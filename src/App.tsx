import React, { useState, useEffect, useRef } from 'react'
import { Message, FileContext, User, Conversation } from './types'
import { OpenAIService } from './services/openaiService'
import { GeminiService } from './services/geminiService'
import { OllamaService } from './services/ollamaService'
import { StorageService } from './services/storageService'
import { ChatService } from './services/chatService'
import { ChatMessage, FileUploader, FileList, ChatInput, Sidebar, Login, PublicChat, UpdatePassword, ThemeToggle, LandingPage } from './components'
import { BotAvatar } from './components/BotAvatar'
import { AuthService } from './services/authService'
import { supabase } from './services/supabaseService'
import { SettingsService, UserSettings } from './services/settingsService'

const openai = new OpenAIService()
const gemini = new GeminiService()
const ollama = new OllamaService()

export default function App() {
  // Initialize mode directly from URL to avoid flicker
  const params = new URLSearchParams(window.location.search)
  const embedOwner = params.get('user_id')
  const isEmbed = params.get('embed') === 'true' && !!embedOwner
  const [isAdminMode, setIsAdminMode] = useState(!isEmbed)
  const [ownerId, setOwnerId] = useState<string | null>(embedOwner)

  // Force transparent body for embed mode
  useEffect(() => {
    if (isEmbed) {
      document.body.style.backgroundColor = 'transparent'
      document.documentElement.style.backgroundColor = 'transparent'
      document.body.classList.add('is-embed')
    }
  }, [isEmbed])

  const [user, setUser] = useState<User | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [files, setFiles] = useState<FileContext[]>([])
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isResetMode, setIsResetMode] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [showLanding, setShowLanding] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Initialize user session
  useEffect(() => {
    if (isEmbed) return // Don't load main user session in embed mode

    AuthService.getCurrentUser().then(setUser)

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string, session: any) => {
      console.log('Auth Event:', event)

      if (event === 'PASSWORD_RECOVERY') {
        setIsResetMode(true)
      }

      if (session?.user) {
        setUser({
          id: session.user.id,
          username: session.user.email?.split('@')[0] || 'User',
          email: session.user.email!,
          isLoggedIn: true,
          plan: 'free'
        })
      } else {
        setUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Start WhatsApp Polling Service
  useEffect(() => {
    import('./services/whatsappPollingService').then(({ whatsappPollingService }) => {
      if (user) {
        whatsappPollingService.startPolling(user.id)
      } else {
        whatsappPollingService.stopPolling()
      }
    })

    return () => {
      import('./services/whatsappPollingService').then(({ whatsappPollingService }) => {
        whatsappPollingService.stopPolling()
      })
    }
  }, [user])

  // Load user files from storage and chat history
  useEffect(() => {
    if (!user) return
    const loadData = async () => {
      try {
        const [userFiles, historyList, settings] = await Promise.all([
          StorageService.getFiles(user.id),
          ChatService.getConversations(user.id),
          SettingsService.getSettings(user.id)
        ])
        setFiles(userFiles)
        setConversations(historyList)
        setUserSettings(settings)
      } catch (e: any) {
        console.error('فشل تحميل البيانات:', e.message)
        setError(`فشل استعادة البيانات من السحابة: ${e.message}. تأكد من إعداد الجداول (Tables) في Supabase.`)
      }
    }
    loadData()
  }, [user])

  // Load messages when conversation changes
  useEffect(() => {
    if (!user || !currentConversationId) {
      if (!currentConversationId) setMessages([])
      return
    }
    const loadMessages = async () => {
      try {
        const msgs = await ChatService.getMessages(user.id, currentConversationId)
        setMessages(msgs)
      } catch (e: any) {
        console.error('Error loading messages:', e)
      }
    }
    loadMessages()
  }, [user, currentConversationId])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleFilesAdded = async (newFiles: FileContext[]) => {
    console.log('HANDLE FILES ADDED:', newFiles.map(f => ({ name: f.name, size: f.size, contentLength: f.content.length })));
    setError('')

    // Add to local state immediately
    setFiles(prev => [...prev, ...newFiles])

    // Try to save to Supabase in background
    if (user) {
      try {
        await StorageService.saveFiles(user.id, newFiles)
      } catch (e: any) {
        console.error('Background Save Error:', e);
      }
    }
  }

  const handleRemoveFile = async (fileName: string) => {
    try {
      if (user) {
        await StorageService.deleteFile(user.id, fileName)
      }
      setFiles(prev => prev.filter(f => f.name !== fileName))
    } catch (e: any) {
      setError(`خطأ في حذف الملف: ${e.message}`)
    }
  }

  const handleSend = async () => {
    if (!input.trim() || files.length === 0) {
      setError(files.length === 0 ? 'يرجى تحميل ملف أولاً' : '')
      return
    }

    setLoading(true)
    setError('')

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    }

    let convId = currentConversationId;

    // Create a new conversation if it's the first message
    if (!convId && user) {
      try {
        const title = input.length > 30 ? input.substring(0, 30) + '...' : input;
        const newConv = await ChatService.createConversation(user.id, title);
        setConversations((prev: Conversation[]) => [newConv, ...prev]);
        setCurrentConversationId(newConv.id);
        convId = newConv.id;
      } catch (e: any) {
        console.error('Error creating conversation:', e);
      }
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')

    // Save user message to Supabase
    if (user) {
      ChatService.saveMessage(user.id, userMessage, convId).catch(e => {
        console.error('Save User Message Error:', e);
        setError(`فشل حفظ الرسالة في قاعدة البيانات: ${e.message}`);
      });
    }

    try {
      let response = '';
      const openAiKey = userSettings?.openai_api_key || (import.meta.env as any).VITE_OPENAI_API_KEY;
      const geminiKey = userSettings?.gemini_api_key || (import.meta.env as any).VITE_GEMINI_API_KEY;

      // Model Selection logic based on user settings
      const useOllama = userSettings?.use_remote_ollama || userSettings?.use_local_model;
      const useGemini = userSettings?.use_gemini;
      const useOpenAI = userSettings?.use_openai;

      if (useOllama) {
        // --- Ollama Selection ---
        ollama.setBaseUrl('http://localhost:11434')
        ollama.setApiKey(null)
        ollama.setModel(userSettings?.local_model_name || 'gemma3:4b')

        if (userSettings?.use_remote_ollama) {
          if (userSettings.ollama_base_url) ollama.setBaseUrl(userSettings.ollama_base_url)
          ollama.setApiKey(userSettings.ollama_api_key || null)
        }

        response = await ollama.generateResponse(input, messages, files)

      } else if (useGemini && geminiKey) {
        // --- Gemini Selection ---
        try {
          response = await gemini.generateResponse(input, messages, files, user?.plan, geminiKey, userSettings?.gemini_model_name, user?.id)
        } catch (e: any) {
          if (e.message.includes('quota') || e.message.includes('limit') || e.message.includes('rate')) {
            throw new Error('انتهى رصيد الاستخدام المجاني لـ Gemini. يرجى المحاولة بعد دقيقة أو شحن الرصيد.');
          }
          throw e;
        }

      } else if (useOpenAI && openAiKey) {
        // --- OpenAI Selection ---
        try {
          response = await openai.generateResponse(input, messages, files, user?.plan, openAiKey, undefined, user?.id)
        } catch (e: any) {
          // If OpenAI fails and Gemini is available, fallback as a courtesy
          if (geminiKey && (e.message.includes('quota') || e.message.includes('key') || e.message.includes('رصيدك') || e.message.includes('limit'))) {
            try {
              response = await gemini.generateResponse(input, messages, files, user?.plan, geminiKey, userSettings?.gemini_model_name, user?.id)
            } catch (gemErr: any) {
              if (gemErr.message.includes('quota') || gemErr.message.includes('limit')) {
                throw new Error('انتهى رصيد الاستخدام في كل من OpenAI و Gemini. يرجى المحاولة لاحقاً.');
              }
              throw gemErr;
            }
          } else {
            throw e;
          }
        }

      } else {
        // --- Default Fallback logic if nothing specific selected ---
        if (openAiKey) {
          response = await openai.generateResponse(input, messages, files, user?.plan, openAiKey, undefined, user?.id)
        } else if (geminiKey) {
          response = await gemini.generateResponse(input, messages, files, user?.plan, geminiKey, undefined, user?.id)
        } else {
          throw new Error('لم يتم إعداد أي مفاتيح API في الإعدادات.');
        }
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, assistantMessage])

      // Save assistant message to Supabase
      if (user) {
        ChatService.saveMessage(user.id, assistantMessage, convId).catch(e => {
          console.error('Save Assistant Message Error:', e);
          setError(`فشل حفظ رد الذكاء الاصطناعي: ${e.message}`);
        });
      }
    } catch (e: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `⚠️ ${e.message}`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }


  const handleNewChat = () => {
    setCurrentConversationId(null)
    setMessages([])
    setInput('')
    setError('')
  }

  const handleLogout = async () => {
    try {
      await AuthService.logout()
    } catch (e: any) {
      console.error('Logout error:', e)
    } finally {
      setUser(null)
      setMessages([])
      setFiles([])
      setCurrentConversationId(null)
      setConversations([])
      setInput('')
      setError('')
    }
  }

  const handleDeleteConversation = async (conversationId: string) => {
    if (!user) return

    try {
      await ChatService.deleteConversation(user.id, conversationId)

      // Update local state
      setConversations(prev => prev.filter(c => c.id !== conversationId))

      // If the deleted conversation was active, reset to empty state
      if (currentConversationId === conversationId) {
        setCurrentConversationId(null)
        setMessages([])
      }
    } catch (e: any) {
      setError(`خطأ في حذف المحادثة: ${e.message}`)
    }
  }

  const handleRenameConversation = async (id: string, newTitle: string) => {
    if (!user) return
    try {
      await ChatService.renameConversation(user.id, id, newTitle)
      setConversations(prev => prev.map(c => c.id === id ? { ...c, title: newTitle } : c))
    } catch (err: any) {
      setError('تعذر تغيير اسم المحادثة')
    }
  }

  if (!isAdminMode && ownerId) {
    return (
      <div className="h-screen w-full relative overflow-hidden bg-transparent">
        <PublicChat ownerId={ownerId} />
      </div>
    )
  }

  if (isResetMode) {
    return <UpdatePassword onComplete={() => setIsResetMode(false)} />
  }

  if (!user && showLanding) {
    return (
      <LandingPage
        onGetStarted={() => setShowLanding(false)}
        onLogin={() => setShowLanding(false)}
      />
    )
  }

  if (!user) {
    return <Login onLogin={() => { }} onBackToLanding={() => setShowLanding(true)} />
  }

  return (
    <div className="h-screen flex bg-dashboard relative overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <Sidebar
        user={user}
        conversations={conversations}
        currentConversationId={currentConversationId}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onNewChat={() => {
          handleNewChat()
          setIsSidebarOpen(false)
        }}
        onLogout={handleLogout}
        onSelectConversation={(id) => {
          setCurrentConversationId(id)
          setIsSidebarOpen(false)
        }}
        onDeleteConversation={handleDeleteConversation}
        onRenameConversation={handleRenameConversation}
        onSettingsUpdated={async () => {
          if (user) {
            const newSettings = await SettingsService.getSettings(user.id)
            setUserSettings(newSettings)
          }
        }}
      />

      <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-salla-bg-soft">
        {/* Beta Label */}
        <div className="absolute top-4 left-4 z-20 pointer-events-none select-none">
          <div className="px-3 py-1 bg-salla-accent-light backdrop-blur-md border border-salla-accent/30 rounded-full flex items-center gap-1.5 shadow-sm">
            <span className="w-1.5 h-1.5 bg-salla-primary rounded-full animate-pulse"></span>
            <span className="text-[10px] font-bold text-salla-primary uppercase tracking-wider">نسخة تجريبية</span>
          </div>
        </div>

        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between p-4 bg-white border-b border-slate-100 sticky top-0 z-10 shadow-sm">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 hover:bg-slate-50 rounded-lg transition-colors text-salla-primary"
          >
            <span className="text-2xl">☰</span>
          </button>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="flex items-center gap-2">
              <BotAvatar size="sm" />
              <span className="font-bold text-salla-primary text-sm">KB Chatbot</span>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col p-4 md:p-8 overflow-hidden max-w-6xl mx-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
            <div className="lg:col-span-1">
              <FileList files={files} onRemove={handleRemoveFile} />
            </div>
            <div className="lg:col-span-3">
              <FileUploader userId={user.id} onFilesAdded={handleFilesAdded} isLoading={loading} />
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-salla animate-in flex items-start gap-3">
              <span className="mt-0.5">⚠️</span>
              <div>
                <p className="font-bold text-sm">خطأ</p>
                <p className="text-xs mt-1 opacity-90">{error}</p>
              </div>
            </div>
          )}

          <div className="flex-1 bg-white rounded-salla border border-slate-100 p-4 md:p-6 mb-6 overflow-y-auto flex flex-col shadow-sm">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-salla-muted text-center p-6">
                <div className="max-w-xs transition-all animate-in">
                  <p className="text-5xl mb-6">💬</p>
                  <p className="text-2xl font-bold text-salla-primary mb-3">ابدأ محادثة جديدة</p>
                  <p className="text-sm font-medium opacity-70 leading-relaxed">حمّل ملفاتك الآن وابدأ بطرح الأسئلة للحصول على إجابات دقيقة ومدعومة بالذكاء الاصطناعي</p>
                </div>
              </div>
            ) : (
              <>
                {messages.map(message => (
                  <ChatMessage key={message.id} message={message} />
                ))}

                {loading && (
                  <div className="flex justify-start mb-4 px-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="bg-salla-accent-light border border-salla-accent/20 rounded-2xl rounded-tl-none p-4 shadow-sm flex items-center gap-1.5 w-fit">
                      <div className="w-2 h-2 bg-salla-primary/40 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-2 h-2 bg-salla-primary/40 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-2 h-2 bg-salla-primary/40 rounded-full animate-bounce"></div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          <div className="max-w-4xl mx-auto w-full">
            <ChatInput
              value={input}
              onChange={setInput}
              onSubmit={handleSend}
              isLoading={loading}
              placeholder={files.length > 0 ? 'اكتب سؤالك هنا...' : 'حمّل ملف أولاً...'}
            />
          </div>
        </div>
      </main>
    </div>
  )
}

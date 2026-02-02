import React, { useState, useEffect, useRef } from 'react'
import { Message, FileContext, User, Conversation } from './types'
import { OpenAIService } from './services/openaiService'
import { GeminiService } from './services/geminiService'
import { StorageService } from './services/storageService'
import { ChatService } from './services/chatService'
import { ChatMessage, FileUploader, FileList, ChatInput, Sidebar, Login, PublicChat } from './components'
import { AuthService } from './services/authService'
import { supabase } from './services/supabaseService'
import { SettingsService, UserSettings } from './services/settingsService'

const openai = new OpenAIService()
const gemini = new GeminiService()

export default function App() {
  // Initialize mode directly from URL to avoid flicker
  const params = new URLSearchParams(window.location.search)
  const embedOwner = params.get('user_id')
  const isEmbed = params.get('embed') === 'true' && !!embedOwner

  const [isAdminMode, setIsAdminMode] = useState(!isEmbed)
  const [ownerId, setOwnerId] = useState<string | null>(embedOwner)

  const [user, setUser] = useState<User | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [files, setFiles] = useState<FileContext[]>([])
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Initialize user session
  useEffect(() => {
    if (isEmbed) return // Don't load main user session in embed mode

    AuthService.getCurrentUser().then(setUser)

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, session: any) => {
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

      if (!openAiKey && geminiKey) {
        response = await gemini.generateResponse(input, messages, files, user?.plan, geminiKey)
      } else {
        try {
          response = await openai.generateResponse(input, messages, files, user?.plan, openAiKey)
        } catch (e: any) {
          if (geminiKey && (e.message.includes('quota') || e.message.includes('key') || e.message.includes('رصيدك'))) {
            response = await gemini.generateResponse(input, messages, files, user?.plan, geminiKey)
          } else {
            throw e;
          }
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

  if (!isAdminMode && ownerId) {
    return (
      <div className="h-screen w-full relative overflow-hidden bg-transparent">
        <PublicChat ownerId={ownerId} />
      </div>
    )
  }

  if (!user) {
    return <Login onLogin={() => { }} />
  }

  return (
    <div className="h-screen flex bg-dashboard">
      <Sidebar
        user={user}
        conversations={conversations}
        currentConversationId={currentConversationId}
        onNewChat={handleNewChat}
        onLogout={handleLogout}
        onSelectConversation={setCurrentConversationId}
      />

      <main className="flex-1 flex flex-col p-6 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
          <div className="lg:col-span-1">
            <FileList files={files} onRemove={handleRemoveFile} />
          </div>
          <div className="lg:col-span-3">
            <FileUploader userId={user.id} onFilesAdded={handleFilesAdded} isLoading={loading} />
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg animate-in">
            <p className="font-medium">⚠️ خطأ</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        )}

        <div className="flex-1 bg-white rounded-lg border border-slate-200 p-4 mb-4 overflow-y-auto flex flex-col">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-slate-500 text-center">
              <div>
                <p className="text-4xl mb-3">💬</p>
                <p className="text-xl font-medium mb-2">ابدأ محادثة جديدة</p>
                <p className="text-sm">حمّل الملفات واسأل أسئلتك</p>
              </div>
            </div>
          ) : (
            <>
              {messages.map(message => (
                <ChatMessage key={message.id} message={message} />
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        <ChatInput
          value={input}
          onChange={setInput}
          onSubmit={handleSend}
          isLoading={loading}
          placeholder={files.length > 0 ? 'اكتب سؤالك هنا...' : 'حمّل ملف أولاً...'}
        />
      </main>
    </div>
  )
}

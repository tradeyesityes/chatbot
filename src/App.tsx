import React, { useState, useEffect, useRef } from 'react'
import { Message, FileContext, User } from './types'
import { OpenAIService } from './services/openaiService'
import { StorageService } from './services/storageService'
import { ChatMessage, FileUploader, FileList, ChatInput, Sidebar, Login } from './components'
import { AuthService } from './services/authService'
import { supabase } from './services/supabaseService'

const openai = new OpenAIService()

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [files, setFiles] = useState<FileContext[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Initialize user session
  useEffect(() => {
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

  // Load user files from storage
  useEffect(() => {
    if (!user) return
    const loadFiles = async () => {
      try {
        const userFiles = await StorageService.getFiles(user.id)
        setFiles(userFiles)
      } catch (e: any) {
        console.error('فشل تحميل الملفات:', e.message)
      }
    }
    loadFiles()
  }, [user])

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
        // Don't block the user, just warn in console. 
        // Showing an error to UI might be confusing if they can still chat with the file locally.
        // potentially show a toast? For now, we allow chatting.
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

    setMessages(prev => [...prev, userMessage])
    setInput('')

    try {
      const response = await openai.generateResponse(input, messages, files, user?.plan)
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, assistantMessage])
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
    setMessages([])
    setInput('')
    setError('')
  }

  const handleLogout = async () => {
    await AuthService.logout()
    setUser(null)
    setMessages([])
    setFiles([])
    setInput('')
  }

  if (!user) {
    return <Login onLogin={() => { }} />
  }

  return (
    <div className="h-screen flex bg-slate-50">
      <Sidebar user={user} onNewChat={handleNewChat} onLogout={handleLogout} />

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

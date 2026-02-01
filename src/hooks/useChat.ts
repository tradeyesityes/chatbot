import { useState, useCallback } from 'react'
import { Message, FileContext } from '../types'
import { OpenAIService } from '../services/openaiService'

const openai = new OpenAIService()

export const useChat = () => {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')

  const addMessage = useCallback((message: Message) => {
    setMessages(prev => [...prev, message])
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
    setError('')
  }, [])

  const sendMessage = useCallback(
    async (content: string, files: FileContext[], userPlan: 'free' | 'pro' = 'free') => {
      if (!content.trim() || files.length === 0) {
        setError('يرجى تحميل ملف وكتابة سؤال')
        return
      }

      setLoading(true)
      setError('')

      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content,
        timestamp: new Date()
      }

      addMessage(userMessage)

      try {
        const response = await openai.generateResponse(content, messages, files, userPlan)
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response,
          timestamp: new Date()
        }
        addMessage(assistantMessage)
        return response
      } catch (e: any) {
        const errorMessage = e.message || 'حدث خطأ غير معروف'
        setError(errorMessage)
        const errorMsgObj: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `⚠️ ${errorMessage}`,
          timestamp: new Date()
        }
        addMessage(errorMsgObj)
        throw e
      } finally {
        setLoading(false)
      }
    },
    [messages, addMessage]
  )

  return {
    messages,
    loading,
    error,
    addMessage,
    clearMessages,
    sendMessage,
    setError
  }
}

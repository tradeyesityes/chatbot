import React, { createContext, useState, ReactNode } from 'react'
import { User, Message, FileContext } from '../types'

interface AppContextType {
  user: User | null
  setUser: (user: User | null) => void
  messages: Message[]
  setMessages: (messages: Message[]) => void
  files: FileContext[]
  setFiles: (files: FileContext[]) => void
  loading: boolean
  setLoading: (loading: boolean) => void
  error: string
  setError: (error: string) => void
}

export const AppContext = createContext<AppContextType | undefined>(undefined)

interface AppContextProviderProps {
  children: ReactNode
}

export const AppContextProvider: React.FC<AppContextProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [files, setFiles] = useState<FileContext[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const value: AppContextType = {
    user,
    setUser,
    messages,
    setMessages,
    files,
    setFiles,
    loading,
    setLoading,
    error,
    setError,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export const useAppContext = (): AppContextType => {
  const context = React.useContext(AppContext)
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppContextProvider')
  }
  return context
}

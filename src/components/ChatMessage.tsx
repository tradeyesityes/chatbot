import React, { useState } from 'react'
import remarkGfm from 'remark-gfm'
import ReactMarkdown from 'react-markdown'
import { Message } from '../types'

interface ChatMessageProps {
  message: Message
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user'
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={`flex mb-6 animate-in ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[85%] md:max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'} items-end gap-2`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs shrink-0 ${isUser ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
          }`}>
          {isUser ? '👤' : '🤖'}
        </div>

        <div
          className={`px-5 py-4 shadow-sm relative group/msg ${isUser
            ? 'bg-blue-600 text-white rounded-2xl rounded-br-sm'
            : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-2xl rounded-bl-sm'
            }`}
        >
          <button
            onClick={handleCopy}
            className={`absolute -top-2 -left-2 p-1.5 shadow-md rounded-lg transition-all border z-10 flex items-center gap-1.5 ${copied
              ? 'bg-blue-600 border-blue-600 text-white opacity-100'
              : 'bg-white dark:bg-slate-700 opacity-0 group-hover/msg:opacity-100 text-slate-400 hover:text-blue-500 border-slate-100 dark:border-slate-600'
              }`}
            title="نسخ النص"
          >
            <span className="text-xs">{copied ? '✓' : '📋'}</span>
            {copied && <span className="text-[10px] font-bold">تم النسخ</span>}
          </button>

          <div className={`text-sm leading-relaxed break-words prose dark:prose-invert max-w-none ${isUser ? 'prose-p:text-white prose-headings:text-white prose-strong:text-white prose-code:text-blue-100' : 'dark:prose-p:text-slate-200'}`}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>

          <span className={`text-[10px] mt-2 block opacity-70 ${isUser ? 'text-blue-100 text-left' : 'text-slate-400 text-right'}`}>
            {message.timestamp.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  )
}

import React, { useState } from 'react'
import remarkGfm from 'remark-gfm'
import ReactMarkdown from 'react-markdown'
import { Message } from '../types'
import { BotAvatar } from './BotAvatar'

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
        <div className={`shrink-0 ${isUser ? 'w-8 h-8 rounded-full bg-salla-accent-light text-salla-primary flex items-center justify-center text-xs' : ''}`}>
          {isUser ? '👤' : <BotAvatar size="sm" />}
        </div>

        <div
          className={`px-5 py-4 shadow-sm relative group/msg ${isUser
            ? 'bg-salla-primary text-white rounded-2xl rounded-br-sm'
            : 'bg-white border border-salla-accent-light text-salla-primary rounded-2xl rounded-bl-sm'
            }`}
        >
          <button
            onClick={handleCopy}
            className={`absolute -top-2 -left-2 p-1.5 shadow-md rounded-lg transition-all border z-10 flex items-center gap-1.5 ${copied
              ? 'bg-salla-primary border-salla-primary text-white opacity-100'
              : 'bg-white opacity-0 group-hover/msg:opacity-100 text-salla-muted hover:text-salla-primary border-salla-accent-light'
              }`}
            title="نسخ النص"
          >
            <span className="text-xs">{copied ? '✓' : '📋'}</span>
            {copied && <span className="text-[10px] font-bold">تم النسخ</span>}
          </button>

          <div className={`text-sm leading-relaxed break-words prose max-w-none ${isUser ? 'prose-p:text-white prose-headings:text-white prose-strong:text-white prose-code:text-salla-accent' : 'prose-p:text-salla-primary prose-strong:text-salla-primary'}`}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>

          <span className={`text-[10px] mt-2 block opacity-70 font-medium ${isUser ? 'text-salla-accent text-left' : 'text-salla-muted text-right'}`}>
            {message.timestamp.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  )
}

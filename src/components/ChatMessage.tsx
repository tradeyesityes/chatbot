import React from 'react'
import { Message } from '../types'

interface ChatMessageProps {
  message: Message
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user'

  return (
    <div className={`flex mb-6 animate-in ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'} items-end gap-2`}>
        {/* Avatar Placeholder */}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs shrink-0 ${isUser ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'
          }`}>
          {isUser ? '👤' : '🤖'}
        </div>

        <div
          className={`px-5 py-4 shadow-sm relative ${isUser
              ? 'bg-blue-600 text-white rounded-2xl rounded-br-sm'
              : 'bg-white border border-slate-100 text-slate-800 rounded-2xl rounded-bl-sm'
            }`}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
          <span className={`text-[10px] mt-2 block opacity-70 ${isUser ? 'text-blue-100 text-left' : 'text-slate-400 text-right'}`}>
            {message.timestamp.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  )
}

import React, { useRef, useEffect } from 'react'

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  isLoading: boolean
  placeholder?: string
}

export const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChange,
  onSubmit,
  isLoading,
  placeholder = 'اكتب سؤالك هنا...'
}) => {
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px'
    }
  }, [value])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!isLoading && value.trim()) onSubmit()
    }
  }

  return (
    <div className="flex gap-2 items-end">
      <textarea
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isLoading}
        placeholder={placeholder}
        className="flex-1 p-3 border border-slate-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
        rows={1}
      />
      <button
        onClick={onSubmit}
        disabled={isLoading || !value.trim()}
        className="px-4 md:px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium min-w-fit flex items-center justify-center gap-2 transition-all active:scale-95"
      >
        <span className="text-lg">{isLoading ? '⏳' : '➤'}</span>
        <span className="hidden md:inline">{isLoading ? 'جاري المعالجة...' : 'إرسال'}</span>
      </button>
    </div>
  )
}

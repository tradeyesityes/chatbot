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
    <div className="flex gap-3 items-end">
      <textarea
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isLoading}
        placeholder={placeholder}
        className="flex-1 p-4 bg-white border border-slate-200 rounded-salla resize-none focus:outline-none focus:ring-2 focus:ring-salla-accent focus:border-salla-primary disabled:bg-slate-50 text-salla-primary placeholder-salla-muted shadow-sm transition-all"
        rows={1}
      />
      <button
        onClick={onSubmit}
        disabled={isLoading || !value.trim()}
        className="px-6 py-4 bg-salla-primary text-white rounded-salla hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed font-bold min-w-fit flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-salla-primary/10"
      >
        <span className="text-xl leading-none">{isLoading ? '⏳' : '➤'}</span>
        <span className="hidden md:inline">{isLoading ? 'جاري المعالجة...' : 'إرسال'}</span>
      </button>
    </div>
  )
}

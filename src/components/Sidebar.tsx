import React, { useState } from 'react'
import { User, Conversation } from '../types'
import { SettingsModal } from './SettingsModal'

interface SidebarProps {
  user: User | null
  conversations: Conversation[]
  currentConversationId: string | null
  onNewChat?: () => void
  onLogout?: () => void
  onSelectConversation: (id: string) => void
}

export const Sidebar: React.FC<SidebarProps> = ({
  user,
  conversations,
  currentConversationId,
  onNewChat,
  onLogout,
  onSelectConversation
}) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  return (
    <aside className="w-80 glass-dark text-white p-6 flex flex-col shadow-xl z-20">
      <div className="mb-10 flex items-center space-x-3 space-x-reverse">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
          <span className="text-2xl">🤖</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-teal-400">
            KB Chatbot
          </h1>
          <p className="text-[11px] text-slate-400 font-medium tracking-wide">مساعد الإجابة الذكي</p>
        </div>
      </div>

      <button
        onClick={onNewChat}
        className="w-full group px-6 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all transform hover:-translate-y-0.5 mb-8"
      >
        <span className="flex items-center justify-center gap-2">
          <span>✨</span>
          <span>محادثة جديدة</span>
        </span>
      </button>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
        <h3 className="text-xs font-bold text-slate-500 mb-4 px-1 uppercase tracking-widest">المحادثات المحفوظة</h3>
        <div className="space-y-2">
          {conversations.length === 0 ? (
            <div className="text-center py-8 opacity-40">
              <span className="text-4xl block mb-2">📥</span>
              <p className="text-xs">لا توجد محادثات بعد</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={`w-full text-right p-3 rounded-xl transition-all group flex items-start gap-3 ${currentConversationId === conv.id
                  ? 'bg-blue-600/20 border border-blue-500/30 text-blue-400'
                  : 'hover:bg-white/5 text-slate-400 hover:text-slate-200'
                  }`}
              >
                <span className="text-lg mt-0.5">💬</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{conv.title}</p>
                  <p className="text-[10px] opacity-50 mt-1">
                    {new Date(conv.created_at).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {user && (
        <div className="my-6 pt-6 border-t border-white/5">
          <div className="p-4 bg-white/5 rounded-xl border border-white/10 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-slate-400">المستخدم الحالي</p>
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="flex items-center gap-1.5 p-1.5 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white"
                title="الإعدادات"
              >
                <span>⚙️</span>
                <span className="text-[11px] font-medium">الإعدادات</span>
              </button>
            </div>
            <div className="flex items-center justify-between">
              <p className="font-semibold text-lg">{user.username}</p>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${user.plan === 'pro'
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                : 'bg-slate-500/10 border-slate-500/20 text-slate-400'
                }`}>
                {user.plan === 'pro' ? 'PRO' : 'FREE'}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="pt-4">
        {user?.isLoggedIn && (
          <button
            onClick={onLogout}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-red-400 transition-colors mb-4 w-full px-2"
          >
            <span>🚪</span>
            <span>تسجيل الخروج</span>
          </button>
        )}
        <div className="flex justify-between items-center text-[10px] text-slate-600 px-2">
          <span>v2.1.0</span>
          <span>© 2024</span>
        </div>
      </div>

      {user && (
        <SettingsModal
          userId={user.id}
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
    </aside>
  )
}


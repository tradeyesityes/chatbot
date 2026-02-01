import React, { useState } from 'react'
import { User } from '../types'
import { SettingsModal } from './SettingsModal'

interface SidebarProps {
  user: User | null
  onNewChat?: () => void
  onLogout?: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({ user, onNewChat, onLogout }) => {
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
        className="w-full group px-6 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all transform hover:-translate-y-0.5"
      >
        <span className="flex items-center justify-center gap-2">
          <span>✨</span>
          <span>محادثة جديدة</span>
        </span>
      </button>

      {user && (
        <div className="my-8 p-4 bg-white/5 rounded-xl border border-white/10 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-slate-400">المستخدم الحالي</p>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white"
              title="الإعدادات"
            >
              ⚙️
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
      )}

      <div className="flex-1 overflow-y-auto">
        <h3 className="text-xs font-bold text-slate-500 mb-4 px-1">تعليمات الاستخدام</h3>
        <ul className="space-y-4">
          {[
            { icon: '📂', text: 'حمّل المستندات للمراجعة' },
            { icon: '💬', text: 'اطرح الأسئلة بالعربية' },
            { icon: '⚡', text: 'احصل على إجابات فورية' }
          ].map((item, i) => (
            <li key={i} className="flex items-center gap-3 text-sm text-slate-300 p-2 rounded-lg hover:bg-white/5 transition-colors cursor-default">
              <span className="text-lg opacity-80">{item.icon}</span>
              <span>{item.text}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-auto pt-6 border-t border-white/5">
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
          <span>v2.0.0</span>
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


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
  onDeleteConversation?: (id: string) => void
  onRenameConversation?: (id: string, newTitle: string) => void
  onSettingsUpdated?: () => void
  isOpen?: boolean
  onClose?: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({
  user,
  conversations,
  currentConversationId,
  onNewChat,
  onLogout,
  onSelectConversation,
  onDeleteConversation,
  onRenameConversation,
  onSettingsUpdated,
  isOpen,
  onClose
}) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')

  return (
    <aside className={`fixed inset-y-0 right-0 z-40 w-80 bg-white border-l border-slate-100 p-6 flex flex-col shadow-xl transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center space-x-3 space-x-reverse">
          <div className="w-10 h-10 bg-salla-primary rounded-xl flex items-center justify-center shadow-lg shadow-salla-primary/10">
            <span className="text-2xl">🤖</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-salla-primary">
              KB Chatbot
            </h1>
            <p className="text-[11px] text-salla-muted font-medium tracking-wide">مساعد الإجابة الذكي</p>
          </div>
        </div>

        {/* Mobile Close Button */}
        <button
          onClick={onClose}
          className="lg:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors text-salla-muted"
        >
          <span className="text-2xl">×</span>
        </button>
      </div>

      <button
        onClick={onNewChat}
        className="w-full group px-6 py-3.5 bg-salla-primary hover:bg-salla-primary/90 text-white rounded-salla font-bold shadow-lg shadow-salla-primary/20 transition-all transform active:scale-[0.98] mb-8"
      >
        <span className="flex items-center justify-center gap-2">
          <span>✨</span>
          <span>محادثة جديدة</span>
        </span>
      </button>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
        <h3 className="text-xs font-bold text-salla-muted mb-4 px-1 uppercase tracking-widest">المحادثات المحفوظة</h3>
        <div className="space-y-2">
          {conversations.length === 0 ? (
            <div className="text-center py-8 opacity-40">
              <span className="text-4xl block mb-2">📥</span>
              <p className="text-xs text-salla-primary">لا توجد محادثات بعد</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                className={`relative group rounded-salla transition-all ${currentConversationId === conv.id
                  ? 'bg-salla-accent-light border border-salla-accent/30'
                  : 'hover:bg-slate-50'
                  }`}
              >
                {editingId === conv.id ? (
                  <div className="p-3 flex items-center gap-2">
                    <input
                      autoFocus
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          onRenameConversation?.(conv.id, editTitle)
                          setEditingId(null)
                        } else if (e.key === 'Escape') {
                          setEditingId(null)
                        }
                      }}
                      onBlur={() => {
                        onRenameConversation?.(conv.id, editTitle)
                        setEditingId(null)
                      }}
                      className="flex-1 bg-white text-sm border border-salla-accent rounded-lg px-2 py-1 outline-none text-right text-salla-primary"
                      dir="rtl"
                    />
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => onSelectConversation(conv.id)}
                      className={`w-full text-right p-3 rounded-salla transition-all flex items-start gap-3 ${currentConversationId === conv.id
                        ? 'text-salla-primary'
                        : 'text-salla-muted hover:text-salla-primary'
                        }`}
                    >
                      <span className="text-lg mt-0.5">💬</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">{conv.title}</p>
                        <p className="text-[10px] opacity-60 mt-1 font-medium">
                          {new Date(conv.created_at).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                    </button>
                    <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      {onRenameConversation && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditingId(conv.id)
                            setEditTitle(conv.title)
                          }}
                          className="p-1.5 hover:bg-salla-primary/5 rounded-lg transition-all text-salla-muted hover:text-salla-primary"
                          title="تعديل الاسم"
                        >
                          <span className="text-xs">✏️</span>
                        </button>
                      )}
                      {onDeleteConversation && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            if (window.confirm('هل أنت متأكد من حذف هذه المحادثة؟')) {
                              onDeleteConversation(conv.id)
                            }
                          }}
                          className="p-1.5 hover:bg-red-50 rounded-lg transition-all text-salla-muted hover:text-red-500"
                          title="حذف المحادثة"
                        >
                          <span className="text-xs">🗑️</span>
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {user && (
        <div className="my-6 pt-6 border-t border-slate-100">
          <div className="p-4 bg-salla-bg-soft rounded-salla border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-salla-muted font-medium">المستخدم الحالي</p>
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="flex items-center gap-1.5 p-1.5 hover:bg-salla-accent-light rounded-lg transition-colors text-salla-primary"
                title="الإعدادات"
              >
                <span>⚙️</span>
                <span className="text-[11px] font-bold">الإعدادات</span>
              </button>
            </div>
            <div className="flex items-center justify-between">
              <p className="font-bold text-lg text-salla-primary">{user.username}</p>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${user.plan === 'pro'
                ? 'bg-amber-50 border-amber-200 text-amber-600'
                : 'bg-slate-50 border-slate-200 text-slate-500'
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
            className="flex items-center gap-2 text-sm font-bold text-salla-muted hover:text-red-500 transition-colors mb-4 w-full px-2"
          >
            <span>🚪</span>
            <span>تسجيل الخروج</span>
          </button>
        )}
        <div className="flex justify-between items-center text-[10px] text-salla-muted opacity-50 font-bold px-2">
          <span>v2.1.0</span>
          <span>© {new Date().getFullYear()}</span>
        </div>
      </div>

      {user && (
        <SettingsModal
          userId={user.id}
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          onSettingsUpdated={onSettingsUpdated}
        />
      )}
    </aside>
  )
}


import React, { useState } from 'react'
import { User, Conversation, ConversationSource } from '../types'
import { BotAvatar } from './BotAvatar'

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
  onAdminView?: () => void
  onSettingsView?: () => void
  isOpen?: boolean
  onClose?: () => void
}

// --- Source Badge Component ---
const SourceBadge: React.FC<{ source?: ConversationSource; phoneNumber?: string | null; visitorName?: string | null }> = ({
  source,
  phoneNumber,
  visitorName
}) => {
  if (!source || source === 'webchat') {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-50 border border-blue-100 text-blue-500 text-[9px] font-bold leading-none">
        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        ويب
      </span>
    )
  }

  if (source === 'whatsapp') {
    const shortPhone = phoneNumber
      ? phoneNumber.replace('@s.whatsapp.net', '').replace('@g.us', '').replace(/^966/, '0')
      : null
    return (
      <span
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-green-50 border border-green-100 text-green-600 text-[9px] font-bold leading-none"
        title={phoneNumber || 'واتساب'}
      >
        <svg className="w-2.5 h-2.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
        {shortPhone ? shortPhone.slice(-7) : 'واتساب'}
      </span>
    )
  }

  if (source === 'public') {
    return (
      <span
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-purple-50 border border-purple-100 text-purple-600 text-[9px] font-bold leading-none"
        title={visitorName || 'زائر'}
      >
        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        {visitorName ? visitorName.split(' ')[0] : 'زائر'}
      </span>
    )
  }

  return null
}

// --- Group conversations by source for display ---
function groupConversations(conversations: Conversation[]) {
  const whatsapp = conversations.filter(c => c.source === 'whatsapp')
  const publicChats = conversations.filter(c => c.source === 'public')
  const webchat = conversations.filter(c => !c.source || c.source === 'webchat')
  return { whatsapp, publicChats, webchat }
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
  onAdminView,
  onSettingsView,
  isOpen,
  onClose
}) => {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [activeFilter, setActiveFilter] = useState<'all' | ConversationSource>('all')

  const { whatsapp, publicChats, webchat } = groupConversations(conversations)

  const filteredConversations = activeFilter === 'all'
    ? conversations
    : conversations.filter(c => {
        if (activeFilter === 'webchat') return !c.source || c.source === 'webchat'
        return c.source === activeFilter
      })

  const ConversationItem = ({ conv }: { conv: Conversation }) => (
    <div
      key={conv.id}
      className={`relative group rounded-salla transition-all ${currentConversationId === conv.id
        ? 'bg-salla-accent-light border border-salla-accent/30'
        : 'hover:bg-slate-50'
        } `}
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
              } `}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">{conv.title}</p>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <SourceBadge
                  source={conv.source}
                  phoneNumber={conv.phone_number}
                  visitorName={conv.visitor_name}
                />
                <p className="text-[10px] opacity-60 font-medium">
                  {new Date(conv.created_at).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })}
                </p>
              </div>
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
  )

  return (
    <aside className={`fixed inset-y-0 right-0 z-40 w-80 bg-white border-l border-slate-100 p-6 flex flex-col shadow-xl transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center space-x-3 space-x-reverse">
          <BotAvatar size="md" />
          <div>
            <h1 className="text-2xl font-bold text-salla-primary leading-tight">
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
        className="w-full group px-6 py-3.5 bg-salla-primary hover:bg-salla-primary/90 text-white rounded-salla font-bold shadow-lg shadow-salla-primary/20 transition-all transform active:scale-[0.98] mb-3"
      >
        <span className="flex items-center justify-center gap-2">
          <span>✨</span>
          <span>محادثة جديدة</span>
        </span>
      </button>

      <button
        onClick={() => {
          onSettingsView?.()
          onClose?.()
        }}
        className="w-full group px-6 py-3.5 bg-white border border-salla-primary/20 hover:bg-slate-50 text-salla-primary rounded-salla font-bold shadow-md hover:shadow-lg transition-all transform active:scale-[0.98] mb-5"
      >
        <span className="flex items-center justify-center gap-2">
          <span>⚙️</span>
          <span>الإعدادات التفاعلية</span>
        </span>
      </button>

      {/* Filter Tabs */}
      {conversations.length > 0 && (
        <div className="flex items-center gap-1 mb-4 bg-slate-50 rounded-xl p-1">
          <button
            onClick={() => setActiveFilter('all')}
            className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${activeFilter === 'all' ? 'bg-white shadow-sm text-salla-primary' : 'text-salla-muted hover:text-salla-primary'}`}
          >
            الكل ({conversations.length})
          </button>
          {webchat.length > 0 && (
            <button
              onClick={() => setActiveFilter('webchat')}
              className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${activeFilter === 'webchat' ? 'bg-white shadow-sm text-blue-600' : 'text-salla-muted hover:text-blue-600'}`}
              title="محادثات الويب"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              {webchat.length}
            </button>
          )}
          {whatsapp.length > 0 && (
            <button
              onClick={() => setActiveFilter('whatsapp')}
              className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${activeFilter === 'whatsapp' ? 'bg-white shadow-sm text-green-600' : 'text-salla-muted hover:text-green-600'}`}
              title="محادثات واتساب"
            >
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              {whatsapp.length}
            </button>
          )}
          {publicChats.length > 0 && (
            <button
              onClick={() => setActiveFilter('public')}
              className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${activeFilter === 'public' ? 'bg-white shadow-sm text-purple-600' : 'text-salla-muted hover:text-purple-600'}`}
              title="محادثات الويدجت"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {publicChats.length}
            </button>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
        <h3 className="text-xs font-bold text-salla-muted mb-3 px-1 uppercase tracking-widest">
          {activeFilter === 'all' ? 'المحادثات المحفوظة' :
           activeFilter === 'webchat' ? '💬 محادثات الويب' :
           activeFilter === 'whatsapp' ? '📱 محادثات واتساب' :
           '👤 محادثات الزوار'}
        </h3>
        <div className="space-y-2">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-salla-muted/50">
              <span className="text-3xl mb-2">
                {activeFilter === 'whatsapp' ? '📱' : activeFilter === 'public' ? '👤' : '💬'}
              </span>
              <p className="text-xs text-center">لا توجد محادثات</p>
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <ConversationItem key={conv.id} conv={conv} />
            ))
          )}
        </div>
      </div>

      {user && (
        <div className="my-6 pt-6 border-t border-slate-100">
          <div className="p-4 bg-salla-bg-soft rounded-salla border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-salla-muted font-medium">المستخدم الحالي</p>
            </div>
            <div className="flex items-center justify-between">
              <p className="font-bold text-lg text-salla-primary">{user.username}</p>
              <div className="flex gap-2 items-center">
                {onAdminView && (
                  <button
                    onClick={onAdminView}
                    className="p-1 px-2 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-lg border border-blue-100 hover:bg-blue-100 transition-colors"
                  >
                    Admin
                  </button>
                )}
                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${user.plan === 'pro'
                  ? 'bg-amber-50 border-amber-200 text-amber-600'
                  : 'bg-slate-50 border-slate-200 text-slate-500'
                  } `}>
                  {user.plan === 'pro' ? 'PRO' : 'FREE'}
                </span>
              </div>
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
        <div className="text-[10px] text-gray-400 mt-2 px-4">v1.4-beta</div>
      </div>

    </aside>
  )
}

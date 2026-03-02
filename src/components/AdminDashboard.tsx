import React, { useState, useEffect } from 'react'
import { AdminService, AdminUser } from '../services/adminService'
import { SettingsService, UserSettings } from '../services/settingsService'
import { BotAvatar } from './BotAvatar'

interface AdminDashboardProps {
    onBack?: () => void
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack }) => {
    const [users, setUsers] = useState<AdminUser[]>([])
    const [loading, setLoading] = useState(true)
    const [editingUser, setEditingUser] = useState<AdminUser | null>(null)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    useEffect(() => {
        loadUsers()
    }, [])

    const loadUsers = async () => {
        setLoading(true)
        try {
            const data = await AdminService.getUsers()
            setUsers(data)
        } catch (e: any) {
            setMessage({ type: 'error', text: 'فشل تحميل المستخدمين: ' + e.message })
        } finally {
            setLoading(false)
        }
    }

    const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
        try {
            await AdminService.toggleUserStatus(userId, !currentStatus)
            setMessage({ type: 'success', text: 'تم تحديث حالة المستخدم بنجاح' })
            loadUsers()
        } catch (e: any) {
            setMessage({ type: 'error', text: 'فشل تحديث الحالة: ' + e.message })
        }
    }

    const handleDeleteUser = async (userId: string) => {
        if (!window.confirm('هل أنت متأكد من حذف هذا المستخدم؟ لا يمكن التراجع عن هذا الإجراء.')) return
        try {
            await AdminService.deleteUser(userId)
            setMessage({ type: 'success', text: 'تم حذف المستخدم بنجاح' })
            loadUsers()
        } catch (e: any) {
            setMessage({ type: 'error', text: 'فشل حذف المستخدم: ' + e.message })
        }
    }

    const handleSaveSettings = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editingUser) return

        try {
            await AdminService.updateUserSettings(editingUser.user_id, editingUser)
            setMessage({ type: 'success', text: 'تم حفظ الإعدادات بنجاح' })
            setEditingUser(null)
            loadUsers()
        } catch (e: any) {
            setMessage({ type: 'error', text: 'فشل حفظ الإعدادات: ' + e.message })
        }
    }

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
    )

    return (
        <div className="p-8 bg-slate-50 dark:bg-slate-900 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <header className="mb-8 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">لوحة التحكم</h1>
                        <p className="text-slate-500 dark:text-slate-400">إدارة حسابات العملاء وإعداداتهم</p>
                    </div>
                    {onBack && (
                        <button
                            onClick={onBack}
                            className="px-6 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-50 transition-colors font-bold shadow-sm"
                        >
                            العودة للمحادثة
                        </button>
                    )}
                </header>

                {message && (
                    <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 animate-slide-up ${message.type === 'success'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800'
                        : 'bg-rose-50 text-rose-700 border border-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800'
                        }`}>
                        <div className={`h-2 w-2 rounded-full ${message.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        {message.text}
                    </div>
                )}

                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden border border-slate-200 dark:border-slate-700">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900/50">
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">المستخدم</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">الحالة</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">نماذج AI</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {users.map(u => (
                                <tr key={u.user_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors">
                                    <td className="px-6 py-4 rtl:text-right">
                                        <div className="flex items-center gap-3 justify-end">
                                            <div className="text-right">
                                                <div className="font-semibold text-slate-800 dark:text-white truncate max-w-[200px]" title={u.email || u.user_id}>
                                                    {u.email || u.user_id.substring(0, 8) + '...'}
                                                </div>
                                                <div className="text-xs text-slate-500">{u.is_admin ? 'مشرف' : 'عميل'}</div>
                                            </div>
                                            <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 font-bold">
                                                {u.user_id[0].toUpperCase()}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 rtl:text-right">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${u.is_enabled
                                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                                            : 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400'
                                            }`}>
                                            {u.is_enabled ? 'نشط' : 'معطل'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 rtl:text-right">
                                        <div className="flex gap-2 justify-end">
                                            {u.use_openai && <span className="px-2 py-1 bg-green-50 dark:bg-green-900/20 text-green-600 text-[10px] rounded border border-green-100">OpenAI</span>}
                                            {u.use_gemini && <span className="px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 text-[10px] rounded border border-blue-100">Gemini</span>}
                                            {u.use_local_model && <span className="px-2 py-1 bg-slate-50 dark:bg-slate-900 text-slate-600 text-[10px] rounded border border-slate-700">Ollama</span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 rtl:text-right">
                                        <div className="flex gap-2 justify-end">
                                            <button
                                                onClick={() => setEditingUser(u)}
                                                className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                            >
                                                تعديل
                                            </button>
                                            <button
                                                onClick={() => handleToggleStatus(u.user_id, u.is_enabled || false)}
                                                className={`p-2 rounded-lg transition-colors ${u.is_enabled ? 'text-orange-600 hover:bg-orange-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                                            >
                                                {u.is_enabled ? 'تعطيل' : 'تفعيل'}
                                            </button>
                                            <button
                                                onClick={() => handleDeleteUser(u.user_id)}
                                                className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                                            >
                                                حذف
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Editing Modal */}
            {editingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-scale-up border border-slate-200 dark:border-slate-700">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                                تعديل إعدادات {editingUser.email || editingUser.user_id.substring(0, 8)}
                            </h2>
                            <button onClick={() => setEditingUser(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full">✕</button>
                        </div>
                        <form onSubmit={handleSaveSettings} className="p-6 overflow-y-auto max-h-[70vh]">
                            <div className="space-y-6">
                                {/* Roles */}
                                <div className="grid grid-cols-2 gap-4">
                                    <label className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={editingUser.is_admin}
                                            onChange={e => setEditingUser({ ...editingUser, is_admin: e.target.checked })}
                                            className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-sm font-semibold">مشرف نظام</span>
                                    </label>
                                    <label className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={editingUser.is_enabled}
                                            onChange={e => setEditingUser({ ...editingUser, is_enabled: e.target.checked })}
                                            className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-sm font-semibold">حساب نشط</span>
                                    </label>
                                </div>

                                {/* AI Config */}
                                <div className="space-y-6">
                                    <h3 className="font-bold text-slate-700 dark:text-slate-300 text-right border-b border-slate-100 dark:border-slate-700 pb-2">إعدادات محركات الذكاء الاصطناعي</h3>

                                    {/* OpenAI Section */}
                                    <div className="p-5 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="sr-only peer"
                                                    checked={editingUser.use_openai}
                                                    onChange={e => setEditingUser({ ...editingUser, use_openai: e.target.checked })}
                                                />
                                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                            </label>
                                            <span className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                                OpenAI API
                                                <span className="text-[10px] bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 font-normal">GPT-4, GPT-3.5</span>
                                            </span>
                                        </div>
                                        {editingUser.use_openai && (
                                            <div className="space-y-2">
                                                <label className="text-xs font-semibold text-slate-500 block text-right">API Key</label>
                                                <input
                                                    type="text"
                                                    placeholder="sk-..."
                                                    className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                                    value={editingUser.openai_api_key || ''}
                                                    onChange={e => setEditingUser({ ...editingUser, openai_api_key: e.target.value })}
                                                />
                                                <p className="text-[10px] text-slate-400 text-right italic">احصل عليه من OpenAI Platform</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Gemini Section */}
                                    <div className="p-5 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="sr-only peer"
                                                    checked={editingUser.use_gemini}
                                                    onChange={e => setEditingUser({ ...editingUser, use_gemini: e.target.checked })}
                                                />
                                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                            </label>
                                            <span className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                                Gemini API
                                                <span className="text-[10px] bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 font-normal">Pro, Flash</span>
                                            </span>
                                        </div>
                                        {editingUser.use_gemini && (
                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <label className="text-xs font-semibold text-slate-500 block text-right">API Key</label>
                                                    <input
                                                        type="text"
                                                        placeholder="AIza..."
                                                        className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                                        value={editingUser.gemini_api_key || ''}
                                                        onChange={e => setEditingUser({ ...editingUser, gemini_api_key: e.target.value })}
                                                    />
                                                    <p className="text-[10px] text-slate-400 text-right italic">احصل عليه مجاناً من Google AI Studio</p>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-semibold text-slate-500 block text-right">اسم النموذج (Gemini Model)</label>
                                                    <input
                                                        type="text"
                                                        placeholder="gemini-1.5-flash-latest"
                                                        className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                                        value={editingUser.gemini_model_name || ''}
                                                        onChange={e => setEditingUser({ ...editingUser, gemini_model_name: e.target.value })}
                                                    />
                                                    <p className="text-[10px] text-slate-400 text-right italic">أمثلة: gemini-1.5-pro, gemini-2.0-flash</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Ollama Section */}
                                    <div className="p-5 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Ollama & Local Models</h4>

                                        <div className="grid grid-cols-2 gap-4">
                                            <label className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 font-semibold text-xs cursor-pointer">
                                                <input type="checkbox" checked={editingUser.use_local_model} onChange={e => setEditingUser({ ...editingUser, use_local_model: e.target.checked })} className="rounded text-blue-600" />
                                                Ollama المحلي (Local)
                                            </label>
                                            <label className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 font-semibold text-xs cursor-pointer">
                                                <input type="checkbox" checked={editingUser.use_remote_ollama} onChange={e => setEditingUser({ ...editingUser, use_remote_ollama: e.target.checked })} className="rounded text-blue-600" />
                                                Ollama الخارجي (Remote)
                                            </label>
                                        </div>

                                        {(editingUser.use_local_model || editingUser.use_remote_ollama) && (
                                            <div className="space-y-4 pt-2">
                                                <div className="space-y-2">
                                                    <label className="text-xs font-semibold text-slate-500 block text-right">اسم النموذج (Model Name)</label>
                                                    <input
                                                        type="text"
                                                        placeholder="gemma3:4b"
                                                        className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                                        value={editingUser.local_model_name || ''}
                                                        onChange={e => setEditingUser({ ...editingUser, local_model_name: e.target.value })}
                                                    />
                                                </div>

                                                {editingUser.use_remote_ollama && (
                                                    <>
                                                        <div className="space-y-2">
                                                            <label className="text-xs font-semibold text-slate-500 block text-right">Base URL</label>
                                                            <input
                                                                type="text"
                                                                placeholder="https://..."
                                                                className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                                                value={editingUser.ollama_base_url || ''}
                                                                onChange={e => setEditingUser({ ...editingUser, ollama_base_url: e.target.value })}
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="text-xs font-semibold text-slate-500 block text-right">API Key (Remote Only)</label>
                                                            <input
                                                                type="text"
                                                                placeholder="Key..."
                                                                className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                                                value={editingUser.ollama_api_key || ''}
                                                                onChange={e => setEditingUser({ ...editingUser, ollama_api_key: e.target.value })}
                                                            />
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Qdrant Section */}
                                    <div className="p-5 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4 text-right">
                                        <div className="flex items-center justify-between">
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="sr-only peer"
                                                    checked={editingUser.use_qdrant || false}
                                                    onChange={e => setEditingUser({ ...editingUser, use_qdrant: e.target.checked })}
                                                />
                                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                                            </label>
                                            <span className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                                قاعدة بيانات Qdrant
                                                <span className="text-[10px] bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 font-normal">Advanced RAG</span>
                                            </span>
                                        </div>
                                        {editingUser.use_qdrant && (
                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <label className="text-xs font-semibold text-slate-500 block">رابط السيرفر (Server URL)</label>
                                                    <input
                                                        type="text"
                                                        placeholder="https://your-qdrant-server.com"
                                                        className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                                        value={editingUser.qdrant_url || ''}
                                                        onChange={e => setEditingUser({ ...editingUser, qdrant_url: e.target.value })}
                                                    />
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <label className="text-xs font-semibold text-slate-500 block">API Key (اختياري)</label>
                                                        <input
                                                            type="text"
                                                            placeholder="ApiKey"
                                                            className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                                            value={editingUser.qdrant_api_key || ''}
                                                            onChange={e => setEditingUser({ ...editingUser, qdrant_api_key: e.target.value })}
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-xs font-semibold text-slate-500 block">اسم المجموعة (Collection)</label>
                                                        <input
                                                            type="text"
                                                            placeholder="segments"
                                                            className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                                            value={editingUser.qdrant_collection || ''}
                                                            onChange={e => setEditingUser({ ...editingUser, qdrant_collection: e.target.value })}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* WhatsApp Settings */}
                                    <div className="p-5 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="sr-only peer"
                                                    checked={editingUser.evolution_bot_enabled}
                                                    onChange={e => setEditingUser({ ...editingUser, evolution_bot_enabled: e.target.checked })}
                                                />
                                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-500"></div>
                                            </label>
                                            <span className="font-bold text-slate-800 dark:text-white flex items-center gap-2">WhatsApp Bot</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 flex gap-3">
                                <button type="submit" className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-700">حفظ التغييرات</button>
                                <button type="button" onClick={() => setEditingUser(null)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-bold transition-all">إلغاء</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

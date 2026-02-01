import React, { useState, useEffect } from 'react'
import { SettingsService, UserSettings } from '../services/settingsService'

interface SettingsModalProps {
    userId: string
    isOpen: boolean
    onClose: () => void
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ userId, isOpen, onClose }) => {
    const [settings, setSettings] = useState<UserSettings>({
        google_client_id: '',
        google_api_key: ''
    })
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    useEffect(() => {
        if (isOpen) {
            loadSettings()
        }
    }, [isOpen])

    const loadSettings = async () => {
        setLoading(true)
        try {
            const data = await SettingsService.getSettings(userId)
            setSettings({
                google_client_id: data.google_client_id || '',
                google_api_key: data.google_api_key || ''
            })
        } catch (e: any) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        setMessage(null)
        try {
            await SettingsService.updateSettings(userId, settings)
            setMessage({ type: 'success', text: 'تم حفظ الإعدادات بنجاح' })
            setTimeout(() => onClose(), 1500)
        } catch (e: any) {
            setMessage({ type: 'error', text: `خطأ في الحفظ: ${e.message}` })
        } finally {
            setSaving(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <span>⚙️</span> الإعدادات
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                        <span className="text-2xl">×</span>
                    </button>
                </div>

                <form onSubmit={handleSave} className="p-6 space-y-5">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                            Google Client ID
                        </label>
                        <input
                            type="text"
                            value={settings.google_client_id || ''}
                            onChange={e => setSettings({ ...settings, google_client_id: e.target.value })}
                            placeholder="Enter your Google Client ID"
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                            Google API Key
                        </label>
                        <input
                            type="password"
                            value={settings.google_api_key || ''}
                            onChange={e => setSettings({ ...settings, google_api_key: e.target.value })}
                            placeholder="Enter your Google API Key"
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
                            required
                        />
                    </div>

                    {message && (
                        <div className={`p-4 rounded-xl text-sm font-medium ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'}`}>
                            {message.text}
                        </div>
                    )}

                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-3 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-semibold"
                        >
                            إلغاء
                        </button>
                        <button
                            type="submit"
                            disabled={saving || loading}
                            className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/20 transition-all font-semibold disabled:opacity-50"
                        >
                            {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
                        </button>
                    </div>
                </form>

                <div className="px-6 py-4 bg-blue-50 dark:bg-blue-900/10 border-t border-blue-100 dark:border-blue-900/20">
                    <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
                        <span className="font-bold">ملاحظة:</span> هذه الإعدادات خاصة بحسابك فقط وتستخدم لتمكين الوصول إلى ملفات Google Drive الخاصة بك.
                    </p>
                </div>
            </div>
        </div>
    )
}

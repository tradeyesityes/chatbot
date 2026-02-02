import React, { useState, useEffect } from 'react'
import { SettingsService, UserSettings } from '../services/settingsService'

interface SettingsModalProps {
    userId: string
    isOpen: boolean
    onClose: () => void
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ userId, isOpen, onClose }) => {
    const [settings, setSettings] = useState<UserSettings>({
        openai_api_key: '',
        gemini_api_key: ''
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
                openai_api_key: data.openai_api_key || '',
                gemini_api_key: data.gemini_api_key || ''
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

                <div className="p-6 space-y-5">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                            OpenAI API Key
                        </label>
                        <input
                            type="text"
                            value={settings.openai_api_key || ''}
                            onChange={e => setSettings({ ...settings, openai_api_key: e.target.value })}
                            placeholder="sk-..."
                            autoComplete="off"
                            name="api_key_openai_custom"
                            style={{ WebkitTextSecurity: 'disc' } as any}
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                            Gemini API Key
                        </label>
                        <input
                            type="text"
                            value={settings.gemini_api_key || ''}
                            onChange={e => setSettings({ ...settings, gemini_api_key: e.target.value })}
                            placeholder="Enter your Gemini API Key"
                            autoComplete="off"
                            name="api_key_gemini_custom"
                            style={{ WebkitTextSecurity: 'disc' } as any}
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-sm mb-1"
                        />
                        <p className="text-[10px] text-slate-500">
                            احصل عليه مجاناً من <a href="https://aistudio.google.com/" target="_blank" className="text-blue-500 underline">Google AI Studio</a>
                        </p>
                    </div>

                    <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                            🚀 تضمين الشات في موقعك
                        </label>
                        <div className="relative group mb-4">
                            <pre className="text-[10px] bg-slate-900 text-blue-400 p-4 rounded-xl overflow-x-auto border border-slate-700">
                                {`<iframe src="${window.location.origin}?embed=true&user_id=${userId}" style="position:fixed; bottom:0; right:0; width:400px; height:700px; border:none; z-index:999999; background:transparent;" allowtransparency="true"></iframe>`}
                            </pre>
                        </div>

                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    const code = `<iframe src="${window.location.origin}?embed=true&user_id=${userId}" style="position:fixed; bottom:0; right:0; width:400px; height:700px; border:none; z-index:999999; background:transparent;" allowtransparency="true"></iframe>`;
                                    navigator.clipboard.writeText(code);
                                    setMessage({ type: 'success', text: 'تم نسخ كود التضمين!' });
                                }}
                                className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/20 transition-all font-semibold text-sm"
                            >
                                📋 نسخ الكود
                            </button>
                            <a
                                href={`${window.location.origin}?embed=true&user_id=${userId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-4 py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-white rounded-xl transition-all font-semibold text-sm flex items-center justify-center gap-2"
                            >
                                🔗 تجربة الرابط
                            </a>
                        </div>
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
                            type="button"
                            onClick={handleSave}
                            disabled={saving || loading}
                            className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/20 transition-all font-semibold disabled:opacity-50"
                        >
                            {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

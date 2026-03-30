import React, { useState, useEffect } from 'react'
import { SettingsService, UserSettings } from '../services/settingsService'
import { supabase } from '../services/supabaseService'
import { WhatsAppQRModal } from './WhatsAppQRModal'
import { BotAvatar } from './BotAvatar'

interface SettingsViewProps {
    userId: string
    onSettingsUpdated?: () => void
    onBack: () => void
}

export const SettingsView: React.FC<SettingsViewProps> = ({ userId, onSettingsUpdated, onBack }) => {
    const [settings, setSettings] = useState<UserSettings>({
        use_openai: false,
        openai_api_key: '',
        use_gemini: false,
        gemini_api_key: '',
        gemini_model_name: 'gemini-1.5-flash-latest',
        use_local_model: false,
        local_model_name: 'gpt-oss:120b',
        use_remote_ollama: true,
        ollama_api_key: import.meta.env.VITE_OLLAMA_API_KEY || null,
        ollama_base_url: 'https://ollama.com',
        use_whatsapp: false,
        whatsapp_number: '',
        whatsapp_message: 'مرحباً، أود الاستفسار عن...',
        evolution_base_url: import.meta.env.VITE_EVOLUTION_BASE_URL || '',
        evolution_api_key: '',
        evolution_global_api_key: import.meta.env.VITE_EVOLUTION_GLOBAL_API_KEY || '',
        evolution_instance_name: '',
        evolution_bot_enabled: false,
        is_admin: false,
        wa_cloud_enabled: false,
        wa_cloud_phone_number_id: '',
        wa_cloud_access_token: '',
        wa_cloud_verify_token: '',
        wa_twilio_enabled: false,
        wa_twilio_account_sid: '',
        wa_twilio_auth_token: '',
        wa_twilio_phone_number: '',
        wa_whatchimp_enabled: false,
        wa_whatchimp_api_key: '',
        wa_whatchimp_phone_number: '',
        tg_enabled: false,
        tg_token: '',
        tg_bot_username: '',
        use_qdrant: false,
        qdrant_url: '',
        qdrant_api_key: '',
        qdrant_collection: 'segments',
        support_email: '',
        handover_keywords: ['تواصل مع موظف', 'خدمة العملاء', 'talk to human', 'support', 'أريد التحدث مع موظف']
    })

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
    const [activeTab, setActiveTab] = useState<'ai' | 'whatsapp' | 'telegram' | 'embed' | 'handover'>('ai')
    const [shortUrl, setShortUrl] = useState<string | null>(null)
    const [generatingShort, setGeneratingShort] = useState(false)
    const [showQRModal, setShowQRModal] = useState(false)
    const [updatingWebhook, setUpdatingWebhook] = useState(false)

    useEffect(() => {
        loadSettings()
    }, [userId])

    const loadSettings = async () => {
        setLoading(true)
        try {
            const data = await SettingsService.getSettings(userId)
            const envEvolutionBaseUrl = import.meta.env.VITE_EVOLUTION_BASE_URL || ''
            const envEvolutionGlobalKey = import.meta.env.VITE_EVOLUTION_GLOBAL_API_KEY || ''

            setSettings({
                ...settings,
                ...data,
                evolution_base_url: data.evolution_base_url || envEvolutionBaseUrl,
                evolution_global_api_key: data.evolution_global_api_key || envEvolutionGlobalKey,
            })
        } catch (e: any) {
            setMessage({ type: 'error', text: `خطأ في جلب الإعدادات: ${e.message}` })
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        setSaving(true)
        setMessage(null)
        try {
            await SettingsService.updateSettings(userId, settings)
            setMessage({ type: 'success', text: 'تم حفظ الإعدادات بنجاح ✨' })
            onSettingsUpdated?.()
            setTimeout(() => setMessage(null), 3000)
        } catch (e: any) {
            setMessage({ type: 'error', text: `خطأ في الحفظ: ${e.message}` })
        } finally {
            setSaving(false)
        }
    }

    const handleUpdateTelegramWebhook = async () => {
        if (!settings.tg_token) {
            setMessage({ type: 'error', text: 'يرجى إدخال التوكن أولاً' })
            return
        }

        setUpdatingWebhook(true)
        setMessage(null)
        try {
            const webhookUrl = `https://rawobjxsbzpmlwwhmsec.supabase.co/functions/v1/telegram-bot?token=${settings.tg_token}`
            const response = await fetch(`https://api.telegram.org/bot${settings.tg_token}/setWebhook?url=${encodeURIComponent(webhookUrl)}`)
            const data = await response.json()
            
            if (data.ok) {
                setMessage({ type: 'success', text: 'تم ربط البوت بنجاح! جربه الآن في تيليقرام.' })
            } else {
                setMessage({ type: 'error', text: `خطأ من تيليقرام: ${data.description}` })
            }
        } catch (e: any) {
            setMessage({ type: 'error', text: `فشل الربط: ${e.message}` })
        } finally {
            setUpdatingWebhook(false)
        }
    }

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center p-20">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-salla-primary border-t-transparent"></div>
            </div>
        )
    }

    const renderAISettings = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-slate-50/50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-700">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-xl">🤖</div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-800 dark:text-white">إعدادات الذكاء الاصطناعي</h3>
                            <p className="text-[10px] text-slate-500">اختر المحرك المفضل لديك</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    {/* OpenAI */}
                    <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center justify-between mb-2">
                             <div className="flex items-center gap-3">
                                 <span className="text-lg">⚡</span>
                                 <span className="text-sm font-bold">OpenAI API (GPT-4)</span>
                             </div>
                             <label className="relative inline-flex items-center cursor-pointer">
                                 <input
                                     type="checkbox"
                                     checked={settings.use_openai || false}
                                     onChange={e => setSettings({ ...settings, use_openai: e.target.checked, use_gemini: false, use_local_model: false, use_remote_ollama: false })}
                                     className="sr-only peer"
                                 />
                                 <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                             </label>
                        </div>
                        {settings.use_openai && (
                            <input
                                type="password"
                                value={settings.openai_api_key || ''}
                                onChange={e => setSettings({ ...settings, openai_api_key: e.target.value })}
                                placeholder="sk-..."
                                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                            />
                        )}
                    </div>

                    {/* Gemini */}
                    <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center justify-between mb-2">
                             <div className="flex items-center gap-3">
                                 <span className="text-lg">♊</span>
                                 <span className="text-sm font-bold">Google Gemini</span>
                             </div>
                             <label className="relative inline-flex items-center cursor-pointer">
                                 <input
                                     type="checkbox"
                                     checked={settings.use_gemini || false}
                                     onChange={e => setSettings({ ...settings, use_gemini: e.target.checked, use_openai: false, use_local_model: false, use_remote_ollama: false })}
                                     className="sr-only peer"
                                 />
                                 <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-600"></div>
                             </label>
                        </div>
                        {settings.use_gemini && (
                            <div className="space-y-2">
                                <input
                                    type="password"
                                    value={settings.gemini_api_key || ''}
                                    onChange={e => setSettings({ ...settings, gemini_api_key: e.target.value })}
                                    placeholder="Gemini API Key"
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                                />
                                <input
                                    type="text"
                                    value={settings.gemini_model_name || ''}
                                    onChange={e => setSettings({ ...settings, gemini_model_name: e.target.value })}
                                    placeholder="Model Name (gemini-1.5-flash)"
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                                />
                            </div>
                        )}
                    </div>

                    {/* Ollama */}
                    <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <span className="text-lg">🦙</span>
                                <span className="text-sm font-bold">Ollama / Local LLM</span>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setSettings({ ...settings, use_local_model: !settings.use_local_model, use_remote_ollama: false, use_openai: false, use_gemini: false })}
                                    className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${settings.use_local_model ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}
                                >
                                    محلي
                                </button>
                                <button
                                    onClick={() => setSettings({ ...settings, use_remote_ollama: !settings.use_remote_ollama, use_local_model: false, use_openai: false, use_gemini: false })}
                                    className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${settings.use_remote_ollama ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}
                                >
                                    بعيد
                                </button>
                            </div>
                        </div>
                        {(settings.use_local_model || settings.use_remote_ollama) && (
                            <div className="space-y-2">
                                <input
                                    type="text"
                                    value={settings.local_model_name || ''}
                                    onChange={e => setSettings({ ...settings, local_model_name: e.target.value })}
                                    placeholder="Model Name (gemma3:4b)"
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                                />
                                {settings.use_remote_ollama && (
                                    <>
                                        <input
                                            type="text"
                                            value={settings.ollama_base_url || ''}
                                            onChange={e => setSettings({ ...settings, ollama_base_url: e.target.value })}
                                            placeholder="Base URL (https://...)"
                                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                                        />
                                        <input
                                            type="password"
                                            value={settings.ollama_api_key || ''}
                                            onChange={e => setSettings({ ...settings, ollama_api_key: e.target.value })}
                                            placeholder="API Key (optional)"
                                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                                        />
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700 flex justify-end">
                    <button 
                        onClick={handleSave}
                        disabled={saving}
                        className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2"
                    >
                        {saving ? 'جاري الحفظ...' : 'حفظ إعدادات الذكاء ✨'}
                    </button>
                </div>
            </div>
        </div>
    )

    const renderWhatsAppSettings = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-slate-50/50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center text-xl">💬</div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-800 dark:text-white">إعدادات الواتساب</h3>
                        <p className="text-[10px] text-slate-500">اربط حسابك لتفعيل الرد التلقائي</p>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="flex items-center justify-between p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl">
                        <button
                            onClick={() => setSettings({ ...settings, wa_cloud_enabled: false, wa_twilio_enabled: false, wa_whatchimp_enabled: false })}
                            className={`flex-1 py-3 text-[10px] font-bold rounded-xl transition-all ${(!settings.wa_cloud_enabled && !settings.wa_twilio_enabled && !settings.wa_whatchimp_enabled) ? 'bg-white dark:bg-slate-800 shadow-sm text-blue-600' : 'text-slate-400'}`}
                        >
                            Evolution
                        </button>
                        <button
                            onClick={() => setSettings({ ...settings, wa_cloud_enabled: true, wa_twilio_enabled: false, wa_whatchimp_enabled: false })}
                            className={`flex-1 py-3 text-[10px] font-bold rounded-xl transition-all ${settings.wa_cloud_enabled ? 'bg-white dark:bg-slate-800 shadow-sm text-emerald-600' : 'text-slate-400'}`}
                        >
                            Cloud API
                        </button>
                        <button
                            onClick={() => setSettings({ ...settings, wa_cloud_enabled: false, wa_twilio_enabled: true, wa_whatchimp_enabled: false })}
                            className={`flex-1 py-3 text-[10px] font-bold rounded-xl transition-all ${settings.wa_twilio_enabled ? 'bg-white dark:bg-slate-800 shadow-sm text-red-600' : 'text-slate-400'}`}
                        >
                            Twilio
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-2 mr-1">رقم الواتساب</label>
                            <input
                                type="text"
                                value={settings.whatsapp_number || ''}
                                onChange={e => setSettings({ ...settings, whatsapp_number: e.target.value })}
                                placeholder="966500000000"
                                className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm"
                            />
                        </div>

                        {settings.wa_cloud_enabled ? (
                            <div className="space-y-4 animate-in slide-in-from-top-2">
                                <input
                                    type="text"
                                    value={settings.wa_cloud_phone_number_id || ''}
                                    onChange={e => setSettings({ ...settings, wa_cloud_phone_number_id: e.target.value })}
                                    placeholder="Phone Number ID"
                                    className="w-full px-4 py-3 dark:bg-slate-900 border dark:border-slate-800 rounded-xl text-sm"
                                />
                                <input
                                    type="password"
                                    value={settings.wa_cloud_access_token || ''}
                                    onChange={e => setSettings({ ...settings, wa_cloud_access_token: e.target.value })}
                                    placeholder="Access Token"
                                    className="w-full px-4 py-3 dark:bg-slate-900 border dark:border-slate-800 rounded-xl text-sm"
                                />
                            </div>
                        ) : !settings.wa_twilio_enabled && (
                            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <BotAvatar size="sm" />
                                    <div>
                                        <h4 className="font-bold text-xs">اتصال Evolution API</h4>
                                        <p className="text-[10px] text-slate-500">الحالة: {settings.evolution_bot_enabled ? 'متصل ✅' : 'غير متصل ❌'}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        if (settings.evolution_bot_enabled) {
                                            if (window.confirm('هل تريد إلغاء ربط الواتساب؟')) {
                                                setSettings({ ...settings, evolution_bot_enabled: false })
                                            }
                                        } else {
                                            setShowQRModal(true)
                                        }
                                    }}
                                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${settings.evolution_bot_enabled ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-600 text-white hover:bg-green-700'}`}
                                >
                                    {settings.evolution_bot_enabled ? 'إلغاء الربط' : 'بدء الربط'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700 flex justify-end">
                    <button 
                        onClick={handleSave}
                        disabled={saving}
                        className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-lg shadow-green-500/20 transition-all flex items-center gap-2"
                    >
                        {saving ? 'جاري الحفظ...' : 'حفظ إعدادات الواتساب ✅'}
                    </button>
                </div>
            </div>
        </div>
    )

    const renderTelegramSettings = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-slate-50/50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-700">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-sky-100 dark:bg-sky-900/30 rounded-xl flex items-center justify-center text-xl">✈️</div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-800 dark:text-white">إعدادات تيليقرام</h3>
                            <p className="text-[10px] text-slate-500">اربط بوت تيليقرام الخاص بك</p>
                        </div>
                    </div>
                     <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={settings.tg_enabled || false}
                            onChange={e => setSettings({ ...settings, tg_enabled: e.target.checked })}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-sky-500"></div>
                    </label>
                </div>

                {settings.tg_enabled && (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="block text-[10px] font-bold text-slate-500 mr-1">Bot Token</label>
                            <input
                                type="password"
                                value={settings.tg_token || ''}
                                onChange={e => setSettings({ ...settings, tg_token: e.target.value })}
                                placeholder="123456789:ABCDEF..."
                                className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm"
                            />
                        </div>
                        <div className="flex gap-3">
                             <button
                                onClick={handleUpdateTelegramWebhook}
                                disabled={updatingWebhook || !settings.tg_token}
                                className="flex-1 py-3 bg-sky-50 text-sky-600 border border-sky-100 hover:bg-sky-100 rounded-xl font-bold text-xs transition-all disabled:opacity-50"
                            >
                                {updatingWebhook ? 'جاري الربط...' : '🔗 ربط الـ Webhook'}
                            </button>
                        </div>
                    </div>
                )}

                <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700 flex justify-end">
                    <button 
                        onClick={handleSave}
                        disabled={saving}
                        className="px-8 py-3 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-bold shadow-lg shadow-sky-500/20 transition-all flex items-center gap-2"
                    >
                        {saving ? 'جاري الحفظ...' : 'حفظ إعدادات تيليقرام 🚀'}
                    </button>
                </div>
            </div>
        </div>
    )

    const renderEmbedSettings = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-slate-50/50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center text-xl">🔗</div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-800 dark:text-white">كود التضمين</h3>
                        <p className="text-[10px] text-slate-500">أضف الشات بوت إلى موقعك الخاص</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="bg-slate-900 rounded-xl p-5 relative group overflow-hidden border border-slate-800 shadow-sm transition-all hover:bg-slate-950">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">كود التضمين (iFrame)</span>
                        </div>
                        <pre className="text-[10px] text-blue-400 font-mono whitespace-pre-wrap leading-relaxed">
                            {`<iframe src="${window.location.origin}?embed=true&user_id=${userId}" style="position:fixed; bottom:20px; right:20px; width:400px; height:600px; border:none; border-radius:12px; shadow: 0 4px 6px rgba(0,0,0,0.1); z-index:9999;" allowtransparency="true"></iframe>`}
                        </pre>
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(`<iframe src="${window.location.origin}?embed=true&user_id=${userId}" style="position:fixed; bottom:20px; right:20px; width:400px; height:600px; border:none; border-radius:12px; shadow: 0 4px 6px rgba(0,0,0,0.1); z-index:9999;" allowtransparency="true"></iframe>`)
                                setMessage({ text: 'تم نسخ الكود بنجاح!', type: 'success' })
                            }}
                            className="absolute top-3 left-3 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-[10px] rounded-lg border border-white/10 transition-all opacity-0 group-hover:opacity-100"
                        >
                            نسخ الكود
                        </button>
                    </div>

                    {/* Direct Link Section */}
                    <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center text-lg">🔗</div>
                                <h4 className="text-xs font-bold text-slate-800 dark:text-white">روابط المحادثة المباشرة</h4>
                            </div>
                        </div>

                        {/* Slug Configuration */}
                        <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-2 mr-1">اسم الرابط المخصص (Slug)</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={settings.slug || ''}
                                        onChange={e => setSettings({ ...settings, slug: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') })}
                                        placeholder="مثال: ali أو mychat"
                                        className="flex-1 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono"
                                    />
                                    <button 
                                        onClick={handleSave}
                                        className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-[10px] font-bold hover:bg-slate-300 transition-all"
                                    >
                                        تحديث الاسم
                                    </button>
                                </div>
                                <p className="text-[9px] text-slate-400 mt-2 mr-1 italic">سيتم استبدال الرموز الطويلة بهذا الاسم في روابطك.</p>
                            </div>

                            <hr className="border-slate-100 dark:border-slate-800" />

                            {/* Option 1: Branded Slug Link */}
                            <div className="space-y-3">
                                <span className="text-[10px] font-bold text-blue-500 uppercase">١- رابط براند مخصص (Branded)</span>
                                <div className="flex items-center gap-2 p-3 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl shadow-sm group">
                                    <input 
                                        type="text" 
                                        readOnly 
                                        value={`${window.location.origin}?e=true&u=${settings.slug || userId}&f=true`}
                                        className="flex-1 bg-transparent text-[10px] text-slate-600 dark:text-slate-400 outline-none font-mono"
                                    />
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(`${window.location.origin}?e=true&u=${settings.slug || userId}&f=true`)
                                            setMessage({ text: 'تم نسخ الرابط بنجاح!', type: 'success' })
                                        }}
                                        className="px-3 py-1.5 bg-salla-primary hover:bg-salla-primary/90 text-white text-[10px] rounded-lg font-bold transition-all shadow-sm active:scale-95"
                                    >
                                        نسخ
                                    </button>
                                    <a
                                        href={`${window.location.origin}?e=true&u=${settings.slug || userId}&f=true`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] rounded-lg font-bold hover:bg-slate-200 transition-all shadow-sm"
                                    >
                                        فتح
                                    </a>
                                </div>
                            </div>

                            {/* Option 2: TinyURL (Extra Short) */}
                            <div className="space-y-3">
                                <span className="text-[10px] font-bold text-emerald-500 uppercase">٢- رابط فائق القصر (TinyURL)</span>
                                <div className="flex items-center gap-2 p-3 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl shadow-sm group">
                                    <input 
                                        type="text" 
                                        readOnly 
                                        value={shortUrl || 'اضغط على السهم لتوليد رابط قصير...'}
                                        placeholder="توليد رابط قصير..."
                                        className="flex-1 bg-transparent text-[10px] text-slate-400 dark:text-slate-500 outline-none font-mono italic"
                                    />
                                    <button
                                        onClick={async () => {
                                            if (shortUrl) {
                                                navigator.clipboard.writeText(shortUrl);
                                                setMessage({ text: 'تم نسخ الرابط القصير!', type: 'success' });
                                                return;
                                            }
                                            setGeneratingShort(true);
                                            try {
                                                const longUrl = `${window.location.origin}?e=true&u=${settings.slug || userId}&f=true`;
                                                
                                                // Try direct TinyURL call (might work on some networks)
                                                const res = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`, { mode: 'no-cors' });
                                                
                                                // Since 'no-cors' doesn't return body, we explain it to the user
                                                // or try a CORS proxy if possible. 
                                                // For absolute stability, we advise using the Branded Link.
                                                
                                                setMessage({ 
                                                    text: 'تم نسخ الرابط الطويل! يمكنك الآن لصقه في أي خدمة اختصار يدوياً.', 
                                                    type: 'success' 
                                                });
                                                navigator.clipboard.writeText(longUrl);
                                                
                                            } catch (e: any) {
                                                console.error('Shorten Error:', e);
                                                setMessage({ text: 'تعذر الاختصار التلقائي. يرجى استخدام الرابط المخصص أعلاه.', type: 'error' });
                                            } finally {
                                                setGeneratingShort(false);
                                            }
                                        }}
                                        disabled={generatingShort}
                                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] rounded-lg font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50"
                                    >
                                        {generatingShort ? '...' : shortUrl ? 'نسخ' : '✨ توليد'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )

    const renderHandoverSettings = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-slate-50/50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center text-xl">👨‍💼</div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-800 dark:text-white">تنبيهات التدخل البشري</h3>
                        <p className="text-[10px] text-slate-500">تلقي تنبيهات عندما يطلب العميل التحدث مع موظف</p>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-2 mr-1">الإيميل لاستقبال التنبيهات</label>
                            <input
                                type="email"
                                value={settings.support_email || ''}
                                onChange={e => setSettings({ ...settings, support_email: e.target.value })}
                                placeholder="support@company.com"
                                className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm"
                            />
                            <p className="text-[10px] text-slate-400 mt-2 mr-1">سيتم إرسال تفاصيل العميل (الاسم، الجوال، الإيميل) إلى هذا العنوان عند طلب المساعدة.</p>
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-2 mr-1">الكلمات المفتاحية للتحويل (مفصولة بفاصلة)</label>
                            <input
                                type="text"
                                value={settings.handover_keywords?.join(', ') || ''}
                                onChange={e => setSettings({ ...settings, handover_keywords: e.target.value.split(',').map(s => s.trim()) })}
                                placeholder="موظف، مساعدة، support..."
                                className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm"
                            />
                        </div>
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700 flex justify-end">
                    <button 
                        onClick={handleSave}
                        disabled={saving}
                        className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-lg shadow-red-500/20 transition-all flex items-center gap-2"
                    >
                        {saving ? 'جاري الحفظ...' : 'حفظ إعدادات التنبيهات 🔔'}
                    </button>
                </div>
            </div>
        </div>
    )

    return (
        <div className="h-full flex flex-col bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-sm border border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-500">
            {/* Header */}
            <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 sticky top-0 z-10" dir="rtl">
                <div className="flex items-center gap-4">
                    <div>
                        <h2 className="text-xl font-black text-slate-800 dark:text-white">الإعدادات التفاعلية</h2>
                        <p className="text-xs text-slate-400 font-medium tracking-wide">تخصيص كامل لمحرك الذكاء الاصطناعي والقنوات</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-4">
                    {message && (
                        <div className={`px-4 py-2 rounded-xl text-xs font-bold animate-in slide-in-from-top-2 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                            {message.text}
                        </div>
                    )}

                    <button 
                        onClick={onBack}
                        className="w-10 h-10 flex items-center justify-center bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all font-bold text-2xl"
                        title="إغلاق"
                    >
                        <span>×</span>
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden" dir="rtl">
                {/* Sidebar Navigation */}
                <div className="w-64 border-l border-slate-50 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20 flex flex-col p-4 gap-2 flex-shrink-0 shadow-[inset_-2px_0_10px_rgba(0,0,0,0.02)]">
                    <button
                        onClick={() => setActiveTab('ai')}
                        className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all ${activeTab === 'ai' ? 'bg-salla-primary text-white shadow-lg shadow-salla-primary/20' : 'text-slate-500 hover:bg-slate-100/50 dark:hover:bg-slate-800'}`}
                    >
                        <span className="text-xl">🤖</span>
                        <span className="font-bold text-sm">نماذج الذكاء</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('whatsapp')}
                        className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all ${activeTab === 'whatsapp' ? 'bg-salla-primary text-white shadow-lg shadow-salla-primary/20' : 'text-slate-500 hover:bg-slate-100/50 dark:hover:bg-slate-800'}`}
                    >
                        <span className="text-xl">💬</span>
                        <span className="font-bold text-sm">الواتساب</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('telegram')}
                        className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all ${activeTab === 'telegram' ? 'bg-salla-primary text-white shadow-lg shadow-salla-primary/20' : 'text-slate-500 hover:bg-slate-100/50 dark:hover:bg-slate-800'}`}
                    >
                        <span className="text-xl">✈️</span>
                        <span className="font-bold text-sm">تيليقرام</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('embed')}
                        className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all ${activeTab === 'embed' ? 'bg-salla-primary text-white shadow-lg shadow-salla-primary/20' : 'text-slate-500 hover:bg-slate-100/50 dark:hover:bg-slate-800'}`}
                    >
                        <span className="text-xl">🔗</span>
                        <span className="font-bold text-sm">التضمين</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('handover')}
                        className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all ${activeTab === 'handover' ? 'bg-salla-primary text-white shadow-lg shadow-salla-primary/20' : 'text-slate-500 hover:bg-slate-100/50 dark:hover:bg-slate-800'}`}
                    >
                        <span className="text-xl">👨‍💼</span>
                        <span className="font-bold text-sm">التواصل البشري</span>
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-white dark:bg-slate-900 text-right">
                    <div className="max-w-3xl mx-auto">
                        {activeTab === 'ai' && renderAISettings()}
                        {activeTab === 'whatsapp' && renderWhatsAppSettings()}
                        {activeTab === 'telegram' && renderTelegramSettings()}
                        {activeTab === 'embed' && renderEmbedSettings()}
                        {activeTab === 'handover' && renderHandoverSettings()}
                    </div>
                </div>
            </div>

            <WhatsAppQRModal
                isOpen={showQRModal}
                onClose={() => setShowQRModal(false)}
                evolutionBaseUrl={settings.evolution_base_url || ''}
                instanceName={settings.evolution_instance_name || ''}
                onSuccess={async () => {
                    const updatedSettings = { ...settings, evolution_bot_enabled: true }
                    setSettings(updatedSettings)
                    setMessage({ type: 'success', text: 'تم ربط WhatsApp بنجاح!' })
                    try {
                        await SettingsService.updateSettings(userId, updatedSettings)
                        loadSettings()
                    } catch (error) {
                        console.error('Failed to save bot enabled state:', error)
                    }
                }}
            />
        </div>
    )
}

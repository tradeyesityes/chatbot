import React, { useState, useEffect } from 'react'
import { SettingsService, UserSettings } from '../services/settingsService'
import { WhatsAppQRModal } from './WhatsAppQRModal'
import { BotAvatar } from './BotAvatar'

interface SettingsModalProps {
    userId: string
    isOpen: boolean
    onClose: () => void
    onSettingsUpdated?: () => void
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ userId, isOpen, onClose, onSettingsUpdated }) => {
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
        tg_bot_username: ''
    })

    const [discoveryLoading, setDiscoveryLoading] = useState(false)
    const [testResults, setTestResults] = useState<{ url: string; status: string; ok: boolean }[]>([])
    const [activeTab, setActiveTab] = useState<'ai' | 'whatsapp' | 'telegram' | 'embed'>('ai')

    const testEvolutionConnection = async () => {
        setDiscoveryLoading(true)
        setTestResults([])
        const sanitize = (str: string) => str.trim().replace(/[^\x00-\x7F]/g, "")
        let baseUrl = sanitize(settings.evolution_base_url || import.meta.env.VITE_EVOLUTION_BASE_URL || '')
        let apiKey = sanitize(settings.evolution_global_api_key || import.meta.env.VITE_EVOLUTION_GLOBAL_API_KEY || '')

        if (!baseUrl || !apiKey) {
            try {
                const globals = await SettingsService.getGlobalSettings()
                baseUrl = baseUrl || sanitize(globals['evolution_base_url'] || '')
                apiKey = apiKey || sanitize(globals['evolution_global_api_key'] || '')
            } catch (e) { }
        }

        if (!baseUrl) {
            setMessage({ type: 'error', text: 'لا يوجد رابط لسيرفر Evolution' })
            setDiscoveryLoading(false)
            return
        }

        const cleanBase = baseUrl.replace(/\/$/, '')
        const endpoints = [
            `${cleanBase}/instance/fetchInstances`,
            `${cleanBase}/v2/instance/fetchInstances`
        ]

        const results = []
        for (const url of endpoints) {
            try {
                const resp = await fetch(url, {
                    method: 'GET',
                    headers: { 'apikey': apiKey }
                })
                results.push({ url: url.replace(cleanBase, ''), status: `${resp.status} ${resp.statusText}`, ok: resp.ok })
            } catch (e: any) {
                results.push({ url: url.replace(cleanBase, ''), status: `Error: ${e.message}`, ok: false })
            }
        }
        setTestResults(results)
        setDiscoveryLoading(false)
    }
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
    const [showQRModal, setShowQRModal] = useState(false)

    useEffect(() => {
        if (isOpen) {
            loadSettings()
        }
    }, [isOpen])

    const loadSettings = async () => {
        setLoading(true)
        try {
            const data = await SettingsService.getSettings(userId)

            // Load Evolution API credentials from environment variables as fallback
            const envEvolutionBaseUrl = import.meta.env.VITE_EVOLUTION_BASE_URL || ''
            const envEvolutionGlobalKey = import.meta.env.VITE_EVOLUTION_GLOBAL_API_KEY || ''

            setSettings({
                use_openai: data.use_openai ?? false,
                openai_api_key: data.openai_api_key || '',
                use_gemini: data.use_gemini ?? false,
                gemini_api_key: data.gemini_api_key || '',
                gemini_model_name: data.gemini_model_name || 'gemini-1.5-flash-latest',
                use_local_model: data.use_local_model || false,
                local_model_name: data.local_model_name || 'gpt-oss:120b',
                use_remote_ollama: data.use_remote_ollama ?? true,
                ollama_api_key: data.ollama_api_key || import.meta.env.VITE_OLLAMA_API_KEY || null,
                ollama_base_url: data.ollama_base_url || 'https://ollama.com',
                use_whatsapp: data.use_whatsapp || false,
                whatsapp_number: data.whatsapp_number || '',
                whatsapp_message: data.whatsapp_message || 'مرحباً، أود الاستفسار عن...',
                // Load from database first, fallback to environment variables
                evolution_base_url: data.evolution_base_url || envEvolutionBaseUrl,
                evolution_api_key: data.evolution_api_key || '',
                evolution_global_api_key: data.evolution_global_api_key || envEvolutionGlobalKey,
                evolution_instance_name: data.evolution_instance_name || '',
                evolution_bot_enabled: data.evolution_bot_enabled || false,
                is_admin: data.is_admin || false,
                wa_cloud_enabled: data.wa_cloud_enabled || false,
                wa_cloud_phone_number_id: data.wa_cloud_phone_number_id || '',
                wa_cloud_access_token: data.wa_cloud_access_token || '',
                wa_cloud_verify_token: data.wa_cloud_verify_token || '',
                wa_twilio_enabled: data.wa_twilio_enabled || false,
                wa_twilio_account_sid: data.wa_twilio_account_sid || '',
                wa_twilio_auth_token: data.wa_twilio_auth_token || '',
                wa_twilio_phone_number: data.wa_twilio_phone_number || '',
                wa_whatchimp_enabled: data.wa_whatchimp_enabled || false,
                wa_whatchimp_api_key: data.wa_whatchimp_api_key || '',
                wa_whatchimp_phone_number: data.wa_whatchimp_phone_number || '',
                tg_enabled: data.tg_enabled || false,
                tg_token: data.tg_token || '',
                tg_bot_username: data.tg_bot_username || ''
            })
            console.log("✅ Settings loaded from DB:", data);
        } catch (e: any) {
            console.error("❌ Error loading settings:", e);
            setMessage({ type: 'error', text: `خطأ في جلب الإعدادات: ${e.message}` })
        } finally {
            setLoading(false)
        }
    }

    const [updatingWebhook, setUpdatingWebhook] = useState(false)

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
            console.error("Telegram setWebhook error:", e)
            setMessage({ type: 'error', text: `فشل الربط: ${e.message}` })
        } finally {
            setUpdatingWebhook(false)
        }
    }

    const handleSmartLink = async () => {
        if (!settings.evolution_base_url || !settings.evolution_global_api_key || !settings.whatsapp_number) {
            setMessage({ type: 'error', text: 'يرجى إدخال رابط الـ API، المفتاح العام، ورقم الواتساب أولاً' })
            return
        }

        setDiscoveryLoading(true)
        setMessage(null)
        try {
            const cleanUrl = settings.evolution_base_url.replace(/\/$/, '')
            const response = await fetch(`${cleanUrl}/instance/fetchInstances`, {
                headers: {
                    'apikey': settings.evolution_global_api_key
                }
            })

            if (!response.ok) throw new Error('فشل الاتصال بالخادم. تأكد من الرابط والمفتاح العام.')

            const instances = await response.json()
            const targetNumber = settings.whatsapp_number.replace(/\D/g, '')

            // Find instance where owner matches targetNumber
            const match = instances.find((inst: any) =>
                (inst.instance.owner && inst.instance.owner.includes(targetNumber)) ||
                (inst.instance.instanceName && inst.instance.instanceName.includes(targetNumber))
            )

            if (match) {
                setSettings({
                    ...settings,
                    evolution_instance_name: match.instance.instanceName,
                    evolution_api_key: match.instance.token
                })
                setMessage({ type: 'success', text: `تم العثور على المثيل: ${match.instance.instanceName}` })
            } else {
                setMessage({ type: 'error', text: 'لم يتم العثور على مثيل مرتبط بهذا الرقم' })
            }
        } catch (e: any) {
            setMessage({ type: 'error', text: e.message })
        } finally {
            setDiscoveryLoading(false)
        }
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        try {
            console.log("💾 Saving settings:", settings);
            await SettingsService.updateSettings(userId, settings)
            setMessage({ type: 'success', text: 'تم حفظ الإعدادات بنجاح' })

            if (onSettingsUpdated) {
                onSettingsUpdated()
            }

            setTimeout(() => onClose(), 1500)
        } catch (e: any) {
            console.error("❌ Save error:", e);
            setMessage({ type: 'error', text: `خطأ في الحفظ: ${e.message}` })
        } finally {
            setSaving(false)
        }
    }

    const renderAISettings = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {settings.is_admin && (
                <>
                    <div className="bg-slate-50/50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-sm font-semibold text-slate-800 dark:text-white">OpenAI API</h3>
                                <p className="text-xs text-slate-500">GPT-4o mini, GPT-4o</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.use_openai || false}
                                    onChange={e => setSettings({ ...settings, use_openai: e.target.checked, use_gemini: false, use_local_model: false, use_remote_ollama: false })}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                            </label>
                        </div>

                        {settings.use_openai && (
                            <div className="animate-in slide-in-from-top-2 duration-200">
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                    API Key
                                </label>
                                <input
                                    type="password"
                                    value={settings.openai_api_key || ''}
                                    onChange={e => setSettings({ ...settings, openai_api_key: e.target.value })}
                                    placeholder="sk-..."
                                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all text-sm text-slate-900 dark:text-white"
                                />
                            </div>
                        )}
                    </div>

                    <div className="bg-slate-50/50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Gemini API</h3>
                                <p className="text-xs text-slate-500">Google Gemini 1.5 Flash/Pro</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.use_gemini || false}
                                    onChange={e => setSettings({ ...settings, use_gemini: e.target.checked, use_openai: false, use_local_model: false, use_remote_ollama: false })}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                            </label>
                        </div>

                        {settings.use_gemini && (
                            <div className="animate-in slide-in-from-top-2 duration-200 space-y-3">
                                <input
                                    type="password"
                                    value={settings.gemini_api_key || ''}
                                    onChange={e => setSettings({ ...settings, gemini_api_key: e.target.value })}
                                    placeholder="Gemini API Key"
                                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
                                />
                                <input
                                    type="text"
                                    value={settings.gemini_model_name || ''}
                                    onChange={e => setSettings({ ...settings, gemini_model_name: e.target.value })}
                                    placeholder="Model Name (e.g. gemini-1.5-flash)"
                                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
                                />
                            </div>
                        )}
                    </div>

                    <div className="bg-slate-50/50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Ollama Connect</h3>
                                <p className="text-xs text-slate-500">Local or Remote LLMs</p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setSettings({ ...settings, use_local_model: !settings.use_local_model, use_remote_ollama: false, use_openai: false, use_gemini: false })}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${settings.use_local_model ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'}`}
                                >
                                    محلي (Local)
                                </button>
                                <button
                                    onClick={() => setSettings({ ...settings, use_remote_ollama: !settings.use_remote_ollama, use_local_model: false, use_openai: false, use_gemini: false })}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${settings.use_remote_ollama ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'}`}
                                >
                                    بعيد (Remote)
                                </button>
                            </div>
                        </div>

                        {(settings.use_local_model || settings.use_remote_ollama) && (
                            <div className="animate-in slide-in-from-top-2 duration-200 space-y-3">
                                <input
                                    type="text"
                                    value={settings.local_model_name || ''}
                                    onChange={e => setSettings({ ...settings, local_model_name: e.target.value })}
                                    placeholder="Model Name (e.g. gemma2:2b)"
                                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl"
                                />
                                {settings.use_remote_ollama && (
                                    <>
                                        <input
                                            type="text"
                                            value={settings.ollama_base_url || ''}
                                            onChange={e => setSettings({ ...settings, ollama_base_url: e.target.value })}
                                            placeholder="Ollama URL (e.g. https://server.com:11434)"
                                            className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl"
                                        />
                                        <input
                                            type="password"
                                            value={settings.ollama_api_key || ''}
                                            onChange={e => setSettings({ ...settings, ollama_api_key: e.target.value })}
                                            placeholder="Remote API Key (optional)"
                                            className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl"
                                        />
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    )

    const renderWhatsAppSettings = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center justify-between p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl mb-4">
                <button
                    onClick={() => setSettings({ ...settings, wa_cloud_enabled: false, wa_twilio_enabled: false, wa_whatchimp_enabled: false })}
                    className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all ${(!settings.wa_cloud_enabled && !settings.wa_twilio_enabled && !settings.wa_whatchimp_enabled) ? 'bg-white dark:bg-slate-800 shadow-sm text-blue-600' : 'text-slate-400'}`}
                >
                    Evolution
                </button>
                <button
                    onClick={() => setSettings({ ...settings, wa_cloud_enabled: true, wa_twilio_enabled: false, wa_whatchimp_enabled: false })}
                    className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all ${settings.wa_cloud_enabled ? 'bg-white dark:bg-slate-800 shadow-sm text-emerald-600' : 'text-slate-400'}`}
                >
                    Cloud API
                </button>
                <button
                    onClick={() => setSettings({ ...settings, wa_cloud_enabled: false, wa_twilio_enabled: true, wa_whatchimp_enabled: false })}
                    className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all ${settings.wa_twilio_enabled ? 'bg-white dark:bg-slate-800 shadow-sm text-red-600' : 'text-slate-400'}`}
                >
                    Twilio
                </button>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">رقم الواتساب</label>
                    <input
                        type="text"
                        value={settings.whatsapp_number || ''}
                        onChange={e => setSettings({ ...settings, whatsapp_number: e.target.value })}
                        placeholder="966500000000"
                        className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-sm"
                    />
                </div>

                {settings.wa_cloud_enabled ? (
                    <div className="space-y-4 animate-in slide-in-from-top-2">
                        <input
                            type="text"
                            value={settings.wa_cloud_phone_number_id || ''}
                            onChange={e => setSettings({ ...settings, wa_cloud_phone_number_id: e.target.value })}
                            placeholder="Phone Number ID"
                            className="w-full px-4 py-2.5 dark:bg-slate-900 border dark:border-slate-600 rounded-xl text-sm"
                        />
                        <input
                            type="password"
                            value={settings.wa_cloud_access_token || ''}
                            onChange={e => setSettings({ ...settings, wa_cloud_access_token: e.target.value })}
                            placeholder="Access Token"
                            className="w-full px-4 py-2.5 dark:bg-slate-900 border dark:border-slate-600 rounded-xl text-sm"
                        />
                    </div>
                ) : !settings.wa_twilio_enabled && !settings.wa_whatchimp_enabled && (
                    <div className="p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <BotAvatar size="sm" />
                            <div>
                                <h4 className="font-bold text-xs text-slate-800 dark:text-white">ربط Evolution API</h4>
                                <p className="text-[10px] text-slate-500">امسح الـ QR Code للاتصال</p>
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                if (settings.evolution_bot_enabled) {
                                    if (window.confirm('هل تريد إلغاء الربط؟')) {
                                        setSettings({...settings, evolution_bot_enabled: false});
                                    }
                                } else {
                                    setShowQRModal(true);
                                }
                            }}
                            className={`px-4 py-2 rounded-lg text-xs font-bold ${settings.evolution_bot_enabled ? 'bg-red-50 text-red-600' : 'bg-blue-600 text-white'}`}
                        >
                            {settings.evolution_bot_enabled ? 'إلغاء الربط' : 'بدء الربط'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    )

    const renderTelegramSettings = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                        <span className="text-lg">✈️</span> إعدادات تيليقرام
                    </h3>
                    <p className="text-[10px] text-slate-500">اربط بوت تيليقرام الخاص بك للرد التلقائي.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input
                        type="checkbox"
                        checked={settings.tg_enabled || false}
                        onChange={e => setSettings({ ...settings, tg_enabled: e.target.checked })}
                        className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
            </div>

            {settings.tg_enabled && (
                <div className="space-y-4">
                    <input
                        type="password"
                        value={settings.tg_token || ''}
                        onChange={e => setSettings({ ...settings, tg_token: e.target.value })}
                        placeholder="Bot Token (e.g. 123456:ABC...)"
                        className="w-full px-4 py-3 dark:bg-slate-900 border dark:border-slate-600 rounded-xl text-sm"
                    />
                    <button
                        onClick={handleUpdateTelegramWebhook}
                        disabled={updatingWebhook || !settings.tg_token}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all disabled:opacity-50"
                    >
                        {updatingWebhook ? '⏳ جاري الربط...' : '🔗 ربط الـ Webhook الآن'}
                    </button>
                </div>
            )}
        </div>
    )

    const renderEmbedSettings = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div>
                <h3 className="text-sm font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                    <span className="text-lg">🔗</span> كود التضمين في الموقع
                </h3>
            </div>
            
            <div className="relative group">
                <pre className="text-[10px] bg-slate-900 text-blue-400 p-4 rounded-xl overflow-x-auto border border-slate-700 font-mono leading-relaxed">
                    {`<iframe src="${window.location.origin}?embed=true&user_id=${userId}" style="position:fixed; bottom:0; right:0; width:400px; height:700px; border:none; z-index:999999; background:transparent;" allowtransparency="true"></iframe>`}
                </pre>
            </div>

            <div className="flex gap-2">
                <button
                    onClick={() => {
                        const code = `<iframe src="${window.location.origin}?embed=true&user_id=${userId}" style="position:fixed; bottom:0; right:0; width:400px; height:700px; border:none; z-index:999999; background:transparent;" allowtransparency="true"></iframe>`;
                        navigator.clipboard.writeText(code);
                        setMessage({ type: 'success', text: 'تم نسخ كود التضمين!' });
                    }}
                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm"
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
    )

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-10 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-500">
            <div className="bg-white dark:bg-slate-800 w-full max-w-4xl rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 slide-in-from-bottom-10 duration-500">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50 flex-shrink-0">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <span>⚙️</span> الإعدادات
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                        <span className="text-2xl">×</span>
                    </button>
                </div>

                <div className="flex flex-1 overflow-hidden flex-row text-right" dir="rtl">
                    {/* Sidebar Navigation */}
                    <div className="w-56 border-l border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex flex-col p-3 gap-2 flex-shrink-0">
                        <button
                            onClick={() => setActiveTab('ai')}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'ai' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                        >
                            <span className="text-lg">🤖</span>
                            <span className="font-bold text-sm">نماذج الذكاء</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('whatsapp')}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'whatsapp' ? 'bg-green-600 text-white shadow-lg shadow-green-500/30' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                        >
                            <span className="text-lg">💬</span>
                            <span className="font-bold text-sm">الواتساب</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('telegram')}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'telegram' ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                        >
                            <span className="text-lg">✈️</span>
                            <span className="font-bold text-sm">تيليقرام</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('embed')}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'embed' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                        >
                            <span className="text-lg">🔗</span>
                            <span className="font-bold text-sm">التضمين</span>
                        </button>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-white dark:bg-slate-800">
                        {message && (
                            <div className={`mb-6 p-4 rounded-xl text-sm font-medium animate-in slide-in-from-top-2 duration-300 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'}`}>
                                <div className="flex items-center gap-2">
                                    <span>{message.type === 'success' ? '✅' : '❌'}</span>
                                    {message.text}
                                </div>
                            </div>
                        )}

                        {activeTab === 'ai' && renderAISettings()}
                        {activeTab === 'whatsapp' && renderWhatsAppSettings()}
                        {activeTab === 'telegram' && renderTelegramSettings()}
                        {activeTab === 'embed' && renderEmbedSettings()}
                    </div>
                </div>

                <div className="p-6 pt-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 flex gap-3 flex-shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-6 py-3 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-bold"
                    >
                        إلغاء
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving || loading}
                        className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/20 transition-all font-bold disabled:opacity-50"
                    >
                        {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
                    </button>
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

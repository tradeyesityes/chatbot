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
        use_openai: true,
        openai_api_key: '',
        use_gemini: false,
        gemini_api_key: '',
        gemini_model_name: 'gemini-1.5-flash-latest',
        use_local_model: false,
        local_model_name: 'gemma3:4b',
        use_remote_ollama: false,
        ollama_api_key: null,
        ollama_base_url: 'http://localhost:11434',
        use_whatsapp: false,
        whatsapp_number: '',
        whatsapp_message: 'مرحباً، أود الاستفسار عن...',
        evolution_base_url: import.meta.env.VITE_EVOLUTION_BASE_URL || '',
        evolution_api_key: '',
        evolution_global_api_key: import.meta.env.VITE_EVOLUTION_GLOBAL_API_KEY || '',
        evolution_instance_name: '',
        evolution_bot_enabled: false
    })

    const [discoveryLoading, setDiscoveryLoading] = useState(false)
    const [testResults, setTestResults] = useState<{ url: string; status: string; ok: boolean }[]>([])

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
                use_openai: data.use_openai ?? true,
                openai_api_key: data.openai_api_key || '',
                use_gemini: data.use_gemini ?? false,
                gemini_api_key: data.gemini_api_key || '',
                gemini_model_name: data.gemini_model_name || 'gemini-1.5-flash-latest',
                use_local_model: data.use_local_model || false,
                local_model_name: data.local_model_name || 'gemma3:4b',
                use_remote_ollama: data.use_remote_ollama || false,
                ollama_api_key: data.ollama_api_key || null,
                ollama_base_url: data.ollama_base_url || 'http://localhost:11434',
                use_whatsapp: data.use_whatsapp || false,
                whatsapp_number: data.whatsapp_number || '',
                whatsapp_message: data.whatsapp_message || 'مرحباً، أود الاستفسار عن...',
                // Load from database first, fallback to environment variables
                evolution_base_url: data.evolution_base_url || envEvolutionBaseUrl,
                evolution_api_key: data.evolution_api_key || '',
                evolution_global_api_key: data.evolution_global_api_key || envEvolutionGlobalKey,
                evolution_instance_name: data.evolution_instance_name || '',
                evolution_bot_enabled: data.evolution_bot_enabled || false
            })
        } catch (e: any) {
            console.error(e)
        } finally {
            setLoading(false)
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
        setMessage(null)
        try {
            await SettingsService.updateSettings(userId, settings)
            setMessage({ type: 'success', text: 'تم حفظ الإعدادات بنجاح' })

            // Notify parent to refresh settings
            if (onSettingsUpdated) {
                onSettingsUpdated()
            }

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
            <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50 flex-shrink-0">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <span>⚙️</span> الإعدادات
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                        <span className="text-2xl">×</span>
                    </button>
                </div>

                <div className="p-6 space-y-5 flex-1 overflow-y-auto custom-scrollbar">
                    {message && (
                        <div className={`p-4 rounded-xl text-sm font-medium animate-in slide-in-from-top-2 duration-300 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'}`}>
                            <div className="flex items-center gap-2">
                                <span>{message.type === 'success' ? '✅' : '❌'}</span>
                                {message.text}
                            </div>
                        </div>
                    )}

                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-sm font-semibold text-slate-800 dark:text-white">OpenAI API</h3>
                                <p className="text-xs text-slate-500">GPT-4, GPT-3.5 Turbo</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.use_openai || false}
                                    onChange={e => setSettings({ ...settings, use_openai: e.target.checked })}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                            </label>
                        </div>

                        {settings.use_openai && (
                            <div className="animate-in slide-in-from-top-2 duration-200">
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                    API Key
                                </label>
                                <input
                                    type="text"
                                    value={settings.openai_api_key || ''}
                                    onChange={e => setSettings({ ...settings, openai_api_key: e.target.value })}
                                    placeholder="sk-..."
                                    autoComplete="off"
                                    name="api_key_openai_custom"
                                    style={{ WebkitTextSecurity: 'disc' } as any}
                                    className="w-full px-4 py-3 bg-transparent border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all text-sm mb-1 text-slate-900 dark:text-white"
                                />
                                <p className="text-[10px] text-slate-500">
                                    احصل عليه من <a href="https://platform.openai.com/api-keys" target="_blank" className="text-green-500 underline">OpenAI Platform</a>
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Gemini API</h3>
                                <p className="text-xs text-slate-500">Gemini Pro, Gemini Flash</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.use_gemini || false}
                                    onChange={e => setSettings({ ...settings, use_gemini: e.target.checked })}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                            </label>
                        </div>

                        {settings.use_gemini && (
                            <div className="animate-in slide-in-from-top-2 duration-200">
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                    API Key
                                </label>
                                <input
                                    type="text"
                                    value={settings.gemini_api_key || ''}
                                    onChange={e => setSettings({ ...settings, gemini_api_key: e.target.value })}
                                    placeholder="Enter your Gemini API Key"
                                    autoComplete="off"
                                    name="api_key_gemini_custom"
                                    style={{ WebkitTextSecurity: 'disc' } as any}
                                    className="w-full px-4 py-3 bg-transparent border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all text-sm mb-1 text-slate-900 dark:text-white"
                                />
                                <p className="text-[10px] text-slate-500">
                                    احصل عليه مجاناً من <a href="https://aistudio.google.com/" target="_blank" className="text-green-500 underline">Google AI Studio</a>
                                </p>
                            </div>
                        )}

                        {settings.use_gemini && (
                            <div className="mt-4 animate-in slide-in-from-top-2 duration-200">
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                    اسم النموذج (Gemini Model)
                                </label>
                                <input
                                    type="text"
                                    value={settings.gemini_model_name || ''}
                                    onChange={e => setSettings({ ...settings, gemini_model_name: e.target.value })}
                                    placeholder="e.g. gemini-1.5-flash-latest"
                                    className="w-full px-4 py-3 bg-transparent border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all text-sm text-slate-900 dark:text-white"
                                />
                                <p className="text-[10px] text-slate-500 mt-1">
                                    أمثلة: gemini-1.5-flash-latest, gemini-2.0-flash, gemini-1.5-pro
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Ollama المحلي (Local)</h3>
                                <p className="text-xs text-slate-500">استخدم نموذج يعمل على جهازك مباشرة</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.use_local_model || false}
                                    onChange={e => setSettings({
                                        ...settings,
                                        use_local_model: e.target.checked,
                                        use_remote_ollama: e.target.checked ? false : settings.use_remote_ollama,
                                        use_openai: e.target.checked ? false : settings.use_openai,
                                        use_gemini: e.target.checked ? false : settings.use_gemini
                                    })}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                            </label>
                        </div>

                        {settings.use_local_model && (
                            <div className="animate-in slide-in-from-top-2 duration-200">
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                    اسم النموذج (Model Name)
                                </label>
                                <input
                                    type="text"
                                    value={settings.local_model_name || ''}
                                    onChange={e => setSettings({ ...settings, local_model_name: e.target.value })}
                                    placeholder="e.g. gemma3:4b"
                                    className="w-full px-4 py-3 bg-transparent border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-sm mb-1 text-slate-900 dark:text-white"
                                />
                                <p className="text-[10px] text-slate-500">
                                    يستخدم localhost:11434 تلقائياً
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Ollama API الخارجي (Remote)</h3>
                                <p className="text-xs text-slate-500">اتصل بخادم Ollama بعيد</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.use_remote_ollama || false}
                                    onChange={e => setSettings({
                                        ...settings,
                                        use_remote_ollama: e.target.checked,
                                        use_local_model: e.target.checked ? false : settings.use_local_model,
                                        use_openai: e.target.checked ? false : settings.use_openai,
                                        use_gemini: e.target.checked ? false : settings.use_gemini
                                    })}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                            </label>
                        </div>

                        {settings.use_remote_ollama && (
                            <div className="animate-in slide-in-from-top-2 duration-200 space-y-3">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                        اسم النموذج (Model Name)
                                    </label>
                                    <input
                                        type="text"
                                        value={settings.local_model_name || ''}
                                        onChange={e => setSettings({ ...settings, local_model_name: e.target.value })}
                                        placeholder="e.g. gemma3:4b"
                                        className="w-full px-4 py-3 bg-transparent border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all text-sm text-slate-900 dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                        Base URL
                                    </label>
                                    <input
                                        type="text"
                                        value={settings.ollama_base_url || ''}
                                        onChange={e => setSettings({ ...settings, ollama_base_url: e.target.value })}
                                        placeholder="https://your-server.com:11434"
                                        className="w-full px-4 py-3 bg-transparent border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all text-sm text-slate-900 dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                        API Key
                                    </label>
                                    <input
                                        type="text"
                                        value={settings.ollama_api_key || ''}
                                        onChange={e => setSettings({ ...settings, ollama_api_key: e.target.value })}
                                        placeholder="Enter your Ollama API key"
                                        autoComplete="off"
                                        style={{ WebkitTextSecurity: 'disc' } as any}
                                        className="w-full px-4 py-3 bg-transparent border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all text-sm mb-1 text-slate-900 dark:text-white"
                                    />
                                    <p className="text-[10px] text-slate-500">
                                        مطلوب للخوادم البعيدة
                                    </p>
                                </div>

                                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-xl">
                                    <h4 className="text-[10px] font-bold text-amber-800 dark:text-amber-400 mb-1">💡 نصيحة للاتصال البعيد:</h4>
                                    <p className="text-[10px] text-amber-700 dark:text-amber-500 leading-relaxed">
                                        لتجنب مشاكل CORS، تأكد من تشغيل Ollama مع إعداد:
                                        <code className="block mt-1 p-1 bg-amber-100 dark:bg-amber-800 rounded">OLLAMA_ORIGINS="*" ollama serve</code>
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-sm font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                                    <span className="text-lg">💬</span> إعدادات الواتساب (WhatsApp)
                                </h3>
                                <p className="text-[10px] text-slate-500">للسماح للعملاء بالتواصل معك مباشرة عبر واتساب</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.use_whatsapp || false}
                                    onChange={e => setSettings({ ...settings, use_whatsapp: e.target.checked })}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                            </label>
                        </div>

                        {settings.use_whatsapp && (
                            <div className="animate-in slide-in-from-top-2 duration-200 space-y-3">
                                <div>
                                    <label className="block text-[10px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        رقم الواتساب
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={settings.whatsapp_number || ''}
                                            onChange={e => setSettings({ ...settings, whatsapp_number: e.target.value })}
                                            placeholder="مثال: 966500000000"
                                            dir="ltr"
                                            className="flex-1 px-4 py-3 bg-transparent border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all text-sm text-slate-900 dark:text-white"
                                        />
                                        {settings.evolution_bot_enabled && (
                                            <button
                                                type="button"
                                                onClick={handleSmartLink}
                                                disabled={discoveryLoading}
                                                className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/20 transition-all font-semibold text-xs whitespace-nowrap disabled:opacity-50"
                                            >
                                                {discoveryLoading ? '⏳...' : '🔗 ربط ذكي'}
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-[9px] text-slate-500 mt-1">
                                        استخدم الرقم مع مفتاح الدولة بدون أصفار أو علامة +
                                    </p>
                                </div>

                                {/* Diagnostic Tool */}
                                {settings.evolution_bot_enabled && (
                                    <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-600">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">أداة التشخيص</span>
                                            <button
                                                onClick={testEvolutionConnection}
                                                disabled={discoveryLoading}
                                                className="text-[9px] bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded hover:bg-slate-300 transition-colors"
                                            >
                                                {discoveryLoading ? '...' : 'اختبار'}
                                            </button>
                                        </div>
                                        {testResults.length > 0 && (
                                            <div className="space-y-1">
                                                {testResults.map((r, i) => (
                                                    <div key={i} className="flex items-center justify-between text-[8px] font-mono">
                                                        <span>{r.url}</span>
                                                        <span className={r.ok ? 'text-green-500' : 'text-red-500'}>{r.status}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                                <div>
                                    <label className="block text-[10px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        الرسالة الافتراضية
                                    </label>
                                    <textarea
                                        value={settings.whatsapp_message || ''}
                                        onChange={e => setSettings({ ...settings, whatsapp_message: e.target.value })}
                                        rows={2}
                                        placeholder="الرسالة التي ستظهر للمستخدم عند فتح واتساب"
                                        className="w-full px-4 py-3 bg-transparent border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all text-sm text-slate-900 dark:text-white resize-none"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-sm font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                                    <BotAvatar size="sm" /> ربط الواتساب
                                </h3>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.evolution_bot_enabled || false}
                                    onChange={async (e) => {
                                        const isEnabled = e.target.checked
                                        const instanceName = settings.evolution_instance_name || `user_${userId.substring(0, 8)}`

                                        const sanitize = (str: string) => str.trim().replace(/[^\x00-\x7F]/g, "")
                                        let finalBaseUrl = settings.evolution_base_url || import.meta.env.VITE_EVOLUTION_BASE_URL || ''
                                        let finalGlobalKey = settings.evolution_global_api_key || import.meta.env.VITE_EVOLUTION_GLOBAL_API_KEY || ''

                                        // Try fetching from global_settings if missing
                                        if (!finalBaseUrl || !finalGlobalKey) {
                                            try {
                                                const globals = await SettingsService.getGlobalSettings()
                                                finalBaseUrl = finalBaseUrl || globals['evolution_base_url'] || ''
                                                finalGlobalKey = finalGlobalKey || globals['evolution_global_api_key'] || ''
                                            } catch (e) {
                                                console.warn('Failed to fetch global settings', e)
                                            }
                                        }

                                        finalBaseUrl = sanitize(finalBaseUrl)
                                        finalGlobalKey = sanitize(finalGlobalKey)

                                        if (isEnabled) {
                                            // Diagnostic section (Hidden by default, shown when testing)
                                            if (testResults.length > 0) {
                                                testEvolutionConnection() // Refresh if already showing? Or just show results
                                            }

                                            // ----------------- ENABLING -----------------

                                            if (finalBaseUrl && finalGlobalKey) {
                                                try {
                                                    const updatedSettings = {
                                                        ...settings,
                                                        evolution_bot_enabled: true,
                                                        evolution_base_url: finalBaseUrl,
                                                        evolution_global_api_key: finalGlobalKey,
                                                        evolution_instance_name: instanceName
                                                    }
                                                    setSettings(updatedSettings)
                                                    await SettingsService.updateSettings(userId, updatedSettings)
                                                    setShowQRModal(true)
                                                } catch (error: any) {
                                                    setMessage({ type: 'error', text: `خطأ في الحفظ: ${error.message}` })
                                                }
                                            } else {
                                                setMessage({ type: 'error', text: 'فشل التفعيل: إعدادات Evolution API غير مكتملة في السيرفر (قاعدة البيانات والبيئة).' })
                                            }
                                        } else {
                                            // ----------------- DISABLING -----------------
                                            if (window.confirm('هل أنت متأكد؟ سيتم حذف رقم الواتس، وسوف تحتاج إلى إعادة تفعيله عبر QR code.')) {
                                                try {
                                                    setMessage({ type: 'success', text: 'جاري حذف الربط...' })

                                                    // 1. Delete Instance from Evolution API
                                                    const cleanBaseUrl = finalBaseUrl.replace(/\/$/, '')
                                                    const endpoints = [
                                                        `${cleanBaseUrl}/instance/delete/${instanceName}`,
                                                        `${cleanBaseUrl}/v2/instance/delete/${instanceName}`
                                                    ]

                                                    for (const url of endpoints) {
                                                        try {
                                                            const resp = await fetch(url, {
                                                                method: 'DELETE',
                                                                headers: {
                                                                    'apikey': finalGlobalKey
                                                                }
                                                            })
                                                            if (resp.ok || resp.status === 404) break
                                                        } catch (e) {
                                                            console.warn(`Delete failed at ${url}, trying next...`)
                                                        }
                                                    }

                                                    // 2. Update Settings
                                                    const updatedSettings = { ...settings, evolution_bot_enabled: false }
                                                    setSettings(updatedSettings)

                                                    // 3. Save to database
                                                    await SettingsService.updateSettings(userId, updatedSettings)

                                                    setMessage({ type: 'success', text: 'تم إلغاء الربط وحذف الرقم بنجاح' })
                                                } catch (error: any) {
                                                    console.error('Logout Error:', error)
                                                    // Even if API fails, we disable locally to reflect user intent
                                                    setSettings({ ...settings, evolution_bot_enabled: false })
                                                    setMessage({ type: 'error', text: 'حدث خطأ أثناء الحذف من السيرفر، لكن تم التعطيل محلياً' })
                                                }
                                            }
                                            // If cancelled, do nothing (checkbox stays checked)
                                        }
                                    }}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                    </div>

                    {/* Instagram Integration Removed */}

                    <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                            🚀 تضمين الشات في موقعك
                        </label>
                        <p className="text-[10px] text-slate-500 mb-3 leading-relaxed">
                            💡 ملاحظة: هذا الكود سيعمل تلقائياً بحسب المحرك الذي تفعله في الأعلى (Gemini أو OpenAI أو Ollama). لا تحتاج لتغيير الكود عند تغيير المحرك.
                        </p>
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


                </div>

                <div className="p-6 pt-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-800/30 flex gap-3 flex-shrink-0">
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

            <WhatsAppQRModal
                isOpen={showQRModal}
                onClose={() => setShowQRModal(false)}
                evolutionBaseUrl={settings.evolution_base_url || ''}
                instanceName={settings.evolution_instance_name || ''}
                onSuccess={async () => {
                    const updatedSettings = { ...settings, evolution_bot_enabled: true }
                    setSettings(updatedSettings)
                    setMessage({ type: 'success', text: 'تم ربط WhatsApp بنجاح!' })

                    // Save to database
                    try {
                        await SettingsService.updateSettings(userId, updatedSettings)
                        loadSettings() // Reload settings to get updated data
                    } catch (error) {
                        console.error('Failed to save bot enabled state:', error)
                    }
                }}
            />
        </div >
    )
}

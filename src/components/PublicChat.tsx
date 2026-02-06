import React, { useState, useEffect, useRef } from 'react'
import { Message, FileContext } from '../types'
import { GeminiService } from '../services/geminiService'
import { OpenAIService } from '../services/openaiService'
import { OllamaService } from '../services/ollamaService'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'
import { supabase } from '../services/supabaseService'
import { StorageService } from '../services/storageService'
import { SettingsService } from '../services/settingsService'

const gemini = new GeminiService()
const openai = new OpenAIService()
const ollamaService = new OllamaService()

interface PublicChatProps {
    ownerId: string;
}

export const PublicChat: React.FC<PublicChatProps> = ({ ownerId }) => {
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [visitor, setVisitor] = useState<{ id: string; name: string; email: string } | null>(null)
    const [files, setFiles] = useState<FileContext[]>([])
    const [settings, setSettings] = useState<any>(null)
    const [formData, setFormData] = useState({ name: '', email: '' })
    const [isStarted, setIsStarted] = useState(false)
    const [isWidgetOpen, setIsWidgetOpen] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        // Load owner's files and settings
        const loadOwnerContent = async () => {
            try {
                const [ownerFiles, ownerSettings] = await Promise.all([
                    StorageService.getFiles(ownerId),
                    SettingsService.getSettings(ownerId)
                ])
                setFiles(ownerFiles)
                setSettings(ownerSettings)
            } catch (e) {
                console.error("Error loading owner content:", e)
            }
        }
        loadOwnerContent()

        // Check for existing visitor session
        const savedVisitor = localStorage.getItem(`visitor_${ownerId}`)
        if (savedVisitor) {
            setVisitor(JSON.parse(savedVisitor))
            setIsStarted(true)
        }
    }, [ownerId])

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('chat_leads')
                .insert({
                    owner_id: ownerId,
                    name: formData.name,
                    email: formData.email
                })
                .select()
                .single()

            if (error) throw error

            const newVisitor = { id: data.id, name: data.name, email: data.email }
            setVisitor(newVisitor)
            localStorage.setItem(`visitor_${ownerId}`, JSON.stringify(newVisitor))
            setIsStarted(true)

            setMessages([{
                id: 'welcome',
                role: 'assistant',
                content: `مرحباً ${data.name}! كيف يمكنني مساعدتك اليوم بخصوص ملفاتنا المرفقة؟`,
                timestamp: new Date()
            }])
        } catch (e: any) {
            alert(`خطأ: ${e.message}`)
        } finally {
            setLoading(false)
        }
    }

    const handleSend = async () => {
        if (!input.trim() || !visitor) return

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
            timestamp: new Date()
        }

        setMessages(prev => [...prev, userMsg])
        setInput('')
        setLoading(true)

        try {
            await supabase.from('chat_messages').insert({
                user_id: ownerId,
                role: 'user',
                content: input,
                visitor_id: visitor.id
            })

            let response = ''
            const openAiKey = settings?.openai_api_key || (import.meta.env as any).VITE_OPENAI_API_KEY;
            const geminiKey = settings?.gemini_api_key || (import.meta.env as any).VITE_GEMINI_API_KEY;

            // Model Selection logic based on owner settings
            const useGemini = settings?.use_gemini;
            const useOpenAI = settings?.use_openai;
            const useOllama = settings?.use_remote_ollama || settings?.use_local_model;

            if (useOllama) {
                // --- Ollama Selection ---
                try {
                    ollamaService.setBaseUrl(settings?.ollama_base_url || 'http://localhost:11434')
                    ollamaService.setApiKey(settings?.ollama_api_key || null)
                    ollamaService.setModel(settings?.local_model_name || 'gemma3:4b')
                    response = await ollamaService.generateResponse(input, messages, files)
                } catch (e: any) {
                    // Fallback to Gemini if configured
                    if (geminiKey) {
                        response = await gemini.generateResponse(input, messages, files, 'free', geminiKey, settings?.gemini_model_name)
                    } else {
                        throw e;
                    }
                }
            } else if (useGemini && geminiKey) {
                try {
                    response = await gemini.generateResponse(input, messages, files, 'free', geminiKey, settings?.gemini_model_name)
                } catch (e: any) {
                    if (e.message.includes('quota') || e.message.includes('limit')) {
                        throw new Error('انتهى رصيد الاستخدام المجاني لـ Gemini. يرجى المحاولة بعد دقيقة.');
                    }
                    throw e;
                }
            } else if (useOpenAI && openAiKey) {
                try {
                    response = await openai.generateResponse(input, messages, files, 'free', openAiKey)
                } catch (e: any) {
                    if (geminiKey && (e.message.includes('quota') || e.message.includes('limit'))) {
                        try {
                            response = await gemini.generateResponse(input, messages, files, 'free', geminiKey, settings?.gemini_model_name)
                        } catch (gemErr: any) {
                            if (gemErr.message.includes('quota')) {
                                throw new Error('انتهى رصيد الاستخدام. يرجى المحاولة لاحقاً.');
                            }
                            throw gemErr;
                        }
                    } else {
                        throw e;
                    }
                }
            } else {
                // Default fallback if no flags set
                if (openAiKey) {
                    response = await openai.generateResponse(input, messages, files, 'free', openAiKey)
                } else if (geminiKey) {
                    response = await gemini.generateResponse(input, messages, files, 'free', geminiKey)
                } else {
                    throw new Error('تعذر العثور على مفتاح API صالح للرد.');
                }
            }

            const assistantMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: response,
                timestamp: new Date()
            }

            setMessages(prev => [...prev, assistantMsg])

            await supabase.from('chat_messages').insert({
                user_id: ownerId,
                role: 'assistant',
                content: response,
                visitor_id: visitor.id
            })

        } catch (e: any) {
            setMessages(prev => [...prev, {
                id: 'err',
                role: 'assistant',
                content: `⚠️ خطأ: ${e.message}`,
                timestamp: new Date()
            }])
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className={`fixed z-[9999] pointer-events-none flex items-end justify-end ${isWidgetOpen ? 'inset-0 p-4 sm:p-8' : 'bottom-6 right-6 sm:bottom-8 sm:right-8'}`}>
            <div className="pointer-events-auto contents">
                {/* Bubble Button */}
                {!isWidgetOpen && (
                    <button
                        onClick={() => setIsWidgetOpen(true)}
                        className="pointer-events-auto w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-full shadow-2xl flex items-center justify-center transform hover:scale-110 transition-all duration-300 animate-in zoom-in slide-in-from-bottom-10"
                    >
                        <span className="text-3xl">💬</span>
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 border-2 border-white rounded-full flex items-center justify-center">
                            <span className="text-[10px] font-bold">1</span>
                        </div>
                    </button>
                )}

                {/* Chat Window */}
                {isWidgetOpen && (
                    <div className="pointer-events-auto w-full max-w-[400px] h-[600px] max-h-[85vh] glass-dark rounded-3xl border border-white/10 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-bottom-10 duration-300">
                        <header className="px-6 py-5 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 border-b border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-xl shadow-lg">🤖</div>
                                <div>
                                    <h3 className="text-white font-bold text-sm">مساعد خدمة العملاء</h3>
                                    <p className="text-[9px] text-emerald-400 flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                                        متصل حالياً
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {settings?.use_whatsapp && settings?.whatsapp_number && (
                                    <a
                                        href={`https://wa.me/${settings.whatsapp_number.replace(/\D/g, '')}?text=${encodeURIComponent(settings.whatsapp_message || '')}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-8 h-8 rounded-full bg-green-500/20 hover:bg-green-500/30 flex items-center justify-center text-green-400 transition-all transform hover:scale-110"
                                        title="تواصل معنا عبر واتساب"
                                    >
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                        </svg>
                                    </a>
                                )}
                                <button
                                    onClick={() => setIsWidgetOpen(false)}
                                    className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-slate-400 transition-colors"
                                >
                                    <span className="text-xl">×</span>
                                </button>
                            </div>
                        </header>

                        <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar flex flex-col gap-4">
                            {!isStarted ? (
                                <div className="py-8 animate-in fade-in duration-500">
                                    <div className="text-center mb-8">
                                        <p className="text-slate-400 text-sm">أهلاً بك! يرجى إدخال بياناتك للمتابعة</p>
                                    </div>
                                    <form onSubmit={handleJoin} className="space-y-4 text-right" dir="rtl">
                                        <div>
                                            <label className="block text-[10px] font-semibold text-slate-500 mb-2 uppercase tracking-wider pr-1">الاسم بالكامل</label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.name}
                                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                placeholder="أدخل اسمك"
                                                className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-slate-600 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-semibold text-slate-500 mb-2 uppercase tracking-wider pr-1">البريد الإلكتروني</label>
                                            <input
                                                type="email"
                                                required
                                                value={formData.email}
                                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                                placeholder="example@domain.com"
                                                className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-slate-600 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-2xl shadow-xl shadow-blue-500/20 transition-all disabled:opacity-50"
                                        >
                                            {loading ? 'جاري التحميل...' : 'ابدأ الدردشة ✨'}
                                        </button>
                                    </form>
                                </div>
                            ) : (
                                <>
                                    {messages.map(m => (
                                        <ChatMessage key={m.id} message={m} />
                                    ))}
                                    <div ref={messagesEndRef} />
                                </>
                            )}
                        </div>

                        {isStarted && (
                            <div className="p-4 border-t border-white/5 bg-slate-900/50">
                                <ChatInput
                                    value={input}
                                    onChange={setInput}
                                    onSubmit={handleSend}
                                    isLoading={loading}
                                    placeholder="اكتب سؤالك هنا..."
                                />
                                <p className="text-center text-[8px] text-slate-600 mt-3">Powered by KB Chatbot AI</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

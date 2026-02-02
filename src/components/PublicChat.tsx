import React, { useState, useEffect, useRef } from 'react'
import { Message, FileContext } from '../types'
import { GeminiService } from '../services/geminiService'
import { OpenAIService } from '../services/openaiService'
import { ChatMessage, ChatInput } from './index'
import { supabase } from '../services/supabaseService'
import { StorageService } from '../services/storageService'
import { SettingsService } from '../services/settingsService'

const gemini = new GeminiService()
const openai = new OpenAIService()

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

            try {
                response = await openai.generateResponse(input, messages, files, 'free', openAiKey)
            } catch (e: any) {
                if (geminiKey) {
                    response = await gemini.generateResponse(input, messages, files, 'free', geminiKey)
                } else {
                    throw e
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
                            <button
                                onClick={() => setIsWidgetOpen(false)}
                                className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-slate-400 transition-colors"
                            >
                                <span className="text-xl">×</span>
                            </button>
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

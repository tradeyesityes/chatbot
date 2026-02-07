import React, { useEffect, useState } from 'react'
import { supabase } from '../services/supabaseService'

interface WhatsAppQRModalProps {
    isOpen: boolean
    onClose: () => void
    evolutionBaseUrl: string
    instanceName: string
    onSuccess: () => void
}

export function WhatsAppQRModal({ isOpen, onClose, evolutionBaseUrl, instanceName, onSuccess }: WhatsAppQRModalProps) {
    const [qrCode, setQrCode] = useState<string | null>(null)
    const [status, setStatus] = useState<'loading' | 'waiting' | 'connected' | 'error'>('loading')
    const [errorMessage, setErrorMessage] = useState<string>('')

    useEffect(() => {
        if (!isOpen) return

        const createInstance = async () => {
            try {
                setStatus('loading')
                setErrorMessage('')

                const { data: { session } } = await supabase.auth.getSession()
                if (!session) {
                    setErrorMessage('Not authenticated')
                    setStatus('error')
                    return
                }

                // Call Edge Function to create instance and get QR code
                const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-whatsapp-instance`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`
                    },
                    body: JSON.stringify({
                        evolutionBaseUrl,
                        instanceName
                    })
                })

                if (!response.ok) {
                    const error = await response.json()
                    throw new Error(error.error || 'Failed to create instance')
                }

                const data = await response.json()
                setQrCode(data.qrCode)
                setStatus('waiting')

                // Start polling for connection status
                startPolling()

            } catch (error: any) {
                console.error('Error creating instance:', error)
                setErrorMessage(error.message)
                setStatus('error')
            }
        }

        createInstance()
    }, [isOpen, evolutionBaseUrl, instanceName])

    const startPolling = () => {
        const pollInterval = setInterval(async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession()
                if (!session) return

                const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-whatsapp-status`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`
                    },
                    body: JSON.stringify({
                        evolutionBaseUrl,
                        instanceName
                    })
                })

                if (response.ok) {
                    const data = await response.json()
                    if (data.connected) {
                        setStatus('connected')
                        clearInterval(pollInterval)
                        setTimeout(() => {
                            onSuccess()
                            onClose()
                        }, 2000)
                    }
                }
            } catch (error) {
                console.error('Polling error:', error)
            }
        }, 3000) // Poll every 3 seconds

        // Cleanup on unmount
        return () => clearInterval(pollInterval)
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-slate-800">ربط WhatsApp</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <span className="text-2xl text-slate-600">×</span>
                    </button>
                </div>

                {status === 'loading' && (
                    <div className="flex flex-col items-center justify-center py-12">
                        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-slate-600">جاري إنشاء الاتصال...</p>
                    </div>
                )}

                {status === 'waiting' && qrCode && (
                    <div className="flex flex-col items-center">
                        <div className="bg-slate-50 p-4 rounded-xl mb-4">
                            <img src={qrCode} alt="QR Code" className="w-64 h-64" />
                        </div>
                        <div className="text-center space-y-2 mb-4">
                            <p className="text-lg font-medium text-slate-800">امسح الكود لربط حسابك</p>
                            <ol className="text-sm text-slate-600 text-right space-y-1">
                                <li>1. افتح WhatsApp على هاتفك</li>
                                <li>2. اضغط على القائمة ← الأجهزة المرتبطة</li>
                                <li>3. امسح هذا الكود</li>
                            </ol>
                        </div>
                        <div className="flex items-center gap-2 text-blue-600">
                            <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                            <span className="text-sm">في انتظار المسح...</span>
                        </div>
                    </div>
                )}

                {status === 'connected' && (
                    <div className="flex flex-col items-center justify-center py-12">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                            <span className="text-4xl">✓</span>
                        </div>
                        <p className="text-xl font-bold text-green-600">تم الربط بنجاح!</p>
                        <p className="text-sm text-slate-600 mt-2">سيتم إغلاق النافذة تلقائياً...</p>
                    </div>
                )}

                {status === 'error' && (
                    <div className="flex flex-col items-center justify-center py-12">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                            <span className="text-4xl">✗</span>
                        </div>
                        <p className="text-xl font-bold text-red-600">فشل الاتصال</p>
                        <p className="text-sm text-slate-600 mt-2">{errorMessage}</p>
                        <button
                            onClick={onClose}
                            className="mt-4 px-6 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg transition-colors"
                        >
                            إغلاق
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

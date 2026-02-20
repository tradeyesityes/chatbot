import React, { useState } from 'react'
import { AuthService } from '../services/authService'

interface LoginProps {
    onLogin: () => void
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isSignUp, setIsSignUp] = useState(false)
    const [isForgotPassword, setIsForgotPassword] = useState(false)
    const [showOtpInput, setShowOtpInput] = useState(false)
    const [otp, setOtp] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [successMessage, setSuccessMessage] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        setSuccessMessage('')

        try {
            if (isForgotPassword) {
                await AuthService.resetPassword(email)
                setSuccessMessage('تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني')
                setIsForgotPassword(false)
            } else if (showOtpInput) {
                await AuthService.verifyOtp(email, otp)
                onLogin()
            } else if (isSignUp) {
                await AuthService.signUp(email, password)
                setShowOtpInput(true)
                alert('الرجاء التحقق من بريدك الإلكتروني وإدخال الكود المرسل')
            } else {
                await AuthService.login(email, password)
                onLogin()
            }
        } catch (e: any) {
            setError(e.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
            <div className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-2xl w-full max-w-md border border-white/50">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-blue-600 rounded-2xl mx-auto flex items-center justify-center text-3xl mb-4 shadow-lg shadow-blue-500/30">
                        🤖
                    </div>
                    <h2 className="text-3xl font-black text-slate-800">
                        {showOtpInput ? 'تفعيل الحساب' : (isForgotPassword ? 'استعادة كلمة المرور' : (isSignUp ? 'إنشاء حساب' : 'تسجيل الدخول'))}
                    </h2>
                    <p className="text-slate-500 mt-2 font-medium">
                        {showOtpInput ? 'أدخل الكود المرسل لبريدك الإلكتروني' : (isForgotPassword ? 'أدخل بريدك الإلكتروني لاستلام رابط الاستعادة' : (isSignUp ? 'أنشئ حسابك للبدء' : 'مرحباً بعودتك!'))}
                    </p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-bold animate-in fade-in slide-in-from-top-2">
                        ⚠️ {error}
                    </div>
                )}

                {successMessage && (
                    <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-xl text-sm font-bold animate-in fade-in slide-in-from-top-2">
                        ✅ {successMessage}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    {!showOtpInput ? (
                        <>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">
                                    <div className="min-h-screen bg-salla-bg-soft flex items-center justify-center p-4">
                                        <div className="w-full max-w-md animate-in">
                                            <div className="text-center mb-10">
                                                <div className="w-20 h-20 bg-salla-primary rounded-3xl flex items-center justify-center text-4xl mx-auto mb-6 shadow-xl shadow-salla-primary/10">
                                                    🤖
                                                </div>
                                                <h1 className="text-4xl font-bold text-salla-primary mb-2">KB Chatbot</h1>
                                                <p className="text-salla-muted font-bold text-lg">منصة الإجابة الذكية - بوابة الدخول</p>
                                            </div>

                                            <div className="bg-white rounded-salla border border-slate-100 p-8 shadow-2xl relative overflow-hidden">
                                                {/* Accent Blobs */}
                                                <div className="absolute -top-10 -right-10 w-32 h-32 bg-salla-accent-light rounded-full opacity-50 blur-3xl"></div>
                                                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-salla-accent-light rounded-full opacity-50 blur-3xl"></div>

                                                <div className="relative z-10">
                                                    <div className="flex bg-salla-bg-soft p-1 rounded-2xl mb-8 border border-slate-100">
                                                        <button
                                                            onClick={() => setMode('login')}
                                                            className={`flex-1 py-3 rounded-xl font-bold transition-all ${mode === 'login' ? 'bg-salla-primary text-white shadow-md' : 'text-salla-muted hover:text-salla-primary'
                                                                }`}
                                                        >
                                                            تسجيل دخول
                                                        </button>
                                                        <button
                                                            onClick={() => setMode('signup')}
                                                            className={`flex-1 py-3 rounded-xl font-bold transition-all ${mode === 'signup' ? 'bg-salla-primary text-white shadow-md' : 'text-salla-muted hover:text-salla-primary'
                                                                }`}
                                                        >
                                                            إنشاء حساب
                                                        </button>
                                                    </div>

                                                    <form onSubmit={handleSubmit} className="space-y-6">
                                                        {mode === 'signup' && (
                                                            <div className="space-y-1">
                                                                <label className="text-xs font-bold text-salla-muted px-1">اسم المستخدم</label>
                                                                <input
                                                                    type="text"
                                                                    required
                                                                    placeholder="ادخل اسمك"
                                                                    className="w-full px-4 py-4 bg-salla-bg-soft border border-slate-100 rounded-salla focus:ring-2 focus:ring-salla-accent focus:border-salla-primary transition-all outline-none font-medium text-salla-primary"
                                                                    value={username}
                                                                    onChange={(e) => setUsername(e.target.value)}
                                                                />
                                                            </div>
                                                        )}

                                                        <div className="space-y-1">
                                                            <label className="text-xs font-bold text-salla-muted px-1">البريد الإلكتروني</label>
                                                            <input
                                                                type="email"
                                                                required
                                                                placeholder="name@example.com"
                                                                className="w-full px-4 py-4 bg-salla-bg-soft border border-slate-100 rounded-salla focus:ring-2 focus:ring-salla-accent focus:border-salla-primary transition-all outline-none font-medium text-salla-primary"
                                                                value={email}
                                                                onChange={(e) => setEmail(e.target.value)}
                                                            />
                                                        </div>

                                                        {(mode === 'login' || mode === 'signup') && (
                                                            <div className="space-y-1">
                                                                <div className="flex justify-between px-1">
                                                                    <label className="text-xs font-bold text-salla-muted">كلمة المرور</label>
                                                                    {mode === 'login' && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setMode('reset')}
                                                                            className="text-xs font-bold text-salla-primary hover:underline"
                                                                        >
                                                                            نسيت كلمة المرور؟
                                                                        </button>
                                                                    )}
                                                                    onClick={() => setIsSignUp(!isSignUp)}
                                                                    className="text-slate-500 hover:text-blue-600 font-bold text-sm transition-colors block w-full"
                            >
                                                                    {isSignUp ? 'لدي حساب بالفعل؟ تسجيل الدخول' : 'ليس لديك حساب؟ إنشاء حساب جديد'}
                                                                </button>
                        )}
                                                            </div>
                                                        ) : (
                                                        <div className="mt-8 text-center">
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowOtpInput(false)}
                                                                className="text-slate-500 hover:text-blue-600 font-bold text-sm transition-colors"
                                                            >
                                                                الرجوع للخلف
                                                            </button>
                                                        </div>
                )}
                                                </div>
                                            </div>
                                            )
}

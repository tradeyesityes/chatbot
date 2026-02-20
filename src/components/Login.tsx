import React, { useState } from 'react'
import { AuthService } from '../services/authService'
import { BotAvatar } from './BotAvatar'

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
        <div className="min-h-screen bg-salla-bg-soft flex items-center justify-center p-4">
            <div className="w-full max-w-md animate-in">
                <div className="text-center mb-10">
                    <div className="mx-auto mb-6">
                        <BotAvatar size="xl" className="mx-auto" />
                    </div>
                    <h1 className="text-4xl font-bold text-salla-primary mb-2">KB Chatbot</h1>
                    <p className="text-salla-muted font-bold text-lg">منصة الإجابة الذكية</p>
                </div>

                <div className="bg-white rounded-salla border border-slate-100 p-8 shadow-2xl relative overflow-hidden">
                    {/* Accent Blobs */}
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-salla-accent-light rounded-full opacity-50 blur-3xl"></div>
                    <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-salla-accent-light rounded-full opacity-50 blur-3xl"></div>

                    <div className="relative z-10">
                        {!showOtpInput && !isForgotPassword && (
                            <div className="flex bg-salla-bg-soft p-1 rounded-2xl mb-8 border border-slate-100">
                                <button
                                    onClick={() => setIsSignUp(false)}
                                    className={`flex-1 py-3 rounded-xl font-bold transition-all ${!isSignUp ? 'bg-salla-primary text-white shadow-md' : 'text-salla-muted hover:text-salla-primary'}`}
                                >
                                    تسجيل دخول
                                </button>
                                <button
                                    onClick={() => setIsSignUp(true)}
                                    className={`flex-1 py-3 rounded-xl font-bold transition-all ${isSignUp ? 'bg-salla-primary text-white shadow-md' : 'text-salla-muted hover:text-salla-primary'}`}
                                >
                                    إنشاء حساب
                                </button>
                            </div>
                        )}

                        <div className="mb-6">
                            <h2 className="text-2xl font-bold text-salla-primary text-center">
                                {showOtpInput ? 'تفعيل الحساب' : (isForgotPassword ? 'استعادة كلمة المرور' : (isSignUp ? 'أنشئ حسابك' : 'مرحباً بك'))}
                            </h2>
                        </div>

                        {error && (
                            <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs font-bold animate-in">
                                ⚠️ {error}
                            </div>
                        )}

                        {successMessage && (
                            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl text-xs font-bold animate-in">
                                ✅ {successMessage}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            {!showOtpInput ? (
                                <>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-salla-muted px-1">البريد الإلكتروني</label>
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            className="w-full px-4 py-4 bg-salla-bg-soft border border-slate-100 rounded-salla focus:ring-2 focus:ring-salla-accent focus:border-salla-primary transition-all outline-none font-medium text-salla-primary"
                                            placeholder="name@example.com"
                                        />
                                    </div>

                                    {!isForgotPassword && (
                                        <div className="space-y-1">
                                            <div className="flex justify-between px-1">
                                                <label className="text-xs font-bold text-salla-muted">كلمة المرور</label>
                                                {!isSignUp && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsForgotPassword(true)}
                                                        className="text-xs font-bold text-salla-primary hover:underline"
                                                    >
                                                        نسيت كلمة المرور؟
                                                    </button>
                                                )}
                                            </div>
                                            <input
                                                type="password"
                                                required
                                                value={password}
                                                onChange={e => setPassword(e.target.value)}
                                                className="w-full px-4 py-4 bg-salla-bg-soft border border-slate-100 rounded-salla focus:ring-2 focus:ring-salla-accent focus:border-salla-primary transition-all outline-none font-medium text-salla-primary"
                                                placeholder="••••••••"
                                            />
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-salla-muted px-1">كود التحقق</label>
                                    <input
                                        type="text"
                                        required
                                        value={otp}
                                        onChange={e => setOtp(e.target.value)}
                                        className="w-full px-4 py-4 bg-salla-bg-soft border border-slate-100 rounded-salla focus:ring-2 focus:ring-salla-accent focus:border-salla-primary transition-all outline-none font-bold text-2xl text-center tracking-widest text-salla-primary"
                                        placeholder="123456"
                                    />
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 bg-salla-primary text-white rounded-salla font-bold text-lg shadow-xl shadow-salla-primary/20 hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                            >
                                {loading ? (
                                    <>
                                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                        جاري المعالجة...
                                    </>
                                ) : (
                                    showOtpInput ? 'تفعيل الحساب' : (isForgotPassword ? 'إرسال رابط الاستعادة' : (isSignUp ? 'إنشاء حساب جديد' : 'دخول للمنصة'))
                                )}
                            </button>
                        </form>

                        <div className="mt-8 text-center">
                            {isForgotPassword ? (
                                <button
                                    onClick={() => setIsForgotPassword(false)}
                                    className="text-salla-primary hover:underline font-bold text-sm"
                                >
                                    العودة لتسجيل الدخول
                                </button>
                            ) : showOtpInput ? (
                                <button
                                    onClick={() => setShowOtpInput(false)}
                                    className="text-salla-primary hover:underline font-bold text-sm"
                                >
                                    الرجوع للخلف
                                </button>
                            ) : null}
                        </div>
                    </div>
                </div>

                <p className="text-center mt-8 text-salla-muted text-sm font-bold opacity-60">
                    جميع الحقوق محفوظة © {new Date().getFullYear()} KB Chatbot
                </p>
            </div>
        </div>
    )
}

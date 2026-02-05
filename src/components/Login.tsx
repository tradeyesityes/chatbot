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
                                    البريد الإلكتروني
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    className="w-full px-5 py-3 rounded-xl bg-slate-50 border-2 border-slate-100 outline-none focus:border-blue-500 focus:bg-white transition-all text-left dir-ltr"
                                    placeholder="name@example.com"
                                />
                            </div>

                            {!isForgotPassword && (
                                <div>
                                    <div className="flex justify-between mb-2">
                                        <label className="block text-sm font-bold text-slate-700">
                                            كلمة المرور
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => setIsForgotPassword(true)}
                                            className="text-xs font-bold text-blue-600 hover:text-blue-700"
                                        >
                                            نسيت كلمة المرور؟
                                        </button>
                                    </div>
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        className="w-full px-5 py-3 rounded-xl bg-slate-50 border-2 border-slate-100 outline-none focus:border-blue-500 focus:bg-white transition-all text-left dir-ltr"
                                        placeholder="••••••••"
                                    />
                                </div>
                            )}
                        </>
                    ) : (
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">
                                كود التحقق
                            </label>
                            <input
                                type="text"
                                required
                                value={otp}
                                onChange={e => setOtp(e.target.value)}
                                className="w-full px-5 py-3 rounded-xl bg-slate-50 border-2 border-slate-100 outline-none focus:border-blue-500 focus:bg-white transition-all text-center text-2xl tracking-widest"
                                placeholder="123456"
                            />
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold shadow-xl hover:bg-blue-700 hover:shadow-2xl hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'جاري المعالجة...' : (showOtpInput ? 'تفعيل الحساب' : (isForgotPassword ? 'إرسال رابط الاستعادة' : (isSignUp ? 'إنشاء حساب' : 'دخول')))}
                    </button>
                </form>

                {!showOtpInput ? (
                    <div className="mt-8 text-center space-y-3">
                        {isForgotPassword ? (
                            <button
                                onClick={() => setIsForgotPassword(false)}
                                className="text-slate-500 hover:text-blue-600 font-bold text-sm transition-colors"
                            >
                                العودة لتسجيل الدخول
                            </button>
                        ) : (
                            <button
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

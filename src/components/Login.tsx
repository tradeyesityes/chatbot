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

    const handleDemoLogin = async () => {
        setLoading(true)
        try {
            // Demo mode just triggers onLogin with a guest state or predefined demo user
            // For now, we'll use a specific demo account or just bypass
            onLogin()
        } catch (e: any) {
            setError('فشل الدخول لنسخة الديمو')
        } finally {
            setLoading(false)
        }
    }

    const handleSocialLogin = async (provider: 'google' | 'microsoft') => {
        setLoading(true)
        setError('')
        try {
            if (provider === 'google') {
                await AuthService.signInWithGoogle()
            } else {
                await AuthService.signInWithMicrosoft()
            }
        } catch (e: any) {
            setError('فشل تسجيل الدخول الاجتماعي. تأكد من إعدادات الهوية.')
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
                    <p className="text-salla-muted font-bold text-lg">منصة الإجابة الذكية Salla SaaS</p>
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
                                    تسجيل الدخول
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
                                {showOtpInput ? 'تفعيل الحساب' : (isForgotPassword ? 'استعادة كلمة المرور' : (isSignUp ? 'أنشئ حسابك التجاري' : 'مرحباً بك'))}
                            </h2>
                        </div>

                        {error && (
                            <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs font-bold animate-in">
                                ⚠️ {error.includes('invalid_credentials') ? 'بيانات الدخول غير صحيحة' : 'حدث خطأ أثناء الاتصال بالخادم، يرجى المحاولة لاحقاً'}
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
                                        <label className="text-xs font-bold text-salla-muted px-1">البريد الإلكتروني للعمل</label>
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            className="w-full px-4 py-4 bg-salla-bg-soft border border-slate-100 rounded-salla focus:ring-2 focus:ring-salla-accent focus:border-salla-primary transition-all outline-none font-medium text-salla-primary"
                                            placeholder="name@company.com"
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
                                    <label className="text-xs font-bold text-salla-muted px-1">كود التحقق المرسل</label>
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
                                    showOtpInput ? 'تفعيل الحساب' : (isForgotPassword ? 'إرسال رابط الاستعادة' : (isSignUp ? 'إنشاء حساب جديد' : 'تسجيل الدخول'))
                                )}
                            </button>
                        </form>

                        {!showOtpInput && !isForgotPassword && (
                            <>
                                <div className="relative my-8 text-center">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-slate-100"></div>
                                    </div>
                                    <span className="relative px-4 bg-white text-xs font-bold text-salla-muted uppercase">أو من خلال</span>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <button
                                        onClick={() => handleSocialLogin('google')}
                                        className="flex items-center justify-center gap-2 py-3 border border-slate-100 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all active:scale-95"
                                    >
                                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                        </svg>
                                        Google
                                    </button>
                                    <button
                                        onClick={() => handleSocialLogin('microsoft')}
                                        className="flex items-center justify-center gap-2 py-3 border border-slate-100 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all active:scale-95"
                                    >
                                        <svg className="w-5 h-5" viewBox="0 0 23 23">
                                            <path fill="#f3f3f3" d="M0 0h23v23H0z" /><path fill="#f35325" d="M1 1h10v10H1z" /><path fill="#81bc06" d="M12 1h10v10H12z" /><path fill="#05a6f0" d="M1 12h10v10H1z" /><path fill="#ffba08" d="M12 12h10v10H12z" />
                                        </svg>
                                        Microsoft
                                    </button>
                                </div>

                                <button
                                    onClick={handleDemoLogin}
                                    className="w-full py-3 bg-slate-50 text-salla-primary border border-slate-100 rounded-xl font-bold text-sm hover:bg-slate-100 transition-all flex items-center justify-center gap-2 underline underline-offset-4"
                                >
                                    ✨ تجربة نسخة ديمو (بدون حساب)
                                </button>
                            </>
                        )}

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
                            ) : (
                                <div className="pt-4 border-t border-slate-50 flex justify-center gap-4 text-[10px] font-bold text-salla-muted">
                                    <a href="#" className="hover:text-salla-primary hover:underline transition-colors tracking-tight">سياسة الخصوصية</a>
                                    <span className="opacity-20">•</span>
                                    <a href="#" className="hover:text-salla-primary hover:underline transition-colors tracking-tight">شروط الاستخدام</a>
                                    <span className="opacity-20">•</span>
                                    <a href="#" className="hover:text-salla-primary hover:underline transition-colors tracking-tight">الدعم الفني</a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <p className="text-center mt-8 text-salla-muted text-sm font-bold opacity-60">
                    جميع الحقوق محفوظة © {new Date().getFullYear()} KB Chatbot SaaS Platform
                </p>
            </div>
        </div>
    )
}

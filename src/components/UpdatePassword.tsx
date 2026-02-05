import React, { useState } from 'react'
import { AuthService } from '../services/authService'

interface UpdatePasswordProps {
    onComplete: () => void
}

export const UpdatePassword: React.FC<UpdatePasswordProps> = ({ onComplete }) => {
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (password !== confirmPassword) {
            setError('كلمات المرور غير متطابقة')
            return
        }

        setLoading(true)
        setError('')
        try {
            await AuthService.updatePassword(password)
            setSuccess(true)
            setTimeout(() => onComplete(), 2000)
        } catch (e: any) {
            setError(e.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 p-4">
            <div className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-2xl w-full max-w-md border border-white/50 animate-in zoom-in-95 duration-300">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-blue-600 rounded-2xl mx-auto flex items-center justify-center text-3xl mb-4 shadow-lg shadow-blue-500/30">
                        🔐
                    </div>
                    <h2 className="text-3xl font-black text-slate-800">
                        تحديث كلمة المرور
                    </h2>
                    <p className="text-slate-500 mt-2 font-medium">
                        أدخل كلمة المرور الجديدة لحماية حسابك
                    </p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-bold animate-in fade-in slide-in-from-top-2">
                        ⚠️ {error}
                    </div>
                )}

                {success && (
                    <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-xl text-sm font-bold animate-in fade-in slide-in-from-top-2">
                        ✅ تم تحديث كلمة المرور بنجاح! جاري تحويلك...
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                            كلمة المرور الجديدة
                        </label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full px-5 py-3 rounded-xl bg-slate-50 border-2 border-slate-100 outline-none focus:border-blue-500 focus:bg-white transition-all text-left dir-ltr"
                            placeholder="••••••••"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                            تأكيد كلمة المرور
                        </label>
                        <input
                            type="password"
                            required
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            className="w-full px-5 py-3 rounded-xl bg-slate-50 border-2 border-slate-100 outline-none focus:border-blue-500 focus:bg-white transition-all text-left dir-ltr"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading || success}
                        className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold shadow-xl hover:bg-blue-700 hover:shadow-2xl hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'جاري الحفظ...' : 'حفظ كلمة المرور الجديدة'}
                    </button>
                </form>
            </div>
        </div>
    )
}

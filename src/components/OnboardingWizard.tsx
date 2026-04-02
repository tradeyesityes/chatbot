import React, { useState } from 'react'
import { SettingsService, UserSettings } from '../services/settingsService'
import { BotAvatar } from './BotAvatar'

interface OnboardingWizardProps {
  userId: string;
  onComplete: (settings: UserSettings) => void;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ userId, onComplete }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<UserSettings>({
    openai_api_key: '',
    gemini_api_key: '',
    use_openai: false,
    use_gemini: false,
    evolution_base_url: '',
    evolution_api_key: '',
    evolution_bot_enabled: false,
    support_email: '',
    has_completed_onboarding: false
  });

  const handleUpdate = (updates: Partial<UserSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }

  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => prev - 1);

  const finishOnboarding = async (skipAll = false) => {
    setLoading(true);
    try {
      const finalSettings = { 
        ...settings, 
        has_completed_onboarding: true 
      };
      
      // If skip all, we don't save the interim settings (unless they were already typed)
      await SettingsService.updateSettings(userId, skipAll ? { has_completed_onboarding: true } as any : finalSettings);
      onComplete(finalSettings);
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
    } finally {
      setLoading(false);
    }
  }

  const renderStep = () => {
    switch (step) {
      case 1: // Welcome
        return (
          <div className="text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-center">
              <div className="p-4 bg-salla-accent-light rounded-full shadow-inner">
                <BotAvatar size="xl" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-extrabold text-salla-primary">أهلاً بك في KB Chatbot!</h2>
              <p className="text-salla-muted text-lg font-medium">سأساعدك في تهيئة نظامك الذكي في دقائق معدودة.</p>
            </div>
            <div className="pt-8">
              <button 
                onClick={nextStep}
                className="w-full py-4 px-6 bg-gradient-to-r from-salla-primary to-salla-primary-dark text-white rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all active:translate-y-0"
              >
                فلنبدأ الرحلة 🚀
              </button>
              <button 
                onClick={() => finishOnboarding(true)}
                className="mt-4 text-salla-muted hover:text-salla-primary font-bold text-sm transition-colors"
              >
                تخطي الكل والبدء فوراً
              </button>
            </div>
          </div>
        );

      case 2: // AI Setup
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex items-center gap-4 border-b border-salla-accent/10 pb-4">
              <div className="p-3 bg-blue-50 rounded-2xl text-2xl">🤖</div>
              <div>
                <h3 className="text-xl font-bold text-salla-primary">إعدادات الذكاء الاصطناعي</h3>
                <p className="text-xs text-salla-muted">اختر المزود المفضل لديك وادخل مفتاح الـ API</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className={`p-4 rounded-2xl border-2 transition-all ${settings.use_openai ? 'border-salla-primary bg-salla-accent-light/30' : 'border-slate-100 bg-white'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">OpenAI (GPT-4o)</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={settings.use_openai} 
                    onChange={e => handleUpdate({ use_openai: e.target.checked })}
                    className="w-5 h-5 rounded accent-salla-primary"
                  />
                </div>
                {settings.use_openai && (
                  <input 
                    type="password"
                    placeholder="sk-..."
                    value={settings.openai_api_key || ''}
                    onChange={e => handleUpdate({ openai_api_key: e.target.value })}
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-salla-primary/20 outline-none"
                  />
                )}
              </div>

              <div className={`p-4 rounded-2xl border-2 transition-all ${settings.use_gemini ? 'border-salla-primary bg-salla-accent-light/30' : 'border-slate-100 bg-white'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">Google Gemini</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={settings.use_gemini} 
                    onChange={e => handleUpdate({ use_gemini: e.target.checked })}
                    className="w-5 h-5 rounded accent-salla-primary"
                  />
                </div>
                {settings.use_gemini && (
                  <input 
                    type="password"
                    placeholder="AIza..."
                    value={settings.gemini_api_key || ''}
                    onChange={e => handleUpdate({ gemini_api_key: e.target.value })}
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-salla-primary/20 outline-none"
                  />
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button onClick={prevStep} className="flex-1 py-3 px-4 border border-slate-200 text-salla-muted rounded-xl font-bold hover:bg-slate-50 transition-all">السابق</button>
              <button 
                onClick={nextStep} 
                className="flex-[2] py-3 px-4 bg-salla-primary text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all"
              >
                التالي
              </button>
            </div>
            <button onClick={nextStep} className="w-full text-center text-xs text-salla-muted hover:underline">تخطي هذه الخطوة</button>
          </div>
        );

      case 3: // WhatsApp Setup
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
             <div className="flex items-center gap-4 border-b border-salla-accent/10 pb-4">
              <div className="p-3 bg-green-50 rounded-2xl text-2xl">💬</div>
              <div>
                <h3 className="text-xl font-bold text-salla-primary">إعدادات الواتساب</h3>
                <p className="text-xs text-salla-muted">اربط حسابك للرد التلقائي على العملاء</p>
              </div>
            </div>

            <div className="p-5 bg-gradient-to-br from-green-50 to-emerald-50/30 rounded-2xl border border-green-100 space-y-4">
                <div className="flex items-center justify-between">
                   <label className="font-bold text-salla-primary flex items-center gap-2">
                     <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                     تفعيل بوت واتساب (Evolution)
                   </label>
                   <input 
                    type="checkbox" 
                    checked={settings.evolution_bot_enabled} 
                    onChange={e => handleUpdate({ evolution_bot_enabled: e.target.checked })}
                    className="w-5 h-5 rounded accent-green-600"
                  />
                </div>

                {settings.evolution_bot_enabled && (
                  <div className="space-y-3 pt-2">
                    <div>
                      <p className="text-[10px] text-salla-muted mb-1 font-bold">Base URL</p>
                      <input 
                        type="text"
                        placeholder="https://you-evolution-api.com"
                        value={settings.evolution_base_url || ''}
                        onChange={e => handleUpdate({ evolution_base_url: e.target.value })}
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500/20"
                      />
                    </div>
                    <div>
                      <p className="text-[10px] text-salla-muted mb-1 font-bold">API Key / Global Key</p>
                      <input 
                        type="password"
                        placeholder="App-Key..."
                        value={settings.evolution_api_key || ''}
                        onChange={e => handleUpdate({ evolution_api_key: e.target.value })}
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500/20"
                      />
                    </div>
                  </div>
                )}
            </div>

            <div className="flex gap-3 pt-4">
              <button onClick={prevStep} className="flex-1 py-3 px-4 border border-slate-200 text-salla-muted rounded-xl font-bold hover:bg-slate-50 transition-all">السابق</button>
              <button 
                onClick={nextStep} 
                className="flex-[2] py-3 px-4 bg-salla-primary text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all"
              >
                التالي
              </button>
            </div>
            <button onClick={nextStep} className="w-full text-center text-xs text-salla-muted hover:underline">تخطي هذه الخطوة</button>
          </div>
        );

      case 4: // Support & Completion
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
             <div className="flex items-center gap-4 border-b border-salla-accent/10 pb-4">
              <div className="p-3 bg-purple-50 rounded-2xl text-2xl">✉️</div>
              <div>
                <h3 className="text-xl font-bold text-salla-primary">إعدادات الدعم الفني</h3>
                <p className="text-xs text-salla-muted">أين نرسل تنبيهات "طلب تواصل مع موظف"؟</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-xs font-bold text-salla-muted mb-2">إيميل استقبال التذاكر (Support Email)</p>
                <input 
                  type="email"
                  placeholder="support@yourcompany.com"
                  value={settings.support_email || ''}
                  onChange={e => handleUpdate({ support_email: e.target.value })}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              <div className="p-4 bg-sky-50/50 rounded-2xl border border-sky-100 space-y-3">
                <p className="text-xs font-bold text-sky-600 mb-1">إعدادات تيليجرام (اختياري)</p>
                <input 
                  type="text"
                  placeholder="اسم البوت (مثال: مساعدي الذكي)"
                  value={settings.tg_bot_name || ''}
                  onChange={e => handleUpdate({ tg_bot_name: e.target.value })}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-sky-500/20"
                />
                <input 
                  type="password"
                  placeholder="Bot Token (123456...)"
                  value={settings.tg_token || ''}
                  onChange={e => handleUpdate({ tg_token: e.target.value })}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-sky-500/20"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button onClick={prevStep} className="flex-1 py-3 px-4 border border-slate-200 text-salla-muted rounded-xl font-bold hover:bg-slate-50 transition-all">السابق</button>
              <button 
                onClick={() => finishOnboarding()} 
                disabled={loading}
                className="flex-[2] py-3 px-4 bg-salla-primary text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
              >
                {loading ? 'جاري الحفظ...' : 'إكمال وإنهاء التهيئة ✨'}
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden relative border border-slate-100 animate-in zoom-in-95 duration-300">
        
        {/* Progress Bar */}
        <div className="h-1.5 w-full bg-slate-100 flex">
           {[1, 2, 3, 4].map(s => (
             <div key={s} className={`h-full transition-all duration-500 ${step >= s ? 'bg-salla-primary w-1/4' : 'w-0'}`}></div>
           ))}
        </div>

        <div className="p-8 md:p-10">
          {renderStep()}
        </div>

        {/* Decorative corner */}
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-salla-primary/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-salla-accent/10 rounded-full blur-3xl pointer-events-none"></div>
      </div>
    </div>
  )
}

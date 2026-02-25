import React from 'react';
import { BotAvatar } from './BotAvatar';

interface LandingPageProps {
    onGetStarted: () => void;
    onLogin: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, onLogin }) => {
    return (
        <div className="min-h-screen bg-white text-salla-primary overflow-x-hidden">
            {/* Navigation */}
            <nav className="fixed top-0 w-full z-50 glass border-b border-salla-accent/10">
                <div className="max-w-7xl mx-auto px-4 md:px-8 h-20 flex justify-between items-center">
                    <div
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                    >
                        <BotAvatar size="sm" />
                        <span className="text-xl font-black tracking-tight">KB Chatbot</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onLogin}
                            className="px-6 py-2.5 text-sm font-bold hover:text-salla-primary/70 transition-colors"
                        >
                            تسجيل الدخول
                        </button>
                        <button
                            onClick={onGetStarted}
                            className="btn-primary"
                        >
                            ابدأ مجاناً
                        </button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="pt-40 pb-0 gradient-bg">
                <div className="max-w-7xl mx-auto px-4 md:px-8 text-center animate-in">
                    <div className="hero-subtitle">
                        <span className="w-2 h-2 bg-salla-primary rounded-full animate-pulse"></span>
                        ذكاء اصطناعي لخدمة عملائك
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black mb-8 leading-[1.2] tracking-tight text-salla-primary">
                        حول ملفاتك إلى <br /> <span className="text-salla-primary opacity-80">عميل ذكي</span> يجيب فوراً
                    </h1>
                    <p className="max-w-2xl mx-auto text-lg md:text-xl text-salla-muted mb-12 font-medium leading-relaxed">
                        استخدم قوة الذكاء الاصطناعي لتحليل وثائق شركتك وتقديم إجابات دقيقة واحترافية لعملائك على مدار الساعة عبر الواتساب والموقع.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
                        <button
                            onClick={onGetStarted}
                            className="px-10 py-5 bg-salla-primary text-white rounded-2xl text-xl font-black shadow-2xl shadow-salla-primary/20 hover:scale-105 active:scale-95 transition-all"
                        >
                            انطلق الآن مجاناً
                        </button>
                        <button className="px-10 py-5 bg-white border-2 border-slate-100 rounded-2xl text-xl font-black hover:border-salla-primary transition-all">
                            شاهد العرض التجريبي
                        </button>
                    </div>

                </div>
            </section>

            {/* Features Grid */}
            <section className="pt-16 pb-32 bg-white">
                <div className="max-w-7xl mx-auto px-4 md:px-8">
                    <div className="text-center mb-20">
                        <h2 className="text-4xl font-black mb-4">لماذا تختار KB Chatbot؟</h2>
                        <p className="text-salla-muted font-medium">كل ما تحتاجه لأتمتة خدمة العملاء باحترافية</p>
                    </div>

                    <div className="landing-grid">
                        <div className="landing-card group">
                            <div className="text-4xl mb-6 grayscale group-hover:grayscale-0 transition-all">📂</div>
                            <h3 className="text-2xl font-black mb-4">قاعدة معرفة ذكية</h3>
                            <p className="text-salla-muted leading-relaxed font-medium text-sm">
                                ارفع ملفات الـ PDF، Excel، والوورد، وسيقوم النظام باستيعاب كل تفاصيلها بدقة متناهية.
                            </p>
                        </div>

                        <div className="landing-card group">
                            <div className="text-4xl mb-6 grayscale group-hover:grayscale-0 transition-all">💬</div>
                            <h3 className="text-2xl font-black mb-4">دردشة فورية</h3>
                            <p className="text-salla-muted leading-relaxed font-medium text-sm">
                                إجابات طبيعية وذكية تشبه الحوار البشري، مدعومة بأحدث نماذج الذكاء الاصطناعي (GPT/Gemini).
                            </p>
                        </div>

                        <div className="landing-card group">
                            <div className="text-4xl mb-6 grayscale group-hover:grayscale-0 transition-all">🟢</div>
                            <h3 className="text-2xl font-black mb-4">دعم الواتساب</h3>
                            <p className="text-salla-muted leading-relaxed font-medium text-sm">
                                اربط البوت برقم الواتساب لخدمة عملائك أينما كانوا وبسرعة استجابة مذهلة.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Pricing Teaser */}
            <section className="py-32 bg-slate-50 border-y border-slate-100">
                <div className="max-w-7xl mx-auto px-4 md:px-8 text-center">
                    <h2 className="text-4xl font-black mb-12">باقات مرنة تناسب طموحك</h2>
                    <div className="landing-grid max-w-5xl mx-auto">
                        <div className="landing-card bg-white">
                            <h3 className="text-xl font-black mb-4">المبتدئ (Starter)</h3>
                            <div className="text-4xl font-black text-salla-primary mb-6">$14<span className="text-sm opacity-50 font-medium">/شهرياً</span></div>
                            <ul className="text-right space-y-4 text-sm font-medium mb-8">
                                <li>✓ 2,000 رسالة شهرياً</li>
                                <li>✓ 100 ملف معرفة</li>
                                <li>✓ دعم جميع القنوات</li>
                            </ul>
                            <button onClick={onGetStarted} className="w-full py-3 border-2 border-salla-primary/10 rounded-xl font-bold hover:bg-salla-primary hover:text-white transition-all">ابدأ الآن</button>
                        </div>
                        <div className="landing-card bg-white border-2 border-salla-primary scale-105 shadow-xl relative overflow-hidden">
                            <div className="absolute top-4 left-4 pricing-badge">الأكثر طلباً</div>
                            <h3 className="text-xl font-black mb-4">الأعمال (Business)</h3>
                            <div className="text-4xl font-black text-salla-primary mb-6">$89<span className="text-sm opacity-50 font-medium">/شهرياً</span></div>
                            <ul className="text-right space-y-4 text-sm font-medium mb-8">
                                <li>✓ 6,000 رسالة شهرياً</li>
                                <li>✓ 500 ملف معرفة</li>
                                <li>✓ تحليلات متقدمة</li>
                            </ul>
                            <button onClick={onGetStarted} className="w-full py-3 bg-salla-primary text-white rounded-xl font-bold hover:brightness-110 shadow-lg shadow-salla-primary/20 transition-all">اختر هذه الباقة</button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-20 bg-white border-t border-slate-100">
                <div className="max-w-7xl mx-auto px-4 md:px-8 flex flex-col md:flex-row justify-between items-center gap-8">
                    <div
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                    >
                        <BotAvatar size="sm" />
                        <span className="text-xl font-black tracking-tight">KB Chatbot</span>
                    </div>
                    <p className="text-salla-muted text-sm font-bold">© {new Date().getFullYear()} جميع الحقوق محفوظة.</p>
                    <div className="flex gap-6 text-sm font-bold text-salla-primary">
                        <a href="#">سياسة الخصوصية</a>
                        <a href="#">الشروط والأحكام</a>
                    </div>
                </div>
            </footer>
        </div>
    );
};

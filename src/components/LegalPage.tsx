import React from 'react';
import { BotAvatar } from './BotAvatar';

interface LegalPageProps {
    type: 'privacy' | 'terms';
    onBack: () => void;
}

export const LegalPage: React.FC<LegalPageProps> = ({ type, onBack }) => {
    const isPrivacy = type === 'privacy';
    const title = isPrivacy ? 'سياسة الخصوصية' : 'شروط الاستخدام';

    return (
        <div className="min-h-screen bg-salla-bg-soft text-salla-primary overflow-x-hidden font-sans rtl">
            {/* Header */}
            <nav className="fixed top-0 w-full z-50 glass border-b border-salla-accent/10">
                <div className="max-w-4xl mx-auto px-4 md:px-8 h-20 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <BotAvatar size="sm" />
                        <span className="text-xl font-black tracking-tight">KB Chatbot</span>
                    </div>
                    <button
                        onClick={onBack}
                        className="px-6 py-2.5 bg-white border border-slate-100 rounded-xl text-sm font-bold hover:border-salla-primary transition-all flex items-center gap-2"
                    >
                        <span>→</span> العودة
                    </button>
                </div>
            </nav>

            {/* Content */}
            <main className="pt-32 pb-20 px-4 md:px-8 animate-in">
                <div className="max-w-3xl mx-auto bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-slate-50">
                    <h1 className="text-3xl md:text-4xl font-black mb-8 text-salla-primary border-r-4 border-salla-primary pr-6">
                        {title}
                    </h1>

                    <div className="prose prose-slate max-w-none text-salla-muted leading-relaxed space-y-6 font-medium">
                        {isPrivacy ? (
                            <>
                                <section>
                                    <h2 className="text-xl font-bold text-salla-primary mb-4">1. جمع المعلومات</h2>
                                    <p>نقوم بجمع المعلومات التي تقدمها لنا مباشرة عند إنشاء حساب، مثل الاسم والبريد الإلكتروني، بالإضافة إلى الملفات التي تقوم برفعها لمعالجتها بواسطة الذكاء الاصطناعي.</p>
                                </section>
                                <section>
                                    <h2 className="text-xl font-bold text-salla-primary mb-4">2. استخدام البيانات</h2>
                                    <p>نستخدم بياناتك لتشغيل وتحسين خدماتنا، وتدريب نماذج الذكاء الاصطناعي الخاصة بك (بشكل خاص لمثالك فقط)، والتواصل معك بشأن حسابك.</p>
                                </section>
                                <section>
                                    <h2 className="text-xl font-bold text-salla-primary mb-4">3. حماية البيانات</h2>
                                    <p>نحن نطبق إجراءات أمنية تقنية وتنظيمية متقدمة لحماية بياناتك من الوصول غير المصرح به أو الإفصاح عنه. يتم تشفير كافة الملفات والمحادثات.</p>
                                </section>
                                <section>
                                    <h2 className="text-xl font-bold text-salla-primary mb-4">4. ملفات تعريف الارتباط (Cookies)</h2>
                                    <p>نستخدم ملفات تعريف الارتباط لتحسين تجربة المستخدم وتحليل كيفية استخدام منصتنا.</p>
                                </section>
                            </>
                        ) : (
                            <>
                                <section>
                                    <h2 className="text-xl font-bold text-salla-primary mb-4">1. قبول الشروط</h2>
                                    <p>باستخدامك لمنصة KB Chatbot، فإنك توافق على الالتزام بهذه الشروط. إذا كنت لا توافق، يرجى التوقف عن استخدام الخدمة.</p>
                                </section>
                                <section>
                                    <h2 className="text-xl font-bold text-salla-primary mb-4">2. وصف الخدمة</h2>
                                    <p>KB Chatbot هي منصة SaaS تتيح للمستخدمين تحويل ملفاتهم إلى عملاء ذكاء اصطناعي تفاعليين عبر الويب والواتساب.</p>
                                </section>
                                <section>
                                    <h2 className="text-xl font-bold text-salla-primary mb-4">3. الحسابات والمسؤولية</h2>
                                    <p>أنت مسؤول عن الحفاظ على سرية معلومات حسابك وعن جميع الأنشطة التي تحدث تحت حسابك. يجب أن تكون كافة المعلومات المقدمة دقيقة وصحيحة.</p>
                                </section>
                                <section>
                                    <h2 className="text-xl font-bold text-salla-primary mb-4">4. الاستخدام المقبول</h2>
                                    <p>يمنع استخدام الخدمة في أي أنشطة غير قانونية، أو رفع ملفات تنتهك حقوق الملكية الفكرية للآخرين، أو محاولة تعطيل أمن النظام.</p>
                                </section>
                                <section>
                                    <h2 className="text-xl font-bold text-salla-primary mb-4">5. إنهاء الخدمة</h2>
                                    <p>نحتفظ بالحق في تعليق أو إنهاء حسابك في حال مخالفة هذه الشروط أو التسبب في ضرر للمنصة.</p>
                                </section>
                            </>
                        )}
                    </div>

                    <div className="mt-12 pt-8 border-t border-slate-100 text-center">
                        <p className="text-xs text-slate-400">آخر تحديث: {new Date().toLocaleDateString('ar-SA')}</p>
                    </div>
                </div>
            </main>
        </div>
    );
};

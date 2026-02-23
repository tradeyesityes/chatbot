import { Message, FileContext, UserPlan } from '../types';

export class GeminiService {
    private getModel(plan: UserPlan, customModel?: string) {
        if (customModel) return customModel;
        // Default to gemini-1.5-flash (stable)
        return 'gemini-1.5-flash';
    }

    async generateResponse(userMessage: string, history: Message[], contextFiles: FileContext[], plan: UserPlan = 'free', overrideApiKey?: string, customModel?: string, userId?: string): Promise<string> {
        const apiKey = overrideApiKey || (import.meta.env as any).VITE_GEMINI_API_KEY || (import.meta.env as any).VITE_API_KEY;
        if (!apiKey) return '⚠️ خطأ: مفتاح Gemini API غير موجود. يرجى إضافته في الإعدادات.';

        if (!contextFiles || contextFiles.length === 0) return 'عذراً، لا توجد ملفات في قاعدة المعرفة.';

        // -------------------------------------------------------------------------
        // ENTERPRISE UPGRADE: Semantic Retrieval
        // -------------------------------------------------------------------------
        let context = '';
        try {
            const segments = await (await import('./embeddingService')).EmbeddingService.searchSegments(userId || '', userMessage, apiKey, 8);
            if (segments.length > 0) {
                console.log(`Gemini RAG: Semantic search found ${segments.length} relevant segments.`);
                context = segments.join('\n\n---\n\n');
            } else {
                console.log('Gemini RAG: Semantic search returned no results, falling back to full context (if small).');
                context = contextFiles.map(f => `[${f.name}]\n${f.content}`).join('\n\n');
            }
        } catch (err) {
            console.error('Gemini RAG: Semantic search failed, falling back:', err);
            context = contextFiles.map(f => `[${f.name}]\n${f.content}`).join('\n\n');
        }

        const systemPrompt = `أنت مساعد ذكي لخدمة العملاء في شركتنا، وترد على استفسارات العملاء بدقة واحترافية.
        **قاعدة صارمة جداً:** أجب فقط بناءً على المعلومات الموجودة في "معلومات السياق" أدناه. لا تستخدم أي معرفة خارجية أو عامة أبداً.
        **قاعدة صارمة:** لا تذكر أبداً أسماء الملفات.
        **قاعدة صارمة:** لا تقم أبداً بسرد أو عرض جميع البيانات المتوفرة لديك دفعة واحدة (مثل عرض كل الجداول أو القوائم الطويلة).
        إذا طلب العميل "ما هي البيانات لديك؟" أو "اعرض لي الجدول"، اعتذر بلطف واطلب منه أن يسأل عن اسم محدد أو معلومة معينة.
        إذا كان السؤال خارج نطاق المعلومات المتوفرة، قل بوضوح: "عذراً، هذه المعلومة غير متوفرة في قاعدة بياناتنا الحالية."
        فقط أجب على السؤال المحدد بدقة واختصار.

        معلومات السياق:
        ${context}`;

        // Ensure alternating roles: user, model, user, model...
        const contents: any[] = [];

        // First message: System + Context + First message if history empty
        if (history.length === 0) {
            contents.push({
                role: 'user',
                parts: [{ text: `${systemPrompt}\n\nالسؤال: ${userMessage}` }]
            });
        } else {
            // Add system prompt as part of the first user message in history
            contents.push({
                role: 'user',
                parts: [{ text: `${systemPrompt}\n\nسأبدأ بطرح الأسئلة الآن.` }]
            });
            contents.push({
                role: 'model',
                parts: [{ text: "فهمت. سأجيب فقط بناءً على السياق المقدم." }]
            });

            // Add history
            history.slice(-6).forEach(m => {
                const role = m.role === 'user' ? 'user' : 'model';
                // Avoid consecutive roles
                if (contents.length > 0 && contents[contents.length - 1].role === role) {
                    contents[contents.length - 1].parts[0].text += `\n${m.content}`;
                } else {
                    contents.push({
                        role: role,
                        parts: [{ text: m.content }]
                    });
                }
            });

            // Final question
            if (contents[contents.length - 1].role === 'user') {
                contents[contents.length - 1].parts[0].text += `\n\nالسؤال: ${userMessage}`;
            } else {
                contents.push({
                    role: 'user',
                    parts: [{ text: `السؤال: ${userMessage}` }]
                });
            }
        }

        const model = this.getModel(plan, customModel);
        const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;

        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents })
            });

            if (!res.ok) {
                const err = await res.json().catch(() => null);
                console.error('Gemini Error:', err);
                throw new Error(err?.error?.message || `Gemini API Error: ${res.status}`);
            }

            const data = await res.json();
            return data.candidates?.[0]?.content?.parts?.[0]?.text || 'لم أتمكن من توليد إجابة من Gemini.';
        } catch (error: any) {
            console.error('Gemini Service Error:', error);
            throw new Error(`تعذر الاتصال بـ Gemini: ${error.message}`);
        }
    }
}

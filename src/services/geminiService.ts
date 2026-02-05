import { Message, FileContext, UserPlan } from '../types';

export class GeminiService {
    private getModel(plan: UserPlan) {
        // Switching to gemini-2.0-flash (stable and available)
        return 'gemini-2.0-flash';
    }

    async generateResponse(userMessage: string, history: Message[], contextFiles: FileContext[], plan: UserPlan = 'free', overrideApiKey?: string): Promise<string> {
        const apiKey = overrideApiKey || (import.meta.env as any).VITE_GEMINI_API_KEY || (import.meta.env as any).VITE_API_KEY;
        if (!apiKey) return '⚠️ خطأ: مفتاح Gemini API غير موجود. يرجى إضافته في الإعدادات.';

        if (!contextFiles || contextFiles.length === 0) return 'عذراً، لا توجد ملفات في قاعدة المعرفة.';

        // System prompt and context consolidated into one initial message
        const systemPrompt = `أنت مساعد خدمة عملاء متخصص ومقيد بالمحتوى المرفق فقط.
تعليمات صارمة:
1. أجب على السؤال **فقط** بناءً على المعلومات المتوفرة في "معلومات السياق" أدناه.
2. **لا** تستخدم أي معلومات خارجية أو معرفة سابقة.
3. إذا كانت الإجابة غير موجودة في السياق، قل بوضوح: "عذراً، هذه المعلومة غير متوفرة في الملفات المرفقة."
4. التزم باللغة التي يسأل بها المستخدم.

معلومات السياق:
${contextFiles.map(f => `[${f.name}]\n${f.content}`).join('\n\n')}`;

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

        const model = this.getModel(plan);
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

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

import { Message, FileContext, UserPlan } from '../types';
import { EmbeddingService } from './embeddingService';

export class MinimaxService {
  private getModel() {
    return 'minimax-m2.7';
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  private buildContext(files: FileContext[], query: string, maxTokens: number = 10000): string {
    if (!files || files.length === 0) return '';

    const allContent = files.map(f => `[${f.name}]\n${f.content}`).join('\n\n');
    const totalTokens = this.estimateTokens(allContent);

    if (totalTokens <= maxTokens) return allContent;

    const paragraphs = allContent.split(/\n\s*\n/);
    const queryKeywords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);

    const scoredParagraphs = paragraphs.map(p => {
      let score = 0;
      const lowerP = p.toLowerCase();
      queryKeywords.forEach(kw => {
        if (lowerP.includes(kw)) score += 1;
      });
      return { text: p, score };
    });

    scoredParagraphs.sort((a, b) => b.score - a.score);

    let currentTokens = 0;
    const selectedParagraphs: string[] = [];

    for (const p of scoredParagraphs) {
      const tokens = this.estimateTokens(p.text);
      if (currentTokens + tokens > maxTokens) break;
      selectedParagraphs.push(p.text);
      currentTokens += tokens;
    }

    return selectedParagraphs.join('\n\n---\n\n');
  }

  async generateResponse(
    userMessage: string, 
    history: Message[], 
    contextFiles: FileContext[], 
    _plan: UserPlan = 'free', 
    customApiKey?: string, 
    systemPrompt?: string, 
    userId?: string, 
    qSettings?: { use: boolean, url: string, key: string, collection: string }
  ): Promise<string> {
    const apiKey = customApiKey;
    if (!apiKey) return '⚠️ خطأ: مفتاح NVIDIA API غير موجود.';

    if (!contextFiles || contextFiles.length === 0) return 'عذراً، لا توجد ملفات في قاعدة المعرفة.';

    const MAX_CONTEXT_TOKENS = 12000;
    
    let context = '';
    try {
      // Use the provided API Key for embeddings if needed, or fallback
      const embeddingKey = (import.meta.env as any).VITE_OPENAI_API_KEY || apiKey;
      const segments = await EmbeddingService.searchSegments(userId || '', userMessage, embeddingKey, 8, qSettings);
      if (segments.length > 0) {
        context = segments.join('\n\n---\n\n');
      } else {
        context = this.buildContext(contextFiles, userMessage, MAX_CONTEXT_TOKENS);
      }
    } catch (err) {
      context = this.buildContext(contextFiles, userMessage, MAX_CONTEXT_TOKENS);
    }

    const model = this.getModel();

    const systemInstruction = systemPrompt || `أنت مساعد ذكي لخدمة العملاء في شركتنا، وترد على استفسارات العملاء بدقة واحترافية باستخدام نموذج MiniMax M2.7.
    **قاعدة صارمة جداً:** أجب فقط بناءً على المعلومات الموجودة في "معلومات السياق" أدناه. لا تستخدم أي معرفة خارجية أو عامة أبداً.
    **قاعدة صارمة:** لا تذكر أبداً أسماء الملفات.
    إذا كان السؤال خارج نطاق المعلومات المتوفرة، قل بوضوح: "عذراً، هذه المعلومة غير متوفرة في قاعدة بياناتنا الحالية."`;

    const body = {
      model,
      messages: [
        { role: 'system', content: systemInstruction },
        ...history.slice(-4).map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content })),
        {
          role: 'user', content: `معلومات السياق (مقتطفات):
${context}

السؤال: ${userMessage}`
        }
      ],
      temperature: 0.1,
      max_tokens: 1500
    };

    try {
      const res = await fetch('/api/nvidia/chat/completions', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${apiKey}` 
        },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error?.message || `NVIDIA API Error: ${res.status}`);
      }

      const data = await res.json();
      return data.choices?.[0]?.message?.content || 'لم أتمكن من توليد إجابة.';
    } catch (error: any) {
      console.error('Minimax Service Error:', error);
      throw new Error(`تعذر الاتصال بخدمة NVIDIA: ${error.message}`);
    }
  }
}

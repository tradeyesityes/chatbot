import { Message, FileContext, UserPlan } from '../types';

export class OpenAIService {
  private getModel(plan: UserPlan) {
    // user requested "chatgpt 5.2" -> mapping to gpt-4o (latest)
    return plan === 'pro' ? 'gpt-4o' : 'gpt-4o';
  }

  // Simple token estimation (4 chars ~= 1 token)
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  // Intelligent context truncation
  private buildContext(files: FileContext[], query: string, maxTokens: number = 10000): string {
    if (!files || files.length === 0) {
      console.log('Build Context: No files provided');
      return '';
    }

    console.log(`Build Context: Processing ${files.length} files for query: "${query}"`);

    // 1. Convert all files to chunks
    const allContent = files.map(f => `[${f.name}]\n${f.content}`).join('\n\n');
    const totalTokens = this.estimateTokens(allContent);
    console.log(`Total content size: ${allContent.length} chars (~${totalTokens} tokens)`);

    // If small enough, return all
    if (totalTokens <= maxTokens) {
      console.log('Content fits within limit. Returning all.');
      return allContent;
    }

    console.log('Content exceeds limit. Truncating...');
    // Split by paragraphs
    const paragraphs = allContent.split(/\n\s*\n/);
    const queryKeywords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);

    // Score paragraphs based on keyword match
    const scoredParagraphs = paragraphs.map(p => {
      let score = 0;
      const lowerP = p.toLowerCase();
      queryKeywords.forEach(kw => {
        if (lowerP.includes(kw)) score += 1;
      });
      return { text: p, score };
    });

    // Sort by score (descending)
    scoredParagraphs.sort((a, b) => b.score - a.score);

    // 3. Reconstruct context until limit is reached
    let currentTokens = 0;
    const selectedParagraphs: string[] = [];

    for (const p of scoredParagraphs) {
      const tokens = this.estimateTokens(p.text);
      if (currentTokens + tokens > maxTokens) break;

      selectedParagraphs.push(p.text);
      currentTokens += tokens;
    }

    // Attempt to keep some original order if possible, or just return relevant chunks
    // For simplicity, we join them back. 
    // Tip: meaningful order usually helps, but for loose context, relevance is key.
    return selectedParagraphs.join('\n\n---\n\n');
  }

  async generateResponse(userMessage: string, history: Message[], contextFiles: FileContext[], plan: UserPlan = 'free', customApiKey?: string, systemPrompt?: string): Promise<string> {
    const apiKey = customApiKey || (import.meta.env as any).VITE_OPENAI_API_KEY;
    if (!apiKey) return '⚠️ خطأ: مفتاح OpenAI غير موجود.';

    if (!contextFiles || contextFiles.length === 0) return 'عذراً، لا توجد ملفات في قاعدة المعرفة.';

    // Optimize context usage
    const MAX_CONTEXT_TOKENS = 12000; // Leave buffer for response
    const context = this.buildContext(contextFiles, userMessage, MAX_CONTEXT_TOKENS);

    const model = this.getModel(plan);

    const systemInstruction = systemPrompt || `أنت مساعد خدمة عملاء متخصص ومقيد بالمحتوى المزود في سياق المحادثة فقط.
    تعليمات صارمة:
    1. أجب على السؤال **فقط** بناءً على المعلومات المتوفرة في "معلومات السياق" أدناه.
    2. **لا** تستخدم أي معلومات خارجية أو معرفة سابقة.
    3. إذا كانت الإجابة غير موجودة في السياق، قل بوضوح: "عذراً، هذه المعلومة غير متوفرة في المصادر المزودة."
    4. التزم باللغة التي يسأل بها المستخدم.`;

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
      temperature: 0.1, // Near zero for maximum determinism
      max_tokens: 1500
    };

    try {
      const res = await fetch('/api/openai/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        console.error('OpenAI Error:', err);
        const errorMessage = err?.error?.message || '';
        if (errorMessage.toLowerCase().includes('quota')) {
          throw new Error('انتهى رصيدك في OpenAI. يرجى شحن الرصيد من لوحة تحكم OpenAI ليعود التطبيق للعمل.');
        }
        throw new Error(errorMessage || `OpenAI API Error: ${res.status}`);
      }

      const data = await res.json();
      return data.choices?.[0]?.message?.content || 'لم أتمكن من توليد إجابة.';
    } catch (error: any) {
      console.error('Service Error:', error);
      throw new Error(`تعذر الاتصال بالخادم: ${error.message}`);
    }
  }
}

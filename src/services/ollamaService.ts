import { Message, FileContext } from '../types';

export class OllamaService {
    private model: string;
    private apiKey: string | null;
    private baseUrl: string;

    constructor(modelName: string = 'gemma3:4b', baseUrl: string = 'http://localhost:11434', apiKey: string | null = null) {
        this.model = modelName;
        this.baseUrl = baseUrl;
        this.apiKey = apiKey;
    }

    setModel(modelName: string) {
        this.model = modelName;
    }

    setBaseUrl(baseUrl: string) {
        // Remove trailing slash if present
        this.baseUrl = baseUrl.replace(/\/+$/, '');
    }

    setApiKey(apiKey: string | null) {
        this.apiKey = apiKey ? apiKey.trim() : null;
    }

    private estimateTokens(text: string): number {
        return Math.ceil(text.length / 4);
    }

    private buildContext(files: FileContext[], query: string, maxTokens: number = 6000): string {
        if (!files || files.length === 0) {
            console.log('Ollama Context: No files');
            return '';
        }

        console.log(`Ollama Context: Processing ${files.length} files for query: "${query}"`);

        // 1. Convert all files to chunks
        const allContent = files.map(f => `[${f.name}]\n${f.content}`).join('\n\n');
        const totalTokens = this.estimateTokens(allContent);
        console.log(`Total content size: ${allContent.length} chars (~${totalTokens} tokens)`);

        // If small enough, return all
        if (totalTokens <= maxTokens) {
            return allContent;
        }

        console.log('Content exceeds limit. Truncating smartly...');
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

        // Reconstruct context until limit is reached
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

    async generateResponse(userMessage: string, history: Message[], contextFiles: FileContext[]): Promise<string> {
        const MAX_CONTEXT_TOKENS = 6000;
        const context = this.buildContext(contextFiles, userMessage, MAX_CONTEXT_TOKENS);

        const systemPrompt = `You are a helpful assistant. answering questions based on the provided context only.`;

        const finalUserMessage = `
Context Information:
${context}

----------------
Question: ${userMessage}

Instructions:
Answer the question using ONLY the context above.
If the answer is not in the context, say "عذراً، هذه المعلومة غير متوفرة في المصادر المزودة."
Do not use outside knowledge.
`;

        const messages = [
            { role: 'system', content: systemPrompt },
            ...history.slice(-4).map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content })),
            { role: 'user', content: finalUserMessage }
        ];

        try {
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (this.apiKey) {
                headers['Authorization'] = `Bearer ${this.apiKey}`;
                console.log(`[Ollama] Authorization header set (Key length: ${this.apiKey.length})`);
            } else {
                console.log(`[Ollama] No API key provided.`);
            }

            // Determine the correct endpoint
            let endpoint: string;
            if (this.baseUrl.includes('ollama.com')) {
                // Use proxy for Ollama Cloud to avoid CORS
                endpoint = '/api/ollama-cloud/api/chat';
            } else if (this.baseUrl.includes('localhost') || this.baseUrl.includes('127.0.0.1')) {
                // Use local proxy for localhost
                endpoint = '/api/ollama/api/chat';
            } else {
                // For custom remote servers, we try to use the direct URL.
                // Note: This may require OLLAMA_ORIGINS="*" on the server side.
                endpoint = `${this.baseUrl}/api/chat`;
            }

            console.log(`[Ollama] Requesting model "${this.model}" at endpoint: ${endpoint}`);

            const res = await fetch(endpoint, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    model: this.model,
                    messages: messages,
                    stream: false
                })
            });

            if (!res.ok) {
                const errText = await res.text();
                console.error(`[Ollama] Error Response (${res.status}):`, errText);

                // Special handling for common remote connection issues
                if (res.status === 404) {
                    // Try to parse if it's a JSON error from Ollama
                    try {
                        const errJson = JSON.parse(errText);
                        if (errJson.error?.includes('model') || errJson.message?.includes('not found')) {
                            throw new Error(`النموذج "${this.model}" غير موجود على هذا الخادم. تأكد من سحب النموذج (poll) أولاً.`);
                        }
                    } catch (e) { }
                    throw new Error(`تعذر العثور على المسار (404) على الخادم: ${endpoint}. تأكد من صحة الرابط.`);
                }
                throw new Error(`خطأ من الخادم (${res.status}): ${errText.substring(0, 100)}`);
            }

            const data = await res.json();
            return data.message?.content || data.response || 'لم أحصل على إجابة من نموذج Ollama.';

        } catch (error: any) {
            console.error('[Ollama] Service Error:', error);
            if (error.name === 'TypeError' && error.message.includes('failed to fetch')) {
                throw new Error(`تعذر الاتصال بخادم Ollama. تأكد من عمل الخادم ومن إعداد CORS (OLLAMA_ORIGINS="*") إذا كان الخادم بعيداً.`);
            }
            throw error;
        }
    }
}

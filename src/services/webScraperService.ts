import { FileContext } from "../types";

export class WebScraperService {
    /**
     * Scrapes a URL using jina.ai reader and returns a FileContext
     */
    static async scrapeUrl(url: string): Promise<FileContext> {
        try {
            // Validate URL format
            new URL(url);

            console.log(`Scraping URL: ${url}`);

            // Using r.jina.ai to get clean markdown content
            const jinaUrl = `https://r.jina.ai/${url}`;

            const response = await fetch(jinaUrl, {
                headers: {
                    'Accept': 'text/plain',
                }
            });

            if (!response.ok) {
                throw new Error(`تعذر الوصول إلى الموقع (Status: ${response.status})`);
            }

            const text = await response.text();

            // Detect Cloudflare or Forbidden warnings from Jina
            if (text.includes('Target URL returned error 403') || text.includes('Verify you are human') || text.includes('Cloudflare')) {
                throw new Error('هذا الموقع محمي بأنظمة أمنية (Cloudflare) تمنع القراءة الآلية. يرجى نسخ النص يدوياً أو استخدام سورس آخر.');
            }

            if (!text || text.trim().length === 0 || text.length < 100) {
                throw new Error('لم يتم الحصول على محتوى مفيد من الرابط. قد يكون الموقع محاداً أو يحتاج لتسجيل دخول.');
            }

            // Extract a title from the URL or content
            let title = url.replace(/^https?:\/\//, '').split('/')[0];
            const match = text.match(/^# (.*)/m);
            if (match && match[1]) {
                title = match[1].trim();
            }

            console.log(`Scraped content length: ${text.length}`);

            return {
                name: `link:${title}`,
                content: text,
                type: 'text/markdown',
                size: text.length
            };
        } catch (err: any) {
            console.error('Web Scraping Error:', err);
            throw new Error(`خطأ في سحب الرابط: ${err.message}`);
        }
    }
}

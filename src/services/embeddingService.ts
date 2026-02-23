import { supabase } from './supabaseService';
import { normalizeArabic } from '../utils/helpers';

export class EmbeddingService {
    private static OPENAI_API_URL = 'https://api.openai.com/v1/embeddings';

    /**
     * Splits text into chunks based on paragraphs or maxChunkSize
     */
    static chunkText(text: string, maxChunkSize: number = 1000, overlap: number = 200): string[] {
        if (!text) return [];

        // Try splitting by paragraphs first to preserve semantic meaning
        const paragraphs = text.split(/\n\s*\n/);
        const chunks: string[] = [];
        let currentChunk = "";

        for (const para of paragraphs) {
            const trimmedPara = para.trim();
            if (!trimmedPara) continue;

            if ((currentChunk + "\n\n" + trimmedPara).length <= maxChunkSize) {
                currentChunk += (currentChunk ? "\n\n" : "") + trimmedPara;
            } else {
                if (currentChunk) chunks.push(currentChunk);

                // If a single paragraph is larger than maxChunkSize, split it by characters
                if (trimmedPara.length > maxChunkSize) {
                    let start = 0;
                    while (start < trimmedPara.length) {
                        const end = Math.min(start + maxChunkSize, trimmedPara.length);
                        chunks.push(trimmedPara.slice(start, end));
                        start += maxChunkSize - overlap;
                        if (start >= trimmedPara.length) break;
                    }
                    currentChunk = "";
                } else {
                    currentChunk = trimmedPara;
                }
            }
        }

        if (currentChunk) chunks.push(currentChunk);
        return chunks;
    }

    /**
     * Generates embedding for a single chunk using OpenAI
     */
    static async generateEmbedding(text: string, apiKey: string): Promise<number[]> {
        const response = await fetch(this.OPENAI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                input: text,
                model: 'text-embedding-3-small'
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`OpenAI Embedding Error: ${error.error?.message || response.statusText}`);
        }

        const data = await response.json();
        return data.data[0].embedding;
    }

    /**
     * Processes a file context: chunks it, generates embeddings, and saves to database
     */
    static async indexFile(userId: string, fileName: string, content: string, apiKey: string, onProgress?: (processed: number, total: number) => void): Promise<void> {
        console.log(`🚀 Indexing file: ${fileName} (${content.length} chars)`);
        const chunks = this.chunkText(content);
        const totalChunks = chunks.length;
        console.log(`📄 Split into ${totalChunks} chunks.`);

        const BATCH_SIZE = 5; // Process 5 chunks in parallel to respect rate limits
        const dbRecords: any[] = [];
        let processedChunks = 0;

        for (let i = 0; i < totalChunks; i += BATCH_SIZE) {
            const batch = chunks.slice(i, i + BATCH_SIZE);
            console.log(`🔄 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(totalChunks / BATCH_SIZE)}...`);

            const batchResults = await Promise.all(
                batch.map(async (chunk) => {
                    try {
                        const embedding = await this.generateEmbedding(chunk, apiKey);
                        processedChunks++;
                        if (onProgress) onProgress(processedChunks, totalChunks);
                        return {
                            user_id: userId,
                            file_id: fileName,
                            content: chunk,
                            embedding: embedding,
                            metadata: { file_name: fileName }
                        };
                    } catch (err) {
                        console.error(`❌ Failed to generate embedding for chunk in ${fileName}:`, err);
                        // Still count as processed to keep progress bar moving
                        processedChunks++;
                        if (onProgress) onProgress(processedChunks, totalChunks);
                        return null;
                    }
                })
            );

            const validResults = batchResults.filter(r => r !== null);
            dbRecords.push(...validResults);

            // Periodically save to DB to avoid memory issues and provide faster feedback
            if (dbRecords.length >= 20 || i + BATCH_SIZE >= chunks.length) {
                console.log(`💾 Saving ${dbRecords.length} segments to database...`);
                const { error } = await supabase.from('file_segments').insert(dbRecords);
                if (error) {
                    console.error("❌ Supabase Insert Error:", error);
                }
                dbRecords.length = 0; // Clear the array
            }
        }

        console.log(`✅ Finished indexing ${fileName}`);
    }

    /**
     * Performs semantic search to find relevant segments
     */
    static async searchSegments(userId: string, query: string, apiKey: string, limit: number = 5): Promise<string[]> {
        const normalizedQuery = normalizeArabic(query);
        console.log(`🔍 Searching segments for query: "${query}" (normalized: "${normalizedQuery}")`);
        const embedding = await this.generateEmbedding(normalizedQuery, apiKey);

        const { data, error } = await supabase.rpc('match_file_segments', {
            query_embedding: embedding,
            match_threshold: 0.35, // Lowered threshold for better Arabic recall
            match_count: limit,
            p_user_id: userId
        });

        if (error) {
            console.error('Vector Search Error:', error);
            return [];
        }

        return (data || []).map((row: any) => row.content);
    }
}

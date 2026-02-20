import { supabase } from './supabaseService';

export class EmbeddingService {
    private static OPENAI_API_URL = 'https://api.openai.com/v1/embeddings';

    /**
     * Splits text into chunks of roughly maxChunkSize with overlap
     */
    static chunkText(text: string, maxChunkSize: number = 1000, overlap: number = 200): string[] {
        const chunks: string[] = [];
        let start = 0;

        while (start < text.length) {
            const end = Math.min(start + maxChunkSize, text.length);
            chunks.push(text.slice(start, end));
            start += maxChunkSize - overlap;
            if (start >= text.length) break;
        }

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
    static async indexFile(userId: string, fileName: string, content: string, apiKey: string): Promise<void> {
        console.log(`Indexing file: ${fileName} for user: ${userId}`);
        const chunks = this.chunkText(content);

        // Progressively process chunks to avoid hitting rate limits or timeouts
        for (const chunk of chunks) {
            try {
                const embedding = await this.generateEmbedding(chunk, apiKey);

                const { error } = await supabase.from('file_segments').insert({
                    user_id: userId,
                    file_id: fileName,
                    content: chunk,
                    embedding: embedding,
                    metadata: { file_name: fileName }
                });

                if (error) throw error;
            } catch (err) {
                console.error(`Failed to index chunk for ${fileName}:`, err);
                // Continue with other chunks
            }
        }
    }

    /**
     * Performs semantic search to find relevant segments
     */
    static async searchSegments(userId: string, query: string, apiKey: string, limit: number = 5): Promise<string[]> {
        const embedding = await this.generateEmbedding(query, apiKey);

        const { data, error } = await supabase.rpc('match_file_segments', {
            query_embedding: embedding,
            match_threshold: 0.5,
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

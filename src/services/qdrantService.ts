import axios from 'axios';

export class QdrantService {
    /**
     * Ensures a collection exists in Qdrant with the correct vector size (1536 for OpenAI)
     */
    static async ensureCollection(url: string, apiKey: string | null, collection: string): Promise<void> {
        try {
            const cleanUrl = url.replace(/\/$/, '');
            const headers: any = {};
            if (apiKey) headers['api-key'] = apiKey;

            // Check if collection exists
            try {
                await axios.get(`${cleanUrl}/collections/${collection}`, { headers });
                return; // Exists
            } catch (e: any) {
                if (e.response?.status !== 404) throw e;
            }

            // Create collection
            await axios.put(`${cleanUrl}/collections/${collection}`, {
                vectors: {
                    size: 1536,
                    distance: 'Cosine'
                }
            }, { headers });

            console.log(`✅ Qdrant Collection '${collection}' created.`);
        } catch (err: any) {
            console.error('❌ Qdrant ensureCollection error:', err.response?.data || err.message);
            throw new Error(`فشل الاتصال بخادم Qdrant: ${err.message}`);
        }
    }

    /**
     * Uploads points (vectors + payload) to Qdrant
     */
    static async upsertPoints(url: string, apiKey: string | null, collection: string, points: any[]): Promise<void> {
        const cleanUrl = url.replace(/\/$/, '');
        const headers: any = {};
        if (apiKey) headers['api-key'] = apiKey;

        try {
            await axios.put(`${cleanUrl}/collections/${collection}/points`, {
                points: points.map((p, idx) => ({
                    id: crypto.randomUUID(),
                    vector: p.embedding,
                    payload: {
                        user_id: p.user_id,
                        file_id: p.file_id,
                        content: p.content,
                        ...p.metadata
                    }
                }))
            }, { headers });
        } catch (err: any) {
            console.error('❌ Qdrant upsertPoints error:', err.response?.data || err.message);
            throw err;
        }
    }

    /**
     * Searches for nearest vectors in Qdrant
     */
    static async searchPoints(url: string, apiKey: string | null, collection: string, vector: number[], userId: string, limit: number = 5): Promise<string[]> {
        const cleanUrl = url.replace(/\/$/, '');
        const headers: any = {};
        if (apiKey) headers['api-key'] = apiKey;

        try {
            const response = await axios.post(`${cleanUrl}/collections/${collection}/points/search`, {
                vector: vector,
                filter: {
                    must: [
                        { key: 'user_id', match: { value: userId } }
                    ]
                },
                limit: limit,
                with_payload: true
            }, { headers });

            return response.data.result.map((r: any) => r.payload.content);
        } catch (err: any) {
            console.error('❌ Qdrant searchPoints error:', err.response?.data || err.message);
            return [];
        }
    }
}

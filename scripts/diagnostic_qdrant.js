import axios from 'axios';

const QDRANT_URL = 'https://qdrant-sg0o08s4gso0c4g8o4s4k8ww.babclick.eu.org';
const QDRANT_API_KEY = 'pNof3HRgo0wMMs9E55oDOz55Ttcyi10g';
const COLLECTION = 'test_segments';

async function verifyQdrantConnectivity() {
    console.log('🚀 Starting Qdrant Connectivity Test (Mock Vectors)...');
    const headers = { 'api-key': QDRANT_API_KEY };

    try {
        // 1. Ensure Collection
        console.log(`Checking collection: ${COLLECTION}`);
        try {
            await axios.get(`${QDRANT_URL}/collections/${COLLECTION}`, { headers });
            console.log('✅ Collection exists.');
        } catch (e) {
            console.log('Creating collection...');
            await axios.put(`${QDRANT_URL}/collections/${COLLECTION}`, {
                vectors: { size: 1536, distance: 'Cosine' }
            }, { headers });
            console.log('✅ Collection created.');
        }

        // 2. Generate Mock Vector
        const mockVector = new Array(1536).fill(0).map(() => Math.random());
        const sampleText = "هذا نص تجريبي لاختبار كفاءة Qdrant.";

        // 3. Upsert to Qdrant
        console.log('Upserting mock point to Qdrant...');
        const pointId = Math.floor(Math.random() * 1000000);
        const startUpsert = Date.now();
        await axios.put(`${QDRANT_URL}/collections/${COLLECTION}/points`, {
            points: [
                {
                    id: pointId,
                    vector: mockVector,
                    payload: { content: sampleText, test: true, user_id: 'test_user' }
                }
            ]
        }, { headers });
        console.log(`✅ Upserted in ${Date.now() - startUpsert}ms`);

        // 4. Search
        console.log('Searching for the mock point...');
        const startSearch = Date.now();
        const searchRes = await axios.post(`${QDRANT_URL}/collections/${COLLECTION}/points/search`, {
            vector: mockVector,
            limit: 1,
            with_payload: true
        }, { headers });

        if (searchRes.data.result && searchRes.data.result.length > 0) {
            console.log(`✅ Search result found: "${searchRes.data.result[0].payload.content}"`);
            console.log(`⏱️ Qdrant Search Latency: ${Date.now() - startSearch}ms`);
            console.log('\n🌟 Qdrant SERVER IS FULLY FUNCTIONAL WITH YOUR KEY!');
        } else {
            console.log('⚠️ No results found.');
        }

    } catch (err) {
        console.error('❌ Qdrant Test FAILED:', err.response?.data || err.message);
    }
}

verifyQdrantConnectivity();

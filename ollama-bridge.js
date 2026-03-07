import express from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();
const PORT = 3001;
const OLLAMA_URL = 'http://127.0.0.1:11434/api/chat';

app.use(cors());
app.use(express.json());

// Main proxy endpoint
app.post('/api/chat', async (req, res) => {
    console.log(`[Bridge] Incoming request for model: ${req.body.model}`);

    try {
        const response = await axios.post(OLLAMA_URL, req.body, {
            headers: { 'Content-Type': 'application/json' }
        });

        console.log(`[Bridge] Success from Ollama`);
        res.json(response.data);
    } catch (error) {
        console.error(`[Bridge] Error from Ollama:`, error.message);
        if (error.response) {
            res.status(error.response.status).send(error.response.data);
        } else {
            res.status(500).send({ error: 'Failed to connect to Ollama', details: error.message });
        }
    }
});

// Health check
app.get('/health', (req, res) => {
    res.send('Ollama Bridge is active');
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Ollama Bridge running on http://127.0.0.1:${PORT}`);
    console.log(`🔗 Proxying to: ${OLLAMA_URL}`);
});

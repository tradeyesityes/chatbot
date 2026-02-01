KB Chatbot v2

Run locally:

```bash
cd /Users/ali/Downloads/kbchatbot-v2
npm install
npm run host
# open http://localhost:8089 or http://<LAN-IP>:8089
```

Notes:
- Uses OpenAI via VITE_OPENAI_API_KEY from .env.local
- Uses Supabase settings VITE_SUPABASE_URL and VITE_SUPABASE_KEY
- No OCR in this version; images are described only

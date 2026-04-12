# 🤖 KB Chatbot v2

**KB Chatbot v2** is a professional-grade knowledge base assistant designed for seamless multi-channel communication. It allows users to interact with their documents using state-of-the-art AI models across Web, WhatsApp, and Telegram.

---

## 🚀 Key Features

*   **Multi-Channel Support**: Native integration with **Web Chat**, **WhatsApp** (via Evolution API), and **Telegram**.
*   **Hybrid RAG System**: Combines vector embeddings with intelligent keyword fallback for highly accurate information retrieval.
*   **Multi-Model Intelligence**: Supports **OpenAI (GPT-4o)**, **Google Gemini (1.5 Flash)**, and **Ollama** (Local or Remote).
*   **Unified Human Handover**: A sophisticated state-machine that collects customer info and manages live support requests with Arabic normalization.
*   **Admin Dashboard**: Comprehensive management of users, files, and system-wide AI configurations.
*   **Secure Infrastructure**: Robust Row-Level Security (RLS) and Super Admin hardening.

---

## 🛠️ Getting Started

### Prerequisites
- Node.js (v18+)
- Supabase Account
- API Keys (OpenAI, Gemini, or Ollama instance)

### Installation
```bash
git clone <repo-url>
cd kbchatbot-v2
npm install
```

### Configuration
1. Create a `.env.local` file based on `.env.example`.
2. Configure your Supabase URL and Service Role keys.
3. Apply the SQL scripts found in the `supabase/` directory to your database.

### Running Locally
```bash
npm run host
# Access via http://localhost:8089
```

---

## 📁 Project Structure

- `src/`: React frontend components, hooks, and services.
- `supabase/`: SQL setup scripts and Edge Functions for Telegram/WhatsApp.
- `scripts/`: Maintenance and utility scripts for database repair and verification.
- `public/`: Static assets and bot avatars.

---

## 🔐 Security

The system is protected by **Supabase Auth** and **Row-Level Security**. Super Admin accounts are hardened with database triggers to prevent accidental self-deletion or disabling.

---

**Version**: 2.1.0  
**Last Updated**: April 2026

# KB Chatbot v2

A modern Arabic knowledge base chatbot powered by OpenAI and Supabase.

## Features

- 📁 **File Upload**: Support for PDF, TXT, CSV, DOCX, and more
- 🤖 **AI Powered**: Integration with OpenAI GPT-3.5-turbo
- 🌍 **Multilingual**: Full Arabic interface with RTL support
- 💾 **Cloud Storage**: Supabase integration for persistent storage
- 🎨 **Modern UI**: Beautiful Tailwind CSS design with animations
- 📱 **Responsive**: Works on desktop and mobile devices
- ⚡ **Real-time**: Instant responses and smooth interactions

## Quick Start

### Prerequisites

- Node.js 16+
- npm or yarn
- OpenAI API Key
- Supabase account and credentials

### Installation

```bash
cd /Users/ali/Downloads/kbchatbot-v2
npm install
```

### Environment Setup

Create a `.env.local` file in the root directory:

```env
VITE_OPENAI_API_KEY=your_openai_api_key
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_KEY=your_supabase_key
VITE_OPENAI_MODEL=gpt-3.5-turbo
```

### Running the Application

```bash
# Development server
npm run dev

# With network access
npm run host
# Open http://localhost:8089 or http://<LAN-IP>:8089

# Production build
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
src/
├── components/          # Reusable React components
│   ├── ChatMessage.tsx
│   ├── ChatInput.tsx
│   ├── FileUploader.tsx
│   ├── FileList.tsx
│   ├── Sidebar.tsx
│   └── index.ts
├── services/           # API and business logic
│   ├── openaiService.ts
│   ├── fileProcessingService.ts
│   ├── supabaseService.ts
│   ├── authService.ts
│   └── storageService.ts
├── hooks/             # Custom React hooks
│   ├── useChat.ts
│   ├── useFileUpload.ts
│   └── index.ts
├── utils/             # Utility functions
│   ├── helpers.ts
│   └── index.ts
├── constants/         # Application constants
├── types.ts           # TypeScript types
├── config.ts          # Configuration
├── App.tsx            # Main app component
├── main.tsx           # Entry point
└── index.css          # Global styles
```

## Development Guidelines

### Code Style
- Use TypeScript for all files
- Use Tailwind CSS for styling
- Components should be functional components with hooks
- Follow the existing code structure

### Naming Conventions
- Components: PascalCase (e.g., `ChatMessage.tsx`)
- Services: camelCase with `Service` suffix (e.g., `openaiService.ts`)
- Utilities: camelCase (e.g., `helpers.ts`)
- Constants: UPPER_SNAKE_CASE (e.g., `MAX_FILE_SIZE`)

### Best Practices
1. Always handle errors gracefully
2. Validate user input
3. Keep components small and focused
4. Extract reusable logic into hooks
5. Use TypeScript interfaces for type safety
6. Add proper comments for complex logic

## Technologies Used

- **Frontend**: React 19, TypeScript, Tailwind CSS
- **Build Tool**: Vite 6
- **API**: OpenAI GPT-3.5-turbo
- **Database**: Supabase
- **File Processing**: PDF.js, Tesseract.js
- **HTTP Client**: Axios

## Version

2.0.0 - Enhanced with modular components and improved architecture

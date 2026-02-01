# KB Chatbot v2 - Quick Reference Guide

## 🚀 Getting Started (5 Minutes)

### 1. Setup
```bash
cd /Users/ali/Downloads/kbchatbot-v2
npm install
cp .env.example .env.local
# Edit .env.local with your keys
```

### 2. Run
```bash
npm run dev              # Local dev (http://localhost:5173)
npm run host            # Network access (http://localhost:8089)
npm run build           # Production build
npm run preview         # Preview build
```

### 3. Deploy
```bash
npm run build           # Creates dist/
# Deploy dist/ folder to your server
```

---

## 📁 Project Structure at a Glance

```
src/
├── components/         # React components
├── services/          # API & business logic
├── hooks/             # Custom React hooks
├── utils/             # Helper functions
├── constants/         # App constants
├── context/           # React context
├── App.tsx            # Main component
├── types.ts           # TypeScript types
├── config.ts          # Configuration
└── index.css          # Global styles
```

---

## 🧩 Components

| Component | Purpose | Props |
|-----------|---------|-------|
| ChatMessage | Display a message | message: Message |
| ChatInput | Text input | value, onChange, onSubmit, isLoading |
| FileUploader | Upload files | onFilesAdded, isLoading |
| FileList | Show files | files, onRemove |
| Sidebar | Navigation | user, onNewChat, onLogout |
| UI | Utils (Spinner, Alert, Badge) | Various |

---

## 🛠️ Services

| Service | Methods | Purpose |
|---------|---------|---------|
| OpenAIService | generateResponse() | AI responses |
| FileProcessingService | processFile(), validateFile() | File handling |
| StorageService | saveFiles(), getFiles(), deleteFile() | Supabase storage |
| AuthService | login(), logout(), getSession() | Authentication |
| Supabase | - | Database connection |

---

## 🎣 Hooks

| Hook | Returns | Purpose |
|------|---------|---------|
| useChat | messages, loading, error, sendMessage() | Chat management |
| useFileUpload | files, loading, error, addFiles(), removeFile() | File upload |

---

## 📝 Common Tasks

### Add a New Component
```typescript
// src/components/MyComponent.tsx
import React from 'react'

interface MyComponentProps {
  prop: string
}

export const MyComponent: React.FC<MyComponentProps> = ({ prop }) => {
  return <div>{prop}</div>
}
```

### Add a New Service
```typescript
// src/services/myService.ts
export class MyService {
  static async doSomething(): Promise<void> {
    // Implementation
  }
}
```

### Add a New Hook
```typescript
// src/hooks/useMyHook.ts
import { useState } from 'react'

export const useMyHook = () => {
  const [state, setState] = useState<string>('')
  return { state, setState }
}
```

### Use a Service
```typescript
import { MyService } from './services/myService'

MyService.doSomething()
```

### Use a Hook
```typescript
import { useMyHook } from './hooks/useMyHook'

const { state } = useMyHook()
```

---

## 🎨 Styling

### Tailwind Classes
```tsx
<div className="p-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
  Button
</div>
```

### Custom Classes
```css
.btn-primary { @apply px-4 py-2 bg-blue-600 text-white rounded-lg; }
.chat-bubble { @apply max-w-[70%] px-4 py-3 rounded-lg; }
```

---

## 🔐 Environment Variables

```env
VITE_OPENAI_API_KEY=sk-...
VITE_SUPABASE_URL=https://...
VITE_SUPABASE_KEY=eyJ...
VITE_OPENAI_MODEL=gpt-3.5-turbo
```

---

## 🐛 Debugging

### Chrome DevTools
- F12 - Open DevTools
- React tab - Inspect components
- Console tab - Check errors

### VS Code Debugging
- Set breakpoints in code
- F5 to run debugger
- Step through code

### Common Issues
```
// API Error
⚠️ Check VITE_OPENAI_API_KEY in .env.local

// Supabase Error
⚠️ Check VITE_SUPABASE_URL and VITE_SUPABASE_KEY

// File Upload Error
⚠️ Check file size < 50MB
```

---

## 📚 Documentation Files

| File | Content |
|------|---------|
| README.md | Original project info |
| DEVELOPMENT.md | Dev guidelines |
| UPGRADE.md | Migration guide |
| API.md | API documentation |
| SUMMARY.md | Project overview |
| CHANGELOG.md | Version history |
| DEVELOPMENT_REPORT.md | Dev report |

---

## 📊 Key Metrics

| Metric | Value |
|--------|-------|
| Components | 7 |
| Services | 5 |
| Hooks | 2 |
| Bundle Size | 110KB gzip |
| Build Time | 868ms |
| Files | 23 TypeScript |

---

## ✅ Before Going to Production

- [ ] Environment variables set
- [ ] Build successful (npm run build)
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] Tested in browser
- [ ] Tested file upload
- [ ] Tested chat functionality
- [ ] Monitored set up
- [ ] Backups configured

---

## 🆘 Getting Help

1. **Check docs** - See markdown files
2. **Check code** - Look at components
3. **Check errors** - Browser console
4. **Check types** - TypeScript definitions
5. **Debug** - Use DevTools

---

## 🎯 Next Steps

1. Read DEVELOPMENT.md for guidelines
2. Explore components in src/components/
3. Review services in src/services/
4. Check API.md for detailed docs
5. Run and test locally
6. Deploy to staging
7. Run tests
8. Deploy to production

---

## 🔗 Useful Commands

```bash
# Development
npm run dev              # Start dev server
npm run host            # Start with network

# Production
npm run build           # Build for prod
npm run preview         # Preview build

# Utility
npm install             # Install dependencies
npm list                # List dependencies
npm outdated            # Check for updates
```

---

## 📞 Contact & Resources

- **Docs**: See markdown files
- **Code**: Explore src/ folder
- **Types**: Check src/types.ts
- **Config**: Edit src/config.ts
- **Support**: Review documentation

---

**Quick Reference for KB Chatbot v2**
Last Updated: January 31, 2024
Version: 2.0.0

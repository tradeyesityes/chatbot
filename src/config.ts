// Environment configuration
export const config = {
  // API Keys (loaded from environment variables)
  openai: {
    apiKey: (import.meta.env as any).VITE_OPENAI_API_KEY || '',
    model: (import.meta.env as any).VITE_OPENAI_MODEL || 'gpt-3.5-turbo',
    temperature: 0.2,
    maxTokens: 1500,
  },

  // Supabase configuration
  supabase: {
    url: (import.meta.env as any).VITE_SUPABASE_URL || '',
    key: (import.meta.env as any).VITE_SUPABASE_KEY || '',
  },

  // Application settings
  app: {
    name: 'KB Chatbot',
    version: '2.0.0',
    maxFileSize: 50 * 1024 * 1024, // 50MB
    maxFiles: 20,
    supportedFormats: ['.pdf', '.txt', '.csv', '.docx', '.doc', '.json'],
  },

  // UI settings
  ui: {
    messageLimit: 50,
    scrollBehavior: 'smooth' as const,
    theme: 'light' as const,
  },

  // Feature flags
  features: {
    authentication: false,
    fileSharing: false,
    darkMode: false,
    multiLanguage: true,
  },
}

// Validate configuration
export const validateConfig = (): boolean => {
  if (!config.openai.apiKey) {
    console.warn('⚠️ OpenAI API key not configured')
    return false
  }
  if (!config.supabase.url || !config.supabase.key) {
    console.warn('⚠️ Supabase configuration incomplete')
    return false
  }
  return true
}

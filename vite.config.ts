import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL || 'https://rawobjxsbzpmlwwhmsec.supabase.co'),
    'import.meta.env.VITE_SUPABASE_KEY': JSON.stringify(process.env.VITE_SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhd29ianhzYnpwbWx3d2htc2VjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0NTU0NDksImV4cCI6MjA4MzAzMTQ0OX0.wEjgxmkDPjzEdH76qXyaFOZEpe-XYYYG0lT0n437TCE'),
    'import.meta.env.VITE_HCAPTCHA_SITE_KEY': JSON.stringify(process.env.VITE_HCAPTCHA_SITE_KEY || '42ee3480-7f70-43e8-b232-50c21de426c2'),
    'import.meta.env.VITE_META_APP_ID': JSON.stringify(process.env.VITE_META_APP_ID || '4017241231826023'),
    'import.meta.env.VITE_EVOLUTION_BASE_URL': JSON.stringify(process.env.VITE_EVOLUTION_BASE_URL || 'https://evo-1001.babclick.eu.org'),
    'import.meta.env.VITE_OPENAI_API_KEY': JSON.stringify(process.env.VITE_OPENAI_API_KEY || ''),
    'import.meta.env.VITE_API_KEY': JSON.stringify(process.env.VITE_API_KEY || ''),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 8089,
    host: '0.0.0.0',
    middlewareMode: false,
    proxy: {
      '/api/openai': {
        target: 'https://api.openai.com/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/openai/, ''),
      },
      '/api/ollama-cloud': {
        target: 'https://ollama.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/ollama-cloud/, ''),
      },
      '/api/ollama': {
        target: 'http://172.17.0.1:11434',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/ollama/, ''),
      },
      '/api/supabase': {
        target: 'https://rawobjxsbzpmlwwhmsec.supabase.co',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/supabase/, ''),
      },
    },
  }
});

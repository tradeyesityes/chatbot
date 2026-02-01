import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

function loadEnvLocal() {
  const envPath = path.resolve(__dirname, '.env.local');
  if (!fs.existsSync(envPath)) return {};
  
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const env: Record<string, string> = {};
  
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      env[key.trim()] = valueParts.join('=').trim();
    }
  });
  
  return env;
}

const envLocal = loadEnvLocal();
Object.assign(process.env, envLocal);

export default defineConfig({
  plugins: [react()],
  server: {
    port: 8089,
    host: '0.0.0.0',
    middlewareMode: false,
  },
  define: {
    'process.env.VITE_OPENAI_API_KEY': JSON.stringify(process.env.VITE_OPENAI_API_KEY),
    'process.env.VITE_SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL),
    'process.env.VITE_SUPABASE_KEY': JSON.stringify(process.env.VITE_SUPABASE_KEY),
  }
});

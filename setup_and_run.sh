#!/bin/bash

# KB Chatbot v2 - Ubuntu Setup & Run Script
# This script installs dependencies and starts the application using PM2.

echo "🚀 Starting setup for KB Chatbot v2..."

# 0. Check if running in the correct directory
if [ ! -f package.json ]; then
    echo "❌ Error: package.json not found in the current directory."
    echo "Please make sure you have uploaded ALL project files (src, package.json, vite.config.ts, etc.) to this folder."
    exit 1
fi

# 2. Check for PM2
if ! command -v pm2 &> /dev/null; then
    echo "⚠️ PM2 not found. Installing PM2 globally..."
    sudo npm install -g pm2
fi

# 3. Install Project Dependencies
echo "📦 Installing project dependencies..."
npm install

# 4. Check for .env.local
if [ ! -f .env.local ]; then
    echo "⚠️ .env.local not found. Creating from .env.example..."
    cp .env.example .env.local
    echo "‼️ IMPORTANT: Please edit .env.local and add your API keys (OpenAI, Supabase, etc.)"
fi

# 5. Start with PM2
echo "⚙️ Starting the application with PM2 on port 8089..."
pm2 start ecosystem.config.cjs

# 6. Save PM2 list and setup startup script
pm2 save
# Optional: Attempt to setup startup (requires sudo/user interaction usually)
# sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp $HOME

echo "✅ Done! Project should be running at http://$(curl -s ifconfig.me):8089"
echo "🔍 Use 'pm2 logs kbchatbot-v2' to see the logs."
echo "🔍 Use 'pm2 status' to see the status."

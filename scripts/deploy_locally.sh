#!/bin/bash

# Script to build locally and deploy to Cloudflare
# This ensures all VITE_ variables are baked into the build

PROJECT_NAME=$1

if [ -z "$PROJECT_NAME" ]; then
    echo "❌ Error: Project name is required."
    echo "Usage: ./scripts/deploy_locally.sh <project-name>"
    exit 1
fi

echo "🚀 Starting Local Build and Deployment for: $PROJECT_NAME"

# 1. Ensure we have the right Node version
if command -v nvm &> /dev/null; then
    echo "⚙️ Setting Node version via nvm..."
    export PATH="$(nvm which 20 | xargs dirname):$PATH"
fi

# 2. Install dependencies (just in case)
echo "📦 Installing dependencies..."
npm install

# 3. Build the project
# Vite will automatically pick up .env.local variables
echo "🔨 Building the project with Vite..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please check the errors above."
    exit 1
fi

# 4. Deploy assets and config to Cloudflare
echo "☁️ Deploying to Cloudflare..."
npx wrangler deploy --name "$PROJECT_NAME" --assets=dist

if [ $? -eq 0 ]; then
    echo "✅ Successfully deployed to Cloudflare!"
    echo "🔗 URL: https://$PROJECT_NAME.pentalogin.workers.dev"
else
    echo "❌ Deployment failed."
fi

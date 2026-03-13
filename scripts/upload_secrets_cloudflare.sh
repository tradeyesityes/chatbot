#!/bin/bash

# Script to upload environment variables from .env to Cloudflare Pages
# Usage: ./scripts/upload_secrets_cloudflare.sh <project-name>

PROJECT_NAME=$1
ENV_FILE=".env.local" # Or .env

if [ -z "$PROJECT_NAME" ]; then
    echo "❌ Error: Project name is required."
    echo "Usage: ./scripts/upload_secrets_cloudflare.sh <project-name>"
    exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
    echo "⚠️ Warning: $ENV_FILE not found. Trying .env..."
    ENV_FILE=".env"
fi

if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Error: No .env or .env.local file found."
    exit 1
fi

echo "🚀 Starting bulk upload of secrets from $ENV_FILE to Cloudflare project (Worker/Pages): $PROJECT_NAME"

# First try Worker style (wrangler secret bulk)
echo "🔍 Attempting Worker-style secret upload..."
npx wrangler secret bulk "$ENV_FILE" --name "$PROJECT_NAME"

# Then try Pages style if the first one might not cover everything or if it's actually Pages
echo "🔍 Attempting Pages-style secret upload..."
npx wrangler pages secret bulk "$ENV_FILE" --project-name "$PROJECT_NAME"

echo "✅ Bulk upload process completed."
echo "💡 Note: You might need to trigger a new deployment for changes to take effect."

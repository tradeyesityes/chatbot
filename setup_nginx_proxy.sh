#!/bin/bash

# KB Chatbot v2 - Nginx & SSL Setup Script
# This script automates Nginx reverse proxy setup and SSL certification.

DOMAIN="chatbot-1001.babclick.eu.org"
APP_PORT=8089

echo "🚀 Starting Nginx Proxy Setup for $DOMAIN..."

# 1. Update and Install Nginx & Certbot
echo "📦 Updating packages and installing Nginx/Certbot..."
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx

# 2. Create Nginx Configuration
echo "⚙️ Creating Nginx configuration for $DOMAIN..."
NGINX_CONF="/etc/nginx/sites-available/chatbot"

sudo tee $NGINX_CONF > /dev/null <<'EOF'
server {
    listen 80;
    server_name chatbot-1001.babclick.eu.org;

    location / {
        proxy_pass http://127.0.0.1:8089;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# 3. Enable the site and restart Nginx
echo "🔗 Enabling the site..."
sudo ln -sf $NGINX_CONF /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

echo "🧪 Testing Nginx configuration..."
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "🔄 Restarting Nginx..."
    sudo systemctl restart nginx
else
    echo "❌ Nginx configuration test failed. Please check the logs."
    exit 1
fi

# 4. Setup SSL with Certbot
echo "🔐 Starting SSL setup with Certbot..."
echo "‼️  IMPORTANT: Make sure your DNS (A Record) is pointing to this server's IP address."
sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m admin@$DOMAIN --redirect

echo "✅ Setup Complete!"
echo "🌍 Your application should now be accessible at https://$DOMAIN"

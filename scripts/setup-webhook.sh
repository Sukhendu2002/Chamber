#!/bin/bash

# Script to set up Telegram webhook with cloudflared tunnel URL
# Usage: ./scripts/setup-webhook.sh <TUNNEL_URL>
# Example: ./scripts/setup-webhook.sh https://abc-xyz.trycloudflare.com

set -e

BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-${BOT_TOKEN:-}}"
WEBHOOK_SECRET="${TELEGRAM_WEBHOOK_SECRET:-${WEBHOOK_SECRET:-}}"

TUNNEL_URL="$1"

if [ -z "$TUNNEL_URL" ]; then
  echo "❌ Please provide the cloudflared tunnel URL"
  echo ""
  echo "Usage: npm run webhook:setup -- <TUNNEL_URL>"
  echo "Example: npm run webhook:setup -- https://abc-xyz.trycloudflare.com"
  echo ""
  echo "Get the URL from cloudflared output (look for 'https://...trycloudflare.com')"
  exit 1
fi

if [ -z "$BOT_TOKEN" ]; then
  echo "❌ Missing Telegram bot token. Set TELEGRAM_BOT_TOKEN in your environment."
  exit 1
fi

if [ -z "$WEBHOOK_SECRET" ]; then
  echo "❌ Missing webhook secret. Set TELEGRAM_WEBHOOK_SECRET in your environment."
  exit 1
fi

WEBHOOK_URL="${TUNNEL_URL}/api/telegram/webhook"

echo "🚀 Setting up Telegram webhook..."
echo "   Tunnel URL: $TUNNEL_URL"
echo "   Webhook URL: $WEBHOOK_URL"

# Set the webhook
RESPONSE=$(curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{
    \"url\": \"${WEBHOOK_URL}\",
    \"secret_token\": \"${WEBHOOK_SECRET}\"
  }")

if echo "$RESPONSE" | grep -q '"ok":true'; then
  echo "✅ Webhook set successfully!"
  echo ""
  echo "📋 Webhook info:"
  curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo" | jq .
else
  echo "❌ Failed to set webhook"
  echo "   Response: $RESPONSE"
  exit 1
fi

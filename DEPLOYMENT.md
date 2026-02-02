# Chamber Deployment Guide

## Production Readiness Analysis

### ✅ Ready for Deployment
- **Authentication**: Clerk authentication properly configured with middleware protection
- **Database**: Prisma with PostgreSQL (Neon) - connection pooling configured
- **File Storage**: Cloudflare R2 for receipt storage
- **API Security**: Webhook secret verification, auth protection on routes
- **Environment Variables**: Properly separated (no hardcoded secrets in code)

### ⚠️ Pre-Deployment Checklist

1. **Environment Variables** - Ensure all are set in production:
   - `DATABASE_URL` - Production PostgreSQL connection string
   - `CLERK_SECRET_KEY` - Production Clerk secret
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Production Clerk publishable key
   - `TELEGRAM_BOT_TOKEN` - Telegram bot token
   - `TELEGRAM_WEBHOOK_SECRET` - Webhook verification secret
   - `OPENROUTER_API_KEY` - AI parsing API key
   - `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` - Cloudflare R2
   - `CRON_SECRET` - (Optional) For cron job authentication

2. **Clerk Configuration**:
   - Create production Clerk application
   - Update redirect URLs for production domain
   - Configure OAuth providers if needed

3. **Database Migration**:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

---

## Deployment Options

### Option 1: Vercel (Recommended)

Vercel is the recommended platform for Next.js applications.

#### Steps:

1. **Connect Repository**
   ```bash
   # Push your code to GitHub/GitLab/Bitbucket
   git push origin main
   ```

2. **Import Project in Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New Project"
   - Import your repository

3. **Configure Environment Variables**
   In Vercel Dashboard → Settings → Environment Variables, add:
   ```
   DATABASE_URL=postgresql://...
   CLERK_SECRET_KEY=sk_live_...
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
   TELEGRAM_BOT_TOKEN=...
   TELEGRAM_WEBHOOK_SECRET=...
   OPENROUTER_API_KEY=...
   R2_ACCOUNT_ID=...
   R2_ACCESS_KEY_ID=...
   R2_SECRET_ACCESS_KEY=...
   R2_BUCKET_NAME=...
   CRON_SECRET=... (generate a random string)
   ```

4. **Configure Build Settings**
   - Framework Preset: Next.js
   - Build Command: `pnpm build` or `npm run build`
   - Output Directory: `.next`
   - Install Command: `pnpm install` or `npm install`

5. **Deploy**
   - Click "Deploy"
   - Vercel will build and deploy automatically

6. **Post-Deployment**
   - Update Clerk redirect URLs to production domain
   - Set up Telegram webhook (see below)
   - Configure cron jobs (see below)

---

### Option 2: Netlify

1. **Connect Repository**
   - Go to [netlify.com](https://netlify.com)
   - Click "Add new site" → "Import an existing project"

2. **Configure Build**
   - Build command: `pnpm build` or `npm run build`
   - Publish directory: `.next`

3. **Add Environment Variables**
   Same as Vercel (Site Settings → Environment Variables)

4. **Deploy**

---

### Option 3: Railway

1. **Create Project**
   - Go to [railway.app](https://railway.app)
   - Create new project from GitHub repo

2. **Add Environment Variables**
   - Same variables as above

3. **Deploy**
   - Railway auto-detects Next.js and deploys

---

### Option 4: Self-Hosted (Docker)

1. **Create Dockerfile**
   ```dockerfile
   FROM node:20-alpine AS base

   # Install dependencies
   FROM base AS deps
   WORKDIR /app
   COPY package.json pnpm-lock.yaml ./
   RUN corepack enable pnpm && pnpm install --frozen-lockfile

   # Build
   FROM base AS builder
   WORKDIR /app
   COPY --from=deps /app/node_modules ./node_modules
   COPY . .
   RUN corepack enable pnpm && pnpm build

   # Production
   FROM base AS runner
   WORKDIR /app
   ENV NODE_ENV=production
   
   RUN addgroup --system --gid 1001 nodejs
   RUN adduser --system --uid 1001 nextjs

   COPY --from=builder /app/public ./public
   COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
   COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

   USER nextjs
   EXPOSE 3000
   ENV PORT=3000

   CMD ["node", "server.js"]
   ```

2. **Update next.config.ts for standalone output**
   ```typescript
   const nextConfig: NextConfig = {
     output: 'standalone',
   };
   ```

3. **Build and Run**
   ```bash
   docker build -t chamber .
   docker run -p 3000:3000 --env-file .env.production chamber
   ```

---

## Post-Deployment Setup

### 1. Telegram Webhook Setup

After deployment, set up the Telegram webhook:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-domain.com/api/telegram/webhook",
    "secret_token": "<YOUR_TELEGRAM_WEBHOOK_SECRET>"
  }'
```

Verify webhook:
```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
```

### 2. Cron Jobs (Subscription Alerts)

#### Vercel Cron
Add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/subscription-alerts",
      "schedule": "0 9 * * *"
    }
  ]
}
```

#### External Cron (cron-job.org, Upstash, etc.)
Set up a daily HTTP GET request to:
```
https://your-domain.com/api/cron/subscription-alerts
```
With header:
```
Authorization: Bearer <CRON_SECRET>
```

### 3. Clerk Production Setup

1. Go to Clerk Dashboard
2. Create a new production instance (or switch existing to production)
3. Update environment variables with production keys
4. Configure allowed redirect URLs:
   - `https://your-domain.com/sign-in`
   - `https://your-domain.com/sign-up`
   - `https://your-domain.com/dashboard`

### 4. Database Migration

Run migrations on production database:
```bash
DATABASE_URL="your-production-url" npx prisma db push
```

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | Production PostgreSQL URL |
| `DEV_DATABASE_URL` | ❌ | Development database (local only) |
| `CLERK_SECRET_KEY` | ✅ | Clerk backend secret |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | ✅ | Clerk frontend key |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | ✅ | Sign-in page path |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | ✅ | Sign-up page path |
| `TELEGRAM_BOT_TOKEN` | ✅ | Telegram bot API token |
| `TELEGRAM_WEBHOOK_SECRET` | ✅ | Webhook verification |
| `OPENROUTER_API_KEY` | ✅ | AI expense parsing |
| `R2_ACCOUNT_ID` | ✅ | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | ✅ | R2 access key |
| `R2_SECRET_ACCESS_KEY` | ✅ | R2 secret key |
| `R2_BUCKET_NAME` | ✅ | R2 bucket name |
| `CRON_SECRET` | ❌ | Cron job auth (recommended) |

---

## Security Recommendations

1. **Never commit `.env` files** - Already in `.gitignore`
2. **Use production Clerk keys** - Don't use test keys in production
3. **Enable HTTPS** - All platforms above provide this automatically
4. **Set strong CRON_SECRET** - Generate with `openssl rand -hex 32`
5. **Rotate API keys periodically** - Especially if compromised
6. **Monitor logs** - Check for unauthorized access attempts

---

## Monitoring & Maintenance

### Vercel Analytics
Enable in Vercel Dashboard for performance monitoring.

### Database Monitoring
Neon provides built-in monitoring at [console.neon.tech](https://console.neon.tech)

### Error Tracking (Optional)
Consider adding Sentry:
```bash
pnpm add @sentry/nextjs
```

---

## Troubleshooting

### Build Fails
- Check Node.js version (requires 18+)
- Run `pnpm install` locally first
- Check for TypeScript errors: `pnpm build`

### Database Connection Issues
- Verify `DATABASE_URL` is correct
- Check if IP is whitelisted (if using restricted access)
- Ensure SSL mode is enabled for Neon

### Telegram Webhook Not Working
- Verify webhook URL is HTTPS
- Check `TELEGRAM_WEBHOOK_SECRET` matches
- Test with `getWebhookInfo` API

### Clerk Auth Issues
- Verify redirect URLs are configured
- Check publishable key matches domain
- Ensure middleware is not blocking routes

---

## Quick Deploy Commands

```bash
# 1. Install dependencies
pnpm install

# 2. Generate Prisma client
npx prisma generate

# 3. Push schema to production database
DATABASE_URL="your-prod-url" npx prisma db push

# 4. Build locally to verify
pnpm build

# 5. Deploy (Vercel CLI)
vercel --prod
```

---

## Support

For issues, check:
- [Next.js Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [Clerk Docs](https://clerk.com/docs)
- [Vercel Docs](https://vercel.com/docs)

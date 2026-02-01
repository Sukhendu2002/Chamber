# Chamber - AI-Powered Expense Tracker

Chamber is a modern expense tracking application with AI-powered receipt parsing, Telegram bot integration, and real-time analytics.

## Features

- **Expense Tracking**: Add, edit, and categorize expenses
- **Receipt Upload**: Upload images or PDFs to R2 cloud storage
- **Telegram Bot**: Add expenses via Telegram with AI parsing
- **AI-Powered**: Gemini AI extracts expense details from receipts
- **Currency Conversion**: Auto-convert expenses when changing currency
- **Dark Mode**: Toggle between light and dark themes
- **Real-time Analytics**: Visualize spending patterns
- **Multi-Currency**: Support for INR, USD, EUR, GBP

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: Clerk
- **AI**: Google Gemini 1.5 Flash
- **Storage**: Cloudflare R2
- **Styling**: Tailwind CSS + shadcn/ui
- **Deployment**: Vercel

## Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- PostgreSQL database
- Cloudflare R2 bucket
- Clerk account
- Google AI Studio API key
- Telegram Bot (optional, for Telegram features)

## Getting Started

### 1. Clone and Install

```bash
git clone <repo-url>
cd chamber
pnpm install
```

### 2. Environment Variables

Create `.env` file:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/chamber"

# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Google AI (Gemini)
GEMINI_API_KEY=AIza...

# Cloudflare R2 (for receipts)
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=chamber-receipts

# Telegram Bot (optional)
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_WEBHOOK_SECRET=your_webhook_secret
```

### 3. Database Setup

```bash
# Push schema to database
npx prisma db push

# Generate Prisma client
npx prisma generate
```

### 4. Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

### 5. Telegram Webhook Setup (Development)

For local development with Telegram bot:

```bash
# Terminal 1: Start cloudflared tunnel
pnpm tunnel

# Terminal 2: Set webhook (after tunnel starts)
pnpm webhook:setup https://your-tunnel-url.ngrok-free.app
```

The tunnel URL will be printed by cloudflared.

## Development Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm tunnel` | Start cloudflared tunnel |
| `pnpm webhook:setup <url>` | Set Telegram webhook URL |

## Project Structure

```
app/
├── (dashboard)/          # Protected dashboard routes
│   ├── dashboard/        # Main dashboard
│   ├── expenses/         # Expense list with pagination
│   ├── analytics/        # Charts and analytics
│   ├── telegram/         # Telegram linking page
│   └── settings/         # User settings
├── (landing)/            # Public landing page
├── api/                  # API routes
│   ├── telegram/webhook  # Telegram bot handler
│   ├── upload            # File upload to R2
│   └── receipt/[id]      # Serve receipts
├── layout.tsx            # Root layout with theme provider
└── page.tsx              # Landing page redirect

components/
├── ui/                   # shadcn/ui components
├── expense-table.tsx     # Expense list with actions
├── sidebar.tsx           # Navigation sidebar
├── theme-toggle.tsx      # Dark mode toggle
└── ...

lib/
├── actions/              # Server actions
│   ├── expenses.ts       # Expense CRUD
│   └── settings.ts       # Settings + currency conversion
├── ai.ts                 # Gemini AI integration
├── db.ts                 # Prisma client
└── r2.ts                 # R2 storage utilities

prisma/
└── schema.prisma         # Database schema
```

## Key Features Implementation

### Receipt Upload
- Images: Uploaded to R2, displayed with `<img>`
- PDFs: Uploaded to R2, displayed in `<iframe>`
- API: `/api/receipt/[id]` serves files with proper content-type

### Telegram Bot
- Webhook: `/api/telegram/webhook`
- Payment methods: PNB, SBI, Cash, Credit
- Supports: Text, images (OCR), PDFs (text extraction)
- Linking: 6-digit code system

### Currency Conversion
- Live rates from exchangerate-api.com
- Converts all expenses when currency changes
- Stores conversion history in metadata

### Dark Mode
- next-themes integration
- System preference detection
- Persistent across sessions

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Connect repo to Vercel
3. Add environment variables in Vercel dashboard
4. Add `DATABASE_URL` (use connection pooling for serverless)
5. Deploy

### Database (Production)

Use a managed PostgreSQL service:
- Neon
- Supabase
- Railway
- AWS RDS

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Clerk public key |
| `CLERK_SECRET_KEY` | Yes | Clerk secret key |
| `GEMINI_API_KEY` | Yes | Google AI API key |
| `R2_ACCOUNT_ID` | No | Cloudflare R2 account ID |
| `R2_ACCESS_KEY_ID` | No | R2 access key |
| `R2_SECRET_ACCESS_KEY` | No | R2 secret key |
| `R2_BUCKET_NAME` | No | R2 bucket name |
| `TELEGRAM_BOT_TOKEN` | No | Telegram bot token |
| `TELEGRAM_WEBHOOK_SECRET` | No | Webhook verification secret |

## License

MIT

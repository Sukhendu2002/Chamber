# Chamber - AI-Powered Financial Tracker

Chamber is a comprehensive financial management application with AI-powered receipt parsing, Telegram bot integration, account tracking, and loan management.

## Features

### Core Features
- **Expense Tracking**: Add, edit, and categorize expenses with receipt uploads
- **Account Management**: Track bank accounts, investments, and wallet balances with historical graphs
- **Loan Tracking**: Monitor lent money with repayment tracking and receipt storage
- **Subscription Management**: Track recurring subscriptions with automated alerts
- **Telegram Bot**: Add expenses via Telegram with AI-powered receipt parsing
- **AI-Powered**: Extract expense details from receipts using OpenRouter AI models
- **Multi-Currency**: Support for INR, USD, EUR, GBP with live conversion rates
- **Dark Mode**: Toggle between light and dark themes

### Advanced Features
- **Balance History Graph**: Visualize account balances over time with individual account tracking
- **Net Worth Dashboard**: Comprehensive view of all financial assets
- **Receipt Storage**: Upload images and PDFs to Cloudflare R2 with secure access
- **Subscription Alerts**: Automated Telegram notifications for upcoming payments
- **Data Export**: Export financial data in various formats
- **Real-time Updates**: Live dashboard updates via server actions

## Tech Stack

- **Framework**: Next.js 16 (App Router) with TypeScript
- **Database**: PostgreSQL (Neon) + Prisma ORM v7
- **Authentication**: Clerk with middleware protection
- **AI**: OpenRouter API with multiple model fallbacks
- **OCR**: OCR.space API for receipt text extraction
- **Storage**: Cloudflare R2 for file storage
- **Charts**: Recharts for data visualization
- **Styling**: Tailwind CSS v4 + shadcn/ui components
- **Deployment**: Vercel (recommended) or any Node.js platform

## Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- PostgreSQL database (Neon recommended)
- Cloudflare R2 bucket
- Clerk account
- OpenRouter API key
- OCR.space API key (free tier available)
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

# AI & OCR
OPENROUTER_API_KEY=sk-or-...
OCR_SPACE_API_KEY=K85482897388957  # Free tier key

# Cloudflare R2 (for receipts)
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=chamber

# Telegram Bot (optional)
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_WEBHOOK_SECRET=your_webhook_secret

# Cron Job (optional)
CRON_SECRET=your_random_secret
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
│   ├── dashboard/        # Main dashboard with net worth overview
│   ├── expenses/         # Expense list with pagination
│   ├── accounts/         # Bank/investment accounts with balance history
│   ├── loans/            # Loan tracking with repayments
│   ├── subscriptions/    # Subscription management
│   ├── telegram/         # Telegram linking page
│   └── settings/         # User settings
├── (landing)/            # Public landing page
├── api/                  # API routes
│   ├── telegram/webhook  # Telegram bot handler
│   ├── upload            # File upload to R2
│   ├── receipt/[id]      # Serve expense receipts
│   ├── loan-receipt/[id]  # Serve loan receipts
│   ├── repayment-receipt/[id] # Serve repayment receipts
│   └── cron/             # Cron job endpoints
├── layout.tsx            # Root layout with theme provider
└── page.tsx              # Landing page redirect

components/
├── ui/                   # shadcn/ui components
├── expense-table.tsx     # Expense list with actions
├── account-list.tsx      # Account management
├── add-account-dialog.tsx # Add new accounts
├── balance-history-chart.tsx # Balance visualization
├── loan-list.tsx         # Loan tracking
├── add-loan-dialog.tsx   # Add new loans
├── sidebar.tsx           # Navigation sidebar
└── theme-toggle.tsx      # Dark mode toggle

lib/
├── actions/              # Server actions
│   ├── expenses.ts       # Expense CRUD
│   ├── accounts.ts       # Account & balance history
│   ├── loans.ts          # Loan & repayment CRUD
│   └── settings.ts       # Settings + data deletion
├── ai.ts                 # OpenRouter AI integration
├── db.ts                 # Prisma client with connection pooling
├── r2.ts                 # R2 storage utilities
└── subscription-alerts.ts # Cron job helpers

prisma/
└── schema.prisma         # Database schema with all models
```

## Key Features Implementation

### Account Management
- Multiple account types: Bank, Investment, Wallet, Cash, Other
- Balance history tracking with timestamps
- Individual account graphs with Recharts
- Net worth calculation across all accounts
- Account activation/deactivation

### Loan Tracking
- Track money lent to individuals
- Repayment tracking with partial payments
- Receipt storage for loans and repayments
- Status tracking: Pending, Partial, Completed
- Automated calculations for remaining amounts

### Receipt Upload
- Images: Uploaded to R2, displayed with `<img>`
- PDFs: Uploaded to R2, displayed in `<iframe>`
- API: `/api/receipt/[id]` serves files with proper content-type
- Support for multiple receipts per expense/loan

### Telegram Bot
- Webhook: `/api/telegram/webhook`
- Payment methods: PNB, SBI, Cash, Credit
- Supports: Text, images (OCR), PDFs (text extraction)
- Linking: 6-digit code system
- Duplicate expense detection

### Subscription Management
- Track recurring subscriptions
- Automated alerts via Telegram
- Multiple billing cycles: Weekly, Monthly, Quarterly, Yearly
- Custom alert days before due date

### AI Integration
- OpenRouter API with multiple model fallbacks
- OCR.space for receipt text extraction
- Smart expense parsing from images and text
- Confidence scoring for parsed data

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions including:
- Production environment setup
- Multiple deployment options (Vercel, Netlify, Railway, Docker)
- Post-deployment configuration
- Security recommendations
- Troubleshooting guide

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | ✅ | Clerk public key |
| `CLERK_SECRET_KEY` | ✅ | Clerk secret key |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | ✅ | Sign-in page path |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | ✅ | Sign-up page path |
| `OPENROUTER_API_KEY` | ✅ | AI API key for expense parsing |
| `OCR_SPACE_API_KEY` | ❌ | OCR API key (free tier provided) |
| `R2_ACCOUNT_ID` | ✅ | Cloudflare R2 account ID |
| `R2_ACCESS_KEY_ID` | ✅ | R2 access key |
| `R2_SECRET_ACCESS_KEY` | ✅ | R2 secret key |
| `R2_BUCKET_NAME` | ✅ | R2 bucket name |
| `TELEGRAM_BOT_TOKEN` | ❌ | Telegram bot token |
| `TELEGRAM_WEBHOOK_SECRET` | ❌ | Webhook verification secret |
| `CRON_SECRET` | ❌ | Cron job authentication |

## License

MIT

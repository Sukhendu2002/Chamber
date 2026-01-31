# Chamber - Feature Implementation Roadmap

## Overview
This document outlines the phased implementation plan for Chamber, an AI-powered expense tracking application.

---

## Phase 1: Foundation & Authentication (Current)
**Duration: 1-2 days**

### 1.1 Database Setup (Prisma + PostgreSQL)
- [ ] Install Prisma and initialize
- [ ] Create database schema (UserSettings, Expense models)
- [ ] Setup database migrations
- [ ] Create Prisma client singleton

### 1.2 Authentication (Clerk)
- [ ] Install and configure Clerk
- [ ] Setup middleware for protected routes
- [ ] Add ClerkProvider to app layout
- [ ] Create sign-in/sign-up pages
- [ ] Protect dashboard routes

### 1.3 Core Expense CRUD
- [ ] Create expense server actions (create, read, update, delete)
- [ ] Implement "Add Expense" modal/dialog
- [ ] Connect expenses table to real database
- [ ] Add expense editing functionality
- [ ] Add expense deletion with confirmation

### 1.4 User Settings
- [ ] Create user settings on first login
- [ ] Implement budget setting functionality
- [ ] Implement currency preference

---

## Phase 2: Telegram Integration
**Duration: 2-3 days**

### 2.1 Bot Setup
- [ ] Create Telegram bot via BotFather
- [ ] Store bot token in environment variables
- [ ] Create webhook endpoint `/api/telegram/webhook`

### 2.2 Account Linking
- [ ] Generate 6-digit linking codes (with expiry)
- [ ] Store linking codes in database
- [ ] Handle `/start <code>` command
- [ ] Map Telegram chat_id to Clerk user_id
- [ ] Show connection status in UI

### 2.3 Message Processing
- [ ] Validate webhook requests (secret token)
- [ ] Parse incoming text messages
- [ ] Integrate Gemini AI for expense extraction
- [ ] Create expenses from parsed data
- [ ] Send confirmation messages back to user

### 2.4 Receipt Processing
- [ ] Handle photo messages
- [ ] Send images to Gemini for OCR
- [ ] Extract merchant, amount, date from receipts
- [ ] Create expenses from OCR data

---

## Phase 3: Analytics & Insights
**Duration: 1-2 days**

### 3.1 Dashboard Analytics
- [ ] Calculate real monthly totals
- [ ] Show actual category breakdown
- [ ] Display recent expenses from database
- [ ] Implement budget progress tracking

### 3.2 Advanced Charts
- [ ] Monthly spending trends (6 months)
- [ ] Category-wise budget tracking
- [ ] Spending comparison (month-over-month)

### 3.3 Expense Filtering
- [ ] Date range filters
- [ ] Category filters
- [ ] Source filters (Web/Telegram/Statement)
- [ ] Search functionality

---

## Phase 4: Bank Statement Import
**Duration: 2-3 days**

### 4.1 File Upload
- [ ] CSV file upload and parsing
- [ ] PDF file upload (basic parsing)
- [ ] Preview imported transactions

### 4.2 Smart Reconciliation
- [ ] Match imported transactions with existing expenses
- [ ] Detect duplicates (same amount ± 2 days)
- [ ] Mark matched entries as "verified"
- [ ] Handle conflicts and manual resolution

### 4.3 Bulk Operations
- [ ] Import selected transactions
- [ ] Bulk categorization
- [ ] Undo import functionality

---

## Phase 5: Polish & Optimization
**Duration: 1-2 days**

### 5.1 UX Improvements
- [ ] Loading states and skeletons
- [ ] Error handling and toast notifications
- [ ] Mobile responsive refinements
- [ ] Keyboard shortcuts

### 5.2 Performance
- [ ] Implement pagination for expenses
- [ ] Add caching where appropriate
- [ ] Optimize database queries

### 5.3 Data Export
- [ ] Export expenses to CSV
- [ ] Generate monthly reports

---

## Tech Stack Summary

| Component | Technology |
|-----------|------------|
| Framework | Next.js 16 (App Router) |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | Clerk |
| AI | Gemini 1.5 Flash |
| UI | shadcn/ui + Tailwind CSS |
| Charts | Recharts |
| Bot | Telegram Bot API |

---

## Environment Variables Required

```env
# Database
DATABASE_URL="postgresql://..."

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_..."
CLERK_SECRET_KEY="sk_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"

# Telegram
TELEGRAM_BOT_TOKEN="..."
TELEGRAM_WEBHOOK_SECRET="..."

# AI
GEMINI_API_KEY="..."
```

---

## Current Status

- [x] **UI Complete**: All pages built with shadcn components
- [x] **Phase 1**: Complete
  - [x] Prisma schema created (UserSettings, Expense, LinkingCode)
  - [x] Clerk authentication configured
  - [x] Middleware for protected routes
  - [x] Server actions for expenses (CRUD)
  - [x] Server actions for settings
  - [x] Add Expense dialog component
  - [x] Dashboard with real data
  - [x] Expenses page with real data
  - [x] Settings page with save functionality
- [x] **Phase 2**: Complete
  - [x] Telegram linking flow (generate code, copy, refresh)
  - [x] Telegram webhook API route
  - [x] Account linking via /start command
  - [x] Expense parsing from text messages
  - [x] Category auto-detection
- [ ] **Phase 3**: Not Started (Analytics with real data)
- [ ] **Phase 4**: Not Started (Bank Statement Import)
- [ ] **Phase 5**: Not Started (Polish & Optimization)

## Next Steps

1. **Configure Environment Variables**: Set up `.env` with:
   - `DATABASE_URL` - PostgreSQL connection string
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`
   - `TELEGRAM_BOT_TOKEN` and `TELEGRAM_WEBHOOK_SECRET`

2. **Run Database Migration**: `npx prisma migrate dev`

3. **Generate Prisma Client**: `npx prisma generate`

4. **Setup Telegram Bot**: 
   - Create bot via @BotFather
   - Set webhook URL to `https://your-domain.com/api/telegram/webhook`

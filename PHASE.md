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
  - [x] Prisma schema created (UserSettings, Expense, LinkingCode, Subscription)
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
- [x] **Phase 3**: Complete (Analytics & Dashboard)
  - [x] Real monthly totals calculation
  - [x] Category breakdown with pie chart
  - [x] Recent expenses display (5 most recent)
  - [x] Budget progress tracking
  - [x] Expense calendar widget with hover tooltips
  - [x] Date range and category filters
  - [x] Search functionality
- [ ] **Phase 4**: Not Started (Bank Statement Import)
- [x] **Phase 5**: Partial (Polish & Optimization)
  - [x] Export expenses and subscriptions to CSV (with receipt URLs)
  - [x] Delete all data functionality with confirmation
  - [x] Pagination for expenses

---

## Additional Features Implemented

### Subscription Management
- [x] Subscription model with billing cycles (Weekly, Monthly, Quarterly, Yearly, One-time)
- [x] Subscriptions page with calendar view
- [x] Add/Edit/Delete subscriptions
- [x] Auto-create expense when subscription is added
- [x] Auto-create expense when subscription is renewed
- [x] One-time subscriptions auto-deactivate after renewal
- [x] Subscription mode in Add Expense dialog (when "Subscription" category selected)

### Receipt Management
- [x] Receipt upload for expenses (Cloudflare R2 storage)
- [x] Multiple receipts per expense
- [x] Receipt viewing and deletion
- [x] Receipts are protected per user (auth required to access)
- [x] Receipt URLs included in CSV export

### Subscription Alerts
- [x] Event-driven alerts (triggered on expense create/update)
- [x] Telegram notifications for subscriptions due within 7 days
- [x] Alert tracking to prevent duplicate notifications

### Categories
- [x] Food, Travel, Entertainment, Bills, Shopping, Health, Education, General
- [x] Investments category
- [x] Subscription category

### Loan Tracking (Lent Money)
- [x] Loan model with borrower info, amount, status, due date
- [x] Repayment model to track partial payments
- [x] Loans page with stats cards (Total Lent, Outstanding, Pending, Completed)
- [x] Add/Edit/Delete loans
- [x] Add/Delete repayments with automatic status updates
- [x] Progress bar showing repayment percentage
- [x] Loan details dialog with repayment history
- [x] Overdue loan highlighting
- [x] Multiple receipt attachments for loans and repayments
- [x] Automatic status transitions (PENDING → PARTIAL → COMPLETED)

### Account & Investment Tracking
- [x] Account model with types: Bank, Investment, Wallet, Cash, Other
- [x] BalanceHistory model to track every balance update
- [x] Accounts page with stats cards (Net Worth, Bank Balance, Investments, Wallet, Cash)
- [x] Add/Edit/Delete accounts
- [x] Update balance with date and note tracking
- [x] View balance history with change indicators
- [x] Delete individual history entries
- [x] Balance history chart (stacked area chart for banks vs investments)
- [x] Net Worth widget on main dashboard
- [x] Balance trend graph on main dashboard

---

## Receipt Security

Receipts are **protected per user**:
- Stored in Cloudflare R2 with user-specific paths (`receipts/{userId}/{expenseId}/{filename}`)
- API endpoint `/api/receipt/[id]` requires authentication
- Verifies expense ownership before serving receipt
- Other users cannot access receipts they don't own

---

## Next Steps

1. **Phase 4 - Bank Statement Import**:
   - CSV file upload and parsing
   - PDF parsing for bank statements
   - Transaction matching and deduplication
   - Bulk import functionality

2. **Future Enhancements**:
   - Monthly spending reports
   - Budget alerts when approaching limit
   - Recurring expense predictions
   - Mobile app (React Native)

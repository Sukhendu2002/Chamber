# PRD: Chamber (AI-Automated Expense Tracker)

## 1. Project Objective
To eliminate the friction of manual expense tracking by creating an "Input Anywhere" system (Telegram/Web) that automatically categorizes spending using AI, provides deep financial insights, and supports secure bank statement auditing.

## 2. Technical Stack (The "Safety-First" Stack)
- **Framework**: TanStack Start (Full-stack Vite-based framework).
- **Auth & Identity**: Clerk (Session management).
- **Database & ORM**: PostgreSQL + Prisma (Strictly typed relational data).
- **AI Engine**: Gemini 1.5 Flash (Fast OCR for receipts and text parsing).
- **Input Channels**: Telegram Bot API (Webhook-based capture).
- **Analytics**: TanStack Table (for logs) + Recharts (for the dashboard).

## 3. Core Features & User Stories

### A. The "Capture" Engine
- **Telegram Linking (Security Critical)**: Users must link their Telegram account to their Web account via a secure handshake.
    - *Flow*: User generates a 6-digit code on the Web Dashboard -> User sends `/start <code>` to Telegram Bot -> System maps `chat_id` to `clerk_user_id`.
- **Text Capture**: Send "Lunch 450" to the Telegram bot. AI parses: `Amount: 450`, `Category: Food`, `Date: Now`. Bot replies with "✅ Recorded: Lunch (450) - Food".
- **Visual Capture**: Send a receipt image. AI extracts merchant, amount, date.
- **Error Handling**: If AI is unsure, Bot replies: "❓ Could not understand. Please try 'Item Amount'".

### B. The Financial Dashboard
- **Monthly Snapshot**: "Actual Spend" vs "Budget" progress bar.
- **Category breakdown**: Pie charts (Food, Travel, Bills, etc.).
- **Previous Month Logs**: Infinite scroll log with "Search & Filter".

### C. Advanced Analytics & Auditing
- **Bank Statement Upload**: Securely upload .csv/.pdf.
- **Smart Reconciliation (Conflict Resolution)**:
    - When importing a statement, the system checks for existing expenses.
    - *Logic*: If an existing expense exists with **same Amount** AND **Date within ±2 days**, mark statement entry as "Duplicate/Linked".
    - Prevents double counting manual Telegram entries against the official bank record.

## 4. System Architecture
- **Authentication Boundary**: All web routes protected by Clerk. Telegram webhook protected by a shared secret token and internal user mapping.
- **Server Functions**: Handle Gemini API calls and Database mutations.
- **Telegram Webhook**:
    - Route: `/api/telegram/webhook`
    - Security: Validates `X-Telegram-Bot-Api-Secret-Token`.
    - Processing: Checks `from.id` against `UserSettings` table to find the Clerk User ID.

## 5. Data Schema (Prisma)

```prisma
model UserSettings {
  id             String   @id @default(uuid())
  userId         String   @unique // Clerk User ID
  telegramChatId String?  @unique // Linked Telegram Chat ID
  monthlyBudget  Float    @default(0)
  currency       String   @default("USD")
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}

model Expense {
  id          String   @id @default(uuid())
  userId      String   @index // Clerk User ID
  amount      Float
  category    String   @default("General")
  merchant    String?
  description String?
  source      Source   @default(WEB)
  date        DateTime @default(now())
  isVerified  Boolean  @default(false) // True if matched with Bank Statement
  metadata    Json?    // Stores raw OCR text or debug info
  createdAt   DateTime @default(now())
}

enum Source {
  TELEGRAM
  STATEMENT
  WEB
}
```

## 6. Implementation Roadmap

### Phase 1: Foundation & Auth (Week 1)
1.  **Init**: Setup TanStack Start, Clerk, and PostgreSQL.
2.  **Schema**: Deploy Prisma schema with `UserSettings` and `Expense`.
3.  **Web Entry**: Create a simple form to `POST` expenses.
4.  **Dashboard**: Display the `Expense` table using TanStack Table.

### Phase 2: The Telegram Bridge (Week 2)
1.  **Bot Setup**: Create Bot via BotFather, get Token.
2.  **Linking Flow**: Build "Generate Code" UI and "Link Telegram" server function.
3.  **Webhook Handler**: Implement `/api/telegram` to receive messages.
4.  **AI Integration**: Call Gemini Flash to parse text messages.
    - Prompt: "Extract amount, category, merchant from: '${text}'. Return JSON."
5.  **Feedback**: Send confirmation messages back to Telegram.

### Phase 3: Analytics & Import (Week 3)
1.  **Budget UI**: Allow users to set `monthlyBudget` in settings.
2.  **Visualization**: Add Recharts for Category breakdown.
3.  **Statement Import**: File upload -> Parse -> Reconciliation Logic.

# Chamber Development Guide

> **Last Updated**: February 2026  
> **Maintainer**: @Sukhendu2002

This document outlines the coding standards, best practices, and development workflow for contributing to Chamber.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Git Workflow](#git-workflow)
3. [Coding Style Guide](#coding-style-guide)
4. [File & Folder Structure](#file--folder-structure)
5. [Component Patterns](#component-patterns)
6. [Server Actions](#server-actions)
7. [Database Patterns](#database-patterns)
8. [Testing](#testing)
9. [Bug Fix History](#bug-fix-history)
10. [Common Pitfalls](#common-pitfalls)

---

## Getting Started

### Prerequisites

- **Node.js**: v20+ (LTS recommended)
- **pnpm**: v10+ (package manager)
- **PostgreSQL**: v15+ (or Neon serverless)
- **Git**: v2.40+

### Initial Setup

```bash
# Clone the repository
git clone git@github.com:Sukhendu2002/Chamber.git
cd Chamber

# Install dependencies
pnpm install

# Generate Prisma client
pnpm prisma:generate

# Copy environment variables
cp .env.example .env

# Push database schema
npx prisma db push

# Start development server
pnpm dev
```

### Environment Variables

Create a `.env` file with all required variables. See [README.md](./README.md#environment-variables-reference) for the complete list.

**Critical Variables:**
- `DATABASE_URL` - PostgreSQL connection string
- `CLERK_SECRET_KEY` / `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Authentication
- `OPENROUTER_API_KEY` - AI expense parsing
- `R2_*` - Cloudflare R2 for file storage

---

## Git Workflow

### Branch Naming Convention

| Type | Format | Example |
|------|--------|---------|
| Feature | `feature/<short-description>` | `feature/bank-import` |
| Bug Fix | `fix/<issue-or-description>` | `fix/calendar-timezone` |
| Documentation | `docs/<topic>` | `docs/development-guidelines` |
| Refactor | `refactor/<scope>` | `refactor/expense-actions` |
| Hotfix | `hotfix/<critical-issue>` | `hotfix/auth-crash` |

### Development Flow

```
main (production)
  ↑ PR (after review)
dev (integration)
  ↑ PR (feature complete)
feature/xyz (your work)
```

1. **Always branch from `dev`**:
   ```bash
   git checkout dev
   git pull origin dev
   git checkout -b feature/my-feature
   ```

2. **Commit early and often** with meaningful messages:
   ```bash
   git commit -m "feat: add CSV import parser"
   git commit -m "fix: handle empty date in expense form"
   git commit -m "docs: update API documentation"
   ```

3. **Push and create a Pull Request**:
   ```bash
   git push origin feature/my-feature
   # Create PR from GitHub UI targeting `dev` branch
   ```

4. **Never merge directly** - All changes go through PR review.

### Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<optional-scope>): <description>

[optional body]
[optional footer]
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation only
- `style` - Formatting, no code change
- `refactor` - Code change that neither fixes a bug nor adds a feature
- `perf` - Performance improvement
- `test` - Adding tests
- `chore` - Maintenance tasks
- `ci` - CI/CD changes

**Examples:**
```
feat(telegram): add receipt image parsing
fix(dashboard): correct budget calculation for investments
docs: add development guidelines
refactor(actions): consolidate expense queries
```

---

## Coding Style Guide

### TypeScript

1. **Strict typing** - Avoid `any` type. Use `unknown` when type is truly unknown.

   ```typescript
   // ❌ Bad
   function processData(data: any) { ... }
   
   // ✅ Good
   function processData(data: Record<string, unknown>) { ... }
   ```

2. **Type exports** - Export types with the `type` keyword:

   ```typescript
   // ✅ Good
   export type CreateExpenseInput = {
     amount: number;
     category: string;
     merchant?: string;
   };
   ```

3. **Prefer interfaces for objects, types for unions/primitives**:

   ```typescript
   // For object shapes
   interface User {
     id: string;
     name: string;
   }
   
   // For unions and primitives
   type PaymentMethod = "PNB" | "SBI" | "CASH" | "CREDIT";
   type ID = string;
   ```

4. **Use `Record<K, V>` for dynamic objects**:

   ```typescript
   // ✅ Good
   const where: Record<string, unknown> = { userId };
   
   // ❌ Avoid
   const where: { [key: string]: any } = { userId };
   ```

### React / Next.js

1. **Use `"use client"` directive only when necessary**:
   - Client components: user interactions, hooks, browser APIs
   - Server components: data fetching, no interactivity (default)

2. **Component file structure**:

   ```typescript
   "use client"; // Only if needed
   
   // 1. Imports (grouped)
   import { useState } from "react";           // React
   import { useRouter } from "next/navigation"; // Next.js
   import { cn } from "@/lib/utils";           // Local utilities
   import { Button } from "@/components/ui/button"; // UI components
   import { IconPlus } from "@tabler/icons-react"; // Icons
   
   // 2. Types
   type Props = {
     title: string;
     onSubmit: () => void;
   };
   
   // 3. Constants
   const CATEGORIES = ["Food", "Travel", "Bills"] as const;
   
   // 4. Component
   export function MyComponent({ title, onSubmit }: Props) {
     // Hooks first
     const [state, setState] = useState("");
     
     // Event handlers
     const handleClick = () => { ... };
     
     // Render
     return ( ... );
   }
   ```

3. **Named exports for components**:

   ```typescript
   // ✅ Good
   export function ExpenseTable() { ... }
   
   // ❌ Avoid (except for pages)
   export default function ExpenseTable() { ... }
   ```

4. **Use `Link` with `prefetch` for navigation**:

   ```tsx
   <Link href="/dashboard" prefetch={true}>
     Dashboard
   </Link>
   ```

5. **Handle hydration mismatches** with `useSyncExternalStore`:

   ```typescript
   // Pattern used in sidebar.tsx
   const emptySubscribe = () => () => {};
   const mounted = useSyncExternalStore(
     emptySubscribe,
     () => true,   // Client value
     () => false   // Server value
   );
   
   if (!mounted) return <Loading />;
   ```

### CSS / Styling

1. **Use Tailwind CSS** for styling
2. **Use `cn()` utility** for conditional classes:

   ```tsx
   import { cn } from "@/lib/utils";
   
   <div className={cn(
     "base-classes",
     isActive && "active-classes",
     variant === "primary" ? "primary-classes" : "secondary-classes"
   )} />
   ```

3. **Component variants** - Use `class-variance-authority` (CVA):

   ```typescript
   import { cva } from "class-variance-authority";
   
   const buttonVariants = cva(
     "base-classes",
     {
       variants: {
         variant: {
           primary: "bg-primary text-white",
           secondary: "bg-secondary",
         },
         size: {
           sm: "px-2 py-1 text-sm",
           md: "px-4 py-2",
         },
       },
       defaultVariants: {
         variant: "primary",
         size: "md",
       },
     }
   );
   ```

---

## File & Folder Structure

```
chamber/
├── app/                      # Next.js App Router
│   ├── (auth)/               # Auth routes (sign-in, sign-up)
│   ├── (dashboard)/          # Protected dashboard routes
│   │   ├── dashboard/        # Main dashboard
│   │   ├── expenses/         # Expense management
│   │   ├── accounts/         # Account tracking
│   │   ├── loans/            # Loan tracking
│   │   ├── subscriptions/    # Subscription management
│   │   ├── analytics/        # Charts and reports
│   │   ├── import/           # Bank statement import
│   │   ├── telegram/         # Telegram linking
│   │   ├── settings/         # User settings
│   │   └── layout.tsx        # Dashboard layout with sidebar
│   ├── (landing)/            # Public landing page
│   ├── api/                  # API routes
│   │   ├── cron/             # Cron job endpoints
│   │   ├── telegram/         # Telegram webhook
│   │   ├── upload/           # File upload
│   │   └── receipt/          # Receipt serving
│   ├── globals.css           # Global styles
│   └── layout.tsx            # Root layout
├── components/
│   ├── ui/                   # shadcn/ui base components
│   └── *.tsx                 # Feature components
├── lib/
│   ├── actions/              # Server actions (CRUD operations)
│   │   ├── expenses.ts
│   │   ├── accounts.ts
│   │   ├── loans.ts
│   │   ├── subscriptions.ts
│   │   └── settings.ts
│   ├── db.ts                 # Prisma client singleton
│   ├── ai.ts                 # OpenRouter AI integration
│   ├── r2.ts                 # Cloudflare R2 utilities
│   └── utils.ts              # Utility functions
├── prisma/
│   ├── schema.prisma         # Database schema
│   └── migrations/           # Migration history
├── tests/
│   ├── unit/                 # Unit tests (Vitest)
│   ├── e2e/                  # End-to-end tests (Playwright)
│   └── setup.ts              # Test configuration
├── public/                   # Static assets
└── types/                    # Global type definitions
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `ExpenseTable.tsx` |
| Utilities | camelCase | `formatCurrency.ts` |
| Actions | camelCase | `expenses.ts` |
| Pages | lowercase with hyphens | `page.tsx` in `/my-page/` |
| Types | PascalCase | `CreateExpenseInput` |
| Constants | SCREAMING_SNAKE_CASE | `PAYMENT_METHODS` |
| CSS classes | kebab-case | `expense-card` |

---

## Component Patterns

### Client vs Server Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Server Component (default)               │
│  - Data fetching                                            │
│  - Access to backend resources                              │
│  - No useState, useEffect, or event handlers                │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              Client Component ("use client")            ││
│  │  - User interactions (onClick, onChange)                ││
│  │  - Browser APIs (localStorage, window)                  ││
│  │  - React hooks (useState, useEffect)                    ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Data Fetching Pattern

```typescript
// app/(dashboard)/expenses/page.tsx (Server Component)
import { getExpenses } from "@/lib/actions/expenses";
import { ExpenseTable } from "@/components/expense-table";

export default async function ExpensesPage() {
  const expenses = await getExpenses(); // Server-side fetch
  return <ExpenseTable expenses={expenses} />;
}
```

```typescript
// components/expense-table.tsx (Client Component)
"use client";

import { deleteExpense } from "@/lib/actions/expenses";

export function ExpenseTable({ expenses }: { expenses: Expense[] }) {
  const handleDelete = async (id: string) => {
    await deleteExpense(id); // Server action
  };
  
  return ( ... );
}
```

### Dialog/Modal Pattern

```typescript
"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function AddExpenseDialog() {
  const [open, setOpen] = useState(false);
  
  const handleSubmit = async (data: FormData) => {
    await createExpense(data);
    setOpen(false); // Close on success
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add Expense</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Expense</DialogTitle>
        </DialogHeader>
        {/* Form content */}
      </DialogContent>
    </Dialog>
  );
}
```

---

## Server Actions

### Structure

All server actions live in `/lib/actions/` and follow this pattern:

```typescript
"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

// 1. Type definitions
export type CreateExpenseInput = {
  amount: number;
  category: string;
  // ...
};

// 2. Action implementation
export async function createExpense(input: CreateExpenseInput) {
  // A. Auth check (ALWAYS FIRST)
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  
  // B. Business logic
  const expense = await db.expense.create({
    data: {
      userId, // Always scope to user
      ...input,
    },
  });
  
  // C. Revalidate affected paths
  revalidatePath("/dashboard");
  revalidatePath("/expenses");
  
  // D. Return result
  return expense;
}
```

### Best Practices

1. **Always authenticate first** - Every action must check `userId`
2. **Always scope queries to user** - Never expose other users' data
3. **Use `revalidatePath`** - Keep UI in sync after mutations
4. **Handle errors gracefully** - Throw meaningful errors

```typescript
// ❌ Bad - No auth check
export async function deleteExpense(id: string) {
  await db.expense.delete({ where: { id } });
}

// ✅ Good - Auth + user scope
export async function deleteExpense(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  
  await db.expense.deleteMany({
    where: { id, userId }, // Scoped to user
  });
  
  revalidatePath("/expenses");
}
```

---

## Database Patterns

### Prisma Client

The Prisma client is a singleton with connection pooling:

```typescript
// lib/db.ts - DO NOT modify unless necessary
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

// Connection pooling configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,                    // Max connections
  idleTimeoutMillis: 30000,   // Close idle after 30s
  connectionTimeoutMillis: 5000,
});

const adapter = new PrismaPg(pool);
export const db = new PrismaClient({ adapter });
```

### Query Patterns

```typescript
// Pagination
const expenses = await db.expense.findMany({
  where: { userId },
  orderBy: [
    { createdAt: "desc" },
    { id: "desc" }, // Secondary sort for stability
  ],
  take: 20,    // Limit
  skip: offset, // Offset
});

// Filtering with optional parameters
const where: Record<string, unknown> = { userId };

if (options?.category) {
  where.category = options.category;
}

if (options?.startDate || options?.endDate) {
  where.date = {};
  if (options.startDate) (where.date as Record<string, Date>).gte = options.startDate;
  if (options.endDate) (where.date as Record<string, Date>).lte = options.endDate;
}

// Search across multiple fields
if (options?.search) {
  where.OR = [
    { description: { contains: options.search, mode: "insensitive" } },
    { merchant: { contains: options.search, mode: "insensitive" } },
  ];
}
```

### Schema Changes

1. Edit `prisma/schema.prisma`
2. Generate migration:
   ```bash
   npx prisma migrate dev --name your_migration_name
   ```
3. Or push directly (development only):
   ```bash
   npx prisma db push
   ```

---

## Testing

### Running Tests

```bash
# Unit tests (Vitest)
pnpm test          # Watch mode
pnpm test:run      # Single run
pnpm test:coverage # With coverage

# E2E tests (Playwright)
pnpm test:e2e          # Headless
pnpm test:e2e:headed   # With browser
pnpm test:e2e:ui       # Interactive UI
```

### Unit Test Structure

```typescript
// tests/unit/actions/expenses.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createExpense } from "@/lib/actions/expenses";

// Mock dependencies
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(() => Promise.resolve({ userId: "test-user-id" })),
}));

vi.mock("@/lib/db", () => ({
  db: {
    expense: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

describe("createExpense", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create an expense for authenticated user", async () => {
    const input = { amount: 100, category: "Food" };
    
    await createExpense(input);
    
    expect(db.expense.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "test-user-id",
        amount: 100,
      }),
    });
  });

  it("should throw error for unauthenticated user", async () => {
    vi.mocked(auth).mockResolvedValueOnce({ userId: null });
    
    await expect(createExpense({ amount: 100, category: "Food" }))
      .rejects.toThrow("Unauthorized");
  });
});
```

### E2E Test Structure

```typescript
// tests/e2e/dashboard.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  test("should display expense summary", async ({ page }) => {
    await page.goto("/dashboard");
    
    // Wait for content
    await page.waitForLoadState("domcontentloaded");
    
    // Assert
    await expect(page.locator("h1")).toContainText("Dashboard");
    await expect(page.locator("[data-testid='total-spent']")).toBeVisible();
  });
});
```

---

## Bug Fix History

This section documents notable bugs and their resolutions. Reference these when encountering similar issues.

### Receipt Endpoints Cache Control (Feb 2026)
**Commit**: `bd36fca`  
**Issue**: Receipt images were being cached publicly, causing potential security issues.  
**Fix**: Changed cache control from `public` to `private, no-store`.

```typescript
// Before
headers: { "Cache-Control": "public, max-age=31536000" }

// After  
headers: { "Cache-Control": "private, no-store" }
```

### Receipt URL Handling & Calendar Query (Feb 2026)
**Commit**: `89ebdf1`  
**Issue**: Calendar widget was not showing all expenses; receipt URLs were not handled correctly.  
**Fix**: Separated calendar expenses query to fetch wider date range.

```typescript
// Fetch 3-month window for calendar widget
const calendarStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
const calendarEndDate = new Date(now.getFullYear(), now.getMonth() + 2, 0);
```

### Investment Category Name (Feb 2026)
**Commit**: `846c52d`  
**Issue**: Category was named "Investment" (singular) but expected "Investments" (plural).  
**Fix**: Corrected category name to "Investments" across the codebase.

### Budget Calculation for Investments (Feb 2026)
**Commits**: `df633c2`, `c0fa347`, `239c357`  
**Issue**: Investments were incorrectly included/excluded in budget calculations.  
**Fix**: Exclude "Investments" category from remaining budget only, keep in totalSpent and charts.

```typescript
let totalSpent = 0;
let spentExcludingInvestment = 0;

for (const e of monthlyExpenses) {
  totalSpent += e.amount;
  if (e.category !== "Investments") {
    spentExcludingInvestment += e.amount;
  }
}
```

### PaymentMethod Enum Case (Jan 2026)
**Commit**: `7238682`  
**Issue**: Telegram callback_data was using lowercase payment methods, but enum expects uppercase.  
**Fix**: Use uppercase `PaymentMethod` enum values in callback_data.

```typescript
// Before
callback_data: `pay_pnb_${...}`

// After
callback_data: `pay_PNB_${...}`
```

### Prisma Client Dependencies (Jan 2026)
**Commit**: `7fd1f4d`  
**Issue**: Build was failing because `@prisma/client` was in devDependencies.  
**Fix**: Moved `@prisma/client` to dependencies and added `postinstall` script.

```json
{
  "scripts": {
    "postinstall": "prisma generate",
    "prebuild": "prisma generate"
  },
  "dependencies": {
    "@prisma/client": "^7.3.0"
  }
}
```

### Hydration Mismatch in Sidebar (Jan 2026)
**Issue**: Theme toggle and user avatar caused hydration mismatches.  
**Fix**: Use `useSyncExternalStore` to detect client-side mount.

```typescript
const emptySubscribe = () => () => {};
const mounted = useSyncExternalStore(
  emptySubscribe,
  () => true,  // Client: mounted
  () => false  // Server: not mounted
);
```

### Expense Ordering Consistency (Jan 2026)
**Commit**: `521e01f`  
**Issue**: Expenses with same date appeared in random order.  
**Fix**: Added secondary sort by `id` for consistent ordering.

```typescript
orderBy: [
  { createdAt: "desc" },
  { id: "desc" }, // Secondary sort
],
```

---

## Common Pitfalls

### 1. Forgetting Auth Check

```typescript
// ❌ DANGEROUS - No auth check
export async function getExpenses() {
  return db.expense.findMany();
}

// ✅ SAFE
export async function getExpenses() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  return db.expense.findMany({ where: { userId } });
}
```

### 2. Missing `revalidatePath`

After mutations, UI won't update without revalidation:

```typescript
await db.expense.create({ ... });
revalidatePath("/dashboard"); // Required!
revalidatePath("/expenses");  // All affected paths
```

### 3. Hydration Mismatch

Client-only values (like `window`, `localStorage`, user data) cause hydration errors:

```typescript
// ❌ Bad - Will cause hydration mismatch
const theme = localStorage.getItem("theme");

// ✅ Good - Use useEffect or useSyncExternalStore
const [theme, setTheme] = useState<string | null>(null);
useEffect(() => {
  setTheme(localStorage.getItem("theme"));
}, []);
```

### 4. Importing Server Code in Client Components

```typescript
// ❌ Bad - db is server-only
"use client";
import { db } from "@/lib/db"; // Will crash!

// ✅ Good - Use server actions
"use client";
import { getExpenses } from "@/lib/actions/expenses";
```

### 5. Forgetting Prisma Enum Types

When using enums, TypeScript doesn't auto-cast:

```typescript
// ❌ Bad - Type error
await db.expense.create({
  data: { paymentMethod: "PNB" } // String, not enum
});

// ✅ Good - Cast to enum type
await db.expense.create({
  data: {
    paymentMethod: input.paymentMethod as "PNB" | "SBI" | "CASH" | "CREDIT" | undefined
  }
});
```

### 6. Date Timezone Issues

Dates can shift when serialized:

```typescript
// ❌ Bad - May shift timezone
const today = new Date().toISOString().split("T")[0];

// ✅ Good - Use local date constructor
const now = new Date();
const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
```

---

## CI/CD Pipeline

The project uses GitHub Actions for continuous integration. See `.github/workflows/ci.yml`.

### Pipeline Jobs

| Job | Description | Runs On |
|-----|-------------|---------|
| `lint` | ESLint check | Every push/PR |
| `unit-tests` | Vitest unit tests | After lint passes |
| `build` | Next.js build check | After lint passes |
| `e2e-tests` | Playwright tests | After unit tests + build |

### Running CI Locally

```bash
# Lint
pnpm lint

# Unit tests
pnpm test:run

# Build
pnpm build

# E2E tests
pnpm test:e2e
```

---

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Clerk Documentation](https://clerk.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Vitest](https://vitest.dev)
- [Playwright](https://playwright.dev)

---

## Questions?

Open an issue or reach out to the maintainer at [@Sukhendu2002](https://github.com/Sukhendu2002).

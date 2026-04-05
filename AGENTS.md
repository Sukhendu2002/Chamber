# Agent Guidelines for Chamber

This file provides essential guidelines for AI agents working in this repository.

## Build/Lint/Test Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Production build (auto-generates Prisma client) |
| `pnpm lint` | Run ESLint |
| `pnpm test` | Run Vitest in watch mode |
| `pnpm test:run` | Run unit tests once |
| `pnpm test <pattern>` | Run tests matching pattern (e.g., `pnpm test expenses`) |
| `pnpm test:e2e` | Run Playwright E2E tests (headless) |
| `pnpm test:e2e:ui` | Run E2E tests with interactive UI |
| `pnpm prisma:generate` | Generate Prisma client |
| `npx prisma db push` | Push schema to database (dev only) |

**Running a single test file:**
```bash
pnpm test tests/unit/actions/expenses.test.ts
```

**Running a single test by name:**
```bash
pnpm test -t "should create an expense"
```

## Code Style Guidelines

### TypeScript
- **Strict typing required** - No `any` type; use `unknown` when necessary
- **Interfaces for objects**, **types for unions/primitives**
- Use `Record<K, V>` for dynamic key-value objects
- Export types with `type` keyword: `export type MyType = ...`

### React/Next.js
- Server Components by default; use `"use client"` only when needed (hooks, events, browser APIs)
- Named exports for components: `export function MyComponent()` (not default exports)
- Component file order: imports → types → constants → component
- Hooks first inside components, then event handlers, then render

### Imports (grouped and ordered)
```typescript
import { useState } from "react";                    // React
import { useRouter } from "next/navigation";         // Next.js
import { cn } from "@/lib/utils";                    // Local utilities
import { Button } from "@/components/ui/button";     // UI components
import { IconPlus } from "@tabler/icons-react";      // Icons
```

### Naming Conventions
| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `ExpenseTable.tsx` |
| Files | kebab-case | `expense-table.tsx` |
| Types | PascalCase | `CreateExpenseInput` |
| Constants | SCREAMING_SNAKE_CASE | `PAYMENT_METHODS` |
| Utilities | camelCase | `formatCurrency.ts` |

### Error Handling
- Always authenticate first in server actions: `const { userId } = await auth()`
- Throw meaningful errors: `throw new Error("Unauthorized")`
- Use `revalidatePath("/path")` after mutations to refresh UI

### Server Actions Pattern (`lib/actions/`)
```typescript
"use server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function createExpense(input: CreateExpenseInput) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  
  const expense = await db.expense.create({ data: { userId, ...input } });
  
  revalidatePath("/dashboard");
  revalidatePath("/expenses");
  
  return expense;
}
```

### CSS/Styling
- Use Tailwind CSS for all styling
- Use `cn()` utility for conditional classes
- Use `class-variance-authority` (CVA) for component variants

## Testing Guidelines

### Unit Tests (Vitest)
- Location: `tests/unit/`
- Mock Clerk, db, and Next.js modules in `tests/setup.ts`
- Pattern: `describe` → `it` → `expect`

### E2E Tests (Playwright)
- Location: `tests/e2e/`
- Use `page.goto()`, `page.locator()`, `expect()`
- Wait for `domcontentloaded` when needed

## Git Workflow

**CRITICAL: Never commit to `dev` or `main` directly.**

1. Create branch BEFORE any code changes:
   ```bash
   git checkout dev && git pull origin dev
   git checkout -b feature/description  # or fix/, docs/, refactor/
   ```

2. Commit with conventional commits:
   ```
   feat: add new feature
   fix: resolve bug
   docs: update documentation
   refactor: improve code structure
   ```

3. PR to `dev` branch for review

## Common Pitfalls

1. **Missing auth check** - Every server action must verify `userId`
2. **Missing `revalidatePath`** - UI won't update without it
3. **Hydration mismatch** - Use `useSyncExternalStore` for client-only values
4. **Importing server code in client components** - Use server actions instead
5. **Date timezone issues** - Use local date constructor, not ISO strings

## Project Structure

```
app/           # Next.js App Router pages
components/    # React components (ui/ for shadcn)
lib/           # Server actions, utilities, db
prisma/        # Database schema
tests/         # Unit and E2E tests
```

## Environment

- Node.js v20+, pnpm v10+, PostgreSQL v15+
- Path alias: `@/*` resolves to project root
- Strict TypeScript enabled in `tsconfig.json`

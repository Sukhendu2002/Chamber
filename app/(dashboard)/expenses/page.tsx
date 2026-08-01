import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddExpenseDialog } from "@/components/add-expense-dialog";
import { CategoryManager } from "@/components/category-manager";
import { ExpenseTable } from "@/components/expense-table";
import { ExpenseFilters } from "@/components/expense-filters";
import { Pagination } from "@/components/pagination";
import { getExpenses, getExpensesCount, getUserTags } from "@/lib/actions/expenses";
import type { DateRangePreset } from "@/lib/actions/expenses";
import { getUserSettings } from "@/lib/actions/settings";
import { getAccounts } from "@/lib/actions/accounts";
import { getUserCategories } from "@/lib/actions/categories";
import { PageHeader, PageShell } from "@/components/page-shell";

const ITEMS_PER_PAGE = 10;

const DATE_RANGE_PRESETS = ["this_month", "last_month", "last_3_months", "last_6_months", "this_year"] as const;

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; expenseId?: string; search?: string; category?: string; excludeCategory?: string; tags?: string | string[]; dateRange?: string }>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const expenseId = params.expenseId || "";
  const search = params.search || "";
  const category = params.category || "";
  const excludeCategory = params.excludeCategory || "";
  const rawTags = params.tags;
  const tags = rawTags ? (Array.isArray(rawTags) ? rawTags : [rawTags]) : [];
  const dateRange = DATE_RANGE_PRESETS.includes(params.dateRange as DateRangePreset)
    ? (params.dateRange as DateRangePreset)
    : undefined;
  const offset = (page - 1) * ITEMS_PER_PAGE;

  const [expenses, { count: totalCount, totalAmount }, settings, accounts, allTags, userCategories] = await Promise.all([
    getExpenses({
      expenseId: expenseId || undefined,
      limit: ITEMS_PER_PAGE,
      offset,
      search: search || undefined,
      category: category || undefined,
      excludeCategory: excludeCategory || undefined,
      tags: tags.length > 0 ? tags : undefined,
      dateRange,
    }),
    getExpensesCount({
      expenseId: expenseId || undefined,
      search: search || undefined,
      category: category || undefined,
      excludeCategory: excludeCategory || undefined,
      tags: tags.length > 0 ? tags : undefined,
      dateRange,
    }),
    getUserSettings(),
    getAccounts(),
    getUserTags(),
    getUserCategories(),
  ]);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: settings.currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const hasFilters = expenseId || search || category || excludeCategory || tags.length > 0 || dateRange;

  return (
    <PageShell>
      <PageHeader
        title="Expenses"
        description="Manage and track all your expenses"
        actions={
          <>
          <CategoryManager categories={userCategories} />
          <AddExpenseDialog
            currency={settings.currency}
            accounts={accounts.map((account) => ({
              id: account.id,
              name: account.name,
              type: account.type,
              currentBalance: account.currentBalance,
              creditLimit: account.creditLimit,
            }))}
            categories={userCategories}
          />
          </>
        }
      />

      {/* Filters */}
      <ExpenseFilters
        currentExpenseId={expenseId}
        currentSearch={search}
        currentCategory={category}
        currentExcludeCategory={excludeCategory}
        currentTags={tags}
        currentDateRange={dateRange}
        allTags={allTags}
        categories={userCategories.map((userCategory) => userCategory.name)}
      />

      {/* Expenses Table */}
      <Card className="border">
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            {hasFilters
              ? `Filtered Expenses (${totalCount}) - ${formatCurrency(totalAmount)}`
              : `All Expenses (${totalCount}) - ${formatCurrency(totalAmount)}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {expenses.length > 0 ? (
            <>
              <ExpenseTable
                expenses={expenses}
                currency={settings.currency}
                accounts={accounts.map(a => ({ id: a.id, name: a.name, type: a.type }))}
                categories={userCategories}
                allTags={allTags}
              />
              {totalPages > 1 && (
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  search={search}
                  category={category}
                  excludeCategory={excludeCategory}
                  tags={tags}
                  dateRange={dateRange}
                />
              )}
            </>
          ) : (
            <div className="flex h-48 items-center justify-center">
              <p className="text-sm text-muted-foreground">
                {hasFilters
                  ? "No expenses match your filters."
                  : "No expenses yet. Add your first expense to get started."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}

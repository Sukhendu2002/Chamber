import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddExpenseDialog } from "@/components/add-expense-dialog";
import { ExpenseTable } from "@/components/expense-table";
import { ExpenseFilters } from "@/components/expense-filters";
import { Pagination } from "@/components/pagination";
import { getExpenses, getExpensesCount } from "@/lib/actions/expenses";
import { getUserSettings } from "@/lib/actions/settings";
import { getAccounts } from "@/lib/actions/accounts";

const ITEMS_PER_PAGE = 10;

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; category?: string; excludeCategory?: string }>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const search = params.search || "";
  const category = params.category || "";
  const excludeCategory = params.excludeCategory || "";
  const offset = (page - 1) * ITEMS_PER_PAGE;

  const [expenses, { count: totalCount, totalAmount }, settings, accounts] = await Promise.all([
    getExpenses({
      limit: ITEMS_PER_PAGE,
      offset,
      search: search || undefined,
      category: category || undefined,
      excludeCategory: excludeCategory || undefined,
    }),
    getExpensesCount({
      search: search || undefined,
      category: category || undefined,
      excludeCategory: excludeCategory || undefined,
    }),
    getUserSettings(),
    getAccounts(),
  ]);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: settings.currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Expenses</h1>
          <p className="text-sm text-muted-foreground">
            Manage and track all your expenses
          </p>
        </div>
        <AddExpenseDialog accounts={accounts.map(a => ({ id: a.id, name: a.name, type: a.type }))} />
      </div>

      {/* Filters */}
      <ExpenseFilters
        currentSearch={search}
        currentCategory={category}
        currentExcludeCategory={excludeCategory}
      />

      {/* Expenses Table */}
      <Card className="border">
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            {search || category || excludeCategory
              ? `Filtered Expenses (${totalCount}) - ${formatCurrency(totalAmount)}`
              : `All Expenses (${totalCount}) - ${formatCurrency(totalAmount)}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {expenses.length > 0 ? (
            <>
              <ExpenseTable expenses={expenses} currency={settings.currency} accounts={accounts.map(a => ({ id: a.id, name: a.name, type: a.type }))} />
              {totalPages > 1 && (
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  search={search}
                  category={category}
                  excludeCategory={excludeCategory}
                />
              )}
            </>
          ) : (
            <div className="flex h-48 items-center justify-center">
              <p className="text-sm text-muted-foreground">
                {search || category || excludeCategory
                  ? "No expenses match your filters."
                  : "No expenses yet. Add your first expense to get started."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

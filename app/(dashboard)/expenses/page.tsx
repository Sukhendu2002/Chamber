import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddExpenseDialog } from "@/components/add-expense-dialog";
import { ExpenseTable } from "@/components/expense-table";
import { getExpenses } from "@/lib/actions/expenses";
import { getUserSettings } from "@/lib/actions/settings";

export default async function ExpensesPage() {
  const [expenses, settings] = await Promise.all([
    getExpenses({ limit: 100 }),
    getUserSettings(),
  ]);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Expenses</h1>
          <p className="text-sm text-muted-foreground">
            Manage and track all your expenses
          </p>
        </div>
        <AddExpenseDialog />
      </div>

      {/* Expenses Table */}
      <Card className="border">
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            All Expenses ({expenses.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {expenses.length > 0 ? (
            <ExpenseTable expenses={expenses} currency={settings.currency} />
          ) : (
            <div className="flex h-48 items-center justify-center">
              <p className="text-sm text-muted-foreground">
                No expenses yet. Add your first expense to get started.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  IconCurrencyDollar,
  IconReceipt,
  IconWallet,
  IconTrendingUp,
} from "@tabler/icons-react";
import { AddExpenseDialog } from "@/components/add-expense-dialog";
import { getMonthlyStats } from "@/lib/actions/expenses";
import { getUserSettings } from "@/lib/actions/settings";

export default async function DashboardPage() {
  const [stats, settings] = await Promise.all([
    getMonthlyStats(),
    getUserSettings(),
  ]);

  const currentDate = new Date();
  const monthYear = currentDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const budget = settings.monthlyBudget;
  const remaining = budget - stats.totalSpent;
  const budgetUsed = budget > 0 ? Math.round((stats.totalSpent / budget) * 100) : 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: settings.currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const statsData = [
    {
      title: "Total Spent",
      value: formatCurrency(stats.totalSpent),
      subtitle: "This month",
      icon: IconCurrencyDollar,
    },
    {
      title: "Transactions",
      value: stats.transactionCount.toString(),
      subtitle: "This month",
      icon: IconReceipt,
    },
    {
      title: "Budget",
      value: formatCurrency(budget),
      subtitle: `${budgetUsed}% used`,
      icon: IconWallet,
    },
    {
      title: "Remaining",
      value: formatCurrency(remaining),
      subtitle: "left to spend",
      icon: IconTrendingUp,
      valueColor: remaining >= 0 ? "text-green-600" : "text-red-600",
    },
  ];

  const categoryColors: Record<string, string> = {
    Food: "bg-blue-500",
    Travel: "bg-green-500",
    Entertainment: "bg-yellow-500",
    Bills: "bg-red-500",
    Shopping: "bg-purple-500",
    Health: "bg-pink-500",
    Education: "bg-indigo-500",
    General: "bg-gray-500",
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Your financial overview for {monthYear}
          </p>
        </div>
        <AddExpenseDialog />
      </div>

      {/* Stats Grid */}
      <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsData.map((stat) => (
          <Card key={stat.title} className="border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${stat.valueColor || ""}`}
              >
                {stat.value}
              </div>
              <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Spending by Category */}
        <Card className="border">
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Spending by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(stats.categoryBreakdown).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(stats.categoryBreakdown).map(([category, amount]) => (
                  <div key={category} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-3 w-3 rounded-full ${categoryColors[category] || "bg-gray-500"}`}
                      />
                      <span className="text-sm">{category}</span>
                    </div>
                    <span className="text-sm font-medium">
                      {formatCurrency(amount)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-48 items-center justify-center">
                <p className="text-sm text-muted-foreground">
                  No expenses this month
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Expenses */}
        <Card className="border">
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Recent Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.expenses.length > 0 ? (
              <div className="space-y-3">
                {stats.expenses.map((expense) => (
                  <div
                    key={expense.id}
                    className="flex items-center justify-between border-b pb-2 last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {expense.description || expense.merchant || expense.category}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(expense.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {formatCurrency(expense.amount)}
                      </p>
                      <Badge variant="secondary" className="text-xs">
                        {expense.category}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-48 items-center justify-center">
                <p className="text-sm text-muted-foreground">No recent expenses</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

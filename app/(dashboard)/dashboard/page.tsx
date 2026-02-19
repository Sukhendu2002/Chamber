import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  IconCurrencyRupee,
  IconCurrencyDollar,
  IconCurrencyEuro,
  IconCurrencyPound,
  IconReceipt,
  IconWallet,
  IconTrendingUp,
  IconBuildingBank,
  IconChartLine,
} from "@tabler/icons-react";
import { AddExpenseDialog } from "@/components/add-expense-dialog";
import { getMonthlyStats } from "@/lib/actions/expenses";
import { getUserSettings } from "@/lib/actions/settings";
import { ExpenseCalendarWidget } from "@/components/expense-calendar-widget";
import { getAccounts, getAccountStats, getAllBalanceHistory } from "@/lib/actions/accounts";
import { BalanceHistoryChart } from "@/components/balance-history-chart";
import Link from "next/link";
import { DashboardWidgets, DEFAULT_DASHBOARD_WIDGETS } from "@/types/dashboard";

export default async function DashboardPage() {
  const [stats, settings, accountStats, balanceHistory, accounts] = await Promise.all([
    getMonthlyStats(),
    getUserSettings(),
    getAccountStats(),
    getAllBalanceHistory(6),
    getAccounts(),
  ]);

  const currentDate = new Date();
  const monthYear = currentDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const budget = settings.monthlyBudget;
  const remaining = budget - stats.spentExcludingInvestment;
  const budgetUsed = budget > 0 ? Math.round((stats.totalSpent / budget) * 100) : 0;

  // Get dashboard widget settings with defaults
  const widgets: DashboardWidgets = {
    ...DEFAULT_DASHBOARD_WIDGETS,
    ...((settings.dashboardWidgets as DashboardWidgets) || {}),
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: settings.currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Select icon based on currency
  const getCurrencyIcon = () => {
    switch (settings.currency) {
      case "INR":
        return IconCurrencyRupee;
      case "EUR":
        return IconCurrencyEuro;
      case "GBP":
        return IconCurrencyPound;
      case "USD":
      default:
        return IconCurrencyDollar;
    }
  };

  const CurrencyIcon = getCurrencyIcon();

  const statsData = [
    {
      title: "Total Spent",
      value: formatCurrency(stats.totalSpent),
      subtitle: "This month",
      icon: CurrencyIcon,
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

  // Check if any widget is enabled
  const hasAnyWidget = widgets.showStats || widgets.showNetWorth || widgets.showBalanceTrend ||
    widgets.showCalendar || widgets.showCategories || widgets.showRecent;

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Your financial overview for {monthYear}
          </p>
        </div>
        <AddExpenseDialog accounts={accounts.map(a => ({ id: a.id, name: a.name, type: a.type }))} />
      </div>

      {/* Stats Grid - Always full width row */}
      {widgets.showStats && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
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
      )}

      {/* Main Widget Grid - Responsive flowing layout */}
      {(widgets.showNetWorth || widgets.showBalanceTrend || widgets.showCalendar || widgets.showCategories || widgets.showRecent) && (
        <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Net Worth Widget */}
          {widgets.showNetWorth && (
            <Card className="border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Net Worth</CardTitle>
                <Link href="/accounts" className="text-xs text-blue-500 hover:underline">
                  View All
                </Link>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-4">
                  {formatCurrency(accountStats.totalNetWorth)}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <IconBuildingBank className="h-4 w-4 text-blue-500" />
                    <div>
                      <div className="text-xs text-muted-foreground">Banks</div>
                      <div className="font-medium">{formatCurrency(accountStats.totalBankBalance)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <IconChartLine className="h-4 w-4 text-green-500" />
                    <div>
                      <div className="text-xs text-muted-foreground">Investments</div>
                      <div className="font-medium">{formatCurrency(accountStats.totalInvestments)}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Balance Trend Widget */}
          {widgets.showBalanceTrend && (
            <Card className="border">
              <CardHeader>
                <CardTitle className="text-sm font-medium">Balance Trend</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <BalanceHistoryChart
                  accounts={balanceHistory.accounts}
                  timeline={balanceHistory.timeline}
                  currency={settings.currency}
                />
              </CardContent>
            </Card>
          )}

          {/* Expense Calendar Widget */}
          {widgets.showCalendar && (
            <ExpenseCalendarWidget
              expenses={stats.calendarExpenses.map((e: { id: string; amount: number; category: string; merchant: string | null; description: string | null; date: Date }) => ({
                id: e.id,
                amount: e.amount,
                category: e.category,
                merchant: e.merchant,
                description: e.description,
                date: e.date,
              }))}
              currency={settings.currency}
            />
          )}

          {/* Spending by Category Widget */}
          {widgets.showCategories && (
            <Card className="border">
              <CardHeader>
                <CardTitle className="text-sm font-medium">
                  Spending by Category
                </CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(stats.categoryBreakdown).length > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(stats.categoryBreakdown as Record<string, number>).map(([category, amount]) => (
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
          )}

          {/* Recent Expenses Widget */}
          {widgets.showRecent && (
            <Card className="border">
              <CardHeader>
                <CardTitle className="text-sm font-medium">
                  Recent Expenses
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats.expenses.length > 0 ? (
                  <div className="space-y-3">
                    {stats.expenses.map((expense: { id: string; description: string | null; merchant: string | null; category: string; date: Date; amount: number }) => (
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
          )}
        </div>
      )}

      {/* Empty state when all widgets are disabled */}
      {!hasAnyWidget && (
        <Card className="border">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <p className="text-muted-foreground mb-2">No widgets enabled</p>
            <p className="text-sm text-muted-foreground">
              Go to <Link href="/settings" className="text-primary hover:underline">Settings</Link> to enable dashboard widgets.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

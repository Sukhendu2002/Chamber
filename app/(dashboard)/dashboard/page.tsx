import type { ComponentType } from "react";
import Link from "next/link";
import {
  IconAlertCircle,
  IconArrowUpRight,
  IconBuildingBank,
  IconChartLine,
  IconCreditCard,
  IconCurrencyDollar,
  IconCurrencyEuro,
  IconCurrencyPound,
  IconCurrencyRupee,
  IconReceipt,
  IconTrendingUp,
  IconWallet,
} from "@tabler/icons-react";

import { AddExpenseDialog } from "@/components/add-expense-dialog";
import { BalanceHistoryChart } from "@/components/balance-history-chart";
import { DashboardMonthPicker } from "@/components/dashboard-month-picker";
import { ExpenseCalendarWidget } from "@/components/expense-calendar-widget";
import { ForecastWidget } from "@/components/forecast-widget";
import { PageHeader, PageShell } from "@/components/page-shell";
import {
  SpendingTrendChart,
  type SpendingTrendPoint,
} from "@/components/spending-trend-chart";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAccounts, getAccountStats, getAllBalanceHistory } from "@/lib/actions/accounts";
import { getUserCategories } from "@/lib/actions/categories";
import { getMonthlyStats } from "@/lib/actions/expenses";
import { getForecastData, getUpcomingRecurringAlerts } from "@/lib/actions/forecasting";
import { getUserSettings } from "@/lib/actions/settings";
import { DashboardWidgets, DEFAULT_DASHBOARD_WIDGETS } from "@/types/dashboard";

interface CompactMetricCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: ComponentType<{ className?: string }>;
  values: number[];
  tone?: "primary" | "success";
  href?: string;
}

const CATEGORY_TONES = [
  "bg-primary",
  "bg-chart-2",
  "bg-chart-3",
  "bg-chart-5",
  "bg-chart-4",
] as const;

function MiniSparkline({ values }: { values: number[] }) {
  const width = 112;
  const height = 38;
  const padding = 3;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);
  const points = values
    .map((value, index) => {
      const x = padding + (index / Math.max(values.length - 1, 1)) * (width - padding * 2);
      const y = height - padding - ((value - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg aria-hidden="true" viewBox={`0 0 ${width} ${height}`} className="h-10 w-28 overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function CompactMetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  values,
  tone = "primary",
  href,
}: CompactMetricCardProps) {
  const content = (
    <Card className="group h-full hover:border-primary/35">
      <CardContent className="flex h-full items-center gap-3">
        <span
          className={
            tone === "success"
              ? "flex size-9 shrink-0 items-center justify-center rounded-md bg-chart-2/15 text-chart-2"
              : "flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary text-primary"
          }
        >
          <Icon aria-hidden="true" className="size-5 stroke-[1.8]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          <p className="mt-0.5 truncate text-xl font-semibold tracking-[-0.035em] tabular-nums">
            {value}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <div
          className={
            tone === "success"
              ? "hidden shrink-0 text-chart-2 sm:block xl:hidden 2xl:block"
              : "hidden shrink-0 text-primary/65 sm:block xl:hidden 2xl:block"
          }
        >
          <MiniSparkline values={values} />
        </div>
      </CardContent>
    </Card>
  );

  return href ? (
    <Link href={href} className="block h-full rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {content}
    </Link>
  ) : (
    content
  );
}

interface DashboardPageProps {
  searchParams: Promise<{ month?: string }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const now = new Date();
  const monthMatch = params.month?.match(/^(\d{4})-(\d{2})$/);
  const selectedYear = monthMatch ? Number(monthMatch[1]) : now.getFullYear();
  const selectedMonth = monthMatch ? Number(monthMatch[2]) : now.getMonth() + 1;
  const hasValidMonth =
    selectedYear >= 2000 &&
    selectedYear <= 2100 &&
    selectedMonth >= 1 &&
    selectedMonth <= 12;
  const dashboardYear = hasValidMonth ? selectedYear : now.getFullYear();
  const dashboardMonth = hasValidMonth ? selectedMonth : now.getMonth() + 1;
  const selectedDate = new Date(dashboardYear, dashboardMonth - 1, 1);
  const monthValue = `${dashboardYear}-${String(dashboardMonth).padStart(2, "0")}`;

  const [stats, settings, accountStats, balanceHistory, accounts, categories, forecast, alerts] = await Promise.all([
    getMonthlyStats({ year: dashboardYear, month: dashboardMonth }),
    getUserSettings(),
    getAccountStats(),
    getAllBalanceHistory(6),
    getAccounts(),
    getUserCategories(),
    getForecastData(),
    getUpcomingRecurringAlerts(),
  ]);

  const monthYear = selectedDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const budget = settings.monthlyBudget;
  const spentForBudget = stats.spentExcludingInvestment;
  const remaining = budget - spentForBudget;
  const overspent = Math.max(spentForBudget - budget, 0);
  const budgetUsed = budget > 0 ? Math.round((spentForBudget / budget) * 100) : 0;
  const budgetMultiple = budget > 0 ? spentForBudget / budget : 0;
  const budgetMarker = budget > 0
    ? Math.min(Math.max((budget / Math.max(spentForBudget, budget)) * 100, 6), 94)
    : 0;
  const isCurrentMonth =
    dashboardYear === now.getFullYear() && dashboardMonth === now.getMonth() + 1;
  const daysInSelectedMonth = new Date(dashboardYear, dashboardMonth, 0).getDate();
  const elapsedDays = isCurrentMonth ? now.getDate() : daysInSelectedMonth;
  const trendDayCount = isCurrentMonth ? elapsedDays : daysInSelectedMonth;
  const dailyAverage = stats.totalSpent / Math.max(elapsedDays, 1);

  const widgets: DashboardWidgets = {
    ...DEFAULT_DASHBOARD_WIDGETS,
    ...((settings.dashboardWidgets as DashboardWidgets) || {}),
  };

  const formatCurrency = (amount: number, decimals = 2) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: settings.currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(amount);

  const currencyIcons = {
    INR: IconCurrencyRupee,
    EUR: IconCurrencyEuro,
    GBP: IconCurrencyPound,
    USD: IconCurrencyDollar,
  };
  const CurrencyIcon = currencyIcons[settings.currency as keyof typeof currencyIcons] || IconCurrencyDollar;

  const selectedMonthExpenses = stats.calendarExpenses.filter((expense) => {
    const expenseDate = new Date(expense.date);
    return (
      expenseDate.getFullYear() === dashboardYear &&
      expenseDate.getMonth() === dashboardMonth - 1
    );
  });
  const trendData: SpendingTrendPoint[] = Array.from(
    { length: trendDayCount },
    (_, index) => {
      const date = new Date(dashboardYear, dashboardMonth - 1, index + 1);
      const dayExpenses = selectedMonthExpenses.filter((expense) => {
        const expenseDate = new Date(expense.date);
        return expenseDate.getDate() === date.getDate();
      });

      return {
        date: date.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        }),
        label: date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        value: dayExpenses.reduce((sum, expense) => sum + expense.amount, 0),
      };
    },
  );
  const transactionTrend = trendData.map((_, index) => {
    return selectedMonthExpenses.filter((expense) => {
      const expenseDate = new Date(expense.date);
      return expenseDate.getDate() === index + 1;
    }).length;
  });
  const trendValues = trendData.map((day) => day.value);

  const topCategories = Object.entries(stats.categoryBreakdown as Record<string, number>)
    .sort(([, first], [, second]) => second - first)
    .slice(0, 5);
  const largestCategory = Math.max(...topCategories.map(([, amount]) => amount), 1);

  const hasAnyWidget =
    widgets.showStats ||
    widgets.showNetWorth ||
    widgets.showBalanceTrend ||
    widgets.showForecast ||
    widgets.showCalendar ||
    widgets.showCategories ||
    widgets.showRecent;

  return (
    <PageShell>
      <PageHeader
        title={greeting}
        description={`Here’s your financial overview for ${monthYear}`}
        actions={
          <>
            <DashboardMonthPicker value={monthValue} />
            <AddExpenseDialog
              triggerClassName="h-9"
              currency={settings.currency}
              accounts={accounts.map((account) => ({
                id: account.id,
                name: account.name,
                type: account.type,
                currentBalance: account.currentBalance,
                creditLimit: account.creditLimit,
              }))}
              categories={categories}
            />
          </>
        }
      />

      {widgets.showStats && (
        <section aria-label="Monthly financial overview" className="grid gap-3 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader className="grid-cols-[auto_1fr_auto] items-center gap-x-3">
              <span className="row-span-2 flex size-9 items-center justify-center rounded-md bg-secondary text-primary">
                <IconWallet aria-hidden="true" className="size-5 stroke-[1.8]" />
              </span>
              <CardTitle>Monthly budget</CardTitle>
              <CardDescription className="col-start-2">Your progress for {monthYear}</CardDescription>
              <CardAction className="col-start-3 row-start-1 row-span-2 self-center">
                <Link
                  href="/analytics"
                  className="inline-flex min-h-8 items-center gap-1 rounded-sm px-2 text-xs font-semibold text-primary transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  View report
                  <IconArrowUpRight aria-hidden="true" className="size-4" />
                </Link>
              </CardAction>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col justify-between gap-5">
              <div className="grid gap-4 sm:grid-cols-3 sm:divide-x sm:divide-border">
                <div>
                  <p className="text-sm text-muted-foreground">Budget</p>
                  <p className="mt-1 text-2xl font-semibold tracking-[-0.035em] tabular-nums">
                    {formatCurrency(budget)}
                  </p>
                </div>
                <div className="sm:pl-4">
                  <p className="text-sm text-muted-foreground">Spent (excl. investments)</p>
                  <p className="mt-1 text-2xl font-semibold tracking-[-0.035em] tabular-nums">
                    {formatCurrency(spentForBudget)}
                  </p>
                </div>
                <div className="sm:pl-4">
                  <p className="text-sm text-muted-foreground">{remaining < 0 ? "Overspent" : "Remaining"}</p>
                  <p
                    className={
                      remaining < 0
                        ? "mt-1 text-2xl font-semibold tracking-[-0.035em] text-destructive tabular-nums"
                        : "mt-1 text-2xl font-semibold tracking-[-0.035em] text-chart-2 tabular-nums"
                    }
                  >
                    {formatCurrency(Math.abs(remaining))}
                  </p>
                </div>
              </div>

              {budget > 0 ? (
                <div className="space-y-3">
                  <div className="relative h-3 rounded-full bg-muted">
                    <div
                      className="absolute inset-y-0 left-0 rounded-l-full bg-primary"
                      style={{ width: `${budgetMarker}%` }}
                    />
                    <div
                      className={remaining < 0 ? "absolute inset-y-0 right-0 rounded-r-full bg-destructive" : "absolute inset-y-0 right-0 rounded-r-full bg-chart-2"}
                      style={{ width: `${100 - budgetMarker}%` }}
                    />
                    <span
                      aria-hidden="true"
                      className="absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-card bg-muted-foreground shadow-sm"
                      style={{ left: `${budgetMarker}%` }}
                    />
                    <span
                      aria-hidden="true"
                      className={remaining < 0 ? "absolute right-0 top-1/2 size-4 -translate-y-1/2 rounded-full border-[3px] border-destructive bg-card" : "absolute right-0 top-1/2 size-4 -translate-y-1/2 rounded-full border-[3px] border-chart-2 bg-card"}
                    />
                  </div>
                  <div className="grid grid-cols-3 text-xs text-muted-foreground">
                    <span>₹0<br />Start</span>
                    <span className="text-center">{formatCurrency(budget)}<br />Budget</span>
                    <span className="text-right">{formatCurrency(spentForBudget)}<br />Spent</span>
                  </div>
                </div>
              ) : (
                <div className="rounded-md border border-dashed border-primary/35 bg-secondary/55 p-3 text-sm text-secondary-foreground">
                  Add a monthly budget in Settings to see progress and overspend guidance.
                </div>
              )}

              <div
                className={
                  remaining < 0
                    ? "flex flex-col gap-2 rounded-md border border-destructive/15 bg-destructive/[0.055] px-3 py-2.5 text-xs sm:flex-row sm:items-center sm:justify-between"
                    : "flex flex-col gap-2 rounded-md border border-chart-2/20 bg-chart-2/[0.08] px-3 py-2.5 text-xs sm:flex-row sm:items-center sm:justify-between"
                }
              >
                <span className="inline-flex items-center gap-2 font-semibold">
                  {remaining < 0 ? (
                    <IconAlertCircle aria-hidden="true" className="size-4 text-destructive" />
                  ) : (
                    <IconTrendingUp aria-hidden="true" className="size-4 text-chart-2" />
                  )}
                  {budget > 0
                    ? budgetMultiple >= 1
                      ? `${budgetMultiple.toFixed(1)}× budget used`
                      : `${budgetUsed}% budget used`
                    : "No budget configured"}
                </span>
                <span className={remaining < 0 ? "font-semibold text-destructive tabular-nums" : "font-semibold text-chart-2 tabular-nums"}>
                  {remaining < 0
                    ? `${formatCurrency(overspent)} over budget`
                    : `${formatCurrency(remaining)} left to spend`}
                </span>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <CompactMetricCard
              title="Total spent"
              value={formatCurrency(stats.totalSpent)}
              subtitle={monthYear}
              icon={CurrencyIcon}
              values={trendValues}
              href="/expenses"
            />
            <CompactMetricCard
              title="Transactions"
              value={stats.transactionCount.toString()}
              subtitle={monthYear}
              icon={IconReceipt}
              values={transactionTrend}
              tone="success"
              href="/expenses"
            />
            <CompactMetricCard
              title="Daily average"
              value={formatCurrency(dailyAverage)}
              subtitle={`Across ${elapsedDays} days`}
              icon={IconTrendingUp}
              values={trendValues}
            />
          </div>
        </section>
      )}

      {(widgets.showStats || widgets.showCategories || widgets.showRecent) && (
        <section aria-label="Spending details" className="mt-3 grid gap-3 xl:grid-cols-3">
          {widgets.showStats && (
            <Card>
              <CardHeader>
                <CardTitle>Spending trend</CardTitle>
                <CardDescription>Daily totals for {monthYear}</CardDescription>
                <CardAction>
                  <Badge variant="secondary">{monthYear}</Badge>
                </CardAction>
              </CardHeader>
              <CardContent>
                <SpendingTrendChart data={trendData} currency={settings.currency} />
              </CardContent>
            </Card>
          )}

          {widgets.showCategories && (
            <Card>
              <CardHeader>
                <CardTitle>Top categories</CardTitle>
                <CardDescription>By amount spent</CardDescription>
                <CardAction>
                  <Link href="/analytics" className="text-sm font-semibold text-primary hover:underline">
                    View all
                  </Link>
                </CardAction>
              </CardHeader>
              <CardContent>
                {topCategories.length > 0 ? (
                  <div className="space-y-3">
                    {topCategories.map(([category, amount], index) => (
                      <div key={category}>
                        <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                          <span className="flex min-w-0 items-center gap-2.5 font-medium">
                            <span className={`size-2.5 shrink-0 rounded-full ${CATEGORY_TONES[index]}`} />
                            <span className="truncate">{category}</span>
                          </span>
                          <span className="shrink-0 font-semibold tabular-nums">
                            {formatCurrency(amount, 0)}
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-sm bg-muted">
                          <div
                            className={`h-full rounded-sm ${CATEGORY_TONES[index]}`}
                            style={{ width: `${Math.max((amount / largestCategory) * 100, 5)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex min-h-52 items-center justify-center text-sm text-muted-foreground">
                    No category spending this month
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {widgets.showRecent && (
            <Card>
              <CardHeader>
                <CardTitle>Recent expenses</CardTitle>
                <CardDescription>Latest activity</CardDescription>
                <CardAction>
                  <Link href="/expenses" className="text-sm font-semibold text-primary hover:underline">
                    View all
                  </Link>
                </CardAction>
              </CardHeader>
              <CardContent>
                {stats.expenses.length > 0 ? (
                  <div className="divide-y divide-border">
                    {stats.expenses.map((expense) => (
                      <Link
                        key={expense.id}
                        href="/expenses"
                        className="flex min-h-12 items-center gap-2.5 rounded-sm px-1 transition-colors hover:bg-muted/45"
                      >
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                          <IconReceipt aria-hidden="true" className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">
                            {expense.description || expense.merchant || expense.category}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {expense.category} ·{" "}
                            {new Date(expense.date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </span>
                        <span className="shrink-0 text-sm font-semibold tabular-nums">
                          -{formatCurrency(expense.amount)}
                        </span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="flex min-h-52 items-center justify-center text-sm text-muted-foreground">
                    No recent expenses
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </section>
      )}

      {(widgets.showNetWorth || widgets.showBalanceTrend || widgets.showForecast || widgets.showCalendar) && (
        <section aria-labelledby="more-insights-title" className="mt-4">
          <div className="mb-3 flex items-end justify-between">
            <div>
              <p className="eyebrow">Portfolio</p>
              <h2 id="more-insights-title" className="mt-1 text-xl font-semibold tracking-[-0.025em]">
                More insights
              </h2>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {widgets.showNetWorth && (
              <Card>
                <CardHeader>
                  <CardTitle>Net worth</CardTitle>
                  <CardDescription>Across all tracked accounts</CardDescription>
                  <CardAction>
                    <Link href="/accounts" className="text-sm font-semibold text-primary hover:underline">
                      View all
                    </Link>
                  </CardAction>
                </CardHeader>
                <CardContent>
                  <div className="metric-value mb-5">{formatCurrency(accountStats.totalNetWorth)}</div>
                  <div className="grid divide-y border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                    <div className="p-3">
                      <IconBuildingBank className="mb-2 size-4 text-primary" />
                      <div className="text-xs text-muted-foreground">Banks</div>
                      <div className="mt-0.5 truncate text-sm font-semibold tabular-nums">
                        {formatCurrency(accountStats.totalBankBalance, 0)}
                      </div>
                    </div>
                    <div className="p-3">
                      <IconChartLine className="mb-2 size-4 text-chart-2" />
                      <div className="text-xs text-muted-foreground">Investments</div>
                      <div className="mt-0.5 truncate text-sm font-semibold tabular-nums">
                        {formatCurrency(accountStats.totalInvestments, 0)}
                      </div>
                    </div>
                    <div className="p-3">
                      <IconCreditCard className="mb-2 size-4 text-destructive" />
                      <div className="text-xs text-muted-foreground">Card debt</div>
                      <div className="mt-0.5 truncate text-sm font-semibold text-destructive tabular-nums">
                        {formatCurrency(accountStats.totalCreditCardOutstanding, 0)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {widgets.showBalanceTrend && (
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Balance trend</CardTitle>
                  <CardDescription>Six-month account history</CardDescription>
                </CardHeader>
                <CardContent>
                  <BalanceHistoryChart
                    accounts={balanceHistory.accounts}
                    timeline={balanceHistory.timeline}
                    currency={settings.currency}
                  />
                </CardContent>
              </Card>
            )}

            {widgets.showForecast && (
              <ForecastWidget forecast={forecast} currency={settings.currency} alerts={alerts} />
            )}

            {widgets.showCalendar && (
              <ExpenseCalendarWidget
                key={monthValue}
                expenses={stats.calendarExpenses.map((expense) => ({
                  id: expense.id,
                  amount: expense.amount,
                  category: expense.category,
                  merchant: expense.merchant,
                  description: expense.description,
                  date: expense.date,
                }))}
                currency={settings.currency}
                initialDate={selectedDate}
              />
            )}
          </div>
        </section>
      )}

      {!hasAnyWidget && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <IconWallet aria-hidden="true" className="mb-4 size-10 text-muted-foreground/50" />
            <p className="font-semibold">No widgets enabled</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Turn dashboard sections back on from{" "}
              <Link href="/settings" className="font-semibold text-primary hover:underline">
                Settings
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      )}
    </PageShell>
  );
}

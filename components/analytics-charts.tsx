"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import {
  IconCalendarStats,
  IconArrowUpRight,
  IconArrowDownRight,
  IconReceipt,
  IconCurrencyRupee,
  IconSparkles,
  IconTrendingUp,
} from "@tabler/icons-react";

type CategoryData = {
  name: string;
  value: number;
  color: string;
};

type MonthlyData = {
  month: string;
  spent: number;
};

type DailySpending = {
  date: string;
  amount: number;
};

type TopMerchant = {
  name: string;
  amount: number;
};

type AnalyticsChartsProps = {
  totalSpent: number;
  budget: number;
  categoryData: CategoryData[];
  monthlyData: MonthlyData[];
  currency: string;
  dailySpending: DailySpending[];
  topMerchants: TopMerchant[];
  averageDailySpend: number;
  previousMonthSpent: number;
  highestSpendingDay: { date: string; amount: number };
  transactionCount: number;
  aiInsights: string[];
};

export function AnalyticsCharts({
  totalSpent,
  budget,
  categoryData,
  monthlyData,
  currency,
  dailySpending,
  topMerchants,
  averageDailySpend,
  previousMonthSpent,
  highestSpendingDay,
  transactionCount,
  aiInsights,
}: AnalyticsChartsProps) {
  const budgetPercentage = budget > 0 ? Math.round((totalSpent / budget) * 100) : 0;

  const momChange = previousMonthSpent > 0
    ? Math.round(((totalSpent - previousMonthSpent) / previousMonthSpent) * 100)
    : 0;
  const isMomUp = momChange >= 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const summaryStats = [
    {
      title: "Avg. Daily Spend",
      value: formatCurrency(averageDailySpend),
      icon: IconCurrencyRupee,
      color: "text-blue-500",
    },
    {
      title: "Highest Day",
      value: highestSpendingDay.date
        ? `${formatCurrency(highestSpendingDay.amount)}`
        : "N/A",
      subtitle: highestSpendingDay.date || undefined,
      icon: IconCalendarStats,
      color: "text-orange-500",
    },
    {
      title: "Month-over-Month",
      value: `${isMomUp ? "+" : ""}${momChange}%`,
      icon: isMomUp ? IconArrowUpRight : IconArrowDownRight,
      color: isMomUp ? "text-red-500" : "text-green-500",
    },
    {
      title: "Transactions",
      value: transactionCount.toString(),
      icon: IconReceipt,
      color: "text-purple-500",
    },
  ];

  return (
    <>
      {/* Summary Stats Row */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {summaryStats.map((stat) => (
          <Card key={stat.title} className="border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              {stat.subtitle && (
                <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Budget Overview */}
      <Card className="mb-6 border">
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Monthly Budget Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-2xl font-bold">
              {formatCurrency(totalSpent)}
            </span>
            <span className="text-sm text-muted-foreground">
              of {formatCurrency(budget)} budget
            </span>
          </div>
          <Progress value={Math.min(budgetPercentage, 100)} className="h-2" />
          <p className="mt-2 text-sm text-muted-foreground">
            {budgetPercentage}% of monthly budget used
          </p>
        </CardContent>
      </Card>

      {/* AI Insights Card */}
      {aiInsights.length > 0 && (
        <Card className="mb-6 border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader className="flex flex-row items-center gap-2">
            <IconSparkles className="h-5 w-5 text-primary" />
            <CardTitle className="text-sm font-medium">AI Spending Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {aiInsights.map((insight, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <IconTrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-primary/70" />
                  <span className="text-muted-foreground">{insight}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Daily Spending Area Chart */}
      {dailySpending.length > 0 && (
        <Card className="mb-6 border">
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Daily Spending This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailySpending}>
                  <defs>
                    <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0088FE" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0088FE" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value))}
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#0088FE"
                    fillOpacity={1}
                    fill="url(#colorAmount)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts Grid */}
      <div className="mb-6 grid gap-6 md:grid-cols-2">
        {/* Spending by Category Pie Chart */}
        <Card className="border">
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Spending by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            {categoryData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => formatCurrency(Number(value))}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-64 items-center justify-center">
                <p className="text-sm text-muted-foreground">
                  No expenses this month
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Monthly Spending Bar Chart */}
        <Card className="border">
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Monthly Spending Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value))}
                  />
                  <Bar dataKey="spent" fill="#0088FE" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Grid: Top Merchants + Category Breakdown */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Merchants */}
        {topMerchants.length > 0 && (
          <Card className="border">
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                Top Merchants
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {topMerchants.map((merchant, i) => (
                <div key={merchant.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {i + 1}
                    </span>
                    <span className="text-sm font-medium truncate max-w-[160px]">{merchant.name}</span>
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">
                    {formatCurrency(merchant.amount)}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Budget by Category */}
        <Card className="border">
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Spending by Category
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {categoryData.length > 0 ? (
              categoryData.map((item) => {
                const percentage = budget > 0 ? Math.round((item.value / budget) * 100) : 0;
                return (
                  <div key={item.name}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium">{item.name}</span>
                      <span className="text-muted-foreground">
                        {formatCurrency(item.value)}
                      </span>
                    </div>
                    <Progress
                      value={Math.min(percentage, 100)}
                      className={`h-2 ${percentage > 50 ? "[&>div]:bg-orange-500" : ""} ${percentage > 80 ? "[&>div]:bg-red-500" : ""}`}
                    />
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground">
                No expenses this month
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

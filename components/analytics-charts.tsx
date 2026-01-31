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
} from "recharts";

type CategoryData = {
  name: string;
  value: number;
  color: string;
};

type MonthlyData = {
  month: string;
  spent: number;
};

type AnalyticsChartsProps = {
  totalSpent: number;
  budget: number;
  categoryData: CategoryData[];
  monthlyData: MonthlyData[];
  currency: string;
};

export function AnalyticsCharts({
  totalSpent,
  budget,
  categoryData,
  monthlyData,
  currency,
}: AnalyticsChartsProps) {
  const budgetPercentage = budget > 0 ? Math.round((totalSpent / budget) * 100) : 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <>
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
    </>
  );
}

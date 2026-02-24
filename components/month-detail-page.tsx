"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip,
    Legend,
    BarChart,
    Bar,
    XAxis,
    YAxis,
} from "recharts";
import {
    IconArrowLeft,
    IconSparkles,
    IconReceipt,
    IconCurrencyRupee,
    IconCategory,
} from "@tabler/icons-react";
import type { MonthSummary } from "@/lib/actions/expenses";

const CATEGORY_COLORS: Record<string, string> = {
    Food: "#0088FE",
    Travel: "#00C49F",
    Entertainment: "#FFBB28",
    Bills: "#FF8042",
    Shopping: "#8884D8",
    Health: "#FF6B6B",
    Education: "#4ECDC4",
    Investments: "#2ECC71",
    Subscription: "#E67E22",
    General: "#95A5A6",
};

const CATEGORY_BADGE_COLORS: Record<string, string> = {
    Food: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    Travel: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    Entertainment: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    Bills: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    Shopping: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    Health: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
    Education: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
    Investments: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    Subscription: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    General: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
};

type MonthDetailPageProps = {
    month: MonthSummary;
    prevMonth: MonthSummary | null;
    currency: string;
    budget: number;
    aiInsight: string | null;
    year: number;
};

export function MonthDetailPage({
    month,
    prevMonth,
    currency,
    budget,
    aiInsight,
    year,
}: MonthDetailPageProps) {
    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);

    const budgetPct = budget > 0 ? Math.min(Math.round((month.totalSpent / budget) * 100), 100) : null;
    const momChange = prevMonth && prevMonth.hasData
        ? Math.round(((month.totalSpent - prevMonth.totalSpent) / prevMonth.totalSpent) * 100)
        : null;

    const categoryPieData = Object.entries(month.categoryBreakdown)
        .sort((a, b) => b[1] - a[1])
        .map(([name, value]) => ({ name, value, color: CATEGORY_COLORS[name] || "#95A5A6" }));

    const categoryBarData = Object.entries(month.categoryBreakdown)
        .sort((a, b) => b[1] - a[1])
        .map(([name, value]) => ({ name, value }));

    return (
        <div className="mx-auto max-w-5xl">
            {/* Back button + heading */}
            <div className="mb-8 flex items-center gap-4">
                <Button variant="ghost" size="sm" asChild>
                    <Link href={`/summary?year=${year}`}>
                        <IconArrowLeft className="mr-1 h-4 w-4" />
                        Back
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">{month.monthName} {month.year}</h1>
                    <p className="text-sm text-muted-foreground">Monthly spending breakdown</p>
                </div>
            </div>

            {/* Top stat cards */}
            <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
                <Card className="border">
                    <CardHeader className="pb-1 pt-3 px-4">
                        <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                            <IconCurrencyRupee className="h-3.5 w-3.5" /> Total Spent
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pb-3 px-4">
                        <p className="text-2xl font-bold">{formatCurrency(month.totalSpent)}</p>
                    </CardContent>
                </Card>
                <Card className="border">
                    <CardHeader className="pb-1 pt-3 px-4">
                        <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                            <IconReceipt className="h-3.5 w-3.5" /> Transactions
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pb-3 px-4">
                        <p className="text-2xl font-bold">{month.transactionCount}</p>
                    </CardContent>
                </Card>
                <Card className="border">
                    <CardHeader className="pb-1 pt-3 px-4">
                        <CardTitle className="text-xs text-muted-foreground font-medium">Avg / Transaction</CardTitle>
                    </CardHeader>
                    <CardContent className="pb-3 px-4">
                        <p className="text-2xl font-bold">{formatCurrency(month.avgPerTransaction)}</p>
                    </CardContent>
                </Card>
                <Card className="border">
                    <CardHeader className="pb-1 pt-3 px-4">
                        <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                            <IconCategory className="h-3.5 w-3.5" /> Top Category
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pb-3 px-4">
                        {month.topCategory ? (
                            <Badge
                                variant="secondary"
                                className={`text-sm px-3 py-1 ${CATEGORY_BADGE_COLORS[month.topCategory] || ""}`}
                            >
                                {month.topCategory}
                            </Badge>
                        ) : <p className="text-2xl font-bold">—</p>}
                    </CardContent>
                </Card>
            </div>

            {/* Budget + MoM row */}
            {(budgetPct !== null || momChange !== null) && (
                <div className="mb-6 grid gap-4 md:grid-cols-2">
                    {budgetPct !== null && (
                        <Card className="border">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">Budget Usage</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="mb-2 flex justify-between text-sm">
                                    <span>{formatCurrency(month.totalSpent)}</span>
                                    <span className="text-muted-foreground">of {formatCurrency(budget)}</span>
                                </div>
                                <Progress
                                    value={budgetPct}
                                    className={`h-3 ${budgetPct > 80 ? "[&>div]:bg-red-500" : budgetPct > 60 ? "[&>div]:bg-orange-500" : ""}`}
                                />
                                <p className="mt-1.5 text-sm text-muted-foreground">{budgetPct}% of monthly budget used</p>
                            </CardContent>
                        </Card>
                    )}
                    {momChange !== null && (
                        <Card className="border">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">vs Previous Month</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className={`text-3xl font-bold ${momChange > 0 ? "text-red-500" : "text-green-500"}`}>
                                    {momChange > 0 ? "+" : ""}{momChange}%
                                </p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {prevMonth?.monthName}: {formatCurrency(prevMonth!.totalSpent)}
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            {/* AI Summary */}
            {aiInsight && (
                <Card className="mb-6 border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                    <CardHeader className="flex flex-row items-center gap-2 pb-2">
                        <IconSparkles className="h-5 w-5 text-primary" />
                        <CardTitle className="text-sm font-medium">AI Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground leading-relaxed">{aiInsight}</p>
                    </CardContent>
                </Card>
            )}

            {/* Charts row */}
            <div className="mb-6 grid gap-6 md:grid-cols-2">
                {/* Pie chart */}
                <Card className="border">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">Spending by Category</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={categoryPieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={90}
                                        paddingAngle={3}
                                        dataKey="value"
                                    >
                                        {categoryPieData.map((entry, idx) => (
                                            <Cell key={idx} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(val) => formatCurrency(Number(val))} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Bar chart */}
                <Card className="border">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">Category Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={categoryBarData} layout="vertical">
                                    <XAxis type="number" hide />
                                    <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 12 }} />
                                    <Tooltip formatter={(val) => formatCurrency(Number(val))} />
                                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                        {categoryBarData.map((entry, idx) => (
                                            <Cell key={idx} fill={CATEGORY_COLORS[entry.name] || "#95A5A6"} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Category breakdown list */}
            <Card className="border">
                <CardHeader>
                    <CardTitle className="text-sm font-medium">Category Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {Object.entries(month.categoryBreakdown)
                        .sort((a, b) => b[1] - a[1])
                        .map(([cat, amt]) => {
                            const pct = Math.round((amt / month.totalSpent) * 100);
                            return (
                                <div key={cat}>
                                    <div className="flex items-center justify-between text-sm mb-1.5">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className="h-2.5 w-2.5 rounded-full shrink-0"
                                                style={{ backgroundColor: CATEGORY_COLORS[cat] || "#95A5A6" }}
                                            />
                                            <span className="font-medium">{cat}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-muted-foreground text-xs">{pct}%</span>
                                            <span className="font-medium w-24 text-right">{formatCurrency(amt)}</span>
                                        </div>
                                    </div>
                                    <Progress
                                        value={pct}
                                        className="h-2"
                                        style={{ "--progress-color": CATEGORY_COLORS[cat] } as React.CSSProperties}
                                    />
                                </div>
                            );
                        })}
                </CardContent>
            </Card>
        </div>
    );
}

"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    IconTrendingDown,
    IconTrendingUp,
    IconChevronRight,
    IconReportAnalytics,
} from "@tabler/icons-react";
import type { MonthSummary } from "@/lib/actions/expenses";

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

type MonthlySummaryProps = {
    months: MonthSummary[];
    yearTotal: number;
    bestMonth: MonthSummary | null;
    worstMonth: MonthSummary | null;
    avgMonthlySpend: number;
    availableYears: number[];
    currentYear: number;
    currency: string;
    budget: number;
};

export function MonthlySummary({
    months,
    yearTotal,
    bestMonth,
    worstMonth,
    avgMonthlySpend,
    availableYears,
    currentYear,
    currency,
    budget,
}: MonthlySummaryProps) {
    const router = useRouter();

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);

    const handleYearChange = (val: string) => {
        router.push(`/summary?year=${val}`);
    };

    const openMonth = (month: MonthSummary) => {
        router.push(`/summary?year=${month.year}&month=${month.month}`);
    };

    const now = new Date();
    const currentMonthIndex = currentYear === now.getFullYear() ? now.getMonth() : 11;

    return (
        <div>
            {/* Year selector + year overview */}
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 flex-1">
                    <Card className="border">
                        <CardHeader className="pb-1 pt-3 px-4">
                            <CardTitle className="text-xs text-muted-foreground font-medium">Year Total</CardTitle>
                        </CardHeader>
                        <CardContent className="pb-3 px-4">
                            <p className="text-xl font-bold">{formatCurrency(yearTotal)}</p>
                        </CardContent>
                    </Card>
                    <Card className="border">
                        <CardHeader className="pb-1 pt-3 px-4">
                            <CardTitle className="text-xs text-muted-foreground font-medium">Avg / Month</CardTitle>
                        </CardHeader>
                        <CardContent className="pb-3 px-4">
                            <p className="text-xl font-bold">{formatCurrency(avgMonthlySpend)}</p>
                        </CardContent>
                    </Card>
                    <Card className="border">
                        <CardHeader className="pb-1 pt-3 px-4">
                            <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                                <IconTrendingDown className="h-3.5 w-3.5 text-green-500" /> Lightest
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pb-3 px-4">
                            {bestMonth ? (
                                <>
                                    <p className="text-xl font-bold">{formatCurrency(bestMonth.totalSpent)}</p>
                                    <p className="text-xs text-muted-foreground">{bestMonth.monthName}</p>
                                </>
                            ) : <p className="text-sm text-muted-foreground">N/A</p>}
                        </CardContent>
                    </Card>
                    <Card className="border">
                        <CardHeader className="pb-1 pt-3 px-4">
                            <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                                <IconTrendingUp className="h-3.5 w-3.5 text-red-500" /> Heaviest
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pb-3 px-4">
                            {worstMonth ? (
                                <>
                                    <p className="text-xl font-bold">{formatCurrency(worstMonth.totalSpent)}</p>
                                    <p className="text-xs text-muted-foreground">{worstMonth.monthName}</p>
                                </>
                            ) : <p className="text-sm text-muted-foreground">N/A</p>}
                        </CardContent>
                    </Card>
                </div>

                <Select value={currentYear.toString()} onValueChange={handleYearChange}>
                    <SelectTrigger className="w-32 shrink-0">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {availableYears.map((y) => (
                            <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* 12-month grid */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
                {months.map((month) => {
                    const isFuture = currentYear === now.getFullYear() && month.month > currentMonthIndex;
                    const isCurrentMonth = currentYear === now.getFullYear() && month.month === currentMonthIndex;
                    const budgetPct = budget > 0 ? Math.min(Math.round((month.totalSpent / budget) * 100), 100) : 0;

                    return (
                        <Card
                            key={month.month}
                            onClick={() => !isFuture && month.hasData && openMonth(month)}
                            className={[
                                "border transition-all",
                                isFuture
                                    ? "opacity-40 cursor-default"
                                    : month.hasData
                                        ? "cursor-pointer hover:border-primary hover:shadow-md"
                                        : "cursor-default opacity-60",
                                isCurrentMonth ? "ring-1 ring-primary" : "",
                            ].join(" ")}
                        >
                            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-3 px-4">
                                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                                    {isCurrentMonth && (
                                        <span className="h-1.5 w-1.5 rounded-full bg-primary inline-block" />
                                    )}
                                    {month.monthName.slice(0, 3)}
                                </CardTitle>
                                {month.hasData && (
                                    <IconChevronRight className="h-4 w-4 text-muted-foreground/50" />
                                )}
                            </CardHeader>
                            <CardContent className="pb-3 px-4">
                                {month.hasData ? (
                                    <>
                                        <p className="text-lg font-bold">{formatCurrency(month.totalSpent)}</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            {month.transactionCount} transactions
                                        </p>
                                        {month.topCategory && (
                                            <Badge
                                                variant="secondary"
                                                className={`mt-2 text-xs ${CATEGORY_BADGE_COLORS[month.topCategory] || ""}`}
                                            >
                                                {month.topCategory}
                                            </Badge>
                                        )}
                                        {budget > 0 && (
                                            <div className="mt-2">
                                                <Progress
                                                    value={budgetPct}
                                                    className={`h-1.5 ${budgetPct > 80 ? "[&>div]:bg-red-500" : budgetPct > 60 ? "[&>div]:bg-orange-500" : ""}`}
                                                />
                                                <p className="mt-0.5 text-xs text-muted-foreground">{budgetPct}% of budget</p>
                                            </div>
                                        )}
                                    </>
                                ) : isFuture ? (
                                    <p className="text-xs text-muted-foreground">Upcoming</p>
                                ) : (
                                    <p className="text-xs text-muted-foreground">No expenses</p>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Empty year state */}
            {months.every((m) => !m.hasData) && (
                <div className="mt-12 flex flex-col items-center justify-center text-center">
                    <IconReportAnalytics className="mb-3 h-12 w-12 text-muted-foreground/40" />
                    <p className="text-base font-medium text-muted-foreground">No expenses in {currentYear}</p>
                </div>
            )}
        </div>
    );
}

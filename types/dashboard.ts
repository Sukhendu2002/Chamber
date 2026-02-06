// Dashboard widget visibility settings
export type DashboardWidgets = {
    showStats: boolean;        // Total Spent, Transactions, Budget, Remaining
    showNetWorth: boolean;     // Net Worth card
    showBalanceTrend: boolean; // Balance Trend chart
    showCalendar: boolean;     // Expense Calendar
    showCategories: boolean;   // Spending by Category
    showRecent: boolean;       // Recent Expenses
};

// Default widget settings - all enabled
export const DEFAULT_DASHBOARD_WIDGETS: DashboardWidgets = {
    showStats: true,
    showNetWorth: true,
    showBalanceTrend: true,
    showCalendar: true,
    showCategories: true,
    showRecent: true,
};

// Widget metadata for settings UI
export const DASHBOARD_WIDGET_OPTIONS = [
    {
        key: "showStats" as const,
        label: "Stats Cards",
        description: "Total Spent, Transactions, Budget, Remaining",
    },
    {
        key: "showNetWorth" as const,
        label: "Net Worth",
        description: "Overview of your bank accounts and investments",
    },
    {
        key: "showBalanceTrend" as const,
        label: "Balance Trend",
        description: "Historical balance chart across accounts",
    },
    {
        key: "showCalendar" as const,
        label: "Expense Calendar",
        description: "Calendar view of your expenses",
    },
    {
        key: "showCategories" as const,
        label: "Spending by Category",
        description: "Breakdown of spending by category",
    },
    {
        key: "showRecent" as const,
        label: "Recent Expenses",
        description: "List of your most recent expenses",
    },
] as const;

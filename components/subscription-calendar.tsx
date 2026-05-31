"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toLocalDateString, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  IconChevronLeft,
  IconChevronRight,
  IconEdit,
  IconTrash,
  IconRefresh,
  IconBell,
  IconCalendarMonth,
  IconList,
  IconWallet,
  IconReceipt,
  IconAlertTriangle,
  IconChevronDown,
  IconChevronUp,
  IconFolder,
} from "@tabler/icons-react";
import {
  updateSubscription,
  deleteSubscription,
  renewSubscription,
} from "@/lib/actions/subscriptions";

type AccountOption = {
  id: string;
  name: string;
  type: string;
};

type Subscription = {
  id: string;
  name: string;
  amount: number;
  billingCycle: string;
  nextBillingDate: Date;
  startDate: Date | null;
  paymentMethod: string | null;
  category: string;
  description: string | null;
  isActive: boolean;
  alertDaysBefore: number;
};

type SubscriptionCalendarProps = {
  subscriptions: Subscription[];
  currency: string;
  accounts?: AccountOption[];
};

const billingCycles = [
  { value: "ONCE", label: "One-time" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "YEARLY", label: "Yearly" },
];

const CYCLE_COLORS: Record<string, string> = {
  WEEKLY: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800",
  MONTHLY: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  QUARTERLY: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  YEARLY: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  ONCE: "bg-gray-100 text-gray-800 dark:bg-gray-800/40 dark:text-gray-300 border-gray-200 dark:border-gray-700",
};

const CATEGORY_COLORS = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-orange-500",
  "bg-teal-500",
  "bg-pink-500",
  "bg-indigo-500",
  "bg-lime-500",
  "bg-sky-500",
];

function getCategoryColor(category: string, index: number): string {
  return CATEGORY_COLORS[index % CATEGORY_COLORS.length];
}

export function SubscriptionCalendar({ subscriptions, currency, accounts = [] }: SubscriptionCalendarProps) {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Subscription | null>(null);
  const [deleteWithRecords, setDeleteWithRecords] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editBillingCycle, setEditBillingCycle] = useState("");
  const [editNextBillingDate, setEditNextBillingDate] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editPaymentMethod, setEditPaymentMethod] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editAlertDays, setEditAlertDays] = useState("");

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDateShort = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleDateString("en-US", { day: "numeric", month: "short" });
  };

  const formatDateFull = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // Calendar helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayNamesShort = ["S", "M", "T", "W", "T", "F", "S"];

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => setCurrentDate(new Date());

  // ============================================
  // Computed Data
  // ============================================

  const activeSubscriptions = useMemo(
    () => subscriptions.filter((s) => s.isActive),
    [subscriptions]
  );

  const isDueSoon = (sub: Subscription) => {
    const today = new Date();
    const billingDate = new Date(sub.nextBillingDate);
    const diffTime = billingDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return sub.isActive && diffDays >= 0 && diffDays <= sub.alertDaysBefore;
  };

  const isOverdue = (sub: Subscription) => {
    const today = new Date();
    const billingDate = new Date(sub.nextBillingDate);
    return sub.isActive && billingDate < today;
  };

  const getDaysUntil = (sub: Subscription) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const billingDate = new Date(sub.nextBillingDate);
    billingDate.setHours(0, 0, 0, 0);
    const diffTime = billingDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const dueSoonCount = useMemo(
    () => activeSubscriptions.filter(isDueSoon).length,
    [activeSubscriptions]
  );

  const overdueCount = useMemo(
    () => activeSubscriptions.filter(isOverdue).length,
    [activeSubscriptions]
  );

  // Monthly cost calculation
  const monthlyCost = useMemo(
    () =>
      activeSubscriptions.reduce((total, sub) => {
        switch (sub.billingCycle) {
          case "WEEKLY": return total + sub.amount * 4.33;
          case "MONTHLY": return total + sub.amount;
          case "QUARTERLY": return total + sub.amount / 3;
          case "YEARLY": return total + sub.amount / 12;
          default: return total + sub.amount;
        }
      }, 0),
    [activeSubscriptions]
  );

  const yearlyCost = useMemo(
    () =>
      activeSubscriptions.reduce((total, sub) => {
        switch (sub.billingCycle) {
          case "WEEKLY": return total + sub.amount * 52;
          case "MONTHLY": return total + sub.amount * 12;
          case "QUARTERLY": return total + sub.amount * 4;
          case "YEARLY": return total + sub.amount;
          default: return total + sub.amount;
        }
      }, 0),
    [activeSubscriptions]
  );

  const dueThisMonth = useMemo(
    () =>
      activeSubscriptions.filter((sub) => {
        const d = new Date(sub.nextBillingDate);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }),
    [activeSubscriptions]
  );

  const dueThisMonthCost = useMemo(
    () => dueThisMonth.reduce((sum, s) => sum + s.amount, 0),
    [dueThisMonth]
  );

  const upcomingSubscriptions = useMemo(
    () =>
      activeSubscriptions
        .filter((sub) => {
          const days = getDaysUntil(sub);
          return days >= 0 && days <= 30;
        })
        .sort((a, b) => new Date(a.nextBillingDate).getTime() - new Date(b.nextBillingDate).getTime()),
    [activeSubscriptions]
  );

  // ============================================
  // Category grouping
  // ============================================

  const categoryGroups = useMemo(() => {
    const groups: Record<string, Subscription[]> = {};
    for (const sub of activeSubscriptions) {
      const cat = sub.category || "Uncategorized";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(sub);
    }
    // Sort by category name
    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([category, subs]) => ({
        category,
        subs: subs.sort((a, b) => new Date(a.nextBillingDate).getTime() - new Date(b.nextBillingDate).getTime()),
        total: subs.reduce((sum, s) => sum + s.amount, 0),
        count: subs.length,
      }));
  }, [activeSubscriptions]);

  // All unique categories for autocomplete in dialogs
  const existingCategories = useMemo(
    () => [...new Set(subscriptions.map((s) => s.category || "Subscription"))].sort(),
    [subscriptions]
  );

  // ============================================
  // Calendar helpers
  // ============================================

  const getSubscriptionsForDay = (day: number) => {
    return activeSubscriptions.filter((sub) => {
      const billingDate = new Date(sub.nextBillingDate);
      return (
        billingDate.getDate() === day &&
        billingDate.getMonth() === month &&
        billingDate.getFullYear() === year
      );
    });
  };

  const isToday = (day: number) => {
    const today = new Date();
    return day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  };

  // ============================================
  // Actions
  // ============================================

  const openEditDialog = (sub: Subscription) => {
    setEditingSubscription(sub);
    setEditName(sub.name);
    setEditAmount(sub.amount.toString());
    setEditBillingCycle(sub.billingCycle);
    setEditNextBillingDate(toLocalDateString(new Date(sub.nextBillingDate)));
    setEditPaymentMethod(sub.paymentMethod || "");
    setEditStartDate(sub.startDate ? toLocalDateString(new Date(sub.startDate)) : "");
    setEditCategory(sub.category || "");
    setEditDescription(sub.description || "");
    setEditAlertDays(sub.alertDaysBefore.toString());
  };

  const handleEditSave = async () => {
    if (!editingSubscription) return;
    setLoading(true);
    try {
      await updateSubscription(editingSubscription.id, {
        name: editName,
        amount: parseFloat(editAmount),
        billingCycle: editBillingCycle as "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY",
        nextBillingDate: new Date(editNextBillingDate),
        startDate: editStartDate ? new Date(editStartDate) : undefined,
        paymentMethod: editPaymentMethod || undefined,
        category: editCategory || undefined,
        description: editDescription || undefined,
        alertDaysBefore: parseInt(editAlertDays) || 3,
      });
      setEditingSubscription(null);
      router.refresh();
    } catch (error) {
      console.error("Failed to update subscription:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (deleteRecords: boolean) => {
    if (!deleteConfirm) return;
    setLoading(true);
    try {
      await deleteSubscription(deleteConfirm.id, deleteRecords);
      setDeleteConfirm(null);
      setDeleteWithRecords(false);
      setSelectedSubscription(null);
      router.refresh();
    } catch (error) {
      console.error("Failed to delete subscription:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRenew = async (sub: Subscription) => {
    setLoading(true);
    try {
      await renewSubscription(sub.id);
      router.refresh();
    } catch (error) {
      console.error("Failed to renew subscription:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  // ============================================
  // Render helpers
  // ============================================

  const renderCycleBadge = (cycle: string) => (
    <span className={cn(
      "inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium border rounded leading-none",
      CYCLE_COLORS[cycle] || "bg-gray-100 text-gray-800 dark:bg-gray-800/40 dark:text-gray-300 border-gray-200 dark:border-gray-700"
    )}>
      {cycle === "ONCE" ? "Once" : cycle.charAt(0) + cycle.slice(1).toLowerCase().slice(0, 3)}
    </span>
  );

  const renderDaysCell = (sub: Subscription) => {
    const days = getDaysUntil(sub);
    if (days < 0) {
      return (
        <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-medium">
          <IconAlertTriangle className="h-3 w-3" />
          {Math.abs(days)}d overdue
        </span>
      );
    }
    if (days === 0) {
      return <span className="text-orange-600 dark:text-orange-400 font-medium">Due today</span>;
    }
    if (days <= sub.alertDaysBefore) {
      return <span className="text-orange-600 dark:text-orange-400 font-medium">{days}d</span>;
    }
    if (days <= 14) {
      return <span className="text-yellow-600 dark:text-yellow-400">{days}d</span>;
    }
    return <span className="text-muted-foreground">{days}d</span>;
  };

  // ============================================
  // Calendar Grid
  // ============================================

  const calendarDays = [];
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(<div key={`empty-${i}`} className="h-10 border border-muted/30 sm:h-24" />);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const daySubs = getSubscriptionsForDay(day);
    const today = isToday(day);

    calendarDays.push(
      <div
        key={day}
        className={cn(
          "h-10 border border-muted/30 p-0.5 overflow-hidden sm:h-24 sm:p-1 transition-colors",
          today ? "bg-primary/5 border-primary" : "hover:bg-muted/30"
        )}
      >
        <div className={cn(
          "text-[10px] font-medium mb-0.5 sm:text-xs sm:mb-1",
          today ? "text-primary" : "text-muted-foreground"
        )}>
          {day}
        </div>
        <div className="flex gap-0.5 sm:hidden">
          {daySubs.slice(0, 3).map((sub) => (
            <button
              key={sub.id}
              onClick={() => setSelectedSubscription(sub)}
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                isOverdue(sub) ? "bg-red-500" :
                isDueSoon(sub) ? "bg-orange-500" : "bg-blue-500"
              )}
              title={sub.name}
            />
          ))}
        </div>
        <div className="hidden sm:block space-y-1">
          {daySubs.slice(0, 2).map((sub) => (
            <button
              key={sub.id}
              onClick={() => setSelectedSubscription(sub)}
              className={cn(
                "w-full text-left text-xs p-1 rounded truncate transition-colors",
                isOverdue(sub) ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" :
                isDueSoon(sub) ? "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300" :
                "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/40"
              )}
            >
              {sub.name}
            </button>
          ))}
          {daySubs.length > 2 && (
            <div className="text-xs text-muted-foreground">+{daySubs.length - 2} more</div>
          )}
        </div>
      </div>
    );
  }

  // ============================================
  // Main Render
  // ============================================

  return (
    <div className="space-y-6">
      {/* ============================================ */}
      {/* Enhanced Summary Cards */}
      {/* ============================================ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-medium text-muted-foreground">Active</CardTitle>
            <IconReceipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{activeSubscriptions.length}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {overdueCount > 0 ? (
                <span className="text-red-500 font-medium">{overdueCount} overdue</span>
              ) : dueSoonCount > 0 ? (
                <span className="text-orange-500 font-medium">{dueSoonCount} due soon</span>
              ) : "All up to date"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-medium text-muted-foreground">Monthly Cost</CardTitle>
            <IconWallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{formatCurrency(monthlyCost)}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Estimated per month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-medium text-muted-foreground">Yearly Cost</CardTitle>
            <IconCalendarMonth className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{formatCurrency(yearlyCost)}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Projected annually</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-medium text-muted-foreground">Due This Month</CardTitle>
            <IconAlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{formatCurrency(dueThisMonthCost)}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {dueThisMonth.length} {dueThisMonth.length === 1 ? "subscription" : "subscriptions"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ============================================ */}
      {/* Tabs: Calendar | List */}
      {/* ============================================ */}
      <Tabs defaultValue="list" className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList variant="line" className="gap-0">
            <TabsTrigger value="list" className="gap-1.5 px-3 py-1.5 text-xs">
              <IconList className="h-4 w-4" />
              List
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-1.5 px-3 py-1.5 text-xs">
              <IconCalendarMonth className="h-4 w-4" />
              Calendar
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ============================================ */}
        {/* LIST VIEW */}
        {/* ============================================ */}
        <TabsContent value="list" className="mt-0">
          {activeSubscriptions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <IconWallet className="h-12 w-12 text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground font-medium">No subscriptions yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Add your first subscription to start tracking recurring expenses
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col xl:flex-row gap-6">
              {/* Left sidebar: Upcoming + Breakdown */}
              <div className="xl:w-80 shrink-0 order-2 xl:order-1 space-y-4">
                {/* Upcoming */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <IconBell className="h-4 w-4 text-orange-500" />
                      Upcoming (30d)
                      <span className="text-xs font-normal text-muted-foreground ml-auto">
                        {upcomingSubscriptions.length}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {upcomingSubscriptions.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <IconCalendarMonth className="h-8 w-8 text-muted-foreground/30 mb-2" />
                        <p className="text-sm text-muted-foreground">All clear — no upcoming payments</p>
                      </div>
                    ) : (
                      <div className="space-y-0">
                        {upcomingSubscriptions.map((sub, idx) => {
                          const days = getDaysUntil(sub);
                          return (
                            <div key={sub.id}>
                              <div className="flex items-start gap-3 py-2">
                                <div className="flex flex-col items-center shrink-0">
                                  <div className={cn(
                                    "w-2.5 h-2.5 rounded-full ring-2 ring-background",
                                    isOverdue(sub) ? "bg-red-500 ring-red-100 dark:ring-red-950" :
                                    days <= sub.alertDaysBefore ? "bg-orange-500 ring-orange-100 dark:ring-orange-950" :
                                    "bg-blue-500 ring-blue-100 dark:ring-blue-950"
                                  )} />
                                  {idx < upcomingSubscriptions.length - 1 && (
                                    <div className="w-px h-full bg-border mt-1" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0 pb-3">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-medium text-sm truncate">{sub.name}</span>
                                    <span className="text-sm font-semibold shrink-0">{formatCurrency(sub.amount)}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                    <span className={cn(
                                      "text-xs font-medium",
                                      days <= sub.alertDaysBefore
                                        ? "text-orange-500" : "text-muted-foreground"
                                    )}>
                                      {days === 0 ? "Today!" :
                                       days < 0 ? `${Math.abs(days)}d overdue` :
                                       `${days}d`}
                                    </span>
                                    <span className="text-xs text-muted-foreground">•</span>
                                    <span className="text-xs text-muted-foreground">{formatDateShort(sub.nextBillingDate)}</span>
                                    {sub.category && sub.category !== "Subscription" && (
                                      <>
                                        <span className="text-xs text-muted-foreground">•</span>
                                        <span className="text-[10px] text-muted-foreground">{sub.category}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                              {idx < upcomingSubscriptions.length - 1 && (
                                <Separator className="ml-5" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Cost Breakdown */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Cost Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {categoryGroups.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">No data</p>
                    ) : (
                      <div className="space-y-3">
                        {categoryGroups.map(({ category, total, count }, idx) => {
                          const color = getCategoryColor(category, idx);
                          const pct = yearlyCost > 0 ? (total / yearlyCost) * 100 : 0;
                          return (
                            <div key={category}>
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="flex items-center gap-1.5">
                                  <span className={cn("w-2 h-2 rounded-full shrink-0", color)} />
                                  <span className="font-medium truncate max-w-[120px]">{category}</span>
                                </span>
                                <span className="text-muted-foreground">
                                  {formatCurrency(total)}
                                  <span className="text-[10px] ml-1">/cycle</span>
                                </span>
                              </div>
                              <Progress value={pct} className="h-1.5" />
                              <div className="flex justify-between mt-0.5">
                                <span className="text-[10px] text-muted-foreground">{count} {count === 1 ? "sub" : "subs"}</span>
                                <span className="text-[10px] text-muted-foreground">{Math.round(pct)}% of yearly</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Right: All Subscriptions TABLE */}
              <div className="flex-1 min-w-0 order-1 xl:order-2">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <IconReceipt className="h-4 w-4" />
                      All Subscriptions
                      <span className="text-xs font-normal text-muted-foreground ml-auto">
                        {activeSubscriptions.length} active
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {categoryGroups.length === 0 ? (
                      <div className="flex h-32 items-center justify-center">
                        <p className="text-sm text-muted-foreground">No active subscriptions</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-border">
                        {categoryGroups.map(({ category, subs, total, count }, catIdx) => {
                          const isExpanded = expandedCategories.has(category) || expandedCategories.size === 0;
                          const catYearly = subs.reduce((s, sub) => {
                            switch (sub.billingCycle) {
                              case "WEEKLY": return s + sub.amount * 52;
                              case "MONTHLY": return s + sub.amount * 12;
                              case "QUARTERLY": return s + sub.amount * 4;
                              case "YEARLY": return s + sub.amount;
                              default: return s + sub.amount;
                            }
                          }, 0);
                          const color = getCategoryColor(category, catIdx);

                          return (
                            <div key={category}>
                              {/* Category header — clickable to expand/collapse */}
                              <button
                                onClick={() => toggleCategory(category)}
                                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted/50 transition-colors text-left"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", color)} />
                                  <span className="font-semibold text-sm truncate">{category}</span>
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-normal">
                                    {count}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="text-right">
                                    <div className="text-sm font-semibold">{formatCurrency(total)}</div>
                                    <div className="text-[10px] text-muted-foreground">
                                      {formatCurrency(catYearly)}/yr
                                    </div>
                                  </div>
                                  {isExpanded ? (
                                    <IconChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                                  ) : (
                                    <IconChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                                  )}
                                </div>
                              </button>

                              {/* Table rows (collapsible) */}
                              {isExpanded && (
                                <Table>
                                  <TableHeader>
                                    <TableRow className="hover:bg-transparent">
                                      <TableHead className="h-8 px-4 py-1.5 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground w-[30%]">Name</TableHead>
                                      <TableHead className="h-8 px-2 py-1.5 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground w-[15%]">Amount</TableHead>
                                      <TableHead className="h-8 px-2 py-1.5 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground w-[12%]">Cycle</TableHead>
                                      <TableHead className="h-8 px-2 py-1.5 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground w-[18%]">Next Billing</TableHead>
                                      <TableHead className="h-8 px-2 py-1.5 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground hidden sm:table-cell w-[15%]">Payment</TableHead>
                                      <TableHead className="h-8 px-2 py-1.5 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground w-[40px]"></TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {subs.map((sub) => {
                                      const isLate = isOverdue(sub);
                                      const isSoon = isDueSoon(sub);
                                      return (
                                        <TableRow
                                          key={sub.id}
                                          className={cn(
                                            "group transition-colors",
                                            isLate ? "bg-red-50/60 dark:bg-red-950/10" :
                                            isSoon ? "bg-orange-50/60 dark:bg-orange-950/10" : ""
                                          )}
                                        >
                                          <TableCell className="px-4 py-2.5">
                                            <div className="flex items-center gap-2">
                                              <button
                                                onClick={() => setSelectedSubscription(sub)}
                                                className="font-medium text-sm truncate max-w-[200px] hover:text-primary transition-colors"
                                              >
                                                {sub.name}
                                              </button>
                                              {isLate && (
                                                <IconAlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                                              )}
                                              {isSoon && !isLate && (
                                                <IconBell className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                                              )}
                                            </div>
                                          </TableCell>
                                          <TableCell className="px-2 py-2.5">
                                            <span className={cn(
                                              "font-semibold text-sm",
                                              isLate ? "text-red-600 dark:text-red-400" : ""
                                            )}>
                                              {formatCurrency(sub.amount)}
                                            </span>
                                          </TableCell>
                                          <TableCell className="px-2 py-2.5">
                                            {renderCycleBadge(sub.billingCycle)}
                                          </TableCell>
                                          <TableCell className="px-2 py-2.5">
                                            <div className="flex flex-col">
                                              <span className={cn(
                                                "text-xs",
                                                isLate ? "text-red-600 dark:text-red-400" : "text-foreground"
                                              )}>
                                                {formatDateShort(sub.nextBillingDate)}
                                              </span>
                                              <span className="text-[10px]">{renderDaysCell(sub)}</span>
                                            </div>
                                          </TableCell>
                                          <TableCell className="px-2 py-2.5 hidden sm:table-cell">
                                            {sub.paymentMethod ? (
                                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                <IconWallet className="h-3 w-3 shrink-0" />
                                                <span className="truncate max-w-[100px]">{sub.paymentMethod}</span>
                                              </span>
                                            ) : (
                                              <span className="text-xs text-muted-foreground/50">—</span>
                                            )}
                                          </TableCell>
                                          <TableCell className="px-2 py-2.5">
                                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                                onClick={() => handleRenew(sub)}
                                                title="Mark as renewed"
                                              >
                                                <IconRefresh className="h-3.5 w-3.5" />
                                              </Button>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                                onClick={() => openEditDialog(sub)}
                                                title="Edit"
                                              >
                                                <IconEdit className="h-3.5 w-3.5" />
                                              </Button>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                                onClick={() => setDeleteConfirm(sub)}
                                                title="Delete"
                                              >
                                                <IconTrash className="h-3.5 w-3.5" />
                                              </Button>
                                            </div>
                                          </TableCell>
                                        </TableRow>
                                      );
                                    })}
                                  </TableBody>
                                </Table>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ============================================ */}
        {/* CALENDAR VIEW */}
        {/* ============================================ */}
        <TabsContent value="calendar" className="mt-0">
          {upcomingSubscriptions.length > 0 && (
            <Card className="mb-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <IconBell className="h-4 w-4 text-orange-500" />
                  Upcoming This Month
                  <span className="text-xs font-normal text-muted-foreground ml-auto">{upcomingSubscriptions.length}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {upcomingSubscriptions.map((sub, idx) => {
                  const days = getDaysUntil(sub);
                  return (
                    <div key={sub.id} className="flex items-center gap-3 py-1.5">
                      <div className="flex flex-col items-center shrink-0">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          isOverdue(sub) ? "bg-red-500" :
                          days <= sub.alertDaysBefore ? "bg-orange-500" : "bg-blue-500"
                        )} />
                        {idx < upcomingSubscriptions.length - 1 && (
                          <div className="w-px h-full bg-border mt-1" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                        <span className="font-medium text-sm truncate">{sub.name}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-sm font-semibold">{formatCurrency(sub.amount)}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-foreground"
                            onClick={() => handleRenew(sub)}
                          >
                            <IconRefresh className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{monthNames[month]} {year}</CardTitle>
                <div className="flex items-center gap-1.5">
                  <Button variant="outline" size="sm" onClick={goToToday} className="text-xs h-8">Today</Button>
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevMonth}>
                    <IconChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={nextMonth}>
                    <IconChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 mb-2">
                {dayNames.map((day, i) => (
                  <div key={day} className="text-center text-xs font-medium text-muted-foreground py-1 sm:text-sm sm:py-2">
                    <span className="hidden sm:inline">{day}</span>
                    <span className="sm:hidden">{dayNamesShort[i]}</span>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">{calendarDays}</div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ============================================ */}
      {/* Subscription Detail Dialog */}
      {/* ============================================ */}
      <Dialog open={!!selectedSubscription} onOpenChange={() => setSelectedSubscription(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedSubscription?.name}</DialogTitle>
          </DialogHeader>
          {selectedSubscription && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Amount</Label>
                  <p className="font-medium text-lg">{formatCurrency(selectedSubscription.amount)}
                    <span className="text-sm text-muted-foreground font-normal"> / {selectedSubscription.billingCycle.toLowerCase()}</span>
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Next Billing</Label>
                  <p className="font-medium">{formatDateFull(selectedSubscription.nextBillingDate)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Billing Cycle</Label>
                  <div className="mt-1">{renderCycleBadge(selectedSubscription.billingCycle)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Payment Method</Label>
                  <p className="font-medium mt-1">{selectedSubscription.paymentMethod || <span className="text-muted-foreground">-</span>}</p>
                </div>
              </div>
              {selectedSubscription.category && (
                <div>
                  <Label className="text-muted-foreground">Category</Label>
                  <div className="mt-1 flex items-center gap-2">
                    <IconFolder className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-medium">{selectedSubscription.category}</span>
                  </div>
                </div>
              )}
              {selectedSubscription.startDate && (
                <div>
                  <Label className="text-muted-foreground">Started</Label>
                  <p className="font-medium mt-1">{formatDateFull(selectedSubscription.startDate)}</p>
                </div>
              )}
              {selectedSubscription.description && (
                <div>
                  <Label className="text-muted-foreground">Description</Label>
                  <p className="mt-1">{selectedSubscription.description}</p>
                </div>
              )}
              <div className="flex items-center gap-2 pt-2">
                {selectedSubscription.isActive ? (
                  isDueSoon(selectedSubscription) ? (
                    <Badge variant="destructive" className="gap-1">
                      <IconBell className="h-3 w-3" />
                      {getDaysUntil(selectedSubscription) <= 0 ? "Due now" : `Due in ${getDaysUntil(selectedSubscription)} days`}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1">
                      <IconRefresh className="h-3 w-3" />
                      Active
                    </Badge>
                  )
                ) : (
                  <Badge variant="outline">Inactive</Badge>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedSubscription(null)}>Close</Button>
            <Button onClick={() => {
              if (selectedSubscription) {
                openEditDialog(selectedSubscription);
                setSelectedSubscription(null);
              }
            }}>Edit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================ */}
      {/* Edit Dialog */}
      {/* ============================================ */}
      <Dialog open={!!editingSubscription} onOpenChange={() => setEditingSubscription(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Subscription</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input type="number" step="0.01" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Billing Cycle</Label>
                <Select value={editBillingCycle} onValueChange={setEditBillingCycle}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {billingCycles.map((cycle) => (
                      <SelectItem key={cycle.value} value={cycle.value}>{cycle.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="date" value={editStartDate} onChange={(e) => setEditStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Next Billing Date</Label>
                <Input type="date" value={editNextBillingDate} onChange={(e) => setEditNextBillingDate(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={editPaymentMethod} onValueChange={setEditPaymentMethod}>
                  <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.name}>{account.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Alert Days Before</Label>
                <Input type="number" min="1" max="30" value={editAlertDays} onChange={(e) => setEditAlertDays(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Input
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  placeholder="e.g. Domains, Streaming"
                  list="edit-categories"
                />
                <datalist id="edit-categories">
                  {existingCategories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
                <p className="text-[10px] text-muted-foreground">Group related subscriptions together</p>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSubscription(null)}>Cancel</Button>
            <Button onClick={handleEditSave} disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================ */}
      {/* Delete Confirmation */}
      {/* ============================================ */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Delete Subscription</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm">
              Delete &ldquo;{deleteConfirm?.name}&rdquo;?
            </p>

            <label className="flex items-start gap-2.5 cursor-pointer group bg-muted/40 border border-border rounded px-3 py-2.5">
              <input
                type="checkbox"
                checked={deleteWithRecords}
                onChange={(e) => setDeleteWithRecords(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-border accent-destructive"
              />
              <div className="text-xs leading-relaxed">
                <span className="font-medium text-destructive group-hover:underline">Also delete expense records</span>
                <p className="text-muted-foreground">Removes linked renewal expenses from your history</p>
              </div>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => { setDeleteConfirm(null); setDeleteWithRecords(false); }}>Cancel</Button>
            <div className="flex gap-1.5">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleDelete(false)}
                disabled={loading}
              >
                {loading ? "..." : "Delete Only"}
              </Button>
              <Button
                size="sm"
                variant={deleteWithRecords ? "destructive" : "secondary"}
                onClick={() => handleDelete(deleteWithRecords)}
                disabled={loading}
              >
                {loading ? "..." : deleteWithRecords ? "Delete All" : "Delete"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

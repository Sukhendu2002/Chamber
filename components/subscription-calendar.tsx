"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  IconChevronLeft,
  IconChevronRight,
  IconEdit,
  IconTrash,
  IconRefresh,
  IconBell,
} from "@tabler/icons-react";
import {
  updateSubscription,
  deleteSubscription,
  renewSubscription,
} from "@/lib/actions/subscriptions";

type Subscription = {
  id: string;
  name: string;
  amount: number;
  billingCycle: string;
  nextBillingDate: Date;
  paymentMethod: string | null;
  description: string | null;
  isActive: boolean;
  alertDaysBefore: number;
};

type SubscriptionCalendarProps = {
  subscriptions: Subscription[];
  currency: string;
};

const billingCycles = [
  { value: "ONCE", label: "One-time" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "YEARLY", label: "Yearly" },
];

const paymentMethods = [
  { value: "PNB", label: "PNB" },
  { value: "SBI", label: "SBI" },
  { value: "CASH", label: "Cash" },
  { value: "CREDIT", label: "Credit" },
];

export function SubscriptionCalendar({ subscriptions, currency }: SubscriptionCalendarProps) {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editBillingCycle, setEditBillingCycle] = useState("");
  const [editNextBillingDate, setEditNextBillingDate] = useState("");
  const [editPaymentMethod, setEditPaymentMethod] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editAlertDays, setEditAlertDays] = useState("");

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Use consistent date formatting to avoid hydration mismatch
  const formatDate = (date: Date) => {
    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, "0");
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
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

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Get subscriptions for a specific day
  const getSubscriptionsForDay = (day: number) => {
    const date = new Date(year, month, day);
    return subscriptions.filter((sub) => {
      const billingDate = new Date(sub.nextBillingDate);
      return (
        billingDate.getDate() === day &&
        billingDate.getMonth() === month &&
        billingDate.getFullYear() === year &&
        sub.isActive
      );
    });
  };

  // Check if a day is today
  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    );
  };

  // Check if subscription is due soon (within alert days)
  const isDueSoon = (sub: Subscription) => {
    const today = new Date();
    const billingDate = new Date(sub.nextBillingDate);
    const diffTime = billingDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= sub.alertDaysBefore;
  };

  // Open edit dialog
  const openEditDialog = (sub: Subscription) => {
    setEditingSubscription(sub);
    setEditName(sub.name);
    setEditAmount(sub.amount.toString());
    setEditBillingCycle(sub.billingCycle);
    setEditNextBillingDate(new Date(sub.nextBillingDate).toISOString().split("T")[0]);
    setEditPaymentMethod(sub.paymentMethod || "");
    setEditDescription(sub.description || "");
    setEditAlertDays(sub.alertDaysBefore.toString());
  };

  // Handle edit save
  const handleEditSave = async () => {
    if (!editingSubscription) return;
    setLoading(true);
    try {
      await updateSubscription(editingSubscription.id, {
        name: editName,
        amount: parseFloat(editAmount),
        billingCycle: editBillingCycle as "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY",
        nextBillingDate: new Date(editNextBillingDate),
        paymentMethod: editPaymentMethod || undefined,
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

  // Handle delete
  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setLoading(true);
    try {
      await deleteSubscription(deleteConfirm.id);
      setDeleteConfirm(null);
      setSelectedSubscription(null);
      router.refresh();
    } catch (error) {
      console.error("Failed to delete subscription:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle renew (mark as paid and move to next billing date)
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

  // Calculate total monthly cost
  const totalMonthlyCost = subscriptions
    .filter((sub) => sub.isActive)
    .reduce((total, sub) => {
      switch (sub.billingCycle) {
        case "WEEKLY":
          return total + sub.amount * 4.33;
        case "MONTHLY":
          return total + sub.amount;
        case "QUARTERLY":
          return total + sub.amount / 3;
        case "YEARLY":
          return total + sub.amount / 12;
        default:
          return total + sub.amount;
      }
    }, 0);

  // Generate calendar days
  const calendarDays = [];

  // Empty cells for days before the first day of the month
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(<div key={`empty-${i}`} className="h-24 border border-muted/30" />);
  }

  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const daySubs = getSubscriptionsForDay(day);
    const today = isToday(day);

    calendarDays.push(
      <div
        key={day}
        className={`h-24 border border-muted/30 p-1 overflow-hidden ${today ? "bg-primary/5 border-primary" : ""
          }`}
      >
        <div className={`text-xs font-medium mb-1 ${today ? "text-primary" : "text-muted-foreground"}`}>
          {day}
        </div>
        <div className="space-y-1">
          {daySubs.slice(0, 2).map((sub) => (
            <button
              key={sub.id}
              onClick={() => setSelectedSubscription(sub)}
              className={`w-full text-left text-xs p-1 rounded truncate ${isDueSoon(sub)
                  ? "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300"
                  : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                }`}
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

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Subscriptions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {subscriptions.filter((s) => s.isActive).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monthly Cost (Est.)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalMonthlyCost)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Due This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {subscriptions.filter((s) => s.isActive && isDueSoon(s)).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{monthNames[month]} {year}</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={goToToday}>
                Today
              </Button>
              <Button variant="outline" size="icon" onClick={prevMonth}>
                <IconChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={nextMonth}>
                <IconChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {dayNames.map((day) => (
              <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>
          {/* Calendar grid */}
          <div className="grid grid-cols-7">{calendarDays}</div>
        </CardContent>
      </Card>

      {/* Subscription List */}
      <Card>
        <CardHeader>
          <CardTitle>All Subscriptions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {subscriptions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No subscriptions yet. Add your first subscription to start tracking!
              </p>
            ) : (
              subscriptions.map((sub) => (
                <div
                  key={sub.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${!sub.isActive ? "opacity-50" : ""
                    } ${isDueSoon(sub) ? "border-orange-300 bg-orange-50 dark:bg-orange-900/10" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    {isDueSoon(sub) && (
                      <IconBell className="h-4 w-4 text-orange-500" />
                    )}
                    <div>
                      <div className="font-medium">{sub.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatCurrency(sub.amount)} / {sub.billingCycle.toLowerCase()}
                        {" • "}
                        Next: {formatDate(sub.nextBillingDate)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {sub.paymentMethod && (
                      <Badge variant="secondary">{sub.paymentMethod}</Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRenew(sub)}
                      title="Mark as renewed"
                    >
                      <IconRefresh className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(sub)}
                    >
                      <IconEdit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => setDeleteConfirm(sub)}
                    >
                      <IconTrash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Subscription Detail Dialog */}
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
                  <p className="font-medium">{formatCurrency(selectedSubscription.amount)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Billing Cycle</Label>
                  <p className="font-medium capitalize">{selectedSubscription.billingCycle.toLowerCase()}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Next Billing</Label>
                  <p className="font-medium">
                    {formatDate(selectedSubscription.nextBillingDate)}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Payment Method</Label>
                  <p className="font-medium">{selectedSubscription.paymentMethod || "-"}</p>
                </div>
              </div>
              {selectedSubscription.description && (
                <div>
                  <Label className="text-muted-foreground">Description</Label>
                  <p>{selectedSubscription.description}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedSubscription(null)}>
              Close
            </Button>
            <Button onClick={() => {
              if (selectedSubscription) {
                openEditDialog(selectedSubscription);
                setSelectedSubscription(null);
              }
            }}>
              Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
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
                <Input
                  type="number"
                  step="0.01"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Billing Cycle</Label>
                <Select value={editBillingCycle} onValueChange={setEditBillingCycle}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {billingCycles.map((cycle) => (
                      <SelectItem key={cycle.value} value={cycle.value}>
                        {cycle.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Next Billing Date</Label>
                <Input
                  type="date"
                  value={editNextBillingDate}
                  onChange={(e) => setEditNextBillingDate(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={editPaymentMethod} onValueChange={setEditPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((method) => (
                      <SelectItem key={method.value} value={method.value}>
                        {method.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Alert Days Before</Label>
                <Input
                  type="number"
                  min="1"
                  max="30"
                  value={editAlertDays}
                  onChange={(e) => setEditAlertDays(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSubscription(null)}>
              Cancel
            </Button>
            <Button onClick={handleEditSave} disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Subscription</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to delete &quot;{deleteConfirm?.name}&quot;? This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={loading}>
              {loading ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

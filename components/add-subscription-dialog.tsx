"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { IconPlus, IconCalendarMonth, IconChevronDown } from "@tabler/icons-react";
import { createSubscription } from "@/lib/actions/subscriptions";
import { calculateNextBillingDateFromStart } from "@/lib/subscription-utils";
import { createExpense } from "@/lib/actions/expenses";

type AccountOption = {
  id: string;
  name: string;
  type: string;
};

const billingCycles = [
  { value: "ONCE", label: "One-time (non-recurring)" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "YEARLY", label: "Yearly" },
];

type AddSubscriptionDialogProps = {
  accounts?: AccountOption[];
};

export function AddSubscriptionDialog({ accounts = [] }: AddSubscriptionDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [billingCycle, setBillingCycle] = useState<"ONCE" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY">("MONTHLY");
  const [startDate, setStartDate] = useState("");
  const [showManualDate, setShowManualDate] = useState(false);
  const [manualNextDate, setManualNextDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [alertDaysBefore, setAlertDaysBefore] = useState("3");

  // Auto-calculate next billing date from start date + billing cycle
  const computedNextBilling = useMemo(() => {
    if (!startDate || !billingCycle || billingCycle === "ONCE") return null;
    return calculateNextBillingDateFromStart(new Date(startDate), billingCycle);
  }, [startDate, billingCycle]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const resetForm = () => {
    setName("");
    setAmount("");
    setBillingCycle("MONTHLY");
    setStartDate("");
    setShowManualDate(false);
    setManualNextDate("");
    setPaymentMethod("");
    setCategory("");
    setDescription("");
    setAlertDaysBefore("3");
  };

  // Use computed date if available, otherwise manual date, otherwise null
  const getNextBillingDate = (): Date | undefined => {
    if (showManualDate && manualNextDate) {
      return new Date(manualNextDate);
    }
    if (computedNextBilling) {
      return computedNextBilling;
    }
    return undefined;
  };

  const handleSubmit = async () => {
    if (!name || !amount) return;
    
    const nextBillingDate = getNextBillingDate();
    if (!nextBillingDate && billingCycle !== "ONCE") return;
    // For ONCE, if no start date, use today

    setLoading(true);
    try {
      await createSubscription({
        name,
        amount: parseFloat(amount),
        billingCycle,
        nextBillingDate: nextBillingDate || new Date(),
        startDate: startDate ? new Date(startDate) : undefined,
        paymentMethod: paymentMethod || undefined,
        category: category || undefined,
        description: description || undefined,
        alertDaysBefore: parseInt(alertDaysBefore) || 3,
      });

      // Also create an expense for the first payment (use today's date)
      await createExpense({
        amount: parseFloat(amount),
        category: "Subscription",
        description: `${name} - ${billingCycle.toLowerCase()} subscription`,
        merchant: name,
        date: new Date(),
        paymentMethod: paymentMethod || undefined,
      });

      resetForm();
      setOpen(false);
      router.refresh();
    } catch (error) {
      console.error("Failed to create subscription:", error);
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = name && amount && (getNextBillingDate() || billingCycle === "ONCE");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <IconPlus className="mr-2 h-4 w-4" />
          Add Subscription
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Subscription</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Name + Amount */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="Netflix, Spotify..."
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>

          {/* Billing Cycle + Start Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="billing-cycle">Billing Cycle</Label>
              <Select value={billingCycle} onValueChange={(v) => setBillingCycle(v as typeof billingCycle)}>
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
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  // Clear manual date when start date changes
                  if (showManualDate) setShowManualDate(false);
                }}
              />
              <p className="text-[10px] text-muted-foreground">When did you subscribe?</p>
            </div>
          </div>

          {/* Auto-calculated next billing preview */}
          {startDate && computedNextBilling && (
            <div className="bg-primary/5 border border-primary/20 rounded px-3 py-2 flex items-center gap-2">
              <IconCalendarMonth className="h-4 w-4 text-primary shrink-0" />
              <div className="text-xs">
                <span className="font-medium">Next billing: </span>
                <span className="font-semibold">{formatDate(computedNextBilling)}</span>
                <span className="text-muted-foreground ml-1">
                  (auto-calculated from start date)
                </span>
              </div>
            </div>
          )}

          {/* Manual date override (collapsed by default) */}
          {!showManualDate ? (
            <button
              type="button"
              onClick={() => setShowManualDate(true)}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <IconChevronDown className="h-3 w-3" />
              Set a custom next billing date instead
            </button>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="manual-next-date">Custom Next Billing Date</Label>
                <button
                  type="button"
                  onClick={() => {
                    setShowManualDate(false);
                    setManualNextDate("");
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Use auto-calculated
                </button>
              </div>
              <Input
                id="manual-next-date"
                type="date"
                value={manualNextDate}
                onChange={(e) => setManualNextDate(e.target.value)}
              />
            </div>
          )}

          {/* Payment Method + Alert Days */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="payment-method">Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.name}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="alert-days">Alert Days Before</Label>
              <Input
                id="alert-days"
                type="number"
                min="1"
                max="30"
                value={alertDaysBefore}
                onChange={(e) => setAlertDaysBefore(e.target.value)}
              />
            </div>
          </div>

          {/* Category + Description */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                placeholder="e.g. Domains, Streaming"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground">Group related subscriptions</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                placeholder="Notes"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !canSubmit}>
            {loading ? "Adding..." : "Add Subscription"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState } from "react";
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
import { IconPlus } from "@tabler/icons-react";
import { createSubscription } from "@/lib/actions/subscriptions";
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
  const [nextBillingDate, setNextBillingDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [description, setDescription] = useState("");
  const [alertDaysBefore, setAlertDaysBefore] = useState("3");

  const resetForm = () => {
    setName("");
    setAmount("");
    setBillingCycle("MONTHLY");
    setNextBillingDate("");
    setPaymentMethod("");
    setDescription("");
    setAlertDaysBefore("3");
  };

  const handleSubmit = async () => {
    if (!name || !amount || !nextBillingDate) return;

    setLoading(true);
    try {
      // Create subscription
      await createSubscription({
        name,
        amount: parseFloat(amount),
        billingCycle,
        nextBillingDate: new Date(nextBillingDate),
        paymentMethod: paymentMethod || undefined,
        description: description || undefined,
        alertDaysBefore: parseInt(alertDaysBefore) || 3,
      });

      // Also create an expense for the first payment (use today's date, not next billing date)
      await createExpense({
        amount: parseFloat(amount),
        category: "Subscription",
        description: `${name} - ${billingCycle.toLowerCase()} subscription`,
        merchant: name,
        date: new Date(), // Today's date
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <IconPlus className="mr-2 h-4 w-4" />
          Add Subscription
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Subscription</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
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
              <Label htmlFor="next-billing">Next Billing Date</Label>
              <Input
                id="next-billing"
                type="date"
                value={nextBillingDate}
                onChange={(e) => setNextBillingDate(e.target.value)}
              />
            </div>
          </div>

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

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Input
              id="description"
              placeholder="Notes about this subscription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !name || !amount || !nextBillingDate}>
            {loading ? "Adding..." : "Add Subscription"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

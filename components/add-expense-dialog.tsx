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
import { IconPlus, IconUpload, IconX } from "@tabler/icons-react";
import { createExpense } from "@/lib/actions/expenses";
import { createSubscription } from "@/lib/actions/subscriptions";

type AccountOption = {
  id: string;
  name: string;
  type: string;
};

const categories = [
  "Food",
  "Travel",
  "Entertainment",
  "Bills",
  "Shopping",
  "Health",
  "Education",
  "Investments",
  "Subscription",
  "General",
];

const billingCycles = [
  { value: "ONCE", label: "One-time (non-recurring)" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "YEARLY", label: "Yearly" },
];

type AddExpenseDialogProps = {
  accounts?: AccountOption[];
};

export function AddExpenseDialog({ accounts = [] }: AddExpenseDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("General");
  const [description, setDescription] = useState("");
  const [merchant, setMerchant] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");

  // Derive account name for display/label
  const selectedAccountName = accounts.find(a => a.id === selectedAccountId)?.name;
  const [receipt, setReceipt] = useState<File | null>(null);
  
  // Subscription-specific fields
  const [billingCycle, setBillingCycle] = useState<"ONCE" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY">("MONTHLY");
  const [alertDaysBefore, setAlertDaysBefore] = useState("3");
  
  const isSubscription = category === "Subscription";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;
    if (isSubscription && !merchant) return; // Subscription needs a name

    setLoading(true);
    try {
      if (isSubscription) {
        // Create subscription
        await createSubscription({
          name: merchant, // Use merchant as subscription name
          amount: parseFloat(amount),
          billingCycle,
          nextBillingDate: new Date(date),
          paymentMethod: selectedAccountName || undefined,
          description: description || undefined,
          alertDaysBefore: parseInt(alertDaysBefore) || 3,
        });
        
        // Also create an expense for the first payment (use today's date, not next billing date)
        await createExpense({
          amount: parseFloat(amount),
          category: "Subscription",
          description: `${merchant} - ${billingCycle.toLowerCase()} subscription`,
          merchant: merchant,
          date: new Date(), // Today's date
          paymentMethod: selectedAccountName || undefined,
          accountId: selectedAccountId || undefined,
        });
      } else {
        // Create regular expense
        const expense = await createExpense({
          amount: parseFloat(amount),
          category,
          description: description || undefined,
          merchant: merchant || undefined,
          date: new Date(date),
          paymentMethod: selectedAccountName || undefined,
          accountId: selectedAccountId || undefined,
        });

        // If there's a receipt, upload it
        if (receipt && expense?.id) {
          const formData = new FormData();
          formData.append("file", receipt);
          formData.append("expenseId", expense.id);
          await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });
        }
      }

      setOpen(false);
      resetForm();
      router.refresh();
    } catch (error) {
      console.error("Failed to create:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setAmount("");
    setCategory("General");
    setDescription("");
    setMerchant("");
    setDate(new Date().toISOString().split("T")[0]);
    setSelectedAccountId("");
    setReceipt(null);
    setBillingCycle("MONTHLY");
    setAlertDaysBefore("3");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <IconPlus className="mr-2 h-4 w-4" />
          Add Expense
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isSubscription ? "Add Subscription" : "Add New Expense"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {isSubscription && (
            <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
              📅 This will create a recurring subscription that you can track in the Subscriptions page.
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="merchant">{isSubscription ? "Subscription Name *" : "Merchant"}</Label>
            <Input
              id="merchant"
              placeholder={isSubscription ? "Netflix, Spotify, etc." : "Store or vendor name"}
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              required={isSubscription}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder={isSubscription ? "Notes about this subscription" : "What was this expense for?"}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">{isSubscription ? "Next Billing Date" : "Date"}</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {isSubscription ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="billingCycle">Billing Cycle</Label>
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
                <Label htmlFor="alertDays">Alert Days Before</Label>
                <Input
                  id="alertDays"
                  type="number"
                  min="1"
                  max="30"
                  value={alertDaysBefore}
                  onChange={(e) => setAlertDaysBefore(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Receipt</Label>
              {receipt ? (
                <div className="flex items-center gap-2 rounded-md border p-2">
                  <span className="flex-1 truncate text-sm">{receipt.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setReceipt(null)}
                  >
                    <IconX className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed p-2 hover:bg-muted/50">
                  <IconUpload className="h-4 w-4" />
                  <span className="text-sm">Upload</span>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={(e) => setReceipt(e.target.files?.[0] || null)}
                  />
                </label>
              )}
            </div>
          )}
          
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || (isSubscription && !merchant)}>
              {loading ? "Adding..." : isSubscription ? "Add Subscription" : "Add Expense"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

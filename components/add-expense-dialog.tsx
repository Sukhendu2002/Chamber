"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toLocalDateString } from "@/lib/utils";
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
import { TagInput } from "@/components/tag-input";
import { IconPlus, IconUpload, IconX } from "@tabler/icons-react";
import { createExpense } from "@/lib/actions/expenses";
import { getUserTags } from "@/lib/actions/expenses";
import { createSubscription } from "@/lib/actions/subscriptions";
import { smartCategorize } from "@/lib/actions/categories";
import type { UserCategoryRecord } from "@/lib/actions/categories";

type AccountOption = {
  id: string;
  name: string;
  type: string;
  currentBalance: number;
  creditLimit: number | null;
};

type ExpenseCategory = string;

const billingCycles = [
  { value: "ONCE", label: "One-time (non-recurring)" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "YEARLY", label: "Yearly" },
];

type AddExpenseDialogProps = {
  accounts?: AccountOption[];
  categories?: UserCategoryRecord[];
  currency?: string;
};

export function AddExpenseDialog({
  accounts = [],
  categories = [],
  currency = "INR",
}: AddExpenseDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("General");
  const [smartCategory, setSmartCategory] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [merchant, setMerchant] = useState("");
  const [date, setDate] = useState(toLocalDateString());
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");

  const selectedAccount = accounts.find((account) => account.id === selectedAccountId);
  const selectedAccountName = selectedAccount?.name;
  const parsedAmount = Number(amount);
  const availableCredit =
    selectedAccount?.type === "CREDIT_CARD" && selectedAccount.creditLimit !== null
      ? selectedAccount.creditLimit - selectedAccount.currentBalance
      : null;
  const exceedsAvailableCredit =
    availableCredit !== null &&
    Number.isFinite(parsedAmount) &&
    parsedAmount > availableCredit;
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  const [receipt, setReceipt] = useState<File | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  
  // Fetch existing tags when dialog opens
  useEffect(() => {
    if (open) {
      getUserTags().then(setTagSuggestions);
    }
  }, [open]);

  // Smart categorization: suggest category based on merchant/description
  useEffect(() => {
    if (!merchant && !description) {
      setSmartCategory(null);
      return;
    }
    const timer = setTimeout(async () => {
      const result = await smartCategorize(merchant, description);
      if (result.confidence !== "low") {
        setSmartCategory(result.category);
      } else {
        setSmartCategory(null);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [merchant, description]);
  
  // Subscription-specific fields
  const [billingCycle, setBillingCycle] = useState<"ONCE" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY">("MONTHLY");
  const [alertDaysBefore, setAlertDaysBefore] = useState("3");
  
  const isSubscription = category === "Subscription";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;
    if (isSubscription && !merchant) return; // Subscription needs a name
    if (exceedsAvailableCredit) return;

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
          tags: tags.length > 0 ? tags : undefined,
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
    setDate(toLocalDateString());
    setSelectedAccountId("");
    setReceipt(null);
    setTags([]);
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
              <Select value={category} onValueChange={(v) => setCategory(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(categories.length > 0 ? categories : [{ id: "general", name: "General", icon: "📦", color: null, parentId: null, sortOrder: 0, userId: "", createdAt: new Date(), updatedAt: new Date() }]).map((cat) => (
                    <SelectItem key={cat.id} value={cat.name}>
                      {cat.icon || "📦"} {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {smartCategory && smartCategory !== category && (
                <button
                  type="button"
                  className="text-xs text-blue-500 hover:underline"
                  onClick={() => setCategory(smartCategory!)}
                >
                  💡 Suggested: {smartCategory} (click to apply)
                </button>
              )}
            </div>
          </div>
          
          {isSubscription && (
            <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
              This will create a recurring subscription that you can track in the Subscriptions page.
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
          
          <div className="space-y-2">
            <Label>Tags</Label>
            <TagInput
              value={tags}
              onChange={setTags}
              suggestions={tagSuggestions}
              placeholder="Add keywords..."
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
              <Label htmlFor="paymentMethod">Paid with</Label>
              <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                <SelectTrigger id="paymentMethod">
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                      {account.type === "CREDIT_CARD" ? " · Credit card" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedAccount?.type === "CREDIT_CARD" && (
            <div
              className={`rounded-md border p-3 text-sm ${
                exceedsAvailableCredit
                  ? "border-destructive/40 bg-destructive/10 text-destructive"
                  : "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300"
              }`}
            >
              <p>
                This purchase increases your card outstanding. Your bank balance changes
                only when you pay the card.
              </p>
              {availableCredit !== null && (
                <p className="mt-1 font-medium">
                  Available after purchase:{" "}
                  {formatCurrency(
                    availableCredit - (Number.isFinite(parsedAmount) ? parsedAmount : 0),
                  )}
                  {exceedsAvailableCredit ? " — expense exceeds the card limit" : ""}
                </p>
              )}
            </div>
          )}
          
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
                    accept="image/jpeg,image/png,image/webp,application/pdf"
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
            <Button
              type="submit"
              disabled={loading || (isSubscription && !merchant) || exceedsAvailableCredit}
            >
              {loading ? "Adding..." : isSubscription ? "Add Subscription" : "Add Expense"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IconArrowsTransferDown } from "@tabler/icons-react";
import { createTransfer } from "@/lib/actions/transfers";

type Account = {
  id: string;
  name: string;
  type: string;
  currentBalance: number;
};

type BankTransferDialogProps = {
  accounts: Account[];
  currency: string;
};

function toLocalDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function BankTransferDialog({ accounts, currency }: BankTransferDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(toLocalDateString());

  const currencySymbol = (() => {
    try {
      return (
        new Intl.NumberFormat("en", { style: "currency", currency, minimumFractionDigits: 0 })
          .formatToParts(0)
          .find((p) => p.type === "currency")?.value ?? currency
      );
    } catch {
      return currency;
    }
  })();

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);

  const resetForm = () => {
    setFromAccountId("");
    setToAccountId("");
    setAmount("");
    setNote("");
    setDate(toLocalDateString());
    setError(null);
  };

  const fromAccount = accounts.find((a) => a.id === fromAccountId);
  const toAccount = accounts.find((a) => a.id === toAccountId);

  const parsedAmount = parseFloat(amount);

  const hasInsufficientFunds = (() => {
    if (!fromAccount || isNaN(parsedAmount)) return false;
    if (fromAccount.type === "CREDIT_CARD") {
      // For credit cards, check against available credit (limit - current debt)
      const creditLimit = (fromAccount as Account & { creditLimit?: number }).creditLimit ?? 0;
      const availableCredit = creditLimit - fromAccount.currentBalance;
      return parsedAmount > availableCredit;
    }
    return parsedAmount > fromAccount.currentBalance;
  })();

  const isValid =
    fromAccountId &&
    toAccountId &&
    fromAccountId !== toAccountId &&
    amount &&
    !isNaN(parsedAmount) &&
    parsedAmount > 0 &&
    !hasInsufficientFunds;

  const handleSubmit = async () => {
    if (!isValid) return;
    setLoading(true);
    setError(null);

    try {
      const [year, month, day] = date.split("-").map(Number);
      const transferDate = new Date(year, month - 1, day);

      await createTransfer({
        fromAccountId,
        toAccountId,
        amount: parsedAmount,
        note: note.trim() || undefined,
        date: transferDate,
      });

      resetForm();
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transfer failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Filter out the selected account from the other side
  const toAccountOptions = accounts.filter((a) => a.id !== fromAccountId);
  const fromAccountOptions = accounts.filter((a) => a.id !== toAccountId);

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        setOpen(val);
        if (!val) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <IconArrowsTransferDown className="mr-2 h-4 w-4" />
          Transfer
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Bank Transfer</DialogTitle>
          <DialogDescription>
            Move money between your accounts. Both balances will be updated immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* From Account */}
          <div className="grid gap-2">
            <Label htmlFor="fromAccount">From Account *</Label>
            <Select
              value={fromAccountId}
              onValueChange={(v) => {
                setFromAccountId(v);
                if (v === toAccountId) setToAccountId("");
              }}
            >
              <SelectTrigger id="fromAccount">
                <SelectValue placeholder="Select source account" />
              </SelectTrigger>
              <SelectContent>
                {fromAccountOptions.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    <span>{a.name}</span>
                    <span className="ml-2 text-muted-foreground text-xs">
                      {formatCurrency(a.currentBalance)}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fromAccount && (
              <p className="text-xs text-muted-foreground">
                Available balance: {formatCurrency(fromAccount.currentBalance)}
              </p>
            )}
          </div>

          {/* To Account */}
          <div className="grid gap-2">
            <Label htmlFor="toAccount">To Account *</Label>
            <Select
              value={toAccountId}
              onValueChange={(v) => {
                setToAccountId(v);
                if (v === fromAccountId) setFromAccountId("");
              }}
            >
              <SelectTrigger id="toAccount">
                <SelectValue placeholder="Select destination account" />
              </SelectTrigger>
              <SelectContent>
                {toAccountOptions.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    <span>{a.name}</span>
                    <span className="ml-2 text-muted-foreground text-xs">
                      {formatCurrency(a.currentBalance)}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amount */}
          <div className="grid gap-2">
            <Label htmlFor="amount">Amount *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {currencySymbol}
              </span>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                min="0.01"
                step="0.01"
                className="pl-8"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            {hasInsufficientFunds && (
              <p className="text-xs text-destructive">
                {fromAccount?.type === "CREDIT_CARD"
                  ? `Insufficient credit limit. Available: ${formatCurrency(
                      ((fromAccount as Account & { creditLimit?: number }).creditLimit ?? 0) -
                        fromAccount.currentBalance
                    )}`
                  : `Insufficient funds. Available: ${formatCurrency(fromAccount!.currentBalance)}`}
              </p>
            )}
          </div>

          {/* Preview */}
          {fromAccount && toAccount && parsedAmount > 0 && !hasInsufficientFunds && (
            <div className="rounded-md border bg-muted/40 px-4 py-3 text-sm grid gap-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{fromAccount.name} after</span>
                <span className="font-medium">
                  {formatCurrency(
                    fromAccount.type === "CREDIT_CARD"
                      ? fromAccount.currentBalance + parsedAmount
                      : fromAccount.currentBalance - parsedAmount
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{toAccount.name} after</span>
                <span className="font-medium">
                  {formatCurrency(
                    toAccount.type === "CREDIT_CARD"
                      ? toAccount.currentBalance - parsedAmount
                      : toAccount.currentBalance + parsedAmount
                  )}
                </span>
              </div>
            </div>
          )}

          {/* Date */}
          <div className="grid gap-2">
            <Label htmlFor="transferDate">Date</Label>
            <Input
              id="transferDate"
              type="date"
              value={date}
              max={toLocalDateString()}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* Note */}
          <div className="grid gap-2">
            <Label htmlFor="note">Note (optional)</Label>
            <Textarea
              id="note"
              placeholder="e.g., Moving savings to investments"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !isValid}>
            {loading ? "Transferring..." : "Transfer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

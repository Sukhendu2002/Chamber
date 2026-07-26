"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { IconCreditCardPay } from "@tabler/icons-react";
import { isCreditCardPaymentSource } from "@/lib/accounting";
import { payCreditCardBill } from "@/lib/actions/credit-cards";
import { toLocalDateString } from "@/lib/utils";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export interface CreditCardPaymentAccount {
  id: string;
  name: string;
  type: string;
  currentBalance: number;
  creditLimit: number | null;
}

interface CreditCardPaymentDialogProps {
  accounts: CreditCardPaymentAccount[];
  currency: string;
  cardAccountId?: string;
}

function createIdempotencyKey(): string {
  return crypto.randomUUID();
}

export function CreditCardPaymentDialog({
  accounts,
  currency,
  cardAccountId,
}: CreditCardPaymentDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCardId, setSelectedCardId] = useState(cardAccountId ?? "");
  const [sourceAccountId, setSourceAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(toLocalDateString());
  const [note, setNote] = useState("");
  const [allowOverpayment, setAllowOverpayment] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(createIdempotencyKey);

  const cards = useMemo(
    () => accounts.filter((account) => account.type === "CREDIT_CARD"),
    [accounts],
  );
  const sourceAccounts = useMemo(
    () => accounts.filter((account) => isCreditCardPaymentSource(account.type)),
    [accounts],
  );

  const selectedCard = cards.find((account) => account.id === selectedCardId);
  const selectedSource = sourceAccounts.find((account) => account.id === sourceAccountId);
  const parsedAmount = Number(amount);
  const isAmountValid = Number.isFinite(parsedAmount) && parsedAmount > 0;
  const isOverpayment =
    Boolean(selectedCard) &&
    isAmountValid &&
    parsedAmount > Math.max(selectedCard?.currentBalance ?? 0, 0);
  const hasInsufficientFunds =
    Boolean(selectedSource) &&
    isAmountValid &&
    parsedAmount > (selectedSource?.currentBalance ?? 0);
  const canSubmit =
    Boolean(selectedCard) &&
    Boolean(selectedSource) &&
    isAmountValid &&
    !hasInsufficientFunds &&
    (!isOverpayment || allowOverpayment);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);

  const resetForm = () => {
    setSelectedCardId(cardAccountId ?? "");
    setSourceAccountId("");
    setAmount("");
    setDate(toLocalDateString());
    setNote("");
    setAllowOverpayment(false);
    setError(null);
    setIdempotencyKey(createIdempotencyKey());
  };

  const handleSubmit = async () => {
    if (!selectedCard || !selectedSource || !canSubmit) return;

    setLoading(true);
    setError(null);

    try {
      const [year, month, day] = date.split("-").map(Number);
      await payCreditCardBill({
        sourceAccountId: selectedSource.id,
        cardAccountId: selectedCard.id,
        amount: parsedAmount,
        date: new Date(year, month - 1, day),
        note: note.trim() || undefined,
        idempotencyKey,
        allowOverpayment,
      });

      setOpen(false);
      resetForm();
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Credit card payment failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <IconCreditCardPay className="mr-2 h-4 w-4" />
          Pay card
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Pay credit card</DialogTitle>
          <DialogDescription>
            This moves money from an asset account to your card. It will not be counted
            as another expense.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor={`card-${cardAccountId ?? "select"}`}>Credit card</Label>
            <Select
              value={selectedCardId}
              onValueChange={(value) => {
                setSelectedCardId(value);
                setAmount("");
                setAllowOverpayment(false);
              }}
              disabled={Boolean(cardAccountId)}
            >
              <SelectTrigger id={`card-${cardAccountId ?? "select"}`}>
                <SelectValue placeholder="Select credit card" />
              </SelectTrigger>
              <SelectContent>
                {cards.map((card) => (
                  <SelectItem key={card.id} value={card.id}>
                    {card.name} · {formatCurrency(Math.max(card.currentBalance, 0))} outstanding
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor={`source-${cardAccountId ?? "select"}`}>Pay from</Label>
            <Select value={sourceAccountId} onValueChange={setSourceAccountId}>
              <SelectTrigger id={`source-${cardAccountId ?? "select"}`}>
                <SelectValue placeholder="Select payment account" />
              </SelectTrigger>
              <SelectContent>
                {sourceAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name} · {formatCurrency(account.currentBalance)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor={`payment-amount-${cardAccountId ?? "select"}`}>Amount</Label>
              {selectedCard && selectedCard.currentBalance > 0 && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setAmount(selectedCard.currentBalance.toString());
                    setAllowOverpayment(false);
                  }}
                >
                  Pay current outstanding
                </Button>
              )}
            </div>
            <Input
              id={`payment-amount-${cardAccountId ?? "select"}`}
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(event) => {
                setAmount(event.target.value);
                setAllowOverpayment(false);
              }}
              placeholder="0.00"
            />
            {hasInsufficientFunds && selectedSource && (
              <p className="text-xs text-destructive">
                Insufficient funds. Available: {formatCurrency(selectedSource.currentBalance)}
              </p>
            )}
          </div>

          {selectedCard && selectedSource && isAmountValid && !hasInsufficientFunds && (
            <div className="grid gap-1 rounded-md border bg-muted/40 px-4 py-3 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">{selectedSource.name} after</span>
                <span className="font-medium">
                  {formatCurrency(selectedSource.currentBalance - parsedAmount)}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">{selectedCard.name} after</span>
                <span className="font-medium">
                  {selectedCard.currentBalance - parsedAmount >= 0
                    ? `${formatCurrency(selectedCard.currentBalance - parsedAmount)} outstanding`
                    : `${formatCurrency(parsedAmount - selectedCard.currentBalance)} credit`}
                </span>
              </div>
            </div>
          )}

          {isOverpayment && (
            <label className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
              <input
                type="checkbox"
                checked={allowOverpayment}
                onChange={(event) => setAllowOverpayment(event.target.checked)}
                className="mt-0.5 h-4 w-4"
              />
              <span>
                This exceeds the current outstanding and will create a card credit.
                Confirm the overpayment to continue.
              </span>
            </label>
          )}

          <div className="grid gap-2">
            <Label htmlFor={`payment-date-${cardAccountId ?? "select"}`}>Payment date</Label>
            <Input
              id={`payment-date-${cardAccountId ?? "select"}`}
              type="date"
              value={date}
              max={toLocalDateString()}
              onChange={(event) => setDate(event.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor={`payment-note-${cardAccountId ?? "select"}`}>Note (optional)</Label>
            <Textarea
              id={`payment-note-${cardAccountId ?? "select"}`}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Reference number or payment note"
              rows={2}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !canSubmit}>
            {loading ? "Paying..." : "Confirm payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  IconAlertTriangle,
  IconCamera,
  IconCheck,
  IconDownload,
  IconLoader2,
  IconPencil,
  IconPhoto,
  IconRefresh,
  IconShare3,
} from "@tabler/icons-react";
import { createExpense } from "@/lib/actions/expenses";
import { toLocalDateString } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const SHARED_RECEIPT_PATH = "/__chamber_shared_receipt__";

type CaptureMode = "screenshot" | "manual";
type CaptureStage = "idle" | "parsing" | "review" | "saving" | "saved";

interface AccountOption {
  id: string;
  name: string;
  type: string;
  currentBalance: number;
  creditLimit: number | null;
}

interface CategoryOption {
  id: string;
  name: string;
}

interface PwaCaptureProps {
  accounts: AccountOption[];
  categories: CategoryOption[];
  currency: string;
  initialMode: CaptureMode;
  source?: string;
}

interface ParsedExpenseResponse {
  success: boolean;
  expense?: {
    amount: number;
    category: string;
    merchant?: string;
    description: string;
    confidence: number;
  };
  receiptUrl?: string;
  error?: string;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the screenshot"));
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string" || !result.includes(",")) {
        reject(new Error("Could not read the screenshot"));
        return;
      }
      resolve(result.split(",", 2)[1]);
    };
    reader.readAsDataURL(file);
  });
}

function localDateFromInput(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

export function PwaCapture({
  accounts,
  categories,
  currency,
  initialMode,
  source,
}: PwaCaptureProps) {
  const router = useRouter();
  const sharedReceiptRequested = useRef(false);
  const [mode, setMode] = useState<CaptureMode>(initialMode);
  const [stage, setStage] = useState<CaptureStage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | undefined>();
  const [confidence, setConfidence] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("General");
  const [merchant, setMerchant] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(toLocalDateString());
  const [accountId, setAccountId] = useState("");

  const selectedAccount = accounts.find((account) => account.id === accountId);
  const parsedAmount = Number(amount);
  const availableCredit =
    selectedAccount?.type === "CREDIT_CARD" && selectedAccount.creditLimit !== null
      ? selectedAccount.creditLimit - selectedAccount.currentBalance
      : null;
  const exceedsAvailableCredit =
    availableCredit !== null &&
    Number.isFinite(parsedAmount) &&
    parsedAmount > availableCredit;

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const parseScreenshot = useCallback(async (file: File) => {
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      setError("Choose a JPEG, PNG, or WebP screenshot.");
      return;
    }
    if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
      setError("The screenshot must be smaller than 10 MB.");
      return;
    }

    setMode("screenshot");
    setError(null);
    setStage("parsing");
    setReceiptUrl(undefined);
    setConfidence(null);
    setPreviewUrl((currentUrl) => {
      if (currentUrl) URL.revokeObjectURL(currentUrl);
      return URL.createObjectURL(file);
    });

    try {
      const imageBase64 = await readFileAsBase64(file);
      const response = await fetch("/api/chat/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "image",
          imageBase64,
          mimeType: file.type,
        }),
      });
      const result = (await response.json()) as ParsedExpenseResponse;

      if (!response.ok || !result.success || !result.expense) {
        throw new Error(result.error || "Chamber could not read this screenshot.");
      }

      setAmount(String(result.expense.amount));
      setCategory(result.expense.category || "General");
      setMerchant(result.expense.merchant || "");
      setDescription(result.expense.description || "");
      setConfidence(result.expense.confidence);
      setReceiptUrl(result.receiptUrl);
      setStage("review");
    } catch (parseError) {
      setStage("idle");
      setError(
        parseError instanceof Error
          ? parseError.message
          : "Chamber could not read this screenshot.",
      );
    }
  }, []);

  useEffect(() => {
    if (source !== "share" || sharedReceiptRequested.current) return;
    sharedReceiptRequested.current = true;

    const consumeSharedReceipt = async () => {
      try {
        const response = await fetch(SHARED_RECEIPT_PATH, { cache: "no-store" });
        if (!response.ok) {
          throw new Error("The shared screenshot was not available. Share it again.");
        }
        const blob = await response.blob();
        const encodedName = response.headers.get("X-Chamber-Filename");
        const fileName = encodedName
          ? decodeURIComponent(encodedName)
          : "payment-screenshot";
        await parseScreenshot(new File([blob], fileName, { type: blob.type }));
      } catch (shareError) {
        setError(
          shareError instanceof Error
            ? shareError.message
            : "The shared screenshot could not be opened.",
        );
      }
    };

    void consumeSharedReceipt();
  }, [parseScreenshot, source]);

  useEffect(() => {
    if (source === "invalid-share") {
      setError("Android did not share a supported image. Use a JPEG, PNG, or WebP screenshot.");
    } else if (source === "share-failed") {
      setError("Android could not hand the screenshot to Chamber. Please share it again.");
    } else if (source === "share-unavailable") {
      setError(
        "Quick sharing is not active yet. Open Chamber once after installing it, then share the screenshot again.",
      );
    }
  }, [source]);

  const resetForm = (nextMode: CaptureMode = mode) => {
    setMode(nextMode);
    setStage("idle");
    setError(null);
    setReceiptUrl(undefined);
    setConfidence(null);
    setAmount("");
    setCategory("General");
    setMerchant("");
    setDescription("");
    setDate(toLocalDateString());
    setAccountId("");
    setPreviewUrl((currentUrl) => {
      if (currentUrl) URL.revokeObjectURL(currentUrl);
      return null;
    });
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    if (exceedsAvailableCredit) {
      setError("This expense exceeds the selected credit card's available credit.");
      return;
    }

    setError(null);
    setStage("saving");
    try {
      await createExpense({
        amount: numericAmount,
        category,
        merchant: merchant.trim() || undefined,
        description: description.trim() || undefined,
        date: localDateFromInput(date),
        accountId: selectedAccount?.id,
        paymentMethod: selectedAccount?.name,
        receiptUrl,
      });
      setStage("saved");
      window.setTimeout(() => router.push("/expenses?capture=saved"), 700);
    } catch (saveError) {
      setStage(mode === "screenshot" && previewUrl ? "review" : "idle");
      setError(
        saveError instanceof Error ? saveError.message : "The expense could not be saved.",
      );
    }
  };

  const showExpenseForm = mode === "manual" || stage === "review" || stage === "saving";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2" role="tablist" aria-label="Capture method">
        <Button
          type="button"
          role="tab"
          aria-selected={mode === "screenshot"}
          variant={mode === "screenshot" ? "default" : "outline"}
          className="min-h-11"
          disabled={stage === "parsing" || stage === "saving"}
          onClick={() => resetForm("screenshot")}
        >
          <IconPhoto aria-hidden="true" />
          Screenshot
        </Button>
        <Button
          type="button"
          role="tab"
          aria-selected={mode === "manual"}
          variant={mode === "manual" ? "default" : "outline"}
          className="min-h-11"
          disabled={stage === "parsing" || stage === "saving"}
          onClick={() => resetForm("manual")}
        >
          <IconPencil aria-hidden="true" />
          Manual entry
        </Button>
      </div>

      {mode === "screenshot" && stage === "idle" && (
        <Card>
          <CardContent className="space-y-4 pt-1">
            <label
              htmlFor="payment-screenshot"
              className="flex min-h-40 cursor-pointer flex-col items-center justify-center gap-3 border border-dashed bg-muted/30 p-6 text-center transition-colors hover:bg-muted/60 focus-within:ring-2 focus-within:ring-ring"
            >
              <span className="flex size-12 items-center justify-center border bg-background">
                <IconCamera aria-hidden="true" className="size-6" />
              </span>
              <span className="text-sm font-medium">Choose a payment screenshot</span>
              <span className="max-w-xs text-xs text-muted-foreground">
                Or take the Android screenshot first, tap Share, and choose Chamber.
              </span>
              <input
                id="payment-screenshot"
                aria-label="Payment screenshot"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void parseScreenshot(file);
                  event.target.value = "";
                }}
              />
            </label>
          </CardContent>
        </Card>
      )}

      {stage === "parsing" && (
        <Card aria-live="polite">
          <CardContent className="flex min-h-48 flex-col items-center justify-center gap-3 text-center">
            <IconLoader2 aria-hidden="true" className="size-8 animate-spin" />
            <div>
              <p className="text-sm font-medium">Reading your screenshot</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Extracting the amount, merchant, and category…
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {showExpenseForm && (
        <form onSubmit={handleSave} className="space-y-4">
          {previewUrl && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                  Screenshot preview
                  {confidence !== null && (
                    <span className="text-xs font-normal text-muted-foreground">
                      {Math.round(confidence * 100)}% AI confidence
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Payment screenshot selected for this expense"
                  className="max-h-72 w-full border bg-muted object-contain"
                />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {mode === "screenshot" ? "Review expense" : "Add expense"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="capture-amount">Amount *</Label>
                  <Input
                    id="capture-amount"
                    type="number"
                    inputMode="decimal"
                    min="0.01"
                    step="0.01"
                    className="min-h-11 text-base"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    required
                    autoFocus={mode === "manual"}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="capture-category">Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger id="capture-category" className="min-h-11 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((categoryOption) => (
                        <SelectItem key={categoryOption.id} value={categoryOption.name}>
                          {categoryOption.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="capture-merchant">Merchant</Label>
                <Input
                  id="capture-merchant"
                  className="min-h-11 text-base"
                  value={merchant}
                  onChange={(event) => setMerchant(event.target.value)}
                  placeholder="Store or recipient"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="capture-description">Description</Label>
                <Input
                  id="capture-description"
                  className="min-h-11 text-base"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="What was this payment for?"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="capture-date">Date</Label>
                  <Input
                    id="capture-date"
                    type="date"
                    className="min-h-11 text-base"
                    value={date}
                    max={toLocalDateString()}
                    onChange={(event) => setDate(event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="capture-account">Account</Label>
                  <Select
                    value={accountId || "none"}
                    onValueChange={(value) => setAccountId(value === "none" ? "" : value)}
                  >
                    <SelectTrigger id="capture-account" className="min-h-11 w-full">
                      <SelectValue placeholder="No account adjustment" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No account adjustment</SelectItem>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedAccount && (
                <div className="border bg-muted/40 p-3 text-xs text-muted-foreground">
                  {selectedAccount.type === "CREDIT_CARD" && availableCredit !== null
                    ? `Available credit: ${formatCurrency(availableCredit, currency)}`
                    : `Current balance: ${formatCurrency(selectedAccount.currentBalance, currency)}`}
                  {exceedsAvailableCredit && (
                    <p className="mt-1 font-medium text-destructive">
                      This expense exceeds the available credit.
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11"
                  disabled={stage === "saving"}
                  onClick={() => resetForm(mode)}
                >
                  <IconRefresh aria-hidden="true" />
                  Start over
                </Button>
                <Button
                  type="submit"
                  className="min-h-11"
                  disabled={stage === "saving" || exceedsAvailableCredit}
                >
                  {stage === "saving" ? (
                    <IconLoader2 aria-hidden="true" className="animate-spin" />
                  ) : (
                    <IconCheck aria-hidden="true" />
                  )}
                  {stage === "saving" ? "Saving…" : "Save expense"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      )}

      {stage === "saved" && (
        <Card aria-live="polite">
          <CardContent className="flex min-h-40 flex-col items-center justify-center gap-3 text-center">
            <span className="flex size-12 items-center justify-center border bg-primary text-primary-foreground">
              <IconCheck aria-hidden="true" className="size-6" />
            </span>
            <div>
              <p className="text-sm font-medium">Expense saved</p>
              <p className="mt-1 text-xs text-muted-foreground">Opening your expenses…</p>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 border border-destructive/40 bg-destructive/10 p-3 text-sm"
        >
          <IconAlertTriangle
            aria-hidden="true"
            className="mt-0.5 size-5 shrink-0 text-destructive"
          />
          <p>{error}</p>
        </div>
      )}
    </div>
  );
}

export function PwaInstallButton() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const displayMode = window.matchMedia("(display-mode: standalone)");
    const updateStandalone = () => setIsStandalone(displayMode.matches);
    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    updateStandalone();
    displayMode.addEventListener("change", updateStandalone);
    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    return () => {
      displayMode.removeEventListener("change", updateStandalone);
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
    };
  }, []);

  if (isStandalone) {
    return (
      <span className="inline-flex min-h-9 items-center gap-2 border bg-muted px-3 text-xs">
        <IconCheck aria-hidden="true" />
        Installed
      </span>
    );
  }

  if (!installPrompt) return null;

  return (
    <Button
      type="button"
      variant="outline"
      className="min-h-11"
      onClick={async () => {
        await installPrompt.prompt();
        await installPrompt.userChoice;
        setInstallPrompt(null);
      }}
    >
      <IconDownload aria-hidden="true" />
      Install Chamber
    </Button>
  );
}

export function AndroidShareInstructions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <IconShare3 aria-hidden="true" />
          Fastest Android workflow
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="grid gap-3 text-xs text-muted-foreground sm:grid-cols-3">
          <li className="border p-3">
            <span className="mb-2 block font-medium text-foreground">1. Screenshot</span>
            Use Android&apos;s normal screenshot gesture on the payment confirmation.
          </li>
          <li className="border p-3">
            <span className="mb-2 block font-medium text-foreground">2. Share</span>
            Tap Share on the screenshot preview and choose Chamber.
          </li>
          <li className="border p-3">
            <span className="mb-2 block font-medium text-foreground">3. Confirm</span>
            Review the AI result, select the account, and save.
          </li>
        </ol>
      </CardContent>
    </Card>
  );
}

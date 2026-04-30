"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  IconRefresh,
  IconCheck,
  IconX,
  IconClock,
  IconRepeat,
  IconLoader2,
} from "@tabler/icons-react";
import { RecurringExpense } from "@/lib/actions/forecasting";
import { detectRecurringExpenses, setRecurringPatternConfirmed, ignoreRecurringPattern } from "@/lib/actions/forecasting";

type RecurringExpensesProps = {
  patterns: RecurringExpense[];
  currency: string;
};

const FREQUENCY_LABELS: Record<string, string> = {
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  YEARLY: "Yearly",
};

export function RecurringExpenses({ patterns, currency }: RecurringExpensesProps) {
  const [isDetecting, setIsDetecting] = useState(false);
  const [localPatterns, setLocalPatterns] = useState(patterns);
  const [actionId, setActionId] = useState<string | null>(null);

  useEffect(() => {
    setLocalPatterns(patterns);
  }, [patterns]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  const handleDetect = async () => {
    setIsDetecting(true);
    try {
      await detectRecurringExpenses();
      window.location.reload();
    } catch (error) {
      console.error("Detection failed:", error);
    } finally {
      setIsDetecting(false);
    }
  };

  const handleConfirm = async (id: string) => {
    setActionId(id);
    try {
      await setRecurringPatternConfirmed(id, true);
      setLocalPatterns((prev) =>
        prev.map((p) => (p.id === id ? { ...p, isConfirmed: true } : p))
      );
    } catch (error) {
      console.error("Failed to confirm:", error);
    } finally {
      setActionId(null);
    }
  };

  const handleIgnore = async (id: string) => {
    setActionId(id);
    try {
      await ignoreRecurringPattern(id);
      setLocalPatterns((prev) => prev.filter((p) => p.id !== id));
    } catch (error) {
      console.error("Failed to ignore:", error);
    } finally {
      setActionId(null);
    }
  };

  const getDaysUntil = (date: Date) => {
    const now = new Date();
    const target = new Date(date);
    const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const confirmedPatterns = localPatterns.filter((p) => p.isConfirmed);
  const unconfirmedPatterns = localPatterns.filter((p) => !p.isConfirmed);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <IconRepeat className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium">Recurring Expenses</h3>
        </div>
        <Button size="sm" variant="outline" onClick={handleDetect} disabled={isDetecting}>
          {isDetecting ? (
            <IconLoader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
          ) : (
            <IconRefresh className="h-3.5 w-3.5 mr-1" />
          )}
          {isDetecting ? "Scanning..." : "Auto-detect"}
        </Button>
      </div>

      {/* Confirmed recurring */}
      {confirmedPatterns.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Confirmed ({confirmedPatterns.length})</p>
          {confirmedPatterns.map((pattern) => {
            const daysUntil = getDaysUntil(pattern.nextPredicted);
            return (
              <Card key={pattern.id} className="border">
                <CardContent className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="text-sm font-medium">{pattern.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Badge variant="secondary" className="text-[10px] h-5">
                            {FREQUENCY_LABELS[pattern.frequency] || pattern.frequency}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">{pattern.category}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatCurrency(pattern.amount)}</p>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <IconClock className="h-3 w-3" />
                        {daysUntil <= 0
                          ? "Due today"
                          : daysUntil === 1
                            ? "Due tomorrow"
                            : `Due in ${daysUntil} days`}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Suggested recurring */}
      {unconfirmedPatterns.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Suggested ({unconfirmedPatterns.length})</p>
          {unconfirmedPatterns.map((pattern) => (
            <Card key={pattern.id} className="border border-dashed">
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{pattern.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Badge variant="secondary" className="text-[10px] h-5">
                        {FREQUENCY_LABELS[pattern.frequency] || pattern.frequency}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {formatCurrency(pattern.amount)} · {(pattern.confidence * 100).toFixed(0)}% confidence
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                      onClick={() => handleConfirm(pattern.id)}
                      disabled={actionId === pattern.id}
                    >
                      <IconCheck className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => handleIgnore(pattern.id)}
                      disabled={actionId === pattern.id}
                    >
                      <IconX className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {localPatterns.length === 0 && (
        <div className="text-center py-8 border rounded-lg border-dashed">
          <IconRepeat className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No recurring expenses detected</p>
          <p className="text-xs text-muted-foreground mt-1">
            Click Auto-detect to scan your expense history
          </p>
        </div>
      )}
    </div>
  );
}

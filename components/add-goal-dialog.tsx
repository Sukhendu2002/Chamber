"use client";

import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { IconPlus, IconTarget } from "@tabler/icons-react";
import { createGoal } from "@/lib/actions/goals";
import { GoalType } from "@prisma/client";

const GOAL_TYPES: { value: GoalType; label: string }[] = [
  { value: "SAVINGS", label: "Savings" },
  { value: "DEBT_PAYOFF", label: "Debt Payoff" },
  { value: "EMERGENCY_FUND", label: "Emergency Fund" },
  { value: "PURCHASE", label: "Purchase" },
  { value: "INVESTMENT", label: "Investment" },
  { value: "OTHER", label: "Other" },
];

export function AddGoalDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<GoalType>("SAVINGS");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("");
  const [deadline, setDeadline] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !targetAmount) return;

    setError(null);
    setLoading(true);
    try {
      await createGoal({
        name,
        description: description || undefined,
        type,
        targetAmount: parseFloat(targetAmount),
        currentAmount: currentAmount ? parseFloat(currentAmount) : 0,
        deadline: deadline ? new Date(deadline) : undefined,
      });
      setOpen(false);
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create goal");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setType("SAVINGS");
    setTargetAmount("");
    setCurrentAmount("");
    setDeadline("");
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <IconPlus className="h-3.5 w-3.5 mr-1" />
          Add Goal
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconTarget className="h-5 w-5" />
            Create New Goal
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="goal-name">Goal Name</Label>
            <Input
              id="goal-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Emergency Fund, New Car"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="goal-type">Goal Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as GoalType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GOAL_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="target-amount">Target Amount</Label>
              <Input
                id="target-amount"
                type="number"
                min="0"
                step="0.01"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                placeholder="50000"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="current-amount">Current Amount</Label>
              <Input
                id="current-amount"
                type="number"
                min="0"
                step="0.01"
                value={currentAmount}
                onChange={(e) => setCurrentAmount(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="goal-deadline">Target Date (Optional)</Label>
            <Input
              id="goal-deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="goal-description">Description (Optional)</Label>
            <Textarea
              id="goal-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Why this goal matters to you..."
              rows={2}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating..." : "Create Goal"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

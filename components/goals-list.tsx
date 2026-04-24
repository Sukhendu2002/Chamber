"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  IconTarget,
  IconTrendingUp,
  IconAlertTriangle,
  IconCheck,
  IconPlus,
  IconTrash,
  IconPigMoney,
} from "@tabler/icons-react";
import { Goal, GoalStatus } from "@prisma/client";
import { contributeToGoal, deleteGoal } from "@/lib/actions/goals";
import { AddGoalDialog } from "@/components/add-goal-dialog";

const GOAL_TYPE_ICONS: Record<string, React.ReactNode> = {
  SAVINGS: <IconPigMoney className="h-4 w-4" />,
  DEBT_PAYOFF: <IconTrendingUp className="h-4 w-4" />,
  EMERGENCY_FUND: <IconAlertTriangle className="h-4 w-4" />,
  PURCHASE: <IconTarget className="h-4 w-4" />,
  INVESTMENT: <IconTrendingUp className="h-4 w-4" />,
  OTHER: <IconTarget className="h-4 w-4" />,
};

const GOAL_TYPE_LABELS: Record<string, string> = {
  SAVINGS: "Savings",
  DEBT_PAYOFF: "Debt Payoff",
  EMERGENCY_FUND: "Emergency Fund",
  PURCHASE: "Purchase",
  INVESTMENT: "Investment",
  OTHER: "Other",
};

type GoalsListProps = {
  goals: Goal[];
  currency: string;
  summary?: {
    overallProgress: number;
    activeGoals: number;
    atRiskCount: number;
  };
};

export function GoalsList({ goals, currency, summary }: GoalsListProps) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  const handleContribute = async (id: string) => {
    const amount = prompt("Enter contribution amount:");
    if (!amount || isNaN(parseFloat(amount))) return;

    setError(null);
    setLoadingId(id);
    try {
      await contributeToGoal(id, parseFloat(amount));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to contribute");
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this goal?")) return;
    setError(null);
    setLoadingId(id);
    try {
      await deleteGoal(id);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete goal");
    } finally {
      setLoadingId(null);
    }
  };

  const activeGoals = goals.filter((g) => g.status === GoalStatus.ACTIVE);

  return (
    <div className="space-y-4">
      {summary && (
        <div className="grid grid-cols-3 gap-3">
          <Card className="border">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{summary.activeGoals}</div>
              <p className="text-xs text-muted-foreground">Active Goals</p>
            </CardContent>
          </Card>
          <Card className="border">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{summary.overallProgress.toFixed(0)}%</div>
              <p className="text-xs text-muted-foreground">Overall Progress</p>
            </CardContent>
          </Card>
          <Card className="border">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-red-500">{summary.atRiskCount}</div>
              <p className="text-xs text-muted-foreground">At Risk</p>
            </CardContent>
          </Card>
        </div>
      )}

      {error && (
        <div className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Your Goals</h3>
        <AddGoalDialog />
      </div>

      {activeGoals.length === 0 ? (
        <div className="text-center py-8 border rounded-lg">
          <IconTarget className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No active goals yet</p>
          <p className="text-xs text-muted-foreground mt-1">Create a goal to track your progress</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeGoals.map((goal) => {
            const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
            const remaining = goal.targetAmount - goal.currentAmount;
            const isCompleted = goal.status === GoalStatus.COMPLETED;

            return (
              <Card key={goal.id} className="border">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="text-muted-foreground">
                        {GOAL_TYPE_ICONS[goal.type] || GOAL_TYPE_ICONS.OTHER}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{goal.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Badge variant="secondary" className="text-[10px] h-5">
                            {GOAL_TYPE_LABELS[goal.type] || goal.type}
                          </Badge>
                          {goal.deadline && (
                            <span className="text-[10px] text-muted-foreground">
                              Due {new Date(goal.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {isCompleted && <IconCheck className="h-4 w-4 text-green-500" />}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(goal.id)}
                        disabled={loadingId === goal.id}
                      >
                        <IconTrash className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        {formatCurrency(goal.currentAmount)} of {formatCurrency(goal.targetAmount)}
                      </span>
                      <span className="font-medium">{progress.toFixed(0)}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">
                        {remaining > 0 ? `${formatCurrency(remaining)} remaining` : "Completed!"}
                      </span>
                      {!isCompleted && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs px-2"
                          onClick={() => handleContribute(goal.id)}
                          disabled={loadingId === goal.id}
                        >
                          <IconPlus className="h-3 w-3 mr-1" />
                          Add
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

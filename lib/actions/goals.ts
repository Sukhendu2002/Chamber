"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { GoalType, GoalStatus } from "@prisma/client";

export type CreateGoalInput = {
  name: string;
  description?: string;
  type: GoalType;
  targetAmount: number;
  currentAmount?: number;
  deadline?: Date;
};

export type UpdateGoalInput = Partial<CreateGoalInput> & {
  status?: GoalStatus;
};

export async function createGoal(input: CreateGoalInput) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  try {
    const goal = await db.goal.create({
      data: {
        userId,
        name: input.name,
        description: input.description,
        type: input.type,
        targetAmount: input.targetAmount,
        currentAmount: input.currentAmount || 0,
        deadline: input.deadline,
      },
    });

    revalidatePath("/forecast");
    revalidatePath("/dashboard");
    return goal;
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && err.code === "P2002") {
      throw new Error(`You already have a goal named "${input.name}"`);
    }
    throw err;
  }
}

export async function getGoals(options?: { status?: GoalStatus }) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const where: { userId: string; status?: GoalStatus } = { userId };
  if (options?.status) {
    where.status = options.status;
  }

  const goals = await db.goal.findMany({
    where,
    orderBy: [
      { status: "asc" },
      { deadline: { sort: "asc", nulls: "last" } },
    ],
  });

  return goals;
}

export async function getGoalById(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const goal = await db.goal.findFirst({
    where: { id, userId },
  });

  return goal;
}

export async function updateGoal(id: string, input: UpdateGoalInput) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const existing = await db.goal.findFirst({
    where: { id, userId },
  });

  if (!existing) throw new Error("Goal not found");

  const goal = await db.goal.update({
    where: { id },
    data: {
      name: input.name,
      description: input.description,
      type: input.type,
      targetAmount: input.targetAmount,
      currentAmount: input.currentAmount,
      deadline: input.deadline,
      status: input.status,
    },
  });

  revalidatePath("/forecast");
  revalidatePath("/dashboard");
  return goal;
}

export async function deleteGoal(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const existing = await db.goal.findFirst({
    where: { id, userId },
  });

  if (!existing) throw new Error("Goal not found");

  await db.goal.delete({
    where: { id },
  });

  revalidatePath("/forecast");
  revalidatePath("/dashboard");
}

export async function contributeToGoal(id: string, amount: number) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Contribution amount must be a positive number");
  }

  const goal = await db.goal.findFirst({
    where: { id, userId },
  });

  if (!goal) throw new Error("Goal not found");

  const newAmount = Math.min(goal.targetAmount, goal.currentAmount + amount);
  const newStatus = newAmount >= goal.targetAmount ? "COMPLETED" : goal.status;

  const updated = await db.goal.update({
    where: { id },
    data: {
      currentAmount: newAmount,
      status: newStatus,
    },
  });

  revalidatePath("/forecast");
  revalidatePath("/dashboard");
  return updated;
}

export async function getGoalSummary() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const goals = await db.goal.findMany({
    where: { userId },
  });

  const activeGoals = goals.filter((g) => g.status === "ACTIVE");
  const completedGoals = goals.filter((g) => g.status === "COMPLETED");

  const totalTarget = activeGoals.reduce((sum, g) => sum + g.targetAmount, 0);
  const totalSaved = activeGoals.reduce((sum, g) => sum + g.currentAmount, 0);
  const overallProgress = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;

  // Goals at risk (deadline within 30 days and less than 80% complete)
  const now = new Date();
  const atRisk = activeGoals.filter((g) => {
    if (!g.deadline) return false;
    const daysUntil = Math.ceil((g.deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const progress = g.targetAmount > 0 ? (g.currentAmount / g.targetAmount) * 100 : 0;
    return daysUntil <= 30 && progress < 80;
  });

  return {
    totalGoals: goals.length,
    activeGoals: activeGoals.length,
    completedGoals: completedGoals.length,
    totalTarget,
    totalSaved,
    overallProgress: Math.round(overallProgress * 100) / 100,
    atRiskCount: atRisk.length,
    atRiskGoals: atRisk,
  };
}

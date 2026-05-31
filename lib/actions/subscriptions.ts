"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { calculateNextBillingDateFromStart } from "@/lib/subscription-utils";

const BILLING_CYCLES = [
  "ONCE",
  "WEEKLY",
  "MONTHLY",
  "QUARTERLY",
  "YEARLY",
] as const;

const CreateSubscriptionSchema = z.object({
  name: z.string().min(1).max(200),
  amount: z.number().positive("Amount must be greater than 0"),
  billingCycle: z.enum(BILLING_CYCLES),
  nextBillingDate: z.date().optional(),
  startDate: z.date().optional(),
  paymentMethod: z.string().max(100).optional(),
  category: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
  alertDaysBefore: z.number().int().min(1).max(30).optional(),
});

const UpdateSubscriptionSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  amount: z.number().positive("Amount must be greater than 0").optional(),
  billingCycle: z.enum(BILLING_CYCLES).optional(),
  nextBillingDate: z.date().optional(),
  startDate: z.date().optional(),
  paymentMethod: z.string().max(100).optional(),
  category: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
  alertDaysBefore: z.number().int().min(1).max(30).optional(),
  isActive: z.boolean().optional(),
});

const IdSchema = z.string().uuid();

const GetUpcomingSubscriptionsSchema = z.object({
  daysAhead: z.number().int().positive().default(7),
});

const GetSubscriptionsForMonthSchema = z.object({
  year: z.number().int(),
  month: z.number().int().min(0).max(11),
});

export type CreateSubscriptionInput = z.infer<typeof CreateSubscriptionSchema>;

export async function createSubscription(input: CreateSubscriptionInput) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const validated = CreateSubscriptionSchema.parse(input);

  // Auto-calculate nextBillingDate from startDate if not provided
  let nextBillingDate = validated.nextBillingDate;
  if (!nextBillingDate && validated.startDate) {
    nextBillingDate = calculateNextBillingDateFromStart(
      validated.startDate,
      validated.billingCycle
    );
  }

  // If still no nextBillingDate, default to today
  if (!nextBillingDate) {
    nextBillingDate = new Date();
  }

  const subscription = await db.subscription.create({
    data: {
      userId,
      name: validated.name,
      amount: validated.amount,
      billingCycle: validated.billingCycle,
      nextBillingDate,
      startDate: validated.startDate,
      paymentMethod: validated.paymentMethod,
      category: validated.category || "Subscription",
      description: validated.description,
      alertDaysBefore: validated.alertDaysBefore || 3,
    },
  });

  revalidatePath("/subscriptions");
  return subscription;
}

export async function getSubscriptions() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const subscriptions = await db.subscription.findMany({
    where: { userId },
    orderBy: { nextBillingDate: "asc" },
  });

  return subscriptions;
}

export async function getActiveSubscriptions() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const subscriptions = await db.subscription.findMany({
    where: { userId, isActive: true },
    orderBy: { nextBillingDate: "asc" },
  });

  return subscriptions;
}

export async function updateSubscription(
  id: string,
  input: Partial<CreateSubscriptionInput> & { isActive?: boolean }
) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const validatedId = IdSchema.parse(id);
  const validated = UpdateSubscriptionSchema.parse(input);

  const data: Record<string, unknown> = {};

  if (validated.name !== undefined) data.name = validated.name;
  if (validated.amount !== undefined) data.amount = validated.amount;
  if (validated.billingCycle !== undefined) data.billingCycle = validated.billingCycle;
  if (validated.nextBillingDate !== undefined) data.nextBillingDate = validated.nextBillingDate;
  if (validated.startDate !== undefined) data.startDate = validated.startDate;
  if (validated.paymentMethod !== undefined) data.paymentMethod = validated.paymentMethod;
  if (validated.category !== undefined) data.category = validated.category;
  if (validated.description !== undefined) data.description = validated.description;
  if (validated.alertDaysBefore !== undefined) data.alertDaysBefore = validated.alertDaysBefore;
  if (validated.isActive !== undefined) data.isActive = validated.isActive;

  // If startDate is updated but nextBillingDate isn't, auto-calculate
  if (validated.startDate && !validated.nextBillingDate) {
    const existing = await db.subscription.findFirst({
      where: { id: validatedId, userId },
    });
    if (existing) {
      data.nextBillingDate = calculateNextBillingDateFromStart(
        validated.startDate,
        validated.billingCycle || existing.billingCycle
      );
    }
  }

  await db.subscription.updateMany({
    where: { id: validatedId, userId },
    data,
  });

  revalidatePath("/subscriptions");
}

export async function deleteSubscription(id: string, deleteRecords?: boolean) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const validatedId = IdSchema.parse(id);

  // If deleting records too, first find the subscription to get its name
  if (deleteRecords) {
    const sub = await db.subscription.findFirst({
      where: { id: validatedId, userId },
    });

    if (sub) {
      // Delete all expenses linked to this subscription (matched by merchant name + Subscription category)
      await db.expense.deleteMany({
        where: {
          userId,
          merchant: sub.name,
          category: "Subscription",
        },
      });
    }
  }

  await db.subscription.deleteMany({
    where: { id: validatedId, userId },
  });

  revalidatePath("/subscriptions");
  revalidatePath("/expenses");
}

export async function getUpcomingSubscriptions(daysAhead: number = 7) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const validated = GetUpcomingSubscriptionsSchema.parse({ daysAhead });

  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + validated.daysAhead);

  const subscriptions = await db.subscription.findMany({
    where: {
      userId,
      isActive: true,
      nextBillingDate: {
        lte: futureDate,
        gte: new Date(),
      },
    },
    orderBy: { nextBillingDate: "asc" },
  });

  return subscriptions;
}

// Calculate next billing date from current billing date (for renewals)
function calculateNextBillingDate(
  currentDate: Date,
  billingCycle: "ONCE" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY"
): Date | null {
  if (billingCycle === "ONCE") {
    return null;
  }

  const next = new Date(currentDate);

  switch (billingCycle) {
    case "WEEKLY":
      next.setDate(next.getDate() + 7);
      break;
    case "MONTHLY":
      next.setMonth(next.getMonth() + 1);
      break;
    case "QUARTERLY":
      next.setMonth(next.getMonth() + 3);
      break;
    case "YEARLY":
      next.setFullYear(next.getFullYear() + 1);
      break;
  }

  return next;
}

// Mark subscription as renewed, create expense, and update next billing date
export async function renewSubscription(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const validatedId = IdSchema.parse(id);

  const subscription = await db.subscription.findFirst({
    where: { id: validatedId, userId },
  });

  if (!subscription) throw new Error("Subscription not found");

  // Create an expense for this subscription payment
  await db.expense.create({
    data: {
      userId,
      amount: subscription.amount,
      category: "Subscription",
      merchant: subscription.name,
      description: `${subscription.name} - ${subscription.billingCycle.toLowerCase()} subscription`,
      date: subscription.nextBillingDate,
      source: "WEB",
      paymentMethod: subscription.paymentMethod,
    },
  });

  // Calculate and update next billing date (or deactivate if one-time)
  const nextBillingDate = calculateNextBillingDate(
    subscription.nextBillingDate,
    subscription.billingCycle
  );

  if (nextBillingDate) {
    await db.subscription.update({
      where: { id: validatedId },
      data: { nextBillingDate },
    });
  } else {
    // One-time subscription - mark as inactive
    await db.subscription.update({
      where: { id: validatedId },
      data: { isActive: false },
    });
  }

  revalidatePath("/subscriptions");
  revalidatePath("/expenses");
  revalidatePath("/dashboard");
}

// Get subscriptions for a specific month (for calendar view)
export async function getSubscriptionsForMonth(year: number, month: number) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const validated = GetSubscriptionsForMonthSchema.parse({ year, month });

  const startOfMonth = new Date(validated.year, validated.month, 1);
  const endOfMonth = new Date(validated.year, validated.month + 1, 0, 23, 59, 59);

  const subscriptions = await db.subscription.findMany({
    where: {
      userId,
      isActive: true,
      nextBillingDate: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
    },
    orderBy: { nextBillingDate: "asc" },
  });

  return subscriptions;
}

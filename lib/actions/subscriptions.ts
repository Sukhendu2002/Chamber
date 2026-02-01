"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export type CreateSubscriptionInput = {
  name: string;
  amount: number;
  billingCycle: "ONCE" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY";
  nextBillingDate: Date;
  paymentMethod?: string;
  description?: string;
  alertDaysBefore?: number;
};

export async function createSubscription(input: CreateSubscriptionInput) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const subscription = await db.subscription.create({
    data: {
      userId,
      name: input.name,
      amount: input.amount,
      billingCycle: input.billingCycle,
      nextBillingDate: input.nextBillingDate,
      paymentMethod: input.paymentMethod as "PNB" | "SBI" | "CASH" | "CREDIT" | undefined,
      description: input.description,
      alertDaysBefore: input.alertDaysBefore || 3,
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

  const subscription = await db.subscription.updateMany({
    where: { id, userId },
    data: {
      ...input,
      paymentMethod: input.paymentMethod as "PNB" | "SBI" | "CASH" | "CREDIT" | undefined,
    },
  });

  revalidatePath("/subscriptions");
  return subscription;
}

export async function deleteSubscription(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  await db.subscription.deleteMany({
    where: { id, userId },
  });

  revalidatePath("/subscriptions");
}

export async function getUpcomingSubscriptions(daysAhead: number = 7) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);

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

// Calculate next billing date based on cycle (helper function, not a server action)
function calculateNextBillingDate(
  currentDate: Date,
  billingCycle: "ONCE" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY"
): Date | null {
  if (billingCycle === "ONCE") {
    return null; // One-time subscriptions don't have a next billing date
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

  const subscription = await db.subscription.findFirst({
    where: { id, userId },
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
      where: { id },
      data: { nextBillingDate },
    });
  } else {
    // One-time subscription - mark as inactive
    await db.subscription.update({
      where: { id },
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

  const startOfMonth = new Date(year, month, 1);
  const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);

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

"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getUserSettings() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  let settings = await db.userSettings.findUnique({
    where: { userId },
  });

  if (!settings) {
    settings = await db.userSettings.create({
      data: {
        userId,
        monthlyBudget: 0,
        currency: "INR",
      },
    });
  }

  return settings;
}

export async function updateUserSettings(input: {
  monthlyBudget?: number;
  currency?: string;
}) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const settings = await db.userSettings.upsert({
    where: { userId },
    update: input,
    create: {
      userId,
      monthlyBudget: input.monthlyBudget || 0,
      currency: input.currency || "INR",
    },
  });

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return settings;
}

export async function generateLinkingCode() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // Generate 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Invalidate any existing codes for this user
  await db.linkingCode.updateMany({
    where: { userId, used: false },
    data: { used: true },
  });

  // Create new code
  const linkingCode = await db.linkingCode.create({
    data: {
      userId,
      code,
      expiresAt,
    },
  });

  return linkingCode;
}

export async function getTelegramStatus() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const settings = await db.userSettings.findUnique({
    where: { userId },
  });

  return {
    isLinked: !!settings?.telegramChatId,
    chatId: settings?.telegramChatId,
  };
}

export async function unlinkTelegram() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  await db.userSettings.update({
    where: { userId },
    data: { telegramChatId: null },
  });

  revalidatePath("/telegram");
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

async function sendTelegramMessage(chatId: string, text: string) {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error("TELEGRAM_BOT_TOKEN not configured");
    return false;
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "HTML",
        }),
      }
    );

    return response.ok;
  } catch (error) {
    console.error("Failed to send Telegram message:", error);
    return false;
  }
}

export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const alertsSent: string[] = [];

    // Get all active subscriptions
    const subscriptions = await db.subscription.findMany({
      where: { isActive: true },
    });

    for (const sub of subscriptions) {
      // Calculate days until next billing
      const billingDate = new Date(sub.nextBillingDate);
      const diffTime = billingDate.getTime() - now.getTime();
      const daysUntilBilling = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Check if we should send an alert
      if (daysUntilBilling >= 0 && daysUntilBilling <= sub.alertDaysBefore) {
        // Check if we already sent an alert today
        const lastAlert = sub.lastAlertSent;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (lastAlert) {
          const lastAlertDate = new Date(lastAlert);
          lastAlertDate.setHours(0, 0, 0, 0);
          if (lastAlertDate.getTime() === today.getTime()) {
            // Already sent alert today, skip
            continue;
          }
        }

        // Get user's Telegram chat ID
        const userSettings = await db.userSettings.findFirst({
          where: { userId: sub.userId },
        });

        if (userSettings?.telegramChatId) {
          // Send alert
          const daysText = daysUntilBilling === 0 
            ? "today" 
            : daysUntilBilling === 1 
              ? "tomorrow" 
              : `in ${daysUntilBilling} days`;

          const message = `🔔 <b>Subscription Reminder</b>\n\n` +
            `📌 <b>${sub.name}</b>\n` +
            `💰 ₹${sub.amount.toFixed(2)}\n` +
            `📅 Due ${daysText} (${billingDate.toLocaleDateString()})\n` +
            `${sub.paymentMethod ? `💳 ${sub.paymentMethod}\n` : ""}` +
            `\n<i>Manage your subscriptions at Chamber</i>`;

          const sent = await sendTelegramMessage(userSettings.telegramChatId, message);

          if (sent) {
            // Update lastAlertSent
            await db.subscription.update({
              where: { id: sub.id },
              data: { lastAlertSent: now },
            });

            alertsSent.push(`${sub.name} (${sub.userId})`);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      alertsSent: alertsSent.length,
      details: alertsSent,
    });
  } catch (error) {
    console.error("Subscription alerts error:", error);
    return NextResponse.json(
      { error: "Failed to process subscription alerts" },
      { status: 500 }
    );
  }
}

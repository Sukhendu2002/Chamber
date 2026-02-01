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

/**
 * Check for upcoming subscription renewals and send Telegram alerts
 * Called after expense operations (create, update) and Telegram bot interactions
 */
export async function checkAndSendSubscriptionAlerts(userId: string) {
  try {
    // Get user's Telegram chat ID
    const userSettings = await db.userSettings.findFirst({
      where: { userId },
    });

    if (!userSettings?.telegramChatId) {
      // User doesn't have Telegram linked, skip
      return { sent: 0 };
    }

    const now = new Date();
    const oneWeekFromNow = new Date();
    oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);

    // Get subscriptions due within 1 week that haven't been alerted today
    const subscriptions = await db.subscription.findMany({
      where: {
        userId,
        isActive: true,
        nextBillingDate: {
          gte: now,
          lte: oneWeekFromNow,
        },
      },
      orderBy: { nextBillingDate: "asc" },
    });

    const alertsSent: string[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const sub of subscriptions) {
      // Check if we already sent an alert today
      if (sub.lastAlertSent) {
        const lastAlertDate = new Date(sub.lastAlertSent);
        lastAlertDate.setHours(0, 0, 0, 0);
        if (lastAlertDate.getTime() === today.getTime()) {
          // Already sent alert today, skip
          continue;
        }
      }

      // Calculate days until billing
      const billingDate = new Date(sub.nextBillingDate);
      const diffTime = billingDate.getTime() - now.getTime();
      const daysUntilBilling = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Format the days text
      const daysText =
        daysUntilBilling === 0
          ? "today"
          : daysUntilBilling === 1
          ? "tomorrow"
          : `in ${daysUntilBilling} days`;

      // Send alert
      const message =
        `🔔 <b>Subscription Reminder</b>\n\n` +
        `📌 <b>${sub.name}</b>\n` +
        `💰 ₹${sub.amount.toFixed(2)}\n` +
        `📅 Due ${daysText} (${billingDate.toLocaleDateString("en-IN")})\n` +
        `${sub.paymentMethod ? `💳 ${sub.paymentMethod}\n` : ""}` +
        `\n<i>Manage at Chamber → Subscriptions</i>`;

      const sent = await sendTelegramMessage(userSettings.telegramChatId, message);

      if (sent) {
        // Update lastAlertSent
        await db.subscription.update({
          where: { id: sub.id },
          data: { lastAlertSent: now },
        });

        alertsSent.push(sub.name);
      }
    }

    return { sent: alertsSent.length, subscriptions: alertsSent };
  } catch (error) {
    console.error("Subscription alerts error:", error);
    return { sent: 0, error: String(error) };
  }
}

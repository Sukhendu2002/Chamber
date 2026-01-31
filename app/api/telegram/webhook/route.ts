import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;

type TelegramMessage = {
  message_id: number;
  from: {
    id: number;
    first_name: string;
    username?: string;
  };
  chat: {
    id: number;
    type: string;
  };
  date: number;
  text?: string;
  photo?: Array<{
    file_id: string;
    file_unique_id: string;
    width: number;
    height: number;
  }>;
};

type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
};

async function sendTelegramMessage(chatId: number, text: string) {
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  if (!TELEGRAM_BOT_TOKEN) {
    console.error("TELEGRAM_BOT_TOKEN not configured");
    return;
  }

  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
    }),
  });
}

async function handleStartCommand(chatId: number, code: string) {
  // Find the linking code
  const linkingCode = await db.linkingCode.findFirst({
    where: {
      code,
      used: false,
      expiresAt: { gt: new Date() },
    },
  });

  if (!linkingCode) {
    await sendTelegramMessage(
      chatId,
      "❌ Invalid or expired code. Please generate a new code from the Chamber dashboard."
    );
    return;
  }

  // Link the Telegram account
  await db.userSettings.upsert({
    where: { userId: linkingCode.userId },
    update: { telegramChatId: chatId.toString() },
    create: {
      userId: linkingCode.userId,
      telegramChatId: chatId.toString(),
    },
  });

  // Mark code as used
  await db.linkingCode.update({
    where: { id: linkingCode.id },
    data: { used: true },
  });

  await sendTelegramMessage(
    chatId,
    "✅ <b>Account linked successfully!</b>\n\nYou can now send expenses like:\n• <code>Lunch 450</code>\n• <code>Uber 250</code>\n• Or send a receipt photo!"
  );
}

async function handleExpenseMessage(chatId: number, text: string) {
  // Find user by chat ID
  const userSettings = await db.userSettings.findFirst({
    where: { telegramChatId: chatId.toString() },
  });

  if (!userSettings) {
    await sendTelegramMessage(
      chatId,
      "❌ Your Telegram account is not linked. Please link it from the Chamber dashboard first."
    );
    return;
  }

  // Simple parsing: try to extract amount and description
  // Format: "Description Amount" or "Amount Description"
  const amountMatch = text.match(/(\d+(?:\.\d{1,2})?)/);
  
  if (!amountMatch) {
    await sendTelegramMessage(
      chatId,
      "❓ Could not understand. Please try format: <code>Item Amount</code>\nExample: <code>Lunch 450</code>"
    );
    return;
  }

  const amount = parseFloat(amountMatch[1]);
  const description = text.replace(amountMatch[0], "").trim() || "Expense";

  // Simple category detection
  const categoryMap: Record<string, string[]> = {
    Food: ["lunch", "dinner", "breakfast", "food", "eat", "restaurant", "cafe", "coffee", "snack", "meal"],
    Travel: ["uber", "ola", "cab", "taxi", "bus", "train", "metro", "fuel", "petrol", "diesel", "travel"],
    Entertainment: ["movie", "netflix", "spotify", "game", "entertainment", "concert", "show"],
    Bills: ["bill", "electricity", "water", "gas", "internet", "phone", "mobile", "recharge"],
    Shopping: ["amazon", "flipkart", "shopping", "clothes", "shoes", "buy"],
    Health: ["medicine", "doctor", "hospital", "pharmacy", "health", "gym"],
    Education: ["book", "course", "education", "school", "college", "tuition"],
  };

  let category = "General";
  const lowerText = text.toLowerCase();
  for (const [cat, keywords] of Object.entries(categoryMap)) {
    if (keywords.some((kw) => lowerText.includes(kw))) {
      category = cat;
      break;
    }
  }

  // Create expense
  await db.expense.create({
    data: {
      userId: userSettings.userId,
      amount,
      category,
      description,
      source: "TELEGRAM",
      date: new Date(),
    },
  });

  await sendTelegramMessage(
    chatId,
    `✅ <b>Recorded:</b> ${description} (₹${amount.toFixed(2)}) - ${category}`
  );
}

export async function POST(request: NextRequest) {
  // Verify webhook secret
  const secretToken = request.headers.get("x-telegram-bot-api-secret-token");
  if (TELEGRAM_WEBHOOK_SECRET && secretToken !== TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const update: TelegramUpdate = await request.json();
    const message = update.message;

    if (!message || !message.chat) {
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat.id;
    const text = message.text || "";

    // Handle /start command with linking code
    if (text.startsWith("/start ")) {
      const code = text.replace("/start ", "").trim();
      await handleStartCommand(chatId, code);
    } else if (text.startsWith("/start")) {
      await sendTelegramMessage(
        chatId,
        "👋 Welcome to Chamber!\n\nTo link your account, please generate a linking code from the Chamber dashboard and send:\n<code>/start YOUR_CODE</code>"
      );
    } else if (text && !text.startsWith("/")) {
      // Handle expense message
      await handleExpenseMessage(chatId, text);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Telegram webhook error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: "Telegram webhook is active" });
}

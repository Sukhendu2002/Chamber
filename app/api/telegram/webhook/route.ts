import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseExpenseWithAI, parseReceiptWithAI } from "@/lib/ai";
import { notifyUser } from "@/app/api/events/route";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import pdfParse from "pdf-parse";
import { checkAndSendSubscriptionAlerts } from "@/lib/subscription-alerts";

const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// R2 upload helper
async function uploadImageToR2(base64Data: string, userId: string): Promise<string> {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    throw new Error("R2 credentials not configured");
  }

  const r2Client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });

  const buffer = Buffer.from(base64Data, "base64");
  const key = `receipts/${userId}/${Date.now()}.jpg`;

  await r2Client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: "image/jpeg",
    })
  );

  return key;
}

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
  caption?: string;  // Caption for photos/documents
  photo?: Array<{
    file_id: string;
    file_unique_id: string;
    width: number;
    height: number;
  }>;
  document?: {
    file_id: string;
    file_unique_id: string;
    file_name?: string;
    mime_type?: string;
    file_size?: number;
  };
};

// Store pending expenses awaiting confirmation (in-memory, resets on server restart)
const pendingExpenses = new Map<number, {
  userId: string;
  amount: number;
  category: string;
  description: string;
  merchant?: string;
  receiptUrl?: string;
  paymentMethod?: string;
  expiresAt: number;
}>();

// Payment method options
const PAYMENT_METHODS = ["PNB", "SBI", "Cash", "Credit"] as const;

type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: {
    id: string;
    from: { id: number };
    message?: { chat: { id: number }; message_id: number };
    data?: string;
  };
};

async function sendTelegramMessage(chatId: number, text: string, replyMarkup?: object) {
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
      ...(replyMarkup && { reply_markup: replyMarkup }),
    }),
  });
}

async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  if (!TELEGRAM_BOT_TOKEN) return;
  
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text,
    }),
  });
}

async function editMessageText(chatId: number, messageId: number, text: string, replyMarkup?: object) {
  if (!TELEGRAM_BOT_TOKEN) return;
  
  const body: Record<string, unknown> = {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: "HTML",
  };
  
  if (replyMarkup) {
    body.reply_markup = replyMarkup;
  }
  
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// Check if caption contains useful expense info (amount)
function hasUsefulExpenseInfo(caption: string): boolean {
  // Check for amount patterns - be more flexible
  const amountPatterns = [
    /₹\s*[\d,]+/i,
    /Rs\.?\s*[\d,]+/i,
    /\d+\s*(?:rupees?|rs)/i,
    /paid\s+[\d,]+/i,
    /[\d,]+\s+(?:to|for)/i,
    /\d{2,}/,  // Any number with 2+ digits (like "45000" or "500")
  ];
  return amountPatterns.some(pattern => pattern.test(caption));
}

// Check for duplicate expense (same amount on same date)
async function checkDuplicateExpense(userId: string, amount: number): Promise<boolean> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const existing = await db.expense.findFirst({
    where: {
      userId,
      amount,
      date: {
        gte: today,
        lt: tomorrow,
      },
    },
  });

  return !!existing;
}

async function getFileUrl(fileId: string): Promise<string | null> {
  if (!TELEGRAM_BOT_TOKEN) return null;

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`
    );
    const data = await response.json();
    
    if (data.ok && data.result.file_path) {
      return `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${data.result.file_path}`;
    }
  } catch (error) {
    console.error("Failed to get file URL:", error);
  }
  return null;
}

async function downloadImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer).toString("base64");
  } catch (error) {
    console.error("Failed to download image:", error);
    return null;
  }
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

  // Use AI to parse the expense
  await sendTelegramMessage(chatId, "🤖 Processing...");
  
  const aiResult = await parseExpenseWithAI(text);

  let amount: number;
  let category: string;
  let description: string;
  let merchant: string | undefined;

  if (!aiResult.success || !aiResult.expense) {
    // Fallback to simple parsing
    const amountMatch = text.match(/(\d+(?:\.\d{1,2})?)/);
    
    if (!amountMatch) {
      await sendTelegramMessage(
        chatId,
        "❓ Could not understand. Please try format: <code>Item Amount</code>\nExample: <code>Lunch 450</code>"
      );
      return;
    }

    amount = parseFloat(amountMatch[1]);
    description = text.replace(amountMatch[0], "").trim() || "Expense";
    category = "General";
  } else {
    amount = aiResult.expense.amount;
    category = aiResult.expense.category;
    description = aiResult.expense.description;
    merchant = aiResult.expense.merchant;
  }

  // Check for duplicate expense
  const isDuplicate = await checkDuplicateExpense(userSettings.userId, amount);

  // Store pending expense for confirmation
  pendingExpenses.set(chatId, {
    userId: userSettings.userId,
    amount,
    category,
    description,
    merchant,
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
  });

  // Build confirmation message - ask for payment method first
  let confirmMsg = `📋 <b>Select payment method:</b>\n\n`;
  if (merchant) confirmMsg += `🏪 ${merchant}\n`;
  confirmMsg += `💰 ₹${amount.toFixed(2)}\n📁 ${category}\n📝 ${description}`;
  
  if (isDuplicate) {
    confirmMsg += `\n\n⚠️ <b>Warning:</b> Duplicate amount today.`;
  }

  // Inline keyboard with payment method buttons
  const keyboard = {
    inline_keyboard: [
      [
        { text: "🏦 PNB", callback_data: "pay_PNB" },
        { text: "🏦 SBI", callback_data: "pay_SBI" },
      ],
      [
        { text: "💵 Cash", callback_data: "pay_CASH" },
        { text: "💳 Credit", callback_data: "pay_CREDIT" },
      ],
      [
        { text: "❌ Cancel", callback_data: "confirm_no" },
      ],
    ],
  };

  await sendTelegramMessage(chatId, confirmMsg, keyboard);
}

async function handlePhotoMessage(chatId: number, photo: TelegramMessage["photo"], caption?: string) {
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

  if (!photo || photo.length === 0) {
    await sendTelegramMessage(chatId, "❌ Could not process the image.");
    return;
  }

  await sendTelegramMessage(chatId, "🤖 Analyzing receipt...");

  // Get the largest photo (last in array)
  const largestPhoto = photo[photo.length - 1];
  const fileUrl = await getFileUrl(largestPhoto.file_id);

  if (!fileUrl) {
    await sendTelegramMessage(chatId, "❌ Could not download the image.");
    return;
  }

  const imageBase64 = await downloadImageAsBase64(fileUrl);

  if (!imageBase64) {
    await sendTelegramMessage(chatId, "❌ Could not process the image.");
    return;
  }

  let aiResult;
  
  // If caption has useful expense info (contains amount), use it; otherwise do OCR
  if (caption && caption.trim().length > 5 && hasUsefulExpenseInfo(caption)) {
    console.log("Using caption for parsing:", caption);
    aiResult = await parseExpenseWithAI(`User sent a payment screenshot with this caption: "${caption}"`);
  } else {
    console.log("Caption not useful, using OCR");
    aiResult = await parseReceiptWithAI(imageBase64);
  }

  if (!aiResult.success || !aiResult.expense) {
    await sendTelegramMessage(
      chatId,
      "❓ Could not extract expense. Please try:\n• Adding a caption like: <code>Paid 290 to Sweets Shop</code>\n• Or type the expense manually"
    );
    return;
  }

  const { amount, category, description, merchant } = aiResult.expense;

  // Upload image to R2
  let receiptUrl: string | undefined;
  try {
    receiptUrl = await uploadImageToR2(imageBase64, userSettings.userId);
  } catch (error) {
    console.error("Failed to upload receipt to R2:", error);
    // Continue without receipt URL - not a critical error
  }

  // Check for duplicate expense
  const isDuplicate = await checkDuplicateExpense(userSettings.userId, amount);

  // Store pending expense for confirmation
  pendingExpenses.set(chatId, {
    userId: userSettings.userId,
    amount,
    category,
    description,
    merchant,
    receiptUrl,
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
  });

  // Build confirmation message - ask for payment method first
  let confirmMsg = `📋 <b>Select payment method:</b>\n\n`;
  if (merchant) confirmMsg += `🏪 ${merchant}\n`;
  confirmMsg += `💰 ₹${amount.toFixed(2)}\n📁 ${category}\n📝 ${description}`;
  if (receiptUrl) confirmMsg += `\n📎 Receipt attached`;
  
  if (isDuplicate) {
    confirmMsg += `\n\n⚠️ <b>Warning:</b> Duplicate amount today.`;
  }

  // Inline keyboard with payment method buttons
  const keyboard = {
    inline_keyboard: [
      [
        { text: "🏦 PNB", callback_data: "pay_PNB" },
        { text: "🏦 SBI", callback_data: "pay_SBI" },
      ],
      [
        { text: "💵 Cash", callback_data: "pay_CASH" },
        { text: "💳 Credit", callback_data: "pay_CREDIT" },
      ],
      [
        { text: "❌ Cancel", callback_data: "confirm_no" },
      ],
    ],
  };

  await sendTelegramMessage(chatId, confirmMsg, keyboard);
}

// Handle PDF document messages
async function handleDocumentMessage(chatId: number, document: TelegramMessage["document"], caption?: string) {
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

  if (!document) {
    await sendTelegramMessage(chatId, "❌ Could not process the document.");
    return;
  }

  // Check if it's a PDF
  const isPdf = document.mime_type === "application/pdf" || document.file_name?.toLowerCase().endsWith(".pdf");
  
  if (!isPdf) {
    await sendTelegramMessage(chatId, "❌ Only PDF invoices are supported. Please send a PDF file or an image.");
    return;
  }

  await sendTelegramMessage(chatId, "📄 Extracting text from PDF...");

  // Download the PDF
  const fileUrl = await getFileUrl(document.file_id);
  if (!fileUrl) {
    await sendTelegramMessage(chatId, "❌ Could not download the PDF.");
    return;
  }

  const response = await fetch(fileUrl);
  const arrayBuffer = await response.arrayBuffer();
  const pdfBuffer = Buffer.from(arrayBuffer);

  // Extract text from PDF
  let pdfText = "";
  try {
    const pdfData = await pdfParse(pdfBuffer);
    pdfText = pdfData.text;
    console.log("PDF text extracted:", pdfText.substring(0, 500));
  } catch (error) {
    console.error("PDF parse error:", error);
    await sendTelegramMessage(chatId, "❌ Could not extract text from PDF. Please send an image instead.");
    return;
  }

  // Use caption if provided, otherwise use extracted PDF text
  let textToParse = caption && hasUsefulExpenseInfo(caption) 
    ? `User sent a PDF invoice with caption: "${caption}"`
    : `Extract expense details from this invoice text:\n\n${pdfText.substring(0, 2000)}`;

  await sendTelegramMessage(chatId, "🤖 Analyzing invoice...");

  // Parse expense with AI
  const aiResult = await parseExpenseWithAI(textToParse);

  if (!aiResult.success || !aiResult.expense) {
    await sendTelegramMessage(
      chatId,
      "❓ Could not parse expense. Please try:\n<code>Item name Amount</code>"
    );
    return;
  }

  const { amount, category, description, merchant } = aiResult.expense;

  // Upload PDF to R2 (reuse the already downloaded buffer)
  let receiptUrl: string | undefined;
  try {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const bucketName = process.env.R2_BUCKET_NAME;

    if (accountId && accessKeyId && secretAccessKey && bucketName) {
      const r2Client = new S3Client({
        region: "auto",
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId, secretAccessKey },
      });

      const key = `receipts/${userSettings.userId}/${Date.now()}.pdf`;
      await r2Client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: key,
          Body: pdfBuffer,
          ContentType: "application/pdf",
        })
      );
      receiptUrl = key;
    }
  } catch (error) {
    console.error("Failed to upload PDF to R2:", error);
  }

  // Check for duplicate expense
  const isDuplicate = await checkDuplicateExpense(userSettings.userId, amount);

  // Store pending expense for confirmation
  pendingExpenses.set(chatId, {
    userId: userSettings.userId,
    amount,
    category,
    description,
    merchant,
    receiptUrl,
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
  });

  // Build confirmation message - ask for payment method first
  let confirmMsg = `📋 <b>Select payment method:</b>\n\n`;
  if (merchant) confirmMsg += `🏪 ${merchant}\n`;
  confirmMsg += `💰 ₹${amount.toFixed(2)}\n📁 ${category}\n📝 ${description}`;
  confirmMsg += `\n📄 PDF attached`;
  
  if (isDuplicate) {
    confirmMsg += `\n\n⚠️ <b>Warning:</b> Duplicate amount today.`;
  }

  // Inline keyboard with payment method buttons
  const keyboard = {
    inline_keyboard: [
      [
        { text: "🏦 PNB", callback_data: "pay_PNB" },
        { text: "🏦 SBI", callback_data: "pay_SBI" },
      ],
      [
        { text: "💵 Cash", callback_data: "pay_CASH" },
        { text: "💳 Credit", callback_data: "pay_CREDIT" },
      ],
      [
        { text: "❌ Cancel", callback_data: "confirm_no" },
      ],
    ],
  };

  await sendTelegramMessage(chatId, confirmMsg, keyboard);
}

export async function POST(request: NextRequest) {
  // Verify webhook secret
  const secretToken = request.headers.get("x-telegram-bot-api-secret-token");
  if (TELEGRAM_WEBHOOK_SECRET && secretToken !== TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const update: TelegramUpdate = await request.json();
    
    // Handle callback queries (inline button clicks)
    if (update.callback_query) {
      const callbackQuery = update.callback_query;
      const chatId = callbackQuery.message?.chat.id;
      const messageId = callbackQuery.message?.message_id;
      const data = callbackQuery.data;

      if (chatId && messageId) {
        // Handle payment method selection - save directly without extra confirmation
        if (data?.startsWith("pay_")) {
          const paymentMethod = data.replace("pay_", "") as "PNB" | "SBI" | "CASH" | "CREDIT";
          const pending = pendingExpenses.get(chatId);
          if (pending && pending.expiresAt > Date.now()) {
            // Save expense directly with payment method
            await db.expense.create({
              data: {
                userId: pending.userId,
                amount: pending.amount,
                category: pending.category,
                description: pending.description,
                merchant: pending.merchant,
                receiptUrl: pending.receiptUrl,
                source: "TELEGRAM",
                paymentMethod: paymentMethod,
                date: new Date(),
              },
            });
            // Notify web UI to refresh
            notifyUser(pending.userId);
            
            // Check and send subscription alerts (non-blocking)
            checkAndSendSubscriptionAlerts(pending.userId).catch(console.error);
            
            pendingExpenses.delete(chatId);
            
            await editMessageText(chatId, messageId, `✅ <b>Saved!</b>\n\n💰 ₹${pending.amount.toFixed(2)}\n📁 ${pending.category}\n💳 ${paymentMethod}`);
            await answerCallbackQuery(callbackQuery.id, "Saved!");
          } else {
            await editMessageText(chatId, messageId, "⏰ Expired. Please send the expense again.");
            await answerCallbackQuery(callbackQuery.id, "Expired");
          }
        } else if (data === "confirm_no") {
          pendingExpenses.delete(chatId);
          await editMessageText(chatId, messageId, "❌ Cancelled. Send another expense or receipt.");
          await answerCallbackQuery(callbackQuery.id, "Cancelled");
        }
      }
      return NextResponse.json({ ok: true });
    }

    const message = update.message;

    if (!message || !message.chat) {
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat.id;
    const text = message.text || "";

    // Handle photo messages (receipts) - pass caption if available
    if (message.photo && message.photo.length > 0) {
      await handlePhotoMessage(chatId, message.photo, message.caption);
      return NextResponse.json({ ok: true });
    }

    // Handle document messages (PDF invoices)
    if (message.document) {
      await handleDocumentMessage(chatId, message.document, message.caption);
      return NextResponse.json({ ok: true });
    }

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
      // If there's a pending expense, treat this as a correction
      if (pendingExpenses.has(chatId)) {
        pendingExpenses.delete(chatId);
        await sendTelegramMessage(chatId, "🔄 Processing your correction...");
      }
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

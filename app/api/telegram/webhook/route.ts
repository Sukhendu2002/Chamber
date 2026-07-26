import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseExpenseWithAI, parseReceiptWithVision, parsePDFWithVision } from "@/lib/ai";
import { notifyUser } from "@/app/api/events/route";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { checkAndSendSubscriptionAlerts } from "@/lib/subscription-alerts";
import { getAccountsByUserId } from "@/lib/actions/accounts";
import { escapeHtml } from "@/lib/utils";
import { getExpenseBalanceAdjustment, getNetWorthContribution } from "@/lib/accounting";

const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

type TransactionClient = Parameters<Parameters<typeof db.$transaction>[0]>[0];

interface TelegramExpenseAccount {
 id: string;
 type: string;
 creditLimit: number | null;
}

async function applyTelegramExpenseBalance(
 tx: TransactionClient,
 userId: string,
 account: TelegramExpenseAccount,
 amount: number
) {
 const adjustment = getExpenseBalanceAdjustment(account.type, amount);

 if (account.type === "CREDIT_CARD" && account.creditLimit !== null) {
 const updateResult = await tx.account.updateMany({
 where: {
 id: account.id,
 userId,
 isActive: true,
 currentBalance: { lte: account.creditLimit - amount },
 },
 data: { currentBalance: { increment: adjustment } },
 });

 if (updateResult.count !== 1) {
 throw new Error("Expense exceeds the credit card's available credit");
 }

 return tx.account.findUniqueOrThrow({ where: { id: account.id } });
 }

 return tx.account.update({
 where: { id: account.id },
 data: { currentBalance: { increment: adjustment } },
 });
}

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
 caption?: string; // Caption for photos/documents
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

// Store pending quick expenses awaiting account selection (in-memory, resets on server restart)
const pendingQuickExpenses = new Map<number, {
 userId: string;
 amount: number;
 expiresAt: number;
}>();

// Handle summary command - /summary [today|week|month]
async function handleSummaryCommand(chatId: number, args: string) {
 const userSettings = await db.userSettings.findFirst({
 where: { telegramChatId: chatId.toString() },
 });

 if (!userSettings) {
 await sendTelegramMessage(
 chatId,
 " Your Telegram account is not linked. Please link it from the Chamber dashboard first."
 );
 return;
 }

 const period = args || "today";
 const now = new Date();
 let startDate: Date;
 const endDate: Date = new Date();
 let periodLabel: string;

 if (period === "today") {
 startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
 periodLabel = "Today";
 } else if (period === "week") {
 startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
 periodLabel = "Last 7 Days";
 } else if (period === "month") {
 startDate = new Date(now.getFullYear(), now.getMonth(), 1);
 periodLabel = "This Month";
 } else {
 await sendTelegramMessage(
 chatId,
 " Usage: <code>/summary [today|week|month]</code>\n\nExamples:\n• <code>/summary</code> - Today's summary\n• <code>/summary week</code> - Last 7 days\n• <code>/summary month</code> - This month"
 );
 return;
 }

 const expenses = await db.expense.findMany({
 where: {
 userId: userSettings.userId,
 date: {
 gte: startDate,
 lte: endDate,
 },
 },
 orderBy: [{ createdAt: "desc" }, { id: "desc" }],
 select: {
 amount: true,
 category: true,
 description: true,
 merchant: true,
 date: true,
 },
 });

 let totalSpent = 0;
 const categoryBreakdown: Record<string, number> = {};
 const recentExpenses = expenses.slice(0, 5);

 for (const exp of expenses) {
 totalSpent += exp.amount;
 categoryBreakdown[exp.category] = (categoryBreakdown[exp.category] || 0) + exp.amount;
 }

 const currency = userSettings.currency || "INR";
 const currencySymbol = currency === "INR" ? "₹" : "$";

 let message = `<b>${periodLabel} Summary</b>\n\n`;
 message += `<b>Total:</b> ${currencySymbol}${totalSpent.toFixed(2)}\n`;
 message += `<b>Transactions:</b> ${expenses.length}\n`;

 if (expenses.length > 0) {
 const sortedCategories = Object.entries(categoryBreakdown)
 .sort((a, b) => b[1] - a[1])
 .slice(0, 5);

 message += `\n<b>By Category:</b>\n`;
 for (const [category, amount] of sortedCategories) {
 const percentage = ((amount / totalSpent) * 100).toFixed(0);
 message += `• ${escapeHtml(category)}: ${currencySymbol}${amount.toFixed(2)} (${percentage}%)\n`;
 }

 message += `\n<b>Recent Transactions:</b>\n`;
 for (const exp of recentExpenses) {
 const label = exp.merchant || exp.description || exp.category;
 const date = new Date(exp.date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
 message += `• ${escapeHtml(label)}: ${currencySymbol}${exp.amount.toFixed(2)} (${date})\n`;
 }
 } else {
 message += `\n<i>No expenses recorded for ${periodLabel.toLowerCase()}.</i>`;
 }

 await sendTelegramMessage(chatId, message);
}

// Handle help command - /help
async function handleHelpCommand(chatId: number) {
 const helpMessage = `<b>Chamber Bot Commands</b>

<b>Account Setup</b>
• <code>/start &lt;code&gt;</code> - Link your Chamber account

<b>Expense Management</b>
• <code>/summary [today|week|month]</code> - View spending summary
• <code>/accounts</code> - Check account balances
• Send any text message - Add an expense via AI
• Send a photo - Extract expense from receipt
• Send a PDF - Extract expense from invoice

<b>Need Help?</b>
• Visit: <a href="https://chamber.vercel.app">chamber.vercel.app</a>

<i>Tip: You can also send voice messages to add expenses!</i>

<b>Quick Expenses</b>
• Send just a number (e.g., <code>25</code>) or use <code>/quick</code> — tap an amount, then pick an account to save instantly!`;

 await sendTelegramMessage(chatId, helpMessage);
}

// Handle quick command - /quick
async function handleQuickCommand(chatId: number) {
 const userSettings = await db.userSettings.findFirst({
 where: { telegramChatId: chatId.toString() },
 });

 if (!userSettings) {
 await sendTelegramMessage(
 chatId,
 "Your Telegram account is not linked. Please link it from the Chamber dashboard first."
 );
 return;
 }

 await sendTelegramMessage(
 chatId,
 "Quick-expense buttons are at the bottom. Tap an amount, then pick the account to charge.",
 buildQuickReplyKeyboard()
 );
}

// Handle quick expense - shows account selection inline keyboard
// Works for both inline button taps (with messageId) and direct text messages (messageId=0)
async function handleQuickExpenseTap(
 chatId: number,
 messageId: number,
 callbackQueryId: string,
 amount: number
) {
 const userSettings = await db.userSettings.findFirst({
 where: { telegramChatId: chatId.toString() },
 });

 if (!userSettings) {
 if (callbackQueryId) await answerCallbackQuery(callbackQueryId, "Account not linked");
 return;
 }

 const accounts = await getAccountsByUserId(userSettings.userId);

 if (accounts.length === 0) {
 const text = "No accounts found. Please add accounts in Chamber first.";
 if (messageId > 0) {
 await editMessageText(chatId, messageId, text);
 } else {
 await sendTelegramMessage(chatId, text, buildQuickReplyKeyboard());
 }
 if (callbackQueryId) await answerCallbackQuery(callbackQueryId, "No accounts");
 return;
 }

 // Store pending quick expense so we can save it after account selection
 pendingQuickExpenses.set(chatId, {
 userId: userSettings.userId,
 amount,
 expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
 });

 const text = `<b>Select account for ₹${amount.toFixed(2)} quick expense:</b>`;
 const keyboard = buildAccountKeyboard(accounts, "qpay_");

 if (messageId > 0) {
 await editMessageText(chatId, messageId, text, keyboard);
 } else {
 await sendTelegramMessage(chatId, text, keyboard);
 }

 if (callbackQueryId) {
 await answerCallbackQuery(callbackQueryId, "Select account");
 }
}

// Save a quick expense after the user picks an account
async function handleQuickAccountSelection(
 chatId: number,
 messageId: number,
 callbackQueryId: string,
 accountId: string
) {
 const pending = pendingQuickExpenses.get(chatId);

 if (!pending || pending.expiresAt <= Date.now()) {
 pendingQuickExpenses.delete(chatId);
 await editMessageText(chatId, messageId, "⏰ Expired. Please send the amount again.");
 await answerCallbackQuery(callbackQueryId, "Expired");
 return;
 }

 const account = await db.account.findFirst({
 where: { id: accountId, userId: pending.userId, isActive: true },
 });

 if (!account) {
 await editMessageText(chatId, messageId, "Account not found or access denied. Please try again.");
 await answerCallbackQuery(callbackQueryId, "Account not found");
 return;
 }

 try {
 await db.$transaction(async (tx) => {
 await tx.expense.create({
 data: {
 userId: pending.userId,
 amount: pending.amount,
 category: QUICK_DEFAULT_CATEGORY,
 description: "Quick expense",
 source: "TELEGRAM",
 accountId: account.id,
 paymentMethod: account.name,
 date: new Date(),
 },
 });

 const updatedAccount = await applyTelegramExpenseBalance(
 tx,
 pending.userId,
 account,
 pending.amount
 );
 await tx.balanceHistory.create({
 data: {
 accountId: account.id,
 balance: updatedAccount.currentBalance,
 note: `Quick expense: ₹${pending.amount}`,
 date: new Date(),
 },
 });
 });

 notifyUser(pending.userId);
 checkAndSendSubscriptionAlerts(pending.userId).catch(console.error);
 pendingQuickExpenses.delete(chatId);

 await editMessageText(
 chatId,
 messageId,
 `<b>Saved!</b>\n\n₹${pending.amount.toFixed(2)} · ${escapeHtml(account.name)}`
 );
 await answerCallbackQuery(callbackQueryId, "Saved!");
 } catch (error) {
 console.error("Quick expense save error:", error);
 await editMessageText(chatId, messageId, "Failed to save expense. Please try again.");
 await answerCallbackQuery(callbackQueryId, "Failed");
 }
}

// Handle accounts command - /accounts
async function handleAccountsCommand(chatId: number) {
 const userSettings = await db.userSettings.findFirst({
 where: { telegramChatId: chatId.toString() },
 });

 if (!userSettings) {
 await sendTelegramMessage(
 chatId,
 " Your Telegram account is not linked. Please link it from the Chamber dashboard first.\n\nUse: <code>/start YOUR_CODE</code>"
 );
 return;
 }

 const accounts = await db.account.findMany({
 where: { userId: userSettings.userId, isActive: true },
 orderBy: [{ type: "asc" }, { name: "asc" }],
 });

 if (accounts.length === 0) {
 await sendTelegramMessage(
 chatId,
 " You don't have any active accounts yet.\n\nAdd accounts from the Chamber dashboard."
 );
 return;
 }

 const currency = userSettings.currency || "INR";
 const currencySymbol = currency === "INR" ? "₹" : "$";

 let totalBalance = 0;
 let message = `<b>Your Accounts</b>\n\n`;

 // Group accounts by type
 const accountsByType: Record<string, typeof accounts> = {};
 for (const account of accounts) {
 if (!accountsByType[account.type]) {
 accountsByType[account.type] = [];
 }
 accountsByType[account.type].push(account);
 }

 // Display accounts grouped by type
 const typeOrder = ["BANK", "INVESTMENT", "WALLET", "CASH", "CREDIT_CARD", "DEBIT_CARD", "OTHER"];

 for (const type of typeOrder) {
 const typeAccounts = accountsByType[type];
 if (!typeAccounts || typeAccounts.length === 0) continue;

 const icon = ACCOUNT_TYPE_ICONS[type] || "";

 for (const account of typeAccounts) {
 const balance = Number(account.currentBalance);
 totalBalance += getNetWorthContribution(account.type, balance);
 if (account.type === "CREDIT_CARD") {
 const cardLabel = balance >= 0
 ? `${currencySymbol}${balance.toFixed(2)} outstanding`
 : `${currencySymbol}${Math.abs(balance).toFixed(2)} credit`;
 message += `${icon} <b>${escapeHtml(account.name)}</b>: ${cardLabel}\n`;
 } else {
 message += `${icon} <b>${escapeHtml(account.name)}</b>: ${currencySymbol}${balance.toFixed(2)}\n`;
 }
 }
 }

 message += `\n <b>Net Worth:</b> ${currencySymbol}${totalBalance.toFixed(2)}`;

 await sendTelegramMessage(chatId, message);
}
const ACCOUNT_TYPE_ICONS: Record<string, string> = {
 BANK: "\u{1F3E6}",
 INVESTMENT: "\u{1F4C8}",
 WALLET: "\u{1F4B3}",
 CASH: "\u{1F4B5}",
 CREDIT_CARD: "\u{1F4B3}",
 DEBIT_CARD: "\u{1F4B3}",
 OTHER: "\u{1F4B0}",
};

// Quick expense configuration
const QUICK_DEFAULT_CATEGORY = "General";
const QUICK_MAX_AMOUNT = 200;

function detectQuickExpense(text: string): number | null {
 const trimmed = text.trim();
 // Match "25", "₹25", "Rs25", "25 rs" etc.
 const match = trimmed.match(/^(?:₹|Rs\.?\s*)?(\d{1,3})(?:\.\d{1,2})?\s*(?:rupees?|rs)?$/i);
 if (!match) return null;
 const amount = parseFloat(match[1]);
 if (isNaN(amount) || amount <= 0 || amount > QUICK_MAX_AMOUNT) return null;
 return amount;
}

// Persistent reply keyboard for quick expense amounts
function buildQuickReplyKeyboard(): object {
 return {
 keyboard: [
 [
 { text: "₹10" },
 { text: "₹20" },
 { text: "₹25" },
 ],
 [
 { text: "₹50" },
 { text: "₹100" },
 ],
 ],
 resize_keyboard: true,
 input_field_placeholder: "Tap amount or type expense...",
 };
}

// Build inline keyboard from user's accounts (uses accountId in callback_data)
function buildAccountKeyboard(
 accounts: { id: string; name: string; type: string }[],
 callbackPrefix: string = "pay_"
) {
 const rows: { text: string; callback_data: string }[][] = [];
 for (let i = 0; i < accounts.length; i += 2) {
 const row: { text: string; callback_data: string }[] = [];
 row.push({
 text: `${ACCOUNT_TYPE_ICONS[accounts[i].type] || "\u{1F4B0}"} ${accounts[i].name}`,
 callback_data: `${callbackPrefix}${accounts[i].id}`,
 });
 if (i + 1 < accounts.length) {
 row.push({
 text: `${ACCOUNT_TYPE_ICONS[accounts[i + 1].type] || "\u{1F4B0}"} ${accounts[i + 1].name}`,
 callback_data: `${callbackPrefix}${accounts[i + 1].id}`,
 });
 }
 rows.push(row);
 }
 rows.push([{ text: "\u274C Cancel", callback_data: "confirm_no" }]);
 return { inline_keyboard: rows };
}

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
 /\d{2,}/, // Any number with 2+ digits (like "45000" or "500")
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
 " Invalid or expired code. Please generate a new code from the Chamber dashboard."
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
 "<b>Account linked successfully!</b>\n\nQuick-expense buttons are now at the bottom. Tap an amount, then pick the account to charge.\n\nYou can also type expenses like:\n• <code>Lunch 450</code>\n• <code>Uber 250</code>\n• Or send a receipt photo",
 buildQuickReplyKeyboard()
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
 " Your Telegram account is not linked. Please link it from the Chamber dashboard first."
 );
 return;
 }

 // Use AI to parse the expense
 await sendTelegramMessage(chatId, " Processing...");

 const aiResult = await parseExpenseWithAI(text, userSettings.currency || "INR");

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
 " Could not understand. Please try format: <code>Item Amount</code>\nExample: <code>Lunch 450</code>"
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

 // Fetch user's accounts for payment method selection
 const userAccounts = await getAccountsByUserId(userSettings.userId);

 // Build confirmation message - ask for payment method first
 let confirmMsg = `<b>Select payment method:</b>\n\n`;
 if (merchant) confirmMsg += ` ${escapeHtml(merchant)}\n`;
 confirmMsg += ` ₹${amount.toFixed(2)}\n ${escapeHtml(category)}\n ${escapeHtml(description)}`;

 if (isDuplicate) {
 confirmMsg += `\n\n <b>Warning:</b> Duplicate amount today.`;
 }

 if (userAccounts.length === 0) {
 confirmMsg += `\n\n No accounts found. Please add accounts in Chamber first.`;
 await sendTelegramMessage(chatId, confirmMsg);
 return;
 }

 // Inline keyboard with dynamic account buttons
 const keyboard = buildAccountKeyboard(userAccounts);

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
 " Your Telegram account is not linked. Please link it from the Chamber dashboard first."
 );
 return;
 }

 if (!photo || photo.length === 0) {
 await sendTelegramMessage(chatId, " Could not process the image.");
 return;
 }

 await sendTelegramMessage(chatId, " Analyzing receipt with AI vision...");

 // Get the largest photo (last in array)
 const largestPhoto = photo[photo.length - 1];
 const fileUrl = await getFileUrl(largestPhoto.file_id);

 if (!fileUrl) {
 await sendTelegramMessage(chatId, " Could not download the image.");
 return;
 }

 const imageBase64 = await downloadImageAsBase64(fileUrl);

 if (!imageBase64) {
 await sendTelegramMessage(chatId, " Could not process the image.");
 return;
 }

 let aiResult;

 // If caption has useful expense info (contains amount), use free text model to save credits
 if (caption && caption.trim().length > 5 && hasUsefulExpenseInfo(caption)) {
 console.log("Caption has expense info, using free text model:", caption);
 aiResult = await parseExpenseWithAI(`User sent a payment screenshot with this caption: "${caption}"`, userSettings.currency || "INR");
 } else {
 // Send image directly to GPT-4.1 Nano vision - no OCR needed
 console.log("Sending image to Vision AI (GPT-4.1 Nano)...");
 aiResult = await parseReceiptWithVision(imageBase64, "image/jpeg", caption, userSettings.currency || "INR");
 }

 if (!aiResult.success || !aiResult.expense) {
 await sendTelegramMessage(
 chatId,
 " Could not extract expense. Please try:\n• Adding a caption like: <code>Paid 290 to Sweets Shop</code>\n• Or type the expense manually"
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

 // Fetch user's accounts for payment method selection
 const userAccounts = await getAccountsByUserId(userSettings.userId);

 // Build confirmation message - ask for payment method first
 let confirmMsg = `<b>Select payment method:</b>\n\n`;
 if (merchant) confirmMsg += ` ${escapeHtml(merchant)}\n`;
 confirmMsg += ` ₹${amount.toFixed(2)}\n ${escapeHtml(category)}\n ${escapeHtml(description)}`;
 if (receiptUrl) confirmMsg += `\n Receipt attached`;

 if (isDuplicate) {
 confirmMsg += `\n\n <b>Warning:</b> Duplicate amount today.`;
 }

 if (userAccounts.length === 0) {
 confirmMsg += `\n\n No accounts found. Please add accounts in Chamber first.`;
 await sendTelegramMessage(chatId, confirmMsg);
 return;
 }

 // Inline keyboard with dynamic account buttons
 const keyboard = buildAccountKeyboard(userAccounts);

 await sendTelegramMessage(chatId, confirmMsg, keyboard);
}

// Handle PDF document messages - now also supports image files
async function handleDocumentMessage(chatId: number, document: TelegramMessage["document"], caption?: string) {
 // Find user by chat ID
 const userSettings = await db.userSettings.findFirst({
 where: { telegramChatId: chatId.toString() },
 });

 if (!userSettings) {
 await sendTelegramMessage(
 chatId,
 " Your Telegram account is not linked. Please link it from the Chamber dashboard first."
 );
 return;
 }

 if (!document) {
 await sendTelegramMessage(chatId, " Could not process the document.");
 return;
 }

 const mimeType = document.mime_type || "";
 const isPdf = mimeType === "application/pdf" || document.file_name?.toLowerCase().endsWith(".pdf");
 const isImage = mimeType.startsWith("image/");

 if (!isPdf && !isImage) {
 await sendTelegramMessage(chatId, " Only PDF invoices and images are supported. Please send a PDF or image file.");
 return;
 }

 await sendTelegramMessage(chatId, " Analyzing document with AI vision...");

 // Download the file
 const fileUrl = await getFileUrl(document.file_id);
 if (!fileUrl) {
 await sendTelegramMessage(chatId, " Could not download the document.");
 return;
 }

 const response = await fetch(fileUrl);
 const arrayBuffer = await response.arrayBuffer();
 const fileBuffer = Buffer.from(arrayBuffer);
 const fileBase64 = fileBuffer.toString("base64");

 let aiResult;

 // If caption has useful expense info, use free text model to save credits
 if (caption && caption.trim().length > 5 && hasUsefulExpenseInfo(caption)) {
 console.log("Caption has expense info, using free text model:", caption);
 aiResult = await parseExpenseWithAI(
 `User sent a ${isPdf ? "PDF invoice" : "image"} with caption: "${caption}"`,
 userSettings.currency || "INR"
 );
 } else if (isPdf) {
 // Send PDF directly to vision model
 aiResult = await parsePDFWithVision(fileBase64, caption, userSettings.currency || "INR");
 } else {
 // Send image directly to vision model
 aiResult = await parseReceiptWithVision(fileBase64, mimeType, caption, userSettings.currency || "INR");
 }

 if (!aiResult.success || !aiResult.expense) {
 await sendTelegramMessage(
 chatId,
 " Could not parse expense. Please try:\n<code>Item name Amount</code>"
 );
 return;
 }

 const { amount, category, description, merchant } = aiResult.expense;

 // Upload file to R2
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

 const ext = isPdf ? "pdf" : (mimeType.split("/")[1] || "jpg");
 const key = `receipts/${userSettings.userId}/${Date.now()}.${ext}`;
 await r2Client.send(
 new PutObjectCommand({
 Bucket: bucketName,
 Key: key,
 Body: fileBuffer,
 ContentType: mimeType || (isPdf ? "application/pdf" : "image/jpeg"),
 })
 );
 receiptUrl = key;
 }
 } catch (error) {
 console.error("Failed to upload document to R2:", error);
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

 // Fetch user's accounts for payment method selection
 const userAccounts = await getAccountsByUserId(userSettings.userId);

 // Build confirmation message - ask for payment method first
 let confirmMsg = `<b>Select payment method:</b>\n\n`;
 if (merchant) confirmMsg += ` ${escapeHtml(merchant)}\n`;
 confirmMsg += ` ₹${amount.toFixed(2)}\n ${escapeHtml(category)}\n ${escapeHtml(description)}`;
 confirmMsg += `\n ${isPdf ? "PDF" : "Image"} attached`;

 if (isDuplicate) {
 confirmMsg += `\n\n <b>Warning:</b> Duplicate amount today.`;
 }

 if (userAccounts.length === 0) {
 confirmMsg += `\n\n No accounts found. Please add accounts in Chamber first.`;
 await sendTelegramMessage(chatId, confirmMsg);
 return;
 }

 // Inline keyboard with dynamic account buttons
 const keyboard = buildAccountKeyboard(userAccounts);

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
 // Handle quick expense tap - show account selection
 if (data?.startsWith("quick_")) {
 const amountStr = data.replace("quick_", "");
 if (amountStr === "cancel") {
 await editMessageText(chatId, messageId, "Cancelled.");
 await answerCallbackQuery(callbackQuery.id, "Cancelled");
 } else {
 const amount = parseFloat(amountStr);
 if (!isNaN(amount) && amount > 0) {
 await handleQuickExpenseTap(chatId, messageId, callbackQuery.id, amount);
 }
 }
 } else if (data?.startsWith("qpay_")) {
 const accountId = data.replace("qpay_", "");
 await handleQuickAccountSelection(chatId, messageId, callbackQuery.id, accountId);
 } else if (data?.startsWith("pay_")) {
 const accountId = data.replace("pay_", "");
 const pending = pendingExpenses.get(chatId);
 if (pending && pending.expiresAt > Date.now()) {
 const account = await db.account.findFirst({
 where: { id: accountId, userId: pending.userId, isActive: true },
 });

 if (!account) {
 await editMessageText(
 chatId,
 messageId,
 "Account not found or access denied. Please try again."
 );
 await answerCallbackQuery(callbackQuery.id, "Account not found");
 return NextResponse.json({ ok: true });
 }
 const accountName = account.name;

 // Save expense and adjust balance in a transaction
 await db.$transaction(async (tx) => {
 await tx.expense.create({
 data: {
 userId: pending.userId,
 amount: pending.amount,
 category: pending.category,
 description: pending.description,
 merchant: pending.merchant,
 receiptUrl: pending.receiptUrl,
 source: "TELEGRAM",
 paymentMethod: accountName,
 accountId: accountId,
 date: new Date(),
 },
 });

 // Adjust account balance and record history
 const updatedAccount = await applyTelegramExpenseBalance(
 tx,
 pending.userId,
 account,
 pending.amount
 );
 const label = pending.description || pending.category || "Expense";
 await tx.balanceHistory.create({
 data: {
 accountId,
 balance: updatedAccount.currentBalance,
 note: `Expense: ${label} (₹${pending.amount})`,
 date: new Date(),
 },
 });
 });

 // Notify web UI to refresh
 notifyUser(pending.userId);

 // Check and send subscription alerts (non-blocking)
 checkAndSendSubscriptionAlerts(pending.userId).catch(console.error);

 pendingExpenses.delete(chatId);

 await editMessageText(chatId, messageId, `<b>Saved!</b>\n\n ₹${pending.amount.toFixed(2)}\n ${escapeHtml(pending.category)}\n ${escapeHtml(accountName)}`);
 await answerCallbackQuery(callbackQuery.id, "Saved!");
 } else {
 await editMessageText(chatId, messageId, "⏰ Expired. Please send the expense again.");
 await answerCallbackQuery(callbackQuery.id, "Expired");
 }
 } else if (data === "confirm_no") {
 pendingExpenses.delete(chatId);
 pendingQuickExpenses.delete(chatId);
 await editMessageText(chatId, messageId, " Cancelled. Send another expense or receipt.");
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
 "Welcome to Chamber!\n\nTo link your account, please generate a linking code from the Chamber dashboard and send:\n<code>/start YOUR_CODE</code>"
 );
 } else if (text.startsWith("/summary")) {
 const args = text.replace("/summary", "").trim().toLowerCase();
 await handleSummaryCommand(chatId, args);
 } else if (text.startsWith("/accounts")) {
 await handleAccountsCommand(chatId);
 } else if (text.startsWith("/quick")) {
 await handleQuickCommand(chatId);
 } else if (text.startsWith("/help")) {
 await handleHelpCommand(chatId);
 } else if (text && !text.startsWith("/")) {
 // Check if this is a quick-expense candidate (just a small number like "25")
 const quickAmount = detectQuickExpense(text);
 if (quickAmount !== null) {
 // Verify user is linked
 const userSettings = await db.userSettings.findFirst({
 where: { telegramChatId: chatId.toString() },
 });
 if (userSettings) {
 // Show account selection for the quick amount
 await handleQuickExpenseTap(chatId, 0, "", quickAmount);
 return NextResponse.json({ ok: true });
 }
 }

 // If there's a pending expense, treat this as a correction
 if (pendingExpenses.has(chatId)) {
 pendingExpenses.delete(chatId);
 await sendTelegramMessage(chatId, "Processing your correction...");
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

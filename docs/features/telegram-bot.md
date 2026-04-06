# Telegram Bot

Chamber's Telegram bot lets you add expenses on the go using text messages or receipt photos. The AI automatically parses your messages and extracts expense details.

## Table of Contents

- [What is the Telegram Bot?](#what-is-the-telegram-bot)
- [Linking Your Account](#linking-your-account)
- [Supported Commands](#supported-commands)
- [Adding Expenses via Text](#adding-expenses-via-text)
- [Adding Expenses via Receipt Photos](#adding-expenses-via-receipt-photos)
- [Adding Expenses via PDF](#adding-expenses-via-pdf)
- [Duplicate Detection](#duplicate-detection)
- [Unlinking Your Account](#unlinking-your-account)
- [Troubleshooting](#troubleshooting)

## What is the Telegram Bot?

The Telegram bot provides a convenient way to track expenses from your phone:

**Features:**
- Add expenses by sending text messages
- Upload receipt photos for AI parsing
- Send PDF receipts
- Works from anywhere with internet
- Faster than opening the web app
- Great for capturing expenses immediately

**How It Works:**
1. Link your Telegram account to Chamber
2. Send messages or photos to the bot
3. AI extracts expense details
4. Expenses appear in your Chamber account

## Linking Your Account

### Step 1: Find Your Linking Code

1. Log in to Chamber web app
2. Go to **Telegram** in the sidebar
3. Your 6-digit linking code is displayed
4. Code expires in 30 minutes

### Step 2: Start the Bot

1. Open Telegram on your phone
2. Search for **@ChamberBot** (or the bot username shown in Chamber)
3. Tap "Start" or send `/start`

### Step 3: Link Your Account

1. Send the linking code to the bot:
   ```
   /start 123456
   ```
   (Replace 123456 with your actual code)

2. Bot confirms:
   ```
   ✅ Account linked successfully!
   You can now send expenses to Chamber.
   ```

### Connection Status

In the Chamber web app, the Telegram page shows:
- ✅ **Linked** - Your account is connected
- ❌ **Not Linked** - Link your account to use the bot

**Refresh:** Click "Refresh" to check current status

**Generate New Code:** Click "Generate Code" if your code expired

## Supported Commands

### /start
Starts the bot and links your account.

**Usage:**
```
/start 123456
```

### /unlink
Disconnects your Telegram account from Chamber.

**Usage:**
```
/unlink
```

**Note:** This stops the bot from creating expenses. You can relink anytime.

### /help
Shows help message with available commands.

**Usage:**
```
/help
```

## Adding Expenses via Text

Simply send a message describing your expense. The AI extracts:
- Amount
- Category
- Description
- Merchant (if mentioned)

### Text Message Examples

**Simple Expense:**
```
Spent $50 on groceries
```
→ Amount: $50, Category: Food, Description: Groceries

**Detailed Expense:**
```
Paid $120 for electricity bill at State Power Company
```
→ Amount: $120, Category: Bills, Description: Electricity bill, Merchant: State Power Company

**Restaurant:**
```
Lunch at Subway $15.50
```
→ Amount: $15.50, Category: Food, Description: Lunch, Merchant: Subway

**Transportation:**
```
Uber ride to airport $35
```
→ Amount: $35, Category: Travel, Description: Uber ride to airport, Merchant: Uber

**Shopping:**
```
Bought a new phone case on Amazon for $12.99
```
→ Amount: $12.99, Category: Shopping, Description: Phone case, Merchant: Amazon

### Tips for Text Messages

1. **Include amount** - Always mention the amount
2. **Be specific** - "Starbucks coffee $5" vs "coffee $5"
3. **Mention merchant** - Helps with tracking
4. **Use currency** - $, ₹, €, £ are recognized
5. **Natural language** - Write as you'd tell a friend

### Confirmation Messages

After parsing, the bot sends:

```
✅ Expense added successfully!

Amount: $50.00
Category: Food
Description: Groceries
Merchant: Whole Foods

From account: Bank Account
```

## Adding Expenses via Receipt Photos

Take a photo of a receipt and send it to the bot. The AI extracts details from the image.

### Supported Receipts

- Restaurant bills
- Store receipts
- Invoices
- Gas station receipts
- Any printed receipt

### How to Send Receipts

1. Tap the attachment icon in Telegram
2. Choose "Photo"
3. Take or select a receipt photo
4. Send to the bot

**Tip:** Take clear, well-lit photos for best results.

### What the AI Extracts

From receipt images, the AI extracts:
- **Total amount** - The final amount paid
- **Merchant name** - Store or restaurant name
- **Date** - Transaction date
- **Items** - Sometimes individual items (if readable)
- **Category** - Based on merchant type

### Confirmation

```
✅ Expense added from receipt!

Amount: $47.23
Category: Food
Description: Dinner
Merchant: Olive Garden
Date: March 15, 2024

Receipt saved successfully.
```

### Photo Quality Tips

**Good Photos:**
- ✅ Well-lit
- ✅ Flat, no wrinkles
- ✅ Entire receipt visible
- ✅ Text is readable

**Avoid:**
- ❌ Blurry images
- ❌ Shadows covering text
- ❌ Folded/crumpled receipts
- ❌ Angled photos

## Adding Expenses via PDF

Send PDF receipts or invoices to the bot.

### How to Send PDFs

1. Tap the attachment icon
2. Choose "File"
3. Select a PDF
4. Send to the bot

**Note:** The bot extracts text from the PDF and parses it like a receipt photo.

## Duplicate Detection

Chamber prevents duplicate expenses from Telegram.

### How It Works

When you send an expense, Chamber checks:
- Same amount
- Same or similar description
- Within 5 minutes of a previous entry

If a duplicate is detected:
```
⚠️ Possible duplicate detected

Similar expense already added:
- Amount: $50.00
- Description: Groceries
- Time: 2 minutes ago

This expense was not added. If this is different, try again with more details.
```

### Why Duplicates Happen

- Sending the same message twice
- Receipt photo + text description
- Network issues causing resends

### Avoiding Duplicates

1. Wait for confirmation before sending again
2. If adding details, edit the original message
3. Check expense list if unsure

## Unlinking Your Account

To disconnect Telegram:

**Method 1 - Via Telegram:**
```
/unlink
```

**Method 2 - Via Chamber:**
1. Go to **Telegram** page
2. Click "Unlink Account"

**What Happens:**
- Bot stops creating expenses
- Past expenses remain
- You can relink anytime
- Your data is not deleted

## Troubleshooting

### Bot Not Responding

**Check:**
1. Is your account still linked? Check Chamber web app
2. Try sending `/start` again
3. Check if the bot is online

### Expenses Not Appearing

**Check:**
1. Wait a few seconds - there's a small delay
2. Refresh the Chamber web app
3. Check your internet connection
4. Check if AI parsing failed (see error messages)

### Wrong Category/Amount

**The AI isn't perfect. If parsing is wrong:**
1. Edit the expense in the web app
2. When texting, be more specific
3. For receipts, ensure photo quality is good

### Linking Code Expired

**Solution:**
1. Go to Chamber → Telegram
2. Click "Generate New Code"
3. Use the new code within 30 minutes

### "Account Already Linked" Error

**Solution:**
- Your Telegram is already linked to another Chamber account
- Unlink first, then relink

### Receipt Not Parsing

**Try:**
1. Better lighting
2. Flatten the receipt
3. Closer photo (but not blurry)
4. Manual entry via web app

## Privacy & Security

- Receipts are stored securely in Cloudflare R2
- Only you can access your expenses
- Telegram messages are processed by AI and not stored
- Your data is never shared with third parties

## Best Practices

1. **Link Telegram** - Makes expense tracking much faster
2. **Send immediately** - Don't wait, capture expenses while fresh
3. **Use natural language** - No need for special formats
4. **Keep receipts** - Upload photos for important purchases
5. **Check confirmations** - Verify AI parsed correctly
6. **Edit if needed** - Fix any mistakes in web app
7. **Keep bot handy** - Add to Telegram favorites

## Supported Currencies

The bot recognizes:
- $ (USD)
- ₹ (INR)
- € (EUR)
- £ (GBP)

Expenses are stored in your preferred currency from settings.

## Related Features

- [Expense Tracking](./expenses.md) - View and manage expenses added via Telegram
- [Settings](./../getting-started.md) - Set your currency and other preferences

---

**Questions?** See the [FAQ](../faq.md) or [Troubleshooting Guide](../troubleshooting.md).

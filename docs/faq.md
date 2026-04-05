# Frequently Asked Questions (FAQ)

Common questions about using Chamber.

## Table of Contents

- [General](#general)
- [Expenses](#expenses)
- [Accounts](#accounts)
- [Loans](#loans)
- [Subscriptions](#subscriptions)
- [Telegram Bot](#telegram-bot)
- [Security & Privacy](#security--privacy)

## General

### What is Chamber?

Chamber is an AI-powered financial tracker that helps you manage expenses, track accounts, monitor loans, and manage subscriptions - all in one place.

### Is Chamber free to use?

Yes, Chamber is open-source and free to use. You can self-host it or use a hosted version.

### Do I need technical knowledge to use Chamber?

No. While self-hosting requires some technical setup, using Chamber is designed to be simple and intuitive for everyone.

### What currencies are supported?

Chamber supports:
- INR (₹) - Indian Rupees
- USD ($) - US Dollars
- EUR (€) - Euros
- GBP (£) - British Pounds

### Can I access Chamber on mobile?

Yes! Chamber is a web app that works on any device with a browser. Additionally, you can use the Telegram bot to add expenses from your phone.

### Is there a mobile app?

Currently, there's no native mobile app, but the web app is fully responsive and works great on mobile browsers. The Telegram bot also provides mobile access.

## Expenses

### Can I add an expense without a receipt?

Yes, receipts are optional. Only amount, category, and description are required.

### What receipt formats are supported?

- Images: JPG, JPEG, PNG, WEBP
- Documents: PDF

### How do I change an expense's category?

1. Go to Expenses
2. Find the expense
3. Click "Edit"
4. Change the category
5. Save

### Can I export my expenses?

Yes! Go to Settings → Export Data → Export Expenses. You'll get a CSV file with all your expense data including receipt URLs.

### Why isn't my expense showing in the dashboard?

Check that:
- The expense date is within the current month (for monthly views)
- You're not filtering by category that excludes it
- The expense was successfully saved

### How do I delete multiple expenses at once?

Currently, expenses must be deleted one at a time. Bulk deletion is on the roadmap.

### Can I split an expense into multiple categories?

Not directly. For now, create separate expenses for each category.

### What happens to my receipts if I delete an expense?

Receipts are deleted along with the expense. Download them first if you need to keep them.

## Accounts

### Do I need to add accounts to use Chamber?

No, accounts are optional but recommended. They help track your net worth and allow you to assign payment methods to expenses.

### How often should I update account balances?

- **Bank accounts:** Weekly or after major transactions
- **Investments:** Monthly or when significant changes occur
- **Cash:** As needed

### What happens if I delete an account?

- All balance history is deleted
- The account disappears from net worth calculations
- Expenses using that account remain but lose the payment method reference

### Can I track debts/liabilities?

Currently, Chamber tracks money you've lent (loans) and your assets (accounts). Tracking money you owe (debts) is not yet supported.

### Why doesn't my net worth match my bank balance?

Net worth includes:
- All bank accounts
- Investments
- Digital wallets
- Cash
- Minus outstanding loans you've given

It may differ from any single account balance.

### Can I have accounts in different currencies?

Yes! Each account can have its own currency, and Chamber will convert them for net worth calculations.

### What account type should I choose?

| Type | Use For |
|------|---------|
| Bank | Savings, checking, fixed deposits |
| Investment | Stocks, mutual funds, ETFs, crypto |
| Wallet | PayPal, Venmo, Apple Pay, digital wallets |
| Cash | Physical cash, petty cash |
| Other | Gift cards, credits, anything else |

## Loans

### What's the difference between loans and expenses?

- **Expenses:** Money spent (gone from your accounts)
- **Loans:** Money lent (will be repaid)

Loans track money others owe you; expenses track money you've spent.

### Can I track loans I've borrowed (money I owe)?

Currently, Chamber only tracks money you've lent to others. Tracking your own debts is on the roadmap.

### What happens when I mark a loan as completed?

Loans automatically become "COMPLETED" when repayments equal the loan amount. You don't mark them manually.

### Can I add partial repayments?

Yes! Add multiple repayments. The loan status updates automatically:
- PENDING → PARTIAL → COMPLETED

### What if someone overpays?

The system accepts overpayments and shows a negative remaining balance. You can record the excess as a new expense or loan.

### Do loans affect my net worth?

Outstanding loans (not yet repaid) are not included in net worth calculations. Repaid amounts return to your accounts.

### Can I add interest to a loan?

Not automatically. You can:
1. Add the total (principal + interest) as the loan amount
2. Or create a separate expense for interest

## Subscriptions

### What's the difference between subscriptions and expenses?

- **Subscriptions:** Recurring payments that automatically create expenses
- **Expenses:** One-time or manually added spending

Subscriptions help you remember and plan for recurring bills.

### When are subscription expenses created?

On the billing date, Chamber automatically creates an expense for that subscription.

### Can I pause a subscription?

Currently, you need to delete and re-add paused subscriptions. A pause feature is planned.

### How do subscription alerts work?

If you link Telegram, Chamber sends you a message before the billing date (default: 7 days before).

### Can I change the alert days?

Yes! When adding or editing a subscription, set "Alert Days" to your preference (e.g., 3, 7, 14 days).

### What if I cancel a subscription?

Delete it from Chamber to stop future expenses and alerts.

### Do subscriptions include free trials?

Add them when the paid period starts. You can add notes about trial periods in the description.

### Why didn't I get an alert?

Check:
- Is your Telegram account linked?
- Are alert days set?
- Is the subscription active?
- Check your Telegram notification settings

## Telegram Bot

### Is the Telegram bot free?

Yes, using the Telegram bot is free. You just need a Telegram account.

### Do I need to keep Telegram open?

No, the bot works even when Telegram is closed. You'll receive notifications when you open it.

### Can I use Telegram on desktop?

Yes, Telegram works on mobile, desktop, and web. You can send expenses from any device.

### What if the AI parses my message wrong?

You can:
1. Edit the expense in the web app
2. Be more specific in your next message
3. Use the web app for complex expenses

### Does the AI store my messages?

Messages are processed to extract expense details and then discarded. Receipts are stored securely for your records.

### Can I add expenses via Telegram without linking?

No, you must link your Telegram account to Chamber first.

### What happens if I unlink Telegram?

- You can no longer add expenses via Telegram
- Past expenses remain
- You can relink anytime

### Can multiple people use the same Telegram bot?

Yes, but each person must link their own Chamber account. Expenses go to the linked account only.

### Does Telegram work offline?

Messages queue when offline and send when you reconnect. However, the bot requires internet to process expenses.

## Security & Privacy

### Is my financial data secure?

Yes:
- Authentication via Clerk (industry standard)
- Data encrypted in transit and at rest
- Receipts stored in Cloudflare R2 with secure access
- Each user's data is isolated

### Who can see my expenses?

Only you. Each user's data is private and isolated. No other user can see your expenses, accounts, or loans.

### Are my receipts secure?

Yes:
- Stored in secure cloud storage (Cloudflare R2)
- Each receipt URL is unique and private
- Only you can access your receipts
- Links expire after a period of inactivity

### Can I delete all my data?

Yes! Go to Settings → Delete Data. This permanently removes:
- All expenses
- All accounts
- All loans
- All subscriptions
- All receipts
- All settings

**Warning:** This cannot be undone.

### Is my data backed up?

If you're self-hosting, you should set up your own backups. If using a hosted version, ask your provider about backup policies.

### What happens to my data if I stop using Chamber?

Your data remains until you delete it or your account is removed. Export your data before leaving if you want to keep it.

### Does Chamber sell my data?

No. Chamber is open-source and doesn't monetize user data.

### Can I export my data?

Yes! Go to Settings → Export Data to download your expenses and subscriptions as CSV files.

## Still Have Questions?

- Check the [Troubleshooting Guide](./troubleshooting.md)
- Review feature-specific documentation
- Open an issue on GitHub: [Sukhendu2002/Chamber](https://github.com/Sukhendu2002/Chamber)

---

**Last Updated:** April 2026

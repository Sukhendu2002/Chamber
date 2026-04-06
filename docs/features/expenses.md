# Expense Tracking

Chamber helps you track all your expenses in one place. This guide covers everything you need to know about managing expenses.

## Table of Contents

- [Adding an Expense](#adding-an-expense)
- [Editing an Expense](#editing-an-expense)
- [Deleting an Expense](#deleting-an-expense)
- [Uploading Receipts](#uploading-receipts)
- [Categories](#categories)
- [Filtering and Searching](#filtering-and-searching)
- [Understanding the Expense List](#understanding-the-expense-list)
- [Exporting Expenses](#exporting-expenses)

## Adding an Expense

### Via Web App

1. Navigate to **Expenses** in the sidebar
2. Click the "Add Expense" button
3. Fill in the expense details:

**Required Fields:**
- **Amount** - The expense amount (e.g., 50.00)
- **Category** - Select from predefined categories
- **Description** - Brief description of the expense

**Optional Fields:**
- **Merchant** - Where you made the purchase
- **Date** - Defaults to today, but can be changed
- **Payment Method** - Select from your accounts (if set up)
- **Receipt** - Upload an image or PDF

4. Click "Save" to add the expense

### Via Telegram Bot

Once your Telegram account is linked (see [Telegram Bot Guide](./telegram-bot.md)):

**Text Messages:**
Simply send a message describing the expense:
- "Spent $45 on lunch at Subway"
- "Paid $120 for electricity bill"
- "Uber ride $23.50"

The AI will automatically extract:
- Amount
- Category
- Description
- Merchant (if mentioned)

**Receipt Photos:**
Send a photo of a receipt, and the AI will extract:
- Total amount
- Merchant name
- Date
- Individual items (sometimes)

**PDF Receipts:**
Send PDF files, and the text will be extracted for processing.

## Editing an Expense

1. Go to **Expenses**
2. Find the expense you want to edit
3. Click on the expense row or the edit icon
4. Update the fields you want to change
5. Click "Save"

**Note:** Editing an expense updates it immediately in all views (dashboard, analytics, etc.).

## Deleting an Expense

1. Go to **Expenses**
2. Find the expense you want to delete
3. Click the delete icon (trash can)
4. Confirm the deletion in the dialog

**Warning:** Deletion is permanent and cannot be undone. Receipts associated with the expense will also be deleted.

## Uploading Receipts

Receipts help you keep records for taxes, reimbursements, or warranties.

### Supported Formats
- **Images:** JPG, JPEG, PNG, WEBP
- **Documents:** PDF

### Uploading

1. When adding or editing an expense, click "Upload Receipt"
2. Select one or more files
3. Wait for upload to complete
4. Save the expense

### Viewing Receipts

1. Go to **Expenses**
2. Expenses with receipts show a receipt icon
3. Click on the expense to view attached receipts
4. Click on a receipt to view full size or download

### Deleting Receipts

1. Open the expense with the receipt
2. Click on the receipt to view it
3. Click the delete icon
4. Confirm deletion

## Categories

Chamber comes with predefined categories:

| Category | Typical Use |
|----------|-------------|
| Food | Groceries, restaurants, food delivery |
| Travel | Transportation, fuel, flights, hotels |
| Entertainment | Movies, games, subscriptions, hobbies |
| Bills | Electricity, water, internet, phone |
| Shopping | Clothing, electronics, household items |
| Health | Medical, pharmacy, gym, wellness |
| Education | Courses, books, tuition, certifications |
| Investments | Stocks, mutual funds, crypto |
| Subscription | Recurring service payments |
| General | Miscellaneous expenses |

**Note:** When you select "Subscription" as a category, you can optionally create a subscription entry for recurring tracking.

## Filtering and Searching

### Date Range Filter

1. Go to **Expenses**
2. Click the "Filter" button
3. Select "Date Range"
4. Choose start and end dates
5. Click "Apply"

### Category Filter

1. Click the "Filter" button
2. Select "Category"
3. Choose one or more categories
4. Click "Apply"

### Search

Use the search bar to find expenses by:
- Description
- Merchant name
- Category
- Amount (partial match)

### Clearing Filters

Click "Clear" or "Reset" to remove all filters and show all expenses.

## Understanding the Expense List

The expense list shows:

- **Date** - When the expense occurred
- **Description** - What the expense was for
- **Category** - Color-coded category badge
- **Amount** - Formatted with your preferred currency
- **Actions** - Edit and delete buttons

### Sorting

Expenses are sorted by date (newest first) by default. Secondary sorting by ID ensures consistent ordering for expenses on the same date.

### Pagination

Expenses are paginated (20 per page). Use the pagination controls at the bottom to navigate.

## Exporting Expenses

You can export your expense data to CSV:

1. Go to **Settings**
2. Scroll to "Export Data"
3. Click "Export Expenses"
4. The CSV will include:
   - Date
   - Description
   - Category
   - Amount
   - Merchant
   - Payment method
   - Receipt URLs (if any)

**Use cases for export:**
- Tax preparation
- Backup your data
- Analysis in spreadsheet software
- Sharing with accountants

## Best Practices

1. **Add expenses immediately** - Don't wait; capture them while fresh
2. **Be descriptive** - Use clear descriptions you'll understand later
3. **Categorize consistently** - Helps with accurate reporting
4. **Upload receipts** - Especially for business expenses or warranties
5. **Review weekly** - Check for missing expenses or miscategorizations
6. **Use payment methods** - Track which account was used

## Related Features

- [Account Management](./accounts.md) - Link expenses to accounts
- [Telegram Bot](./telegram-bot.md) - Add expenses on the go
- [Subscriptions](./subscriptions.md) - Track recurring expenses

---

**Questions?** See the [FAQ](../faq.md) or [Troubleshooting Guide](../troubleshooting.md).

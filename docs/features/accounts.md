# Account Management

Chamber's account management feature helps you track all your financial accounts in one place, monitor balance changes over time, and calculate your net worth.

## Table of Contents

- [Account Types](#account-types)
- [Adding an Account](#adding-an-account)
- [Updating Account Balances](#updating-account-balances)
- [Viewing Balance History](#viewing-balance-history)
- [Editing an Account](#editing-an-account)
- [Deleting an Account](#deleting-an-account)
- [Understanding the Dashboard](#understanding-the-dashboard)
- [Net Worth Calculation](#net-worth-calculation)

## Account Types

Chamber supports five types of accounts:

| Type | Description | Examples |
|------|-------------|----------|
| **Bank** | Traditional bank accounts | Savings account, Checking account, Fixed deposit |
| **Investment** | Investment accounts | Stocks, Mutual funds, ETFs, Crypto |
| **Wallet** | Digital wallets | PayPal, Venmo, Apple Pay, Google Pay |
| **Cash** | Physical cash | Wallet cash, Emergency cash, Petty cash |
| **Other** | Miscellaneous | Gift cards, Store credits, IOUs |

## Adding an Account

1. Navigate to **Accounts** in the sidebar
2. Click "Add Account"
3. Fill in the details:

**Required Fields:**
- **Name** - A descriptive name (e.g., "SBI Savings", "Stock Portfolio")
- **Type** - Select from the five account types
- **Current Balance** - The current balance in this account

**Optional Fields:**
- **Currency** - Defaults to your settings, but can be different per account

4. Click "Save"

**Tip:** Create accounts for all your financial holdings to get an accurate net worth calculation.

## Updating Account Balances

Keeping account balances current is important for accurate net worth tracking.

### Manual Update

1. Go to **Accounts**
2. Click on the account you want to update
3. Click "Update Balance"
4. Enter:
   - **New Balance** - The current balance
   - **Date** - When this balance is from (defaults to today)
   - **Note** - Optional note (e.g., "Monthly update", "After deposit")
5. Click "Save"

### Why Track Balance History?

Each balance update creates a historical record. This allows you to:
- See balance trends over time
- View graphs of your financial growth
- Track investment performance
- Monitor spending from specific accounts

### Best Practices

- **Bank accounts:** Update weekly or after major transactions
- **Investments:** Update monthly or when significant changes occur
- **Cash:** Update as needed (weekly or monthly)
- **Wallets:** Update when balances change significantly

## Viewing Balance History

1. Go to **Accounts**
2. Click on any account
3. View the "Balance History" section

Each entry shows:
- **Date** - When the balance was recorded
- **Balance** - The balance at that time
- **Change** - Difference from previous entry
- **Note** - Any notes you added

### Balance History Graph

The graph on the main Dashboard and Accounts page shows:
- **X-axis** - Time (months)
- **Y-axis** - Balance
- **Lines** - Different account types (Bank, Investment, etc.)
- **Stacked Area** - Combined view of all accounts

**Tip:** Hover over the graph to see exact values for specific dates.

### Deleting Balance History Entries

If you made a mistake:

1. Open the account
2. Find the incorrect history entry
3. Click the delete icon
4. Confirm deletion

**Note:** Deleting a history entry does not delete the account or affect other entries.

## Editing an Account

1. Go to **Accounts**
2. Find the account you want to edit
3. Click "Edit" or the edit icon
4. Update:
   - Name
   - Type (rarely needed)
   - Current balance (creates a new history entry)
5. Click "Save"

**Note:** Changing the current balance creates a new history entry with today's date.

## Deleting an Account

**Warning:** Deleting an account is permanent and affects your data.

When you delete an account:
- All balance history is deleted
- The account no longer appears in net worth calculations
- Associated expenses are NOT deleted (but payment method references may become orphaned)

### Steps:

1. Go to **Accounts**
2. Find the account
3. Click "Delete"
4. Confirm deletion

**Alternative:** If you no longer use an account but want to keep history, you can deactivate it (if available) rather than delete.

## Understanding the Dashboard

### Stats Cards

The Accounts page displays summary cards:

| Card | Description |
|------|-------------|
| **Net Worth** | Assets minus credit-card liabilities |
| **Card Debt** | Total current credit-card outstanding |
| **Bank Balance** | Sum of all Bank-type accounts |
| **Investments** | Sum of all Investment-type accounts |
| **Wallet** | Sum of all Wallet-type accounts |
| **Cash** | Sum of all Cash-type accounts |

### Account List

Shows all your accounts with:
- Account name and type
- Current balance
- Last updated date
- Edit/Delete actions

## Net Worth Calculation

Your net worth is calculated as:

```
Net Worth = Total assets - Credit-card outstanding
```

This includes:
- ✅ Bank accounts
- ✅ Investments
- ✅ Digital wallets
- ✅ Cash
- ✅ Other accounts
- ➖ Credit-card outstanding as a liability
- ➕ Credit-card overpayments/refunds as card credit

### Net Worth Dashboard Widget

The main Dashboard shows:
- **Current Net Worth** - Total across all accounts
- **Trend** - How net worth has changed over time
- **Graph** - Visual representation of net worth history

### Factors Affecting Net Worth

Your net worth changes when:
- You update any account balance
- You add or delete accounts
- Investment values fluctuate (update manually)
- You record an expense against an account

Paying a credit-card bill does not change net worth: the source account and the
card liability decrease by the same amount.

## Best Practices

1. **Add all accounts** - Include every financial account for accurate net worth
2. **Update regularly** - Weekly for bank accounts, monthly for investments
3. **Be consistent** - Use clear, descriptive names
4. **Track investments separately** - Don't mix with bank accounts
5. **Review trends** - Check the graph monthly to see your progress
6. **Archive inactive accounts** - Rather than deleting, keep for historical records

## Integration with Other Features

### Expense Tracking

When adding expenses:
- Select the account under **Paid with**
- Bank, wallet, and cash expenses reduce that asset balance immediately
- Credit-card expenses increase current card outstanding without changing a bank balance
- Use **Pay card** on the Accounts page when money leaves your bank account
- A card payment is a transfer and is not counted as a second expense

### Credit-card example

For a ₹10,000 credit-card purchase:

1. Chamber records ₹10,000 of spending on the purchase date.
2. Card outstanding increases by ₹10,000.
3. The bank account remains unchanged.
4. When **Pay card** is used, the bank balance and card outstanding both decrease.
5. Spending remains ₹10,000; the payment is not counted again.

`Current outstanding` includes all posted card purchases. Statement balances,
minimum payments, and due dates will be tracked separately in a future statement
workflow.

### Loan Tracking

Loans you've given are tracked separately and not included in net worth calculations until repaid.

## Related Features

- [Expense Tracking](./expenses.md) - Track spending from your accounts
- [Loan Tracking](./loans.md) - Monitor money you've lent
- [Dashboard](./../getting-started.md#understanding-your-dashboard) - View net worth overview

---

**Questions?** See the [FAQ](../faq.md) or [Troubleshooting Guide](../troubleshooting.md).

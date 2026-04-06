# Subscription Management

Chamber helps you track recurring subscriptions and sends alerts before payments are due.

## Table of Contents

- [What are Subscriptions?](#what-are-subscriptions)
- [Adding a Subscription](#adding-a-subscription)
- [Understanding Billing Cycles](#understanding-billing-cycles)
- [Subscription Alerts](#subscription-alerts)
- [Viewing Subscriptions](#viewing-subscriptions)
- [Editing a Subscription](#editing-a-subscription)
- [Deleting a Subscription](#deleting-a-subscription)
- [Calendar View](#calendar-view)
- [Best Practices](#best-practices)

## What are Subscriptions?

Subscriptions in Chamber track recurring payments for:
- Streaming services (Netflix, Spotify, etc.)
- Software subscriptions
- Gym memberships
- Cloud storage
- Insurance premiums
- Any regular recurring payment

**Key Features:**
- Automatic expense creation on billing dates
- Alerts before payments are due
- Calendar view of upcoming bills
- Track spending on subscriptions

## Adding a Subscription

1. Navigate to **Subscriptions** in the sidebar
2. Click "Add Subscription"
3. Fill in the details:

**Required Fields:**
- **Name** - Service name (e.g., "Netflix", "Gym Membership")
- **Amount** - Cost per billing cycle
- **Billing Cycle** - How often you're charged
- **Next Billing Date** - When the next payment is due

**Optional Fields:**
- **Description** - Additional details
- **Alert Days** - Days before due date to send alert (default: 7)

4. Click "Save"

### Billing Cycle Options

| Cycle | Description | Example |
|-------|-------------|---------|
| **Weekly** | Every 7 days | Weekly meal kits |
| **Monthly** | Every month | Netflix, Spotify |
| **Quarterly** | Every 3 months | Some software |
| **Yearly** | Every 12 months | Annual plans, insurance |
| **One-time** | Single payment | One-time purchase |**

**Note:** One-time subscriptions automatically deactivate after the billing date and create a single expense.

## Understanding Billing Cycles

### How It Works

Chamber tracks subscriptions based on the billing cycle:

**Example - Monthly Subscription:**
- Next Billing: March 15, 2024
- Billing Cycle: Monthly
- Chamber creates an expense on March 15
- Next billing automatically updates to April 15, 2024

**Example - Yearly Subscription:**
- Next Billing: January 1, 2024
- Billing Cycle: Yearly
- Chamber creates an expense on January 1
- Next billing updates to January 1, 2025

### Automatic Expense Creation

When a subscription's billing date arrives:
- An expense is automatically created
- Category: "Subscription"
- Description: "[Subscription Name] - Subscription Payment"
- Amount: Subscription amount
- Date: Billing date

### One-Time Subscriptions

For single payments:
- Creates one expense on the billing date
- Automatically deactivates after
- Useful for tracking one-time software purchases

## Subscription Alerts

Chamber can send alerts before subscriptions are due.

### How Alerts Work

1. Chamber checks daily for upcoming subscriptions
2. Sends alerts based on your "Alert Days" setting
3. Alerts are sent via Telegram (if linked)

**Example:**
- Subscription due: March 15
- Alert days: 3
- Alert sent: March 12

### Setting Up Alerts

To receive alerts:

1. Link your Telegram account (see [Telegram Bot Guide](./telegram-bot.md))
2. Set "Alert Days" when creating/editing subscriptions
3. Alerts will be sent automatically

### Alert Message Format

```
🔔 Subscription Alert

Netflix ($15.99) is due in 3 days on March 15, 2024.

Your monthly subscriptions total: $45.97
```

## Viewing Subscriptions

The Subscriptions page shows:

### List View
- All active subscriptions
- Name, amount, and billing cycle
- Next billing date
- Days until next payment
- Status indicator

### Calendar View
Visual calendar showing:
- All subscription due dates
- Amount for each subscription
- Color-coded by cycle type
- Month navigation

**Switch Views:**
- Click "List" or "Calendar" tabs to change view

### Sorting

Subscriptions are sorted by next billing date (soonest first).

## Editing a Subscription

1. Go to **Subscriptions**
2. Find the subscription
3. Click "Edit"
4. Update any fields:
   - Name
   - Amount (if price changed)
   - Billing cycle
   - Next billing date
   - Alert days
5. Click "Save"

**Common Scenarios:**

**Price Increase:**
- Edit the amount to the new price
- Future expenses will use the new amount

**Billing Date Change:**
- Update the next billing date
- Future dates calculate from this new date

**Pause Subscription:**
- Currently, delete and re-add when resuming
- (Feature request: Pause functionality)

## Deleting a Subscription

1. Go to **Subscriptions**
2. Find the subscription
3. Click "Delete"
4. Confirm deletion

**What Happens:**
- Subscription stops appearing in the list
- No future expenses are created
- Past expenses remain in your expense history
- Alerts stop being sent

**Note:** Deletion doesn't affect past expenses already created.

## Calendar View

The calendar provides a visual overview of your subscription schedule.

### Features

- **Month View** - See all subscriptions for a month
- **Due Date Highlighting** - Subscriptions shown on their due date
- **Amount Display** - Cost shown for each subscription
- **Navigation** - Move between months
- **Today Button** - Jump to current month

### Using the Calendar

1. Go to **Subscriptions**
2. Click "Calendar" tab
3. Navigate to desired month
4. Click on any subscription to view/edit

**Tip:** Use the calendar to plan your monthly budget around subscription due dates.

## Best Practices

1. **Add subscriptions immediately** - After signing up for a new service
2. **Set alert days** - 3-7 days is a good default
3. **Review monthly** - Check for services you no longer use
4. **Track all subscriptions** - Include small amounts ($5/month adds up)
5. **Use descriptive names** - "Netflix - Premium" not just "Netflix"
6. **Link Telegram** - Get convenient mobile alerts
7. **Update when prices change** - Keep amounts accurate

## Subscription Spending Insights

### Monthly Subscription Total

Chamber calculates your total monthly subscription spending:

**Example:**
- Netflix: $15.99/month
- Spotify: $9.99/month
- Gym: $50/month
- Cloud Storage: $9.99/month
- **Total: $85.97/month**

### Annual Cost Projection

To see yearly costs:
- Monthly subscriptions × 12
- Quarterly subscriptions × 4
- Yearly subscriptions × 1
- Sum them up

**Why Track This:**
- Know your fixed monthly obligations
- Identify subscriptions to cancel
- Budget more accurately

## Integration with Expenses

### Automatic Creation

When a subscription billing date arrives, Chamber:
1. Creates an expense automatically
2. Category: "Subscription"
3. Shows in expense list and dashboard
4. Included in monthly spending totals

### Manual Creation

You can also manually create subscription expenses:
1. Add expense
2. Category: "Subscription"
3. Description: Service name

This is useful for one-off subscription charges.

## Related Features

- [Expense Tracking](./expenses.md) - View subscription expenses
- [Telegram Bot](./telegram-bot.md) - Receive alerts on mobile
- [Dashboard](./../getting-started.md#understanding-your-dashboard) - See subscription spending in charts

---

**Questions?** See the [FAQ](../faq.md) or [Troubleshooting Guide](../troubleshooting.md).

# Loan Tracking

Chamber's loan tracking feature helps you monitor money you've lent to others, track repayments, and manage outstanding balances.

## Table of Contents

- [What is Loan Tracking?](#what-is-loan-tracking)
- [Adding a Loan](#adding-a-loan)
- [Understanding Loan Status](#understanding-loan-status)
- [Adding Repayments](#adding-repayments)
- [Viewing Loan Details](#viewing-loan-details)
- [Editing a Loan](#editing-a-loan)
- [Deleting a Loan](#deleting-a-loan)
- [Receipts for Loans](#receipts-for-loans)
- [Best Practices](#best-practices)

## What is Loan Tracking?

Loan tracking in Chamber helps you:
- Record money you've lent to friends, family, or others
- Track partial repayments over time
- Monitor outstanding balances
- Store receipts or agreements as proof
- Know when loans are overdue

**Note:** This tracks money you've **lent out** (people owe you), not money you've borrowed.

## Adding a Loan

1. Navigate to **Loans** in the sidebar
2. Click "Add Loan"
3. Fill in the loan details:

**Required Fields:**
- **Borrower Name** - Who borrowed the money
- **Amount** - Total amount lent
- **Currency** - Defaults to your settings

**Optional Fields:**
- **Description** - Purpose of the loan (e.g., "Car repair", "Emergency")
- **Due Date** - When the loan should be repaid
- **Receipts** - Upload any proof (IOU, agreement, transfer receipt)

4. Click "Save"

The loan will be created with status **PENDING**.

## Understanding Loan Status

Loans automatically progress through three statuses:

| Status | Description | When It Applies |
|--------|-------------|-----------------|
| **PENDING** | No repayments yet | Loan just created |
| **PARTIAL** | Some amount repaid | Repayments < Total amount |
| **COMPLETED** | Fully repaid | Repayments = Total amount |

### Status Transitions

```
PENDING → PARTIAL → COMPLETED
   ↓         ↓          ↓
 0 repaid  Partial    Full
```

**Automatic Updates:**
- Status changes automatically as you add repayments
- No manual status changes needed

## Adding Repayments

When the borrower pays you back:

1. Go to **Loans**
2. Find the loan
3. Click on the loan or "View Details"
4. Click "Add Repayment"
5. Fill in repayment details:

**Required:**
- **Amount** - How much was repaid
- **Date** - When payment was received

**Optional:**
- **Note** - Any details (e.g., "Cash payment", "Bank transfer")
- **Receipt** - Proof of repayment

6. Click "Save"

### Partial Repayments

You can add multiple repayments for the same loan:

**Example:**
- Loan amount: $500
- Repayment 1: $200 (Status: PARTIAL)
- Repayment 2: $150 (Status: PARTIAL)
- Repayment 3: $150 (Status: COMPLETED)

### Overpayment

If the borrower pays more than owed:
- The system will accept the repayment
- The remaining amount will show as negative (overpaid)
- You may want to record the excess as a new loan or expense

## Viewing Loan Details

Click on any loan to see:

### Summary Card
- **Total Amount** - Original loan amount
- **Repaid** - Total amount paid back
- **Remaining** - Amount still owed
- **Progress Bar** - Visual representation of repayment
- **Status** - PENDING, PARTIAL, or COMPLETED

### Repayment History
Lists all repayments with:
- Date
- Amount
- Notes
- Receipts (if any)
- Delete option

### Overdue Indicators

Loans past their due date show:
- **Red highlighting** on the loan card
- **Overdue badge** in the list
- Days overdue calculation

## Editing a Loan

1. Go to **Loans**
2. Find the loan
3. Click "Edit"
4. Update fields:
   - Borrower name
   - Amount (be careful - affects repayments)
   - Description
   - Due date
5. Click "Save"

**Note:** Changing the loan amount doesn't automatically adjust repayments. You may need to edit repayments separately.

## Deleting a Loan

**Warning:** Deletion is permanent.

When you delete a loan:
- All repayment records are deleted
- Associated receipts are deleted
- The action cannot be undone

### Steps:

1. Go to **Loans**
2. Find the loan
3. Click "Delete"
4. Confirm deletion

**Alternative:** If the loan is completed and you want to keep history, leave it as-is. Completed loans don't affect your active tracking.

## Receipts for Loans

You can attach receipts to both loans and repayments.

### Types of Receipts

**For Loans:**
- Bank transfer confirmations
- IOU or written agreements
- Screenshots of payment apps
- Any proof of lending

**For Repayments:**
- Cash received confirmations
- Bank deposit receipts
- Payment app screenshots
- Any proof of repayment

### Uploading Receipts

1. When adding/editing a loan or repayment
2. Click "Upload Receipt"
3. Select image or PDF
4. Save

### Viewing Receipts

1. Open the loan details
2. Click on the receipt thumbnail
3. View full-size or download

## Dashboard Stats

The Loans page shows summary statistics:

| Stat | Description |
|------|-------------|
| **Total Lent** | Sum of all loan amounts |
| **Outstanding** | Amount not yet repaid |
| **Pending** | Number of PENDING loans |
| **Completed** | Number of COMPLETED loans |

## Best Practices

1. **Document everything** - Always upload receipts or agreements
2. **Set due dates** - Helps track overdue loans
3. **Record repayments promptly** - Keep status accurate
4. **Be specific with descriptions** - "Car repair - March 2024" vs just "Loan"
5. **Use full names** - "John Smith" not "John"
6. **Check regularly** - Review outstanding loans weekly
7. **Follow up on overdue** - Contact borrowers when loans are past due

## Integration with Expenses

**Important:** Loans are tracked separately from expenses.

- Lending money does **not** create an expense
- Receiving repayment does **not** create income
- This keeps your expense tracking accurate

If you want to track the loan as an expense:
1. Create an expense when you lend the money
2. Create income when repaid
3. Use the loan tracker in parallel for detailed repayment tracking

## Related Features

- [Expense Tracking](./expenses.md) - Track regular spending
- [Account Management](./accounts.md) - Update account balances when money moves
- [Receipts](./expenses.md#uploading-receipts) - General receipt documentation

---

**Questions?** See the [FAQ](../faq.md) or [Troubleshooting Guide](../troubleshooting.md).

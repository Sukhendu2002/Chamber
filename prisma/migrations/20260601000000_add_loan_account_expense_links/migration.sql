-- Add optional links between loans, their source accounts, and ledger expenses.
-- All columns are nullable so existing records remain unchanged.
ALTER TABLE "Loan"
ADD COLUMN "accountId" TEXT;

ALTER TABLE "Expense"
ADD COLUMN "loanId" TEXT,
ADD COLUMN "repaymentId" TEXT;

CREATE INDEX "Loan_accountId_idx" ON "Loan"("accountId");
CREATE INDEX "Expense_loanId_idx" ON "Expense"("loanId");
CREATE INDEX "Expense_repaymentId_idx" ON "Expense"("repaymentId");

ALTER TABLE "Loan"
ADD CONSTRAINT "Loan_accountId_fkey"
FOREIGN KEY ("accountId") REFERENCES "Account"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Expense"
ADD CONSTRAINT "Expense_loanId_fkey"
FOREIGN KEY ("loanId") REFERENCES "Loan"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Expense"
ADD CONSTRAINT "Expense_repaymentId_fkey"
FOREIGN KEY ("repaymentId") REFERENCES "Repayment"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

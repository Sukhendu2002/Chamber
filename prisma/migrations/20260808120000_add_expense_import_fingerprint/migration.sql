ALTER TABLE "Expense"
ADD COLUMN "importFingerprint" TEXT;

CREATE UNIQUE INDEX "Expense_userId_importFingerprint_key"
ON "Expense"("userId", "importFingerprint");

-- Classify transfers so credit-card payments are distinct from spending and
-- protect payment retries from applying the same balance mutation twice.
CREATE TYPE "TransferKind" AS ENUM (
    'ACCOUNT_TRANSFER',
    'CREDIT_CARD_PAYMENT',
    'CASH_ADVANCE'
);

ALTER TABLE "Transfer"
ADD COLUMN "kind" "TransferKind" NOT NULL DEFAULT 'ACCOUNT_TRANSFER',
ADD COLUMN "idempotencyKey" TEXT;

CREATE INDEX "Transfer_kind_idx" ON "Transfer"("kind");

CREATE UNIQUE INDEX "Transfer_userId_idempotencyKey_key"
ON "Transfer"("userId", "idempotencyKey");

const LIABILITY_ACCOUNT_TYPES = new Set(["CREDIT_CARD"]);

const CREDIT_CARD_PAYMENT_SOURCE_TYPES = new Set([
  "BANK",
  "WALLET",
  "CASH",
  "DEBIT_CARD",
  "OTHER",
]);

export function isLiabilityAccount(accountType: string): boolean {
  return LIABILITY_ACCOUNT_TYPES.has(accountType);
}

export function isCreditCard(accountType: string): boolean {
  return accountType === "CREDIT_CARD";
}

export function isCreditCardPaymentSource(accountType: string): boolean {
  return CREDIT_CARD_PAYMENT_SOURCE_TYPES.has(accountType);
}

export function getNetWorthContribution(accountType: string, balance: number): number {
  return isLiabilityAccount(accountType) ? -balance : balance;
}

export function getExpenseBalanceAdjustment(accountType: string, amount: number): number {
  return isLiabilityAccount(accountType) ? amount : -amount;
}

export function getTransferBalanceAdjustment(
  accountType: string,
  direction: "from" | "to",
  amount: number,
): number {
  if (isLiabilityAccount(accountType)) {
    return direction === "from" ? amount : -amount;
  }

  return direction === "from" ? -amount : amount;
}

export function getCreditCardOutstanding(balance: number): number {
  return Math.max(balance, 0);
}

export function getCreditCardCredit(balance: number): number {
  return Math.max(-balance, 0);
}

export function getAvailableCredit(balance: number, creditLimit: number | null): number | null {
  if (creditLimit === null) return null;
  return creditLimit - balance;
}

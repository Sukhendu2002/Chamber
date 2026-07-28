import { describe, expect, it } from "vitest";
import {
  getAvailableCredit,
  getCreditCardCredit,
  getCreditCardOutstanding,
  getExpenseBalanceAdjustment,
  getNetWorthContribution,
  getTransferBalanceAdjustment,
  isCreditCardPaymentSource,
} from "@/lib/accounting";

describe("accounting helpers", () => {
  it("treats credit-card balances as liabilities in net worth", () => {
    expect(getNetWorthContribution("BANK", 100_000)).toBe(100_000);
    expect(getNetWorthContribution("CREDIT_CARD", 10_000)).toBe(-10_000);
    expect(getNetWorthContribution("CREDIT_CARD", -500)).toBe(500);
  });

  it("increases card debt on purchase without using asset semantics", () => {
    expect(getExpenseBalanceAdjustment("BANK", 1_000)).toBe(-1_000);
    expect(getExpenseBalanceAdjustment("CREDIT_CARD", 1_000)).toBe(1_000);
  });

  it("uses opposite transfer directions for assets and liabilities", () => {
    expect(getTransferBalanceAdjustment("BANK", "from", 1_000)).toBe(-1_000);
    expect(getTransferBalanceAdjustment("BANK", "to", 1_000)).toBe(1_000);
    expect(getTransferBalanceAdjustment("CREDIT_CARD", "from", 1_000)).toBe(1_000);
    expect(getTransferBalanceAdjustment("CREDIT_CARD", "to", 1_000)).toBe(-1_000);
  });

  it("separates card outstanding from card credit", () => {
    expect(getCreditCardOutstanding(2_500)).toBe(2_500);
    expect(getCreditCardCredit(2_500)).toBe(0);
    expect(getCreditCardOutstanding(-750)).toBe(0);
    expect(getCreditCardCredit(-750)).toBe(750);
  });

  it("calculates available credit and eligible payment sources", () => {
    expect(getAvailableCredit(10_000, 50_000)).toBe(40_000);
    expect(getAvailableCredit(-1_000, 50_000)).toBe(51_000);
    expect(getAvailableCredit(0, null)).toBeNull();
    expect(isCreditCardPaymentSource("BANK")).toBe(true);
    expect(isCreditCardPaymentSource("INVESTMENT")).toBe(false);
    expect(isCreditCardPaymentSource("CREDIT_CARD")).toBe(false);
  });
});

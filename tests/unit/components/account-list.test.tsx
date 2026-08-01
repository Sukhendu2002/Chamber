import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AccountList } from "@/components/account-list";

vi.mock("@/lib/actions/accounts", () => ({
  deleteAccount: vi.fn(),
  deleteBalanceHistory: vi.fn(),
  getAccountWithHistory: vi.fn(),
  toggleIncludeInNetWorth: vi.fn(),
  toggleShowOnTelegram: vi.fn(),
  updateAccount: vi.fn(),
  updateBalance: vi.fn(),
}));

vi.mock("@/components/credit-card-payment-dialog", () => ({
  CreditCardPaymentDialog: () => null,
}));

const accounts = [
  {
    id: "bank-account",
    name: "Primary checking",
    type: "BANK" as const,
    currentBalance: 50_000,
    creditLimit: null,
    description: null,
    isActive: true,
    showOnTelegram: true,
    includeInNetWorth: true,
    balanceHistory: [],
  },
  {
    id: "debit-card",
    name: "Daily debit card",
    type: "DEBIT_CARD" as const,
    currentBalance: 5_000,
    creditLimit: null,
    description: null,
    isActive: true,
    showOnTelegram: true,
    includeInNetWorth: true,
    balanceHistory: [],
  },
  {
    id: "credit-card",
    name: "Travel card",
    type: "CREDIT_CARD" as const,
    currentBalance: 2_500,
    creditLimit: 100_000,
    description: null,
    isActive: true,
    showOnTelegram: true,
    includeInNetWorth: true,
    balanceHistory: [],
  },
  {
    id: "wallet",
    name: "Pocket wallet",
    type: "WALLET" as const,
    currentBalance: 1_200,
    creditLimit: null,
    description: null,
    isActive: true,
    showOnTelegram: true,
    includeInNetWorth: true,
    balanceHistory: [],
  },
];

describe("AccountList", () => {
  it("starts collapsed and reveals a group's accounts and total when expanded", () => {
    render(<AccountList accounts={accounts} currency="INR" />);

    const bankingToggles = screen.getAllByRole("button", { name: /Banking/ });
    expect(bankingToggles).toHaveLength(2);
    expect(bankingToggles[0].getAttribute("aria-expanded")).toBe("false");
    expect(bankingToggles[0].textContent).toContain("₹••••••");
    expect(screen.queryByText("Primary checking")).toBeNull();

    fireEvent.click(bankingToggles[0]);

    expect(screen.getAllByText("Primary checking")).toHaveLength(2);
    expect(bankingToggles[0].getAttribute("aria-expanded")).toBe("true");
    expect(bankingToggles[0].textContent).toContain("₹55,000");
    expect(screen.queryByText("Travel card")).toBeNull();
  });

  it("expands and collapses every populated group at once", () => {
    render(<AccountList accounts={accounts} currency="INR" />);

    expect(screen.queryByText("Primary checking")).toBeNull();
    expect(screen.queryByText("Travel card")).toBeNull();
    expect(
      screen.getAllByRole("button", { name: /Credit cards/ })[0].getAttribute(
        "aria-expanded"
      )
    ).toBe("false");

    fireEvent.click(screen.getByRole("button", { name: "Expand all" }));

    expect(screen.getAllByText("Primary checking")).toHaveLength(2);
    expect(screen.getAllByText("Travel card")).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "Collapse all" }));

    expect(screen.queryByText("Primary checking")).toBeNull();
    expect(screen.queryByText("Travel card")).toBeNull();
  });
});

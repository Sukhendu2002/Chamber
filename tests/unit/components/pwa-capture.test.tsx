import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PwaCapture } from "@/components/pwa-capture";

vi.mock("@/lib/actions/expenses", () => ({
  createExpense: vi.fn(),
}));

const accounts = [
  {
    id: "a1111111-1111-1111-a111-111111111111",
    name: "Daily account",
    type: "BANK",
    currentBalance: 1000,
    creditLimit: null,
  },
];

const categories = [
  { id: "food", name: "Food" },
  { id: "general", name: "General" },
];

describe("PwaCapture", () => {
  it("shows the Android screenshot sharing workflow by default", () => {
    render(
      <PwaCapture
        accounts={accounts}
        categories={categories}
        currency="INR"
        initialMode="screenshot"
      />,
    );

    expect(screen.getByLabelText("Capture method")).toBeTruthy();
    expect(screen.getByText("Choose a payment screenshot")).toBeTruthy();
    expect(screen.getByLabelText("Payment screenshot").getAttribute("accept")).toBe(
      "image/jpeg,image/png,image/webp",
    );
  });

  it("renders a labelled, touch-friendly manual expense form", () => {
    render(
      <PwaCapture
        accounts={accounts}
        categories={categories}
        currency="INR"
        initialMode="manual"
      />,
    );

    expect(screen.getByLabelText("Amount *").getAttribute("inputmode")).toBe("decimal");
    expect(screen.getByLabelText("Merchant")).toBeTruthy();
    expect(screen.getByLabelText("Description")).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: "Save expense" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
  });
});

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ReceiptGallery } from "@/components/receipt-gallery";
import type { ReceiptExpense } from "@/lib/actions/receipts";

const expenses: ReceiptExpense[] = [
  ["railways", "Indian Railways UTS", "Travel", 100, "2026-08-01", 1],
  ["maintenance", "Kolkata flat maintenance", "Bills", 3_500, "2026-07-31", 1],
  ["photography", "Wedding photography", "Bills", 28_000, "2026-07-30", 2],
  ["amazon", "Amazon", "Shopping", 943, "2026-07-30", 1],
  ["lunch", "Lunch at Oudh", "Food", 1_260, "2026-07-28", 1],
  ["grocery", "Grocery run", "General", 2_480, "2026-07-24", 1],
  ["electricity", "Electricity bill", "Bills", 1_860, "2026-07-20", 1],
  ["fuel", "Indian Oil", "Travel", 2_000, "2026-07-18", 1],
  ["hotel", "Weekend hotel", "Travel", 5_600, "2026-07-14", 1],
].map(([id, merchant, category, amount, date, receiptCount]) => ({
  id: String(id),
  merchant: String(merchant),
  description: null,
  category: String(category),
  amount: Number(amount),
  date: new Date(String(date)),
  receiptCount: Number(receiptCount),
  thumbnailIsPdf: false,
  thumbnailUrl: `/receipt-${String(id)}.png`,
}));

describe("ReceiptGallery", () => {
  it("switches views and updates the selected receipt preview", () => {
    render(
      <ReceiptGallery
        expenses={expenses}
        currency="INR"
        currentSearch=""
        currentCategory=""
      />
    );

    const listView = screen.getByRole("button", { name: "List view" });
    const gridView = screen.getByRole("button", { name: "Grid view" });

    expect(listView.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("10")).toBeTruthy();

    fireEvent.click(gridView);
    fireEvent.click(
      screen.getByRole("button", {
        name: "Kolkata flat maintenance Bills₹3,500",
      })
    );

    expect(gridView.getAttribute("aria-pressed")).toBe("true");
    expect(
      screen.getByRole("heading", {
        level: 3,
        name: "Kolkata flat maintenance",
      })
    ).toBeTruthy();
  });

  it("paginates compact receipt results and selects the first visible item", () => {
    render(
      <ReceiptGallery
        expenses={expenses}
        currency="INR"
        currentSearch=""
        currentCategory=""
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Grid view" }));
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));

    expect(screen.getByText("9–9 of 9 items")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Weekend hotel Travel₹5,600" })
        .getAttribute("aria-pressed")
    ).toBe("true");
    expect(
      screen.getByRole("heading", { level: 3, name: "Weekend hotel" })
    ).toBeTruthy();
  });
});

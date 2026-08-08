import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DataTransferWorkspace } from "@/components/data-transfer-workspace";

vi.mock("@/lib/actions/data-transfer", () => ({
  previewExpenseImport: vi.fn(),
  importExpensesFromCsv: vi.fn(),
}));

const context = {
  accounts: [
    {
      id: "a1111111-1111-4111-8111-111111111111",
      name: "Checking",
      type: "BANK",
    },
  ],
  categories: ["General"],
};

describe("DataTransferWorkspace", () => {
  it("presents selective export controls with encryption disclosure", () => {
    render(<DataTransferWorkspace context={context} />);

    expect(screen.getByRole("heading", { name: "Build an export" })).toBeTruthy();
    expect(screen.getAllByRole("checkbox")).toHaveLength(11);
    expect(screen.getByText("AES-256-GCM encryption; your password is never stored.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Download export" })).toBeTruthy();
  });

  it("exposes the accessible CSV import flow", () => {
    render(<DataTransferWorkspace context={context} />);

    const importTab = screen.getByRole("tab", { name: "Import expenses" });
    fireEvent.mouseDown(importTab, { button: 0, ctrlKey: false });
    fireEvent.click(importTab);

    expect(screen.getByRole("heading", { name: "Upload expense CSV" })).toBeTruthy();
    expect(screen.getByLabelText("Import progress")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Choose CSV" })).toBeTruthy();
  });
});

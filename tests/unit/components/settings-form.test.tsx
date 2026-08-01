import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SettingsForm } from "@/components/settings-form";
import { DEFAULT_DASHBOARD_WIDGETS } from "@/types/dashboard";

const mocks = vi.hoisted(() => ({
  updateUserSettings: vi.fn(),
  exportExpensesCSV: vi.fn(),
  deleteAllUserData: vi.fn(),
  toggleDemoMode: vi.fn(),
}));

vi.mock("@/lib/actions/settings", () => ({
  updateUserSettings: mocks.updateUserSettings,
  exportExpensesCSV: mocks.exportExpensesCSV,
  deleteAllUserData: mocks.deleteAllUserData,
}));

vi.mock("@/components/demo-mode-provider", () => ({
  useDemoMode: () => ({
    isDemoMode: false,
    toggleDemoMode: mocks.toggleDemoMode,
  }),
}));

vi.mock("@/components/theme-selector", () => ({
  ThemeSelector: () => <div data-testid="theme-selector">Theme selector</div>,
}));

const INITIAL_SETTINGS = {
  monthlyBudget: 50000,
  currency: "INR",
  timezone: "Asia/Kolkata",
  dashboardWidgets: DEFAULT_DASHBOARD_WIDGETS,
  forecastHorizonMonths: 6,
  savingsTargetPercent: 20,
  monthlyIncome: 80000,
  salaryDay: 1,
};

describe("SettingsForm", () => {
  beforeEach(() => {
    mocks.updateUserSettings.mockResolvedValue({});
  });

  it("renders the compact settings sections and status", () => {
    render(<SettingsForm initialSettings={INITIAL_SETTINGS} />);

    expect(screen.getByRole("heading", { name: "Settings" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Money & region" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Forecasting" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Dashboard widgets" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Appearance" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Expense categories" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Your data" })).toBeTruthy();
    expect(screen.getByText("All changes saved")).toBeTruthy();
    expect(screen.getAllByRole("switch")).toHaveLength(8);
  });

  it("marks changes as unsaved and saves the current values", async () => {
    render(<SettingsForm initialSettings={INITIAL_SETTINGS} />);

    fireEvent.change(screen.getByLabelText("Monthly budget"), {
      target: { value: "60000" },
    });
    fireEvent.click(
      screen.getByRole("switch", {
        name: "Stats Cards: Total Spent, Transactions, Budget, Remaining",
      })
    );

    expect(screen.getByText("Unsaved changes")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(mocks.updateUserSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          monthlyBudget: 60000,
          dashboardWidgets: expect.objectContaining({ showStats: false }),
        })
      );
    });
    expect(await screen.findByText("All changes saved")).toBeTruthy();
  });

  it("keeps destructive deletion behind a confirmation dialog", () => {
    render(<SettingsForm initialSettings={INITIAL_SETTINGS} />);

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(
      screen.getByRole("heading", { name: "Delete all your data?" })
    ).toBeTruthy();
    expect(mocks.deleteAllUserData).not.toHaveBeenCalled();
  });
});

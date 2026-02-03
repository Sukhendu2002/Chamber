import { test, expect } from "@playwright/test";

/**
 * Note: These tests require authentication.
 * In a real scenario, you would set up test users via Clerk's testing utilities
 * or use a mock authentication setup.
 *
 * For now, these tests are designed to run in an authenticated state.
 * You can configure Playwright to use stored authentication state.
 */

test.describe("Dashboard", () => {
    test.skip("should display dashboard with stats cards", async ({ page }) => {
        // This test requires authentication
        await page.goto("/dashboard");

        // Check for main dashboard elements
        await expect(page.getByRole("heading", { name: /dashboard/i })).toBeVisible();

        // Check for stats cards
        await expect(page.getByText(/total spent/i)).toBeVisible();
        await expect(page.getByText(/transactions/i)).toBeVisible();
        await expect(page.getByText(/budget/i)).toBeVisible();
        await expect(page.getByText(/remaining/i)).toBeVisible();
    });

    test.skip("should display net worth section", async ({ page }) => {
        await page.goto("/dashboard");

        await expect(page.getByText(/net worth/i)).toBeVisible();
        await expect(page.getByText(/balance trend/i)).toBeVisible();
    });

    test.skip("should have add expense button", async ({ page }) => {
        await page.goto("/dashboard");

        const addExpenseButton = page.getByRole("button", { name: /add expense/i });
        await expect(addExpenseButton).toBeVisible();
    });
});

test.describe("Expenses Page", () => {
    test.skip("should display expenses table", async ({ page }) => {
        await page.goto("/expenses");

        // Check page loads
        await expect(page.getByRole("heading", { name: /expenses/i })).toBeVisible();

        // Check for table structure
        await expect(page.getByRole("table")).toBeVisible();
    });

    test.skip("should have filter options", async ({ page }) => {
        await page.goto("/expenses");

        // Check for category filter
        await expect(page.getByText(/category/i)).toBeVisible();

        // Check for date filters
        await expect(page.getByText(/from/i)).toBeVisible();
    });

    test.skip("should open add expense dialog", async ({ page }) => {
        await page.goto("/expenses");

        const addButton = page.getByRole("button", { name: /add expense/i });
        await addButton.click();

        // Dialog should appear
        await expect(page.getByRole("dialog")).toBeVisible();
        await expect(page.getByLabel(/amount/i)).toBeVisible();
        await expect(page.getByLabel(/category/i)).toBeVisible();
    });
});

test.describe("Accounts Page", () => {
    test.skip("should display accounts list", async ({ page }) => {
        await page.goto("/accounts");

        await expect(page.getByRole("heading", { name: /accounts/i })).toBeVisible();

        // Check for stats
        await expect(page.getByText(/net worth/i)).toBeVisible();
    });

    test.skip("should open add account dialog", async ({ page }) => {
        await page.goto("/accounts");

        const addButton = page.getByRole("button", { name: /add account/i });
        await addButton.click();

        await expect(page.getByRole("dialog")).toBeVisible();
        await expect(page.getByLabel(/account name/i)).toBeVisible();
    });
});

test.describe("Loans Page", () => {
    test.skip("should display loans overview", async ({ page }) => {
        await page.goto("/loans");

        await expect(page.getByRole("heading", { name: /loans/i })).toBeVisible();

        // Check for stats cards
        await expect(page.getByText(/total lent/i)).toBeVisible();
        await expect(page.getByText(/outstanding/i)).toBeVisible();
    });

    test.skip("should open add loan dialog", async ({ page }) => {
        await page.goto("/loans");

        const addButton = page.getByRole("button", { name: /add loan/i });
        await addButton.click();

        await expect(page.getByRole("dialog")).toBeVisible();
        await expect(page.getByLabel(/borrower name/i)).toBeVisible();
    });
});

test.describe("Subscriptions Page", () => {
    test.skip("should display subscriptions calendar", async ({ page }) => {
        await page.goto("/subscriptions");

        await expect(
            page.getByRole("heading", { name: /subscriptions/i })
        ).toBeVisible();
    });

    test.skip("should open add subscription dialog", async ({ page }) => {
        await page.goto("/subscriptions");

        const addButton = page.getByRole("button", { name: /add subscription/i });
        await addButton.click();

        await expect(page.getByRole("dialog")).toBeVisible();
    });
});

test.describe("Settings Page", () => {
    test.skip("should display settings form", async ({ page }) => {
        await page.goto("/settings");

        await expect(page.getByRole("heading", { name: /settings/i })).toBeVisible();

        // Check for budget and currency settings
        await expect(page.getByLabel(/monthly budget/i)).toBeVisible();
        await expect(page.getByText(/currency/i)).toBeVisible();
    });

    test.skip("should have export and delete options", async ({ page }) => {
        await page.goto("/settings");

        await expect(page.getByText(/export/i)).toBeVisible();
        await expect(page.getByText(/delete/i)).toBeVisible();
    });
});

test.describe("Navigation", () => {
    test.skip("should have sidebar navigation", async ({ page }) => {
        await page.goto("/dashboard");

        // Check for navigation links
        await expect(page.getByRole("link", { name: /dashboard/i })).toBeVisible();
        await expect(page.getByRole("link", { name: /expenses/i })).toBeVisible();
        await expect(page.getByRole("link", { name: /accounts/i })).toBeVisible();
        await expect(page.getByRole("link", { name: /loans/i })).toBeVisible();
        await expect(
            page.getByRole("link", { name: /subscriptions/i })
        ).toBeVisible();
    });

    test.skip("should navigate between pages", async ({ page }) => {
        await page.goto("/dashboard");

        // Navigate to expenses
        await page.getByRole("link", { name: /expenses/i }).click();
        await expect(page).toHaveURL(/\/expenses/);

        // Navigate to accounts
        await page.getByRole("link", { name: /accounts/i }).click();
        await expect(page).toHaveURL(/\/accounts/);
    });
});

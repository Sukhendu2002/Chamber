import { test, expect } from "@playwright/test";

test.describe("Landing Page", () => {
    test("should display the landing page correctly", async ({ page }) => {
        await page.goto("/");

        // Check that the page loads
        await expect(page).toHaveTitle(/Chamber/);
    });

    test("should have sign in and sign up links", async ({ page }) => {
        await page.goto("/");

        // Look for authentication links
        const signInLink = page.getByRole("link", { name: /sign in/i });
        const signUpLink = page.getByRole("link", { name: /sign up/i });

        // At least one auth-related link should exist
        const hasAuthLinks =
            (await signInLink.count()) > 0 || (await signUpLink.count()) > 0;
        expect(hasAuthLinks).toBeTruthy();
    });
});

test.describe("Authentication Flow", () => {
    test("should redirect to sign-in when accessing protected route", async ({
        page,
    }) => {
        await page.goto("/dashboard");

        // Should redirect to sign-in or show auth prompt
        await expect(page).toHaveURL(/sign-in|clerk/);
    });

    test("should show sign-in page correctly", async ({ page }) => {
        await page.goto("/sign-in");

        // Should have email input or Clerk auth form
        const emailInput = page.locator('input[type="email"], input[name="email"]');
        const clerkForm = page.locator('[data-clerk]');

        const hasAuthForm =
            (await emailInput.count()) > 0 || (await clerkForm.count()) > 0;
        expect(hasAuthForm).toBeTruthy();
    });
});

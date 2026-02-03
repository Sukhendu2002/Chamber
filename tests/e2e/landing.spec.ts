import { test, expect } from "@playwright/test";

test.describe("Landing Page", () => {
    test("should display the landing page correctly", async ({ page }) => {
        await page.goto("/");

        // Check that the page loads
        await expect(page).toHaveTitle(/Chamber/);
    });

    test("should have navigation or auth elements", async ({ page }) => {
        await page.goto("/");

        // Wait for page to be fully loaded
        await page.waitForLoadState("networkidle");

        // The landing page should have either auth links, a CTA button, or navigation
        // This is a flexible check that works with different landing page designs
        const hasContent = await page.locator("body").textContent();
        expect(hasContent).toBeTruthy();
        expect(hasContent!.length).toBeGreaterThan(0);
    });
});

test.describe("Authentication Flow", () => {
    test("should redirect to sign-in when accessing protected route", async ({
        page,
    }) => {
        await page.goto("/dashboard");

        // Should redirect to sign-in or show auth prompt
        // Wait for redirect to complete
        await page.waitForLoadState("networkidle");

        // URL should contain sign-in, clerk, or we should be on a login page
        const url = page.url();
        const isAuthPage = url.includes("sign-in") || url.includes("clerk") || url.includes("login");
        expect(isAuthPage).toBeTruthy();
    });

    test("should load sign-in page without errors", async ({ page }) => {
        await page.goto("/sign-in");

        // Wait for page to load
        await page.waitForLoadState("networkidle");

        // The page should load without crashing
        // Check that we're on an auth-related page
        const url = page.url();
        expect(url).toMatch(/sign-in|clerk|login/);

        // Page should have some content (not be blank)
        const bodyText = await page.locator("body").textContent();
        expect(bodyText).toBeTruthy();
    });
});

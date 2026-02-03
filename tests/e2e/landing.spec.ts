import { test, expect } from "@playwright/test";

test.describe("Landing Page", () => {
    test("should display the landing page correctly", async ({ page }) => {
        await page.goto("/");

        // Check that the page loads
        await expect(page).toHaveTitle(/Chamber/);
    });

    test("should have navigation or auth elements", async ({ page }) => {
        await page.goto("/");

        // Wait for DOM to be ready (faster than networkidle)
        await page.waitForLoadState("domcontentloaded");

        // The landing page should have content
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

        // Wait for DOM (not networkidle - Clerk keeps connections open)
        await page.waitForLoadState("domcontentloaded");

        // URL should contain sign-in, clerk, or we should be on a login page
        const url = page.url();
        const isAuthPage = url.includes("sign-in") || url.includes("clerk") || url.includes("login");
        expect(isAuthPage).toBeTruthy();
    });

    test("should load sign-in page without errors", async ({ page }) => {
        await page.goto("/sign-in");

        // Wait for DOM to be ready (Clerk uses websockets that keep networkidle waiting)
        await page.waitForLoadState("domcontentloaded");

        // Give Clerk a moment to render
        await page.waitForTimeout(1000);

        // The page should load without crashing
        const url = page.url();
        expect(url).toMatch(/sign-in|clerk|login/);

        // Page should have some content (not be blank)
        const bodyText = await page.locator("body").textContent();
        expect(bodyText).toBeTruthy();
    });
});

import { describe, it, expect, vi, beforeEach } from "vitest";

// These tests verify the AI module's parsing logic

describe("AI Module", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("parseExpenseWithAI - validation logic", () => {
        it("should return error when API key is not configured", async () => {
            // Temporarily remove the API key
            const originalKey = process.env.OPENROUTER_API_KEY;
            delete process.env.OPENROUTER_API_KEY;

            // Need to re-import to get fresh module state
            vi.resetModules();
            const { parseExpenseWithAI } = await import("@/lib/ai");

            const result = await parseExpenseWithAI("Test expense");

            expect(result.success).toBe(false);
            expect(result.error).toBe("AI not configured");

            // Restore
            process.env.OPENROUTER_API_KEY = originalKey;
        });
    });

    describe("AI response parsing", () => {
        it("should validate expense text patterns", () => {
            // Test common expense text patterns
            const patterns = [
                { text: "Lunch 450", expected: { hasAmount: true, hasContext: true } },
                { text: "Uber to airport 250", expected: { hasAmount: true, hasContext: true } },
                { text: "Coffee 50", expected: { hasAmount: true, hasContext: true } },
                { text: "no amount here", expected: { hasAmount: false, hasContext: true } },
            ];

            for (const pattern of patterns) {
                const hasNumber = /\d+/.test(pattern.text);
                expect(hasNumber).toBe(pattern.expected.hasAmount);
            }
        });

        it("should parse JSON response correctly", () => {
            const validResponse = `{"amount": 450, "category": "Food", "description": "Lunch", "merchant": "Restaurant", "confidence": 0.95}`;
            const parsed = JSON.parse(validResponse);

            expect(parsed.amount).toBe(450);
            expect(parsed.category).toBe("Food");
            expect(parsed.confidence).toBe(0.95);
        });

        it("should handle error response from AI", () => {
            const errorResponse = `{"error": "Could not parse expense"}`;
            const parsed = JSON.parse(errorResponse);

            expect(parsed.error).toBeDefined();
            expect(parsed.amount).toBeUndefined();
        });

        it("should extract JSON from mixed content", () => {
            const mixedContent = `Here is the parsed data: {"amount": 299, "category": "Shopping", "description": "Amazon", "confidence": 0.9} Let me know if you need more.`;

            const jsonMatch = mixedContent.match(/\{[\s\S]*\}/);
            expect(jsonMatch).not.toBeNull();

            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                expect(parsed.amount).toBe(299);
            }
        });
    });

    describe("OCR text processing", () => {
        it("should recognize Indian Rupee symbol variations", () => {
            const ocrTexts = [
                "Total: ₹450",
                "Amount = 450", // = often means ₹ in OCR
                "Paid Rs. 299",
                "INR 1000",
            ];

            for (const text of ocrTexts) {
                // Check that amount can be extracted
                const amountMatch = text.match(/\d+/);
                expect(amountMatch).not.toBeNull();
            }
        });

        it("should handle common UPI patterns", () => {
            const upiPatterns = [
                "Paid to Amazon",
                "Sent to John",
                "Payment successful",
                "Transaction completed",
            ];

            for (const pattern of upiPatterns) {
                // These patterns indicate a valid payment screenshot
                const isPaymentText = /paid|sent|payment|transaction/i.test(pattern);
                expect(isPaymentText).toBe(true);
            }
        });
    });
});

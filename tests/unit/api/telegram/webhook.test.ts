import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock fetch for Telegram API calls
global.fetch = vi.fn();

// Mock database client
const mockDb = {
    userSettings: {
        findFirst: vi.fn(),
    },
    expense: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
    },
    account: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
    },
    balanceHistory: {
        create: vi.fn(),
    },
    linkingCode: {
        findFirst: vi.fn(),
        update: vi.fn(),
    },
    $transaction: vi.fn((cb: (tx: Record<string, unknown>) => unknown) => cb(mockDb)),
};

vi.mock("@/lib/db", () => ({
    db: mockDb,
}));

// Mock R2 upload
vi.mock("@aws-sdk/client-s3", () => ({
    S3Client: vi.fn(() => ({
        send: vi.fn().mockResolvedValue({}),
    })),
    PutObjectCommand: vi.fn(),
}));

// Mock AI module
vi.mock("@/lib/ai", () => ({
    parseExpenseWithAI: vi.fn(),
    parseReceiptWithVision: vi.fn(),
    parsePDFWithVision: vi.fn(),
}));

// Mock accounts actions
vi.mock("@/lib/actions/accounts", () => ({
    getAccountsByUserId: vi.fn(),
}));

// Mock subscription alerts
vi.mock("@/lib/subscription-alerts", () => ({
    checkAndSendSubscriptionAlerts: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/rate-limit", () => ({
    checkRateLimit: vi.fn(() => ({ success: true, retryAfter: 0 })),
}));

describe("Telegram Webhook", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(fetch).mockClear();
        process.env.TELEGRAM_BOT_TOKEN = "test-bot-token";
        process.env.TELEGRAM_WEBHOOK_SECRET = "test-webhook-secret";
    });

    describe("Webhook Authentication", () => {
        it("disables the webhook when its secret is missing", async () => {
            delete process.env.TELEGRAM_WEBHOOK_SECRET;
            const { POST } = await import("@/app/api/telegram/webhook/route");
            const request = new Request("http://localhost/api/telegram/webhook", {
                method: "POST",
                body: JSON.stringify({ update_id: 1 }),
            });

            const response = await POST(request);

            expect(response.status).toBe(500);
        });

        it("rejects an invalid webhook secret", async () => {
            const { POST } = await import("@/app/api/telegram/webhook/route");
            const request = new Request("http://localhost/api/telegram/webhook", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-telegram-bot-api-secret-token": "invalid",
                },
                body: JSON.stringify({ update_id: 1 }),
            });

            const response = await POST(request);

            expect(response.status).toBe(401);
        });
    });

    describe("Summary Command", () => {
        it("should show error when user is not linked", async () => {
            mockDb.userSettings.findFirst.mockResolvedValue(null);

            const { POST } = await import("@/app/api/telegram/webhook/route");
            const request = new Request("http://localhost/api/telegram/webhook", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-telegram-bot-api-secret-token": "test-webhook-secret",
                },
                body: JSON.stringify({
                    update_id: 123,
                    message: {
                        message_id: 1,
                        from: { id: 123456, first_name: "Test" },
                        chat: { id: 123456, type: "private" },
                        date: Date.now(),
                        text: "/summary",
                    },
                }),
            });

            await POST(request);

            expect(fetch).toHaveBeenCalledWith(
                expect.stringContaining("/sendMessage"),
                expect.objectContaining({
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: expect.stringContaining("not linked"),
                })
            );
        });

        it("should show today's summary for /summary command", async () => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            mockDb.userSettings.findFirst.mockResolvedValue({
                userId: "test-user-id",
                currency: "INR",
                telegramChatId: "123456",
            });

            mockDb.expense.findMany.mockResolvedValue([
                {
                    amount: 250,
                    category: "Food",
                    description: "Lunch",
                    merchant: "Restaurant",
                    date: new Date(),
                },
                {
                    amount: 100,
                    category: "Travel",
                    description: "Uber",
                    merchant: null,
                    date: new Date(),
                },
            ]);

            const { POST } = await import("@/app/api/telegram/webhook/route");
            const request = new Request("http://localhost/api/telegram/webhook", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-telegram-bot-api-secret-token": "test-webhook-secret",
                },
                body: JSON.stringify({
                    update_id: 123,
                    message: {
                        message_id: 1,
                        from: { id: 123456, first_name: "Test" },
                        chat: { id: 123456, type: "private" },
                        date: Date.now(),
                        text: "/summary",
                    },
                }),
            });

            await POST(request);

            const fetchCalls = vi.mocked(fetch).mock.calls;
            const sendMessageCall = fetchCalls.find((call) =>
                String(call[0]).includes("/sendMessage")
            );

            expect(sendMessageCall).toBeDefined();
            const body = JSON.parse(String(sendMessageCall?.[1]?.body));
            expect(body.text).toContain("Today Summary");
            expect(body.text).toContain("₹350.00");
            expect(body.text).toContain("Food");
            expect(body.text).toContain("Travel");
            expect(body.text).toContain("Restaurant");
            expect(body.text).toContain("Uber");
        });

        it("should show weekly summary for /summary week command", async () => {
            mockDb.userSettings.findFirst.mockResolvedValue({
                userId: "test-user-id",
                currency: "INR",
                telegramChatId: "123456",
            });

            mockDb.expense.findMany.mockResolvedValue([
                {
                    amount: 500,
                    category: "Shopping",
                    description: "Groceries",
                    merchant: "BigBasket",
                    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
                },
            ]);

            const { POST } = await import("@/app/api/telegram/webhook/route");
            const request = new Request("http://localhost/api/telegram/webhook", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-telegram-bot-api-secret-token": "test-webhook-secret",
                },
                body: JSON.stringify({
                    update_id: 123,
                    message: {
                        message_id: 1,
                        from: { id: 123456, first_name: "Test" },
                        chat: { id: 123456, type: "private" },
                        date: Date.now(),
                        text: "/summary week",
                    },
                }),
            });

            await POST(request);

            const fetchCalls = vi.mocked(fetch).mock.calls;
            const sendMessageCall = fetchCalls.find((call) =>
                String(call[0]).includes("/sendMessage")
            );

            expect(sendMessageCall).toBeDefined();
            const body = JSON.parse(String(sendMessageCall?.[1]?.body));
            expect(body.text).toContain("Last 7 Days");
        });

        it("should show monthly summary for /summary month command", async () => {
            mockDb.userSettings.findFirst.mockResolvedValue({
                userId: "test-user-id",
                currency: "INR",
                telegramChatId: "123456",
            });

            mockDb.expense.findMany.mockResolvedValue([
                {
                    amount: 1000,
                    category: "Bills",
                    description: "Electricity",
                    merchant: null,
                    date: new Date(),
                },
            ]);

            const { POST } = await import("@/app/api/telegram/webhook/route");
            const request = new Request("http://localhost/api/telegram/webhook", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-telegram-bot-api-secret-token": "test-webhook-secret",
                },
                body: JSON.stringify({
                    update_id: 123,
                    message: {
                        message_id: 1,
                        from: { id: 123456, first_name: "Test" },
                        chat: { id: 123456, type: "private" },
                        date: Date.now(),
                        text: "/summary month",
                    },
                }),
            });

            await POST(request);

            const fetchCalls = vi.mocked(fetch).mock.calls;
            const sendMessageCall = fetchCalls.find((call) =>
                String(call[0]).includes("/sendMessage")
            );

            expect(sendMessageCall).toBeDefined();
            const body = JSON.parse(String(sendMessageCall?.[1]?.body));
            expect(body.text).toContain("This Month");
        });

        it("should show usage help for invalid summary command", async () => {
            mockDb.userSettings.findFirst.mockResolvedValue({
                userId: "test-user-id",
                currency: "INR",
                telegramChatId: "123456",
            });

            const { POST } = await import("@/app/api/telegram/webhook/route");
            const request = new Request("http://localhost/api/telegram/webhook", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-telegram-bot-api-secret-token": "test-webhook-secret",
                },
                body: JSON.stringify({
                    update_id: 123,
                    message: {
                        message_id: 1,
                        from: { id: 123456, first_name: "Test" },
                        chat: { id: 123456, type: "private" },
                        date: Date.now(),
                        text: "/summary invalid",
                    },
                }),
            });

            await POST(request);

            const fetchCalls = vi.mocked(fetch).mock.calls;
            const sendMessageCall = fetchCalls.find((call) =>
                String(call[0]).includes("/sendMessage")
            );

            expect(sendMessageCall).toBeDefined();
            const body = JSON.parse(String(sendMessageCall?.[1]?.body));
            expect(body.text).toContain("Usage:");
            expect(body.text).toContain("/summary [today|week|month]");
        });

        it("should show 'no expenses' message when no data exists", async () => {
            mockDb.userSettings.findFirst.mockResolvedValue({
                userId: "test-user-id",
                currency: "INR",
                telegramChatId: "123456",
            });

            mockDb.expense.findMany.mockResolvedValue([]);

            const { POST } = await import("@/app/api/telegram/webhook/route");
            const request = new Request("http://localhost/api/telegram/webhook", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-telegram-bot-api-secret-token": "test-webhook-secret",
                },
                body: JSON.stringify({
                    update_id: 123,
                    message: {
                        message_id: 1,
                        from: { id: 123456, first_name: "Test" },
                        chat: { id: 123456, type: "private" },
                        date: Date.now(),
                        text: "/summary",
                    },
                }),
            });

            await POST(request);

            const fetchCalls = vi.mocked(fetch).mock.calls;
            const sendMessageCall = fetchCalls.find((call) =>
                String(call[0]).includes("/sendMessage")
            );

            expect(sendMessageCall).toBeDefined();
            const body = JSON.parse(String(sendMessageCall?.[1]?.body));
            expect(body.text).toContain("No expenses recorded");
        });

        it("should use USD currency when user has USD set", async () => {
            mockDb.userSettings.findFirst.mockResolvedValue({
                userId: "test-user-id",
                currency: "USD",
                telegramChatId: "123456",
            });

            mockDb.expense.findMany.mockResolvedValue([
                {
                    amount: 50,
                    category: "Food",
                    description: "Coffee",
                    merchant: "Starbucks",
                    date: new Date(),
                },
            ]);

            const { POST } = await import("@/app/api/telegram/webhook/route");
            const request = new Request("http://localhost/api/telegram/webhook", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-telegram-bot-api-secret-token": "test-webhook-secret",
                },
                body: JSON.stringify({
                    update_id: 123,
                    message: {
                        message_id: 1,
                        from: { id: 123456, first_name: "Test" },
                        chat: { id: 123456, type: "private" },
                        date: Date.now(),
                        text: "/summary",
                    },
                }),
            });

            await POST(request);

            const fetchCalls = vi.mocked(fetch).mock.calls;
            const sendMessageCall = fetchCalls.find((call) =>
                String(call[0]).includes("/sendMessage")
            );

            expect(sendMessageCall).toBeDefined();
            const body = JSON.parse(String(sendMessageCall?.[1]?.body));
            expect(body.text).toContain("$50.00");
            expect(body.text).not.toContain("₹");
        });
    });

    describe("Help Command", () => {
        it("should show help message for /help command", async () => {
            const { POST } = await import("@/app/api/telegram/webhook/route");
            const request = new Request("http://localhost/api/telegram/webhook", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-telegram-bot-api-secret-token": "test-webhook-secret",
                },
                body: JSON.stringify({
                    update_id: 123,
                    message: {
                        message_id: 1,
                        from: { id: 123456, first_name: "Test" },
                        chat: { id: 123456, type: "private" },
                        date: Date.now(),
                        text: "/help",
                    },
                }),
            });

            await POST(request);

            const fetchCalls = vi.mocked(fetch).mock.calls;
            const sendMessageCall = fetchCalls.find((call) =>
                String(call[0]).includes("/sendMessage")
            );

            expect(sendMessageCall).toBeDefined();
            const body = JSON.parse(String(sendMessageCall?.[1]?.body));
            expect(body.text).toContain("Chamber Bot Commands");
            expect(body.text).toContain("/start");
            expect(body.text).toContain("/summary");
            expect(body.text).toContain("/accounts");
        });
    });

    describe("Accounts Command", () => {
        it("should show error when user is not linked", async () => {
            mockDb.userSettings.findFirst.mockResolvedValue(null);

            const { POST } = await import("@/app/api/telegram/webhook/route");
            const request = new Request("http://localhost/api/telegram/webhook", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-telegram-bot-api-secret-token": "test-webhook-secret",
                },
                body: JSON.stringify({
                    update_id: 123,
                    message: {
                        message_id: 1,
                        from: { id: 123456, first_name: "Test" },
                        chat: { id: 123456, type: "private" },
                        date: Date.now(),
                        text: "/accounts",
                    },
                }),
            });

            await POST(request);

            expect(fetch).toHaveBeenCalledWith(
                expect.stringContaining("/sendMessage"),
                expect.objectContaining({
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: expect.stringContaining("not linked"),
                })
            );
        });

        it("should show message when user has no accounts", async () => {
            mockDb.userSettings.findFirst.mockResolvedValue({
                userId: "test-user-id",
                currency: "INR",
                telegramChatId: "123456",
            });

            mockDb.account.findMany.mockResolvedValue([]);

            const { POST } = await import("@/app/api/telegram/webhook/route");
            const request = new Request("http://localhost/api/telegram/webhook", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-telegram-bot-api-secret-token": "test-webhook-secret",
                },
                body: JSON.stringify({
                    update_id: 123,
                    message: {
                        message_id: 1,
                        from: { id: 123456, first_name: "Test" },
                        chat: { id: 123456, type: "private" },
                        date: Date.now(),
                        text: "/accounts",
                    },
                }),
            });

            await POST(request);

            const fetchCalls = vi.mocked(fetch).mock.calls;
            const sendMessageCall = fetchCalls.find((call) =>
                String(call[0]).includes("/sendMessage")
            );

            expect(sendMessageCall).toBeDefined();
            const body = JSON.parse(String(sendMessageCall?.[1]?.body));
            expect(body.text).toContain("don't have any active accounts");
        });

        it("should show account balances for /accounts command", async () => {
            mockDb.userSettings.findFirst.mockResolvedValue({
                userId: "test-user-id",
                currency: "INR",
                telegramChatId: "123456",
            });

            mockDb.account.findMany.mockResolvedValue([
                {
                    id: "acc-1",
                    name: "HDFC Bank",
                    type: "BANK",
                    currentBalance: 45230,
                    isActive: true,
                },
                {
                    id: "acc-2",
                    name: "Cash Wallet",
                    type: "WALLET",
                    currentBalance: 2150,
                    isActive: true,
                },
                {
                    id: "acc-3",
                    name: "Investments",
                    type: "INVESTMENT",
                    currentBalance: 125000,
                    isActive: true,
                },
                {
                    id: "acc-4",
                    name: "Rewards Card",
                    type: "CREDIT_CARD",
                    currentBalance: 10000,
                    isActive: true,
                },
            ]);

            const { POST } = await import("@/app/api/telegram/webhook/route");
            const request = new Request("http://localhost/api/telegram/webhook", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-telegram-bot-api-secret-token": "test-webhook-secret",
                },
                body: JSON.stringify({
                    update_id: 123,
                    message: {
                        message_id: 1,
                        from: { id: 123456, first_name: "Test" },
                        chat: { id: 123456, type: "private" },
                        date: Date.now(),
                        text: "/accounts",
                    },
                }),
            });

            await POST(request);

            const fetchCalls = vi.mocked(fetch).mock.calls;
            const sendMessageCall = fetchCalls.find((call) =>
                String(call[0]).includes("/sendMessage")
            );

            expect(sendMessageCall).toBeDefined();
            const body = JSON.parse(String(sendMessageCall?.[1]?.body));
            expect(body.text).toContain("Your Accounts");
            expect(body.text).toContain("HDFC Bank");
            expect(body.text).toContain("₹45230.00");
            expect(body.text).toContain("Cash Wallet");
            expect(body.text).toContain("₹2150.00");
            expect(body.text).toContain("Investments");
            expect(body.text).toContain("₹125000.00");
            expect(body.text).toContain("Rewards Card");
            expect(body.text).toContain("₹10000.00 outstanding");
            expect(body.text).toContain("Net Worth");
            expect(body.text).toContain("₹162380.00");
        });

        it("should use USD currency for accounts when set", async () => {
            mockDb.userSettings.findFirst.mockResolvedValue({
                userId: "test-user-id",
                currency: "USD",
                telegramChatId: "123456",
            });

            mockDb.account.findMany.mockResolvedValue([
                {
                    id: "acc-1",
                    name: "Chase Bank",
                    type: "BANK",
                    currentBalance: 5000,
                    isActive: true,
                },
            ]);

            const { POST } = await import("@/app/api/telegram/webhook/route");
            const request = new Request("http://localhost/api/telegram/webhook", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-telegram-bot-api-secret-token": "test-webhook-secret",
                },
                body: JSON.stringify({
                    update_id: 123,
                    message: {
                        message_id: 1,
                        from: { id: 123456, first_name: "Test" },
                        chat: { id: 123456, type: "private" },
                        date: Date.now(),
                        text: "/accounts",
                    },
                }),
            });

            await POST(request);

            const fetchCalls = vi.mocked(fetch).mock.calls;
            const sendMessageCall = fetchCalls.find((call) =>
                String(call[0]).includes("/sendMessage")
            );

            expect(sendMessageCall).toBeDefined();
            const body = JSON.parse(String(sendMessageCall?.[1]?.body));
            expect(body.text).toContain("$5000.00");
            expect(body.text).not.toContain("₹");
        });
    });

    describe("Photo Messages", () => {
        it("falls back to vision when an expense caption cannot be parsed", async () => {
            const { parseExpenseWithAI, parseReceiptWithVision } = await import("@/lib/ai");
            const { getAccountsByUserId } = await import("@/lib/actions/accounts");

            mockDb.userSettings.findFirst.mockResolvedValue({
                userId: "test-user-id",
                currency: "INR",
                telegramChatId: "123456",
            });
            mockDb.expense.findFirst.mockResolvedValue(null);
            vi.mocked(getAccountsByUserId).mockResolvedValue([
                { id: "acc-1", name: "Cash Wallet", type: "WALLET" },
            ]);
            vi.mocked(parseExpenseWithAI).mockResolvedValue({
                success: false,
                error: "Could not parse AI response",
            });
            vi.mocked(parseReceiptWithVision).mockResolvedValue({
                success: true,
                expense: {
                    amount: 290,
                    category: "Food",
                    description: "Sweets",
                    merchant: "Sweets Shop",
                    confidence: 0.95,
                },
            });
            vi.mocked(fetch).mockImplementation(async (input) => {
                const url = String(input);

                if (url.includes("/getFile")) {
                    return new Response(JSON.stringify({
                        ok: true,
                        result: { file_path: "photos/receipt.jpg" },
                    }), {
                        headers: { "Content-Type": "application/json" },
                    });
                }

                if (url.includes("/file/bot")) {
                    return new Response(new Uint8Array([1, 2, 3]));
                }

                return new Response(JSON.stringify({ ok: true }), {
                    headers: { "Content-Type": "application/json" },
                });
            });

            const { POST } = await import("@/app/api/telegram/webhook/route");
            const caption = "Paid 290 to Sweets Shop";
            const request = new Request("http://localhost/api/telegram/webhook", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-telegram-bot-api-secret-token": "test-webhook-secret",
                },
                body: JSON.stringify({
                    update_id: 127,
                    message: {
                        message_id: 4,
                        from: { id: 123456, first_name: "Test" },
                        chat: { id: 123456, type: "private" },
                        date: Date.now(),
                        caption,
                        photo: [
                            {
                                file_id: "photo-file-id",
                                file_unique_id: "photo-unique-id",
                                width: 1080,
                                height: 1920,
                            },
                        ],
                    },
                }),
            });

            const response = await POST(request);

            expect(response.status).toBe(200);
            expect(parseExpenseWithAI).toHaveBeenCalledWith(
                `User sent a payment screenshot with this caption: "${caption}"`,
                "INR",
            );
            expect(parseReceiptWithVision).toHaveBeenCalledWith(
                "AQID",
                "image/jpeg",
                caption,
                "INR",
            );

            const sentBodies = vi.mocked(fetch).mock.calls
                .filter(([input]) => String(input).includes("/sendMessage"))
                .map(([, init]) => JSON.parse(String(init?.body)) as { text: string });
            expect(sentBodies.some(({ text }) => text.includes("Select payment method"))).toBe(true);
            expect(sentBodies.some(({ text }) => text.includes("Could not extract expense"))).toBe(false);
        });
    });

    describe("Quick Expense Command", () => {
        it("should show error when user is not linked for /quick", async () => {
            mockDb.userSettings.findFirst.mockResolvedValue(null);

            const { POST } = await import("@/app/api/telegram/webhook/route");
            const request = new Request("http://localhost/api/telegram/webhook", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-telegram-bot-api-secret-token": "test-webhook-secret",
                },
                body: JSON.stringify({
                    update_id: 123,
                    message: {
                        message_id: 1,
                        from: { id: 123456, first_name: "Test" },
                        chat: { id: 123456, type: "private" },
                        date: Date.now(),
                        text: "/quick",
                    },
                }),
            });

            await POST(request);

            expect(fetch).toHaveBeenCalledWith(
                expect.stringContaining("/sendMessage"),
                expect.objectContaining({
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: expect.stringContaining("not linked"),
                })
            );
        });

        it("should show quick-amount buttons for /quick command", async () => {
            mockDb.userSettings.findFirst.mockResolvedValue({
                userId: "test-user-id",
                currency: "INR",
                telegramChatId: "123456",
            });

            const { POST } = await import("@/app/api/telegram/webhook/route");
            const request = new Request("http://localhost/api/telegram/webhook", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-telegram-bot-api-secret-token": "test-webhook-secret",
                },
                body: JSON.stringify({
                    update_id: 123,
                    message: {
                        message_id: 1,
                        from: { id: 123456, first_name: "Test" },
                        chat: { id: 123456, type: "private" },
                        date: Date.now(),
                        text: "/quick",
                    },
                }),
            });

            await POST(request);

            const fetchCalls = vi.mocked(fetch).mock.calls;
            const sendMessageCall = fetchCalls.find((call) =>
                String(call[0]).includes("/sendMessage")
            );

            expect(sendMessageCall).toBeDefined();
            const body = JSON.parse(String(sendMessageCall?.[1]?.body));
            expect(body.text).toContain("bottom");
            expect(body.reply_markup).toBeDefined();
            expect(body.reply_markup.keyboard).toBeDefined();
            // Should have amount buttons in the reply keyboard
            const allButtons = body.reply_markup.keyboard.flat();
            expect(allButtons.length).toBeGreaterThanOrEqual(5);
        });

        it("should show account selection when quick-amount inline button is tapped", async () => {
            const { getAccountsByUserId } = await import("@/lib/actions/accounts");
            vi.mocked(getAccountsByUserId).mockResolvedValue([
                { id: "acc-1", name: "Cash Wallet", type: "WALLET" },
                { id: "acc-2", name: "HDFC Bank", type: "BANK" },
            ]);

            mockDb.userSettings.findFirst.mockResolvedValue({
                userId: "test-user-id",
                currency: "INR",
                telegramChatId: "123456",
            });

            const { POST } = await import("@/app/api/telegram/webhook/route");
            const request = new Request("http://localhost/api/telegram/webhook", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-telegram-bot-api-secret-token": "test-webhook-secret",
                },
                body: JSON.stringify({
                    update_id: 124,
                    callback_query: {
                        id: "cq-1",
                        from: { id: 123456 },
                        message: {
                            chat: { id: 123456 },
                            message_id: 100,
                        },
                        data: "quick_25",
                    },
                }),
            });

            await POST(request);

            // Should NOT create expense yet (account not selected)
            expect(mockDb.expense.create).not.toHaveBeenCalled();

            // Should edit the message to show account selection
            const fetchCalls = vi.mocked(fetch).mock.calls;
            const editCall = fetchCalls.find((call) =>
                String(call[0]).includes("/editMessageText")
            );
            expect(editCall).toBeDefined();
            const body = JSON.parse(String(editCall?.[1]?.body));
            expect(body.text).toContain("Select account for ₹25.00");
            expect(body.reply_markup.inline_keyboard).toBeDefined();
        });

        it("should save expense after account is selected via qpay callback", async () => {
            const { getAccountsByUserId } = await import("@/lib/actions/accounts");
            vi.mocked(getAccountsByUserId).mockResolvedValue([
                { id: "acc-1", name: "Cash Wallet", type: "WALLET" },
            ]);

            mockDb.userSettings.findFirst.mockResolvedValue({
                userId: "test-user-id",
                currency: "INR",
                telegramChatId: "123456",
            });

            mockDb.account.findFirst.mockResolvedValue({
                id: "acc-1",
                name: "Cash Wallet",
                type: "WALLET",
                currentBalance: 5000,
            });

            mockDb.account.update.mockResolvedValue({
                id: "acc-1",
                name: "Cash Wallet",
                type: "WALLET",
                currentBalance: 4975,
            });

            const { POST } = await import("@/app/api/telegram/webhook/route");

            // Step 1: tap quick amount to set pending quick expense
            const step1 = new Request("http://localhost/api/telegram/webhook", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-telegram-bot-api-secret-token": "test-webhook-secret",
                },
                body: JSON.stringify({
                    update_id: 124,
                    callback_query: {
                        id: "cq-1",
                        from: { id: 123456 },
                        message: {
                            chat: { id: 123456 },
                            message_id: 100,
                        },
                        data: "quick_25",
                    },
                }),
            });
            await POST(step1);

            // Step 2: select account via qpay callback
            const step2 = new Request("http://localhost/api/telegram/webhook", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-telegram-bot-api-secret-token": "test-webhook-secret",
                },
                body: JSON.stringify({
                    update_id: 125,
                    callback_query: {
                        id: "cq-2",
                        from: { id: 123456 },
                        message: {
                            chat: { id: 123456 },
                            message_id: 100,
                        },
                        data: "qpay_acc-1",
                    },
                }),
            });
            await POST(step2);

            // Should create expense with amount 25 and default category
            expect(mockDb.expense.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        amount: 25,
                        category: "General",
                        userId: "test-user-id",
                        accountId: "acc-1",
                        paymentMethod: "Cash Wallet",
                    }),
                })
            );

            // Should update account balance
            expect(mockDb.account.update).toHaveBeenCalled();
            expect(mockDb.balanceHistory.create).toHaveBeenCalled();

            // Should edit the message to show success
            const fetchCalls = vi.mocked(fetch).mock.calls;
            const editCalls = fetchCalls.filter((call) =>
                String(call[0]).includes("/editMessageText")
            );
            expect(editCalls.length).toBeGreaterThanOrEqual(2);
            const lastEditBody = JSON.parse(String(editCalls[editCalls.length - 1]?.[1]?.body));
            expect(lastEditBody.text).toContain("Saved!");
            expect(lastEditBody.text).toContain("₹25.00");
            expect(lastEditBody.text).toContain("Cash Wallet");
        });

        it("should show account selection for a bare number message", async () => {
            const { getAccountsByUserId } = await import("@/lib/actions/accounts");
            vi.mocked(getAccountsByUserId).mockResolvedValue([
                { id: "acc-1", name: "Cash Wallet", type: "WALLET" },
            ]);

            mockDb.userSettings.findFirst.mockResolvedValue({
                userId: "test-user-id",
                currency: "INR",
                telegramChatId: "123456",
            });

            const { POST } = await import("@/app/api/telegram/webhook/route");
            const request = new Request("http://localhost/api/telegram/webhook", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-telegram-bot-api-secret-token": "test-webhook-secret",
                },
                body: JSON.stringify({
                    update_id: 125,
                    message: {
                        message_id: 2,
                        from: { id: 123456, first_name: "Test" },
                        chat: { id: 123456, type: "private" },
                        date: Date.now(),
                        text: "25",
                    },
                }),
            });

            await POST(request);

            // Should NOT create expense yet (account not selected)
            expect(mockDb.expense.create).not.toHaveBeenCalled();

            // Should send account selection message
            const fetchCalls = vi.mocked(fetch).mock.calls;
            const sendMessageCall = fetchCalls.find((call) =>
                String(call[0]).includes("/sendMessage")
            );
            expect(sendMessageCall).toBeDefined();
            const body = JSON.parse(String(sendMessageCall?.[1]?.body));
            expect(body.text).toContain("Select account for ₹25.00");
            expect(body.reply_markup.inline_keyboard).toBeDefined();
        });

        it("should not trigger quick expense for amounts over 200", async () => {
            mockDb.userSettings.findFirst.mockResolvedValue({
                userId: "test-user-id",
                currency: "INR",
                telegramChatId: "123456",
            });

            // Mock expense create to prevent real DB call
            mockDb.expense.findMany.mockResolvedValue([]);

            const { POST } = await import("@/app/api/telegram/webhook/route");
            const request = new Request("http://localhost/api/telegram/webhook", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-telegram-bot-api-secret-token": "test-webhook-secret",
                },
                body: JSON.stringify({
                    update_id: 126,
                    message: {
                        message_id: 3,
                        from: { id: 123456, first_name: "Test" },
                        chat: { id: 123456, type: "private" },
                        date: Date.now(),
                        text: "500",
                    },
                }),
            });

            await POST(request);

            // Should NOT show quick-amount buttons (goes through normal AI flow)
            const fetchCalls = vi.mocked(fetch).mock.calls;
            const sendMessageCall = fetchCalls.find((call) =>
                String(call[0]).includes("/sendMessage")
            );

            expect(sendMessageCall).toBeDefined();
            const body = JSON.parse(String(sendMessageCall?.[1]?.body));
            // Normal flow shows "Processing...", not quick expense message
            expect(body.text).toContain("Processing");
        });
    });
});

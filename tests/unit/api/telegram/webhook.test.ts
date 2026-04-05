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
    },
    account: {
        findMany: vi.fn(),
    },
    linkingCode: {
        findFirst: vi.fn(),
        update: vi.fn(),
    },
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

describe("Telegram Webhook", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(fetch).mockClear();
        process.env.TELEGRAM_BOT_TOKEN = "test-bot-token";
        process.env.TELEGRAM_WEBHOOK_SECRET = "test-webhook-secret";
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
            expect(body.text).toContain("Total Balance");
            expect(body.text).toContain("₹172380.00");
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
});

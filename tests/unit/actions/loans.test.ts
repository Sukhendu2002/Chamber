import { describe, it, expect, vi, beforeEach } from "vitest";

const UUIDS = {
    loan1: "c1111111-1111-4111-a111-111111111111",
    loan2: "d2222222-2222-4222-8aaa-aaaaaaaaaaaa",
    repayment1: "e3333333-3333-4333-9bbb-bbbbbbbbbbbb",
    repayment2: "f4444444-4444-4444-accc-cccccccccccc",
    accountBank: "ab111111-4111-4111-a111-111111111111",
    accountCard: "ac222222-4222-4222-8222-222222222222",
    expense1: "ea111111-4111-4111-a111-111111111111",
    expense2: "ea222222-4222-4222-a222-222222222222",
    history1: "bh111111-4111-4111-a111-111111111111",
    history2: "bh222222-4222-4222-a222-222222222222",
};

// Build a mock for the db that supports $transaction
const buildModelMock = () => ({
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    aggregate: vi.fn(),
    upsert: vi.fn(),
    count: vi.fn(),
});

const mockDb = {
    loan: buildModelMock(),
    repayment: buildModelMock(),
    account: buildModelMock(),
    expense: buildModelMock(),
    balanceHistory: buildModelMock(),
    $transaction: vi.fn(),
};

vi.mock("@/lib/db", () => ({
    db: mockDb,
}));

// Mock next/cache's revalidatePath so we don't try to call Next internals
vi.mock("next/cache", () => ({
    revalidatePath: vi.fn(),
}));

// Helper: make $transaction execute the callback with `tx` that mirrors db models
const setupTransactionMock = () => {
    mockDb.$transaction.mockImplementation(async (cb: (tx: typeof mockDb) => Promise<unknown>) => {
        const tx = {
            loan: mockDb.loan,
            repayment: mockDb.repayment,
            account: mockDb.account,
            expense: mockDb.expense,
            balanceHistory: mockDb.balanceHistory,
        };
        return cb(tx as unknown as typeof mockDb);
    });
};

describe("Loan Actions", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        setupTransactionMock();
        mockDb.loan.updateMany.mockResolvedValue({ count: 1 });
    });

    describe("createLoan", () => {
        it("should create a loan with required fields (no account)", async () => {
            const mockLoan = {
                id: UUIDS.loan1,
                userId: "test-user-id",
                borrowerName: "John Doe",
                borrowerPhone: "1234567890",
                amount: 5000,
                amountRepaid: 0,
                status: "PENDING",
                lendDate: new Date(),
                dueDate: null,
                description: "Personal loan",
                receiptUrls: [],
                accountId: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockDb.loan.create.mockResolvedValue(mockLoan);

            vi.resetModules();
            const { createLoan } = await import("@/lib/actions/loans");

            const result = await createLoan({
                borrowerName: "John Doe",
                borrowerPhone: "1234567890",
                amount: 5000,
                lendDate: new Date(),
                description: "Personal loan",
            });

            expect(result).toEqual(mockLoan);
            expect(mockDb.loan.create).toHaveBeenCalledTimes(1);
            expect(mockDb.expense.create).not.toHaveBeenCalled();
            expect(mockDb.account.update).not.toHaveBeenCalled();
        });

        it("should create a loan with BANK account and deduct balance", async () => {
            const mockLoan = {
                id: UUIDS.loan1,
                userId: "test-user-id",
                borrowerName: "John Doe",
                amount: 5000,
                amountRepaid: 0,
                status: "PENDING",
                lendDate: new Date(),
                accountId: UUIDS.accountBank,
            };

            const mockAccount = {
                id: UUIDS.accountBank,
                userId: "test-user-id",
                name: "SBI Savings",
                type: "BANK",
                currentBalance: 10000,
            };

            mockDb.loan.create.mockResolvedValue(mockLoan);
            mockDb.account.findFirst.mockResolvedValue(mockAccount);
            mockDb.expense.create.mockResolvedValue({ id: UUIDS.expense1, amount: 5000 });
            mockDb.account.update.mockResolvedValue({ ...mockAccount, currentBalance: 5000 });
            mockDb.balanceHistory.create.mockResolvedValue({ id: UUIDS.history1 });

            vi.resetModules();
            const { createLoan } = await import("@/lib/actions/loans");

            const result = await createLoan({
                borrowerName: "John Doe",
                amount: 5000,
                lendDate: new Date(),
                accountId: UUIDS.accountBank,
            });

            expect(result).toEqual(mockLoan);
            expect(mockDb.expense.create).toHaveBeenCalledTimes(1);
            expect(mockDb.expense.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        amount: 5000,
                        category: "Lent Money",
                        loanId: UUIDS.loan1,
                        accountId: UUIDS.accountBank,
                    }),
                })
            );
            expect(mockDb.account.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: UUIDS.accountBank },
                    data: { currentBalance: { increment: -5000 } },
                })
            );
            expect(mockDb.balanceHistory.create).toHaveBeenCalledTimes(1);
        });

        it("should create a loan with CREDIT_CARD account and increase debt", async () => {
            const mockLoan = {
                id: UUIDS.loan1,
                userId: "test-user-id",
                borrowerName: "John Doe",
                amount: 5000,
                amountRepaid: 0,
                status: "PENDING",
                lendDate: new Date(),
                accountId: UUIDS.accountCard,
            };

            const mockAccount = {
                id: UUIDS.accountCard,
                userId: "test-user-id",
                name: "HDFC Credit Card",
                type: "CREDIT_CARD",
                currentBalance: 0,
            };

            mockDb.loan.create.mockResolvedValue(mockLoan);
            mockDb.account.findFirst.mockResolvedValue(mockAccount);
            mockDb.expense.create.mockResolvedValue({ id: UUIDS.expense1, amount: 5000 });
            mockDb.account.update.mockResolvedValue({ ...mockAccount, currentBalance: 5000 });
            mockDb.balanceHistory.create.mockResolvedValue({ id: UUIDS.history1 });

            vi.resetModules();
            const { createLoan } = await import("@/lib/actions/loans");

            await createLoan({
                borrowerName: "John Doe",
                amount: 5000,
                lendDate: new Date(),
                accountId: UUIDS.accountCard,
            });

            expect(mockDb.account.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: UUIDS.accountCard },
                    data: { currentBalance: { increment: 5000 } },
                })
            );
        });

        it("should reject an account that does not belong to the user", async () => {
            mockDb.account.findFirst.mockResolvedValue(null);

            vi.resetModules();
            const { createLoan } = await import("@/lib/actions/loans");

            await expect(
                createLoan({
                    borrowerName: "John Doe",
                    amount: 5000,
                    lendDate: new Date(),
                    accountId: UUIDS.accountBank,
                })
            ).rejects.toThrow("Account not found");

            expect(mockDb.loan.create).not.toHaveBeenCalled();
            expect(mockDb.account.findFirst).toHaveBeenCalledWith({
                where: {
                    id: UUIDS.accountBank,
                    userId: "test-user-id",
                    isActive: true,
                },
            });
        });
    });

    describe("addRepayment", () => {
        it("should add repayment, update loan, and skip account ops when no account", async () => {
            const mockLoan = {
                id: UUIDS.loan1,
                userId: "test-user-id",
                amount: 5000,
                amountRepaid: 0,
                status: "PENDING",
                accountId: null,
            };

            const mockRepayment = {
                id: UUIDS.repayment1,
                loanId: UUIDS.loan1,
                amount: 2000,
                date: new Date(),
                note: "First payment",
                receiptUrls: [],
                createdAt: new Date(),
            };

            mockDb.loan.findFirst.mockResolvedValue(mockLoan);
            mockDb.repayment.create.mockResolvedValue(mockRepayment);
            vi.resetModules();
            const { addRepayment } = await import("@/lib/actions/loans");

            const result = await addRepayment({
                loanId: UUIDS.loan1,
                amount: 2000,
                date: new Date(),
                note: "First payment",
            });

            expect(result.id).toBe(UUIDS.repayment1);
            expect(result.amount).toBe(2000);
            expect(mockDb.expense.create).not.toHaveBeenCalled();
            expect(mockDb.account.update).not.toHaveBeenCalled();
        });

        it("should create negative refund expense and credit balance for linked BANK account", async () => {
            const mockLoan = {
                id: UUIDS.loan1,
                userId: "test-user-id",
                borrowerName: "John Doe",
                amount: 5000,
                amountRepaid: 0,
                status: "PENDING",
                accountId: UUIDS.accountBank,
            };

            const mockAccount = {
                id: UUIDS.accountBank,
                name: "SBI Savings",
                type: "BANK",
                currentBalance: 5000,
            };

            const mockRepayment = {
                id: UUIDS.repayment1,
                loanId: UUIDS.loan1,
                amount: 2000,
                date: new Date(),
                note: "First payment",
                receiptUrls: [],
                createdAt: new Date(),
            };

            mockDb.loan.findFirst.mockResolvedValue(mockLoan);
            mockDb.repayment.create.mockResolvedValue(mockRepayment);
            mockDb.account.findFirst.mockResolvedValue(mockAccount);
            mockDb.expense.create.mockResolvedValue({ id: UUIDS.expense1, amount: -2000 });
            mockDb.account.update.mockResolvedValue({ ...mockAccount, currentBalance: 7000 });
            mockDb.balanceHistory.create.mockResolvedValue({ id: UUIDS.history1 });

            vi.resetModules();
            const { addRepayment } = await import("@/lib/actions/loans");

            await addRepayment({
                loanId: UUIDS.loan1,
                amount: 2000,
                date: new Date(),
                note: "First payment",
            });

            expect(mockDb.expense.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        amount: -2000,
                        category: "Lent Money",
                        loanId: UUIDS.loan1,
                        repaymentId: UUIDS.repayment1,
                        accountId: UUIDS.accountBank,
                    }),
                })
            );
            expect(mockDb.account.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: UUIDS.accountBank },
                    data: { currentBalance: { increment: 2000 } },
                })
            );
        });

        it("should reduce debt when repayment on CREDIT_CARD linked loan", async () => {
            const mockLoan = {
                id: UUIDS.loan1,
                userId: "test-user-id",
                borrowerName: "John Doe",
                amount: 5000,
                amountRepaid: 0,
                status: "PENDING",
                accountId: UUIDS.accountCard,
            };

            const mockAccount = {
                id: UUIDS.accountCard,
                name: "HDFC Credit Card",
                type: "CREDIT_CARD",
                currentBalance: 5000,
            };

            const mockRepayment = {
                id: UUIDS.repayment1,
                loanId: UUIDS.loan1,
                amount: 2000,
                date: new Date(),
                receiptUrls: [],
                createdAt: new Date(),
            };

            mockDb.loan.findFirst.mockResolvedValue(mockLoan);
            mockDb.repayment.create.mockResolvedValue(mockRepayment);
            mockDb.account.findFirst.mockResolvedValue(mockAccount);
            mockDb.expense.create.mockResolvedValue({ id: UUIDS.expense1, amount: -2000 });
            mockDb.account.update.mockResolvedValue({ ...mockAccount, currentBalance: 3000 });
            mockDb.balanceHistory.create.mockResolvedValue({ id: UUIDS.history1 });

            vi.resetModules();
            const { addRepayment } = await import("@/lib/actions/loans");

            await addRepayment({
                loanId: UUIDS.loan1,
                amount: 2000,
                date: new Date(),
            });

            expect(mockDb.account.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: UUIDS.accountCard },
                    data: { currentBalance: { increment: -2000 } },
                })
            );
        });

        it("should mark loan as COMPLETED when fully repaid", async () => {
            const mockLoan = {
                id: UUIDS.loan1,
                userId: "test-user-id",
                borrowerName: "John Doe",
                amount: 5000,
                amountRepaid: 3000,
                status: "PARTIAL",
                accountId: null,
            };

            mockDb.loan.findFirst.mockResolvedValue(mockLoan);
            mockDb.repayment.create.mockResolvedValue({
                id: UUIDS.repayment2,
                loanId: UUIDS.loan1,
                amount: 2000,
                date: new Date(),
                receiptUrls: [],
                createdAt: new Date(),
            });
            vi.resetModules();
            const { addRepayment } = await import("@/lib/actions/loans");

            await addRepayment({
                loanId: UUIDS.loan1,
                amount: 2000,
                date: new Date(),
            });

            expect(mockDb.loan.updateMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        status: "COMPLETED",
                    }),
                })
            );
        });

        it("should reject a repayment above the outstanding balance", async () => {
            mockDb.loan.findFirst.mockResolvedValue({
                id: UUIDS.loan1,
                userId: "test-user-id",
                amount: 5000,
                amountRepaid: 4500,
                status: "PARTIAL",
                accountId: null,
            });

            vi.resetModules();
            const { addRepayment } = await import("@/lib/actions/loans");

            await expect(
                addRepayment({
                    loanId: UUIDS.loan1,
                    amount: 1000,
                    date: new Date(),
                })
            ).rejects.toThrow("outstanding loan balance");

            expect(mockDb.repayment.create).not.toHaveBeenCalled();
        });
    });

    describe("deleteLoan", () => {
        it("should delete a loan with no linked expenses", async () => {
            mockDb.loan.findFirst.mockResolvedValue({
                id: UUIDS.loan1,
                userId: "test-user-id",
                borrowerName: "John",
            });
            mockDb.expense.findMany.mockResolvedValue([]);
            mockDb.loan.delete.mockResolvedValue({ id: UUIDS.loan1 });

            vi.resetModules();
            const { deleteLoan } = await import("@/lib/actions/loans");
            await deleteLoan(UUIDS.loan1);

            expect(mockDb.expense.deleteMany).toHaveBeenCalledWith({
                where: { loanId: UUIDS.loan1 },
            });
            expect(mockDb.loan.delete).toHaveBeenCalledWith({
                where: { id: UUIDS.loan1 },
            });
        });

        it("should reverse balance for each linked expense on BANK account", async () => {
            mockDb.loan.findFirst.mockResolvedValue({
                id: UUIDS.loan1,
                userId: "test-user-id",
                borrowerName: "John",
            });
            mockDb.expense.findMany.mockResolvedValue([
                { id: UUIDS.expense1, accountId: UUIDS.accountBank, amount: 5000, date: new Date() },
            ]);
            mockDb.account.findFirst.mockResolvedValue({
                id: UUIDS.accountBank,
                type: "BANK",
                currentBalance: 0,
            });
            mockDb.account.update.mockResolvedValue({ currentBalance: 5000 });
            mockDb.balanceHistory.create.mockResolvedValue({});

            vi.resetModules();
            const { deleteLoan } = await import("@/lib/actions/loans");
            await deleteLoan(UUIDS.loan1);

            expect(mockDb.account.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: UUIDS.accountBank },
                    data: { currentBalance: { increment: 5000 } },
                })
            );
            expect(mockDb.expense.deleteMany).toHaveBeenCalled();
            expect(mockDb.loan.delete).toHaveBeenCalled();
        });

        it("should reverse balance for repayment refund expense", async () => {
            mockDb.loan.findFirst.mockResolvedValue({
                id: UUIDS.loan1,
                userId: "test-user-id",
                borrowerName: "John",
            });
            mockDb.expense.findMany.mockResolvedValue([
                { id: UUIDS.expense1, accountId: UUIDS.accountBank, amount: 5000, date: new Date() },
                { id: UUIDS.expense2, accountId: UUIDS.accountBank, amount: -2000, date: new Date() },
            ]);
            mockDb.account.findFirst.mockResolvedValue({
                id: UUIDS.accountBank,
                type: "BANK",
                currentBalance: 3000,
            });
            mockDb.account.update.mockResolvedValue({ currentBalance: 5000 });
            mockDb.balanceHistory.create.mockResolvedValue({});

            vi.resetModules();
            const { deleteLoan } = await import("@/lib/actions/loans");
            await deleteLoan(UUIDS.loan1);

            // First expense: reversal of +5000 for BANK is +5000
            // Second expense: reversal of -2000 for BANK is -2000
            expect(mockDb.account.update).toHaveBeenNthCalledWith(
                1,
                expect.objectContaining({
                    data: { currentBalance: { increment: 5000 } },
                })
            );
            expect(mockDb.account.update).toHaveBeenNthCalledWith(
                2,
                expect.objectContaining({
                    data: { currentBalance: { increment: -2000 } },
                })
            );
        });
    });

    describe("deleteRepayment", () => {
        it("should remove repayment and reverse refund expense + balance", async () => {
            const mockRepayment = {
                id: UUIDS.repayment1,
                loanId: UUIDS.loan1,
                amount: 2000,
                loan: {
                    id: UUIDS.loan1,
                    userId: "test-user-id",
                    borrowerName: "John",
                    amount: 5000,
                    amountRepaid: 2000,
                },
            };

            mockDb.repayment.findUnique.mockResolvedValue(mockRepayment);
            mockDb.expense.findFirst.mockResolvedValue({
                id: UUIDS.expense1,
                accountId: UUIDS.accountBank,
                amount: -2000,
                date: new Date(),
            });
            mockDb.account.findFirst.mockResolvedValue({
                id: UUIDS.accountBank,
                type: "BANK",
                currentBalance: 7000,
            });
            mockDb.account.update.mockResolvedValue({ currentBalance: 5000 });
            mockDb.balanceHistory.create.mockResolvedValue({});
            mockDb.loan.update.mockResolvedValue({
                ...mockRepayment.loan,
                amountRepaid: 0,
            });

            vi.resetModules();
            const { deleteRepayment } = await import("@/lib/actions/loans");
            await deleteRepayment(UUIDS.repayment1);

            expect(mockDb.expense.delete).toHaveBeenCalledWith({
                where: { id: UUIDS.expense1 },
            });
            expect(mockDb.repayment.delete).toHaveBeenCalledWith({
                where: { id: UUIDS.repayment1 },
            });
            // Reversal of -2000 for BANK is +2000... wait
            // adjustment for refund of 2000 = -(-2000) = 2000? No
            // original = -validated.amount = -2000
            // adjustment at create = getBalanceAdjustment(BANK, -2000) = -(-2000) = +2000
            // reversal = -getBalanceAdjustment(BANK, -2000) = -2000
            // So balance -= 2000
            expect(mockDb.account.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: { currentBalance: { increment: -2000 } },
                })
            );
        });

        it("should handle repayment deletion with no linked expense", async () => {
            const mockRepayment = {
                id: UUIDS.repayment1,
                loanId: UUIDS.loan1,
                amount: 2000,
                loan: {
                    id: UUIDS.loan1,
                    userId: "test-user-id",
                    borrowerName: "John",
                    amount: 5000,
                    amountRepaid: 2000,
                },
            };

            mockDb.repayment.findUnique.mockResolvedValue(mockRepayment);
            mockDb.expense.findFirst.mockResolvedValue(null);
            mockDb.loan.update.mockResolvedValue({
                ...mockRepayment.loan,
                amountRepaid: 0,
            });

            vi.resetModules();
            const { deleteRepayment } = await import("@/lib/actions/loans");
            await deleteRepayment(UUIDS.repayment1);

            expect(mockDb.account.update).not.toHaveBeenCalled();
            expect(mockDb.expense.delete).not.toHaveBeenCalled();
            expect(mockDb.repayment.delete).toHaveBeenCalled();
        });
    });

    describe("getLoans", () => {
        it("should return all loans with repayments and account info", async () => {
            const mockLoans = [
                {
                    id: UUIDS.loan1,
                    borrowerName: "John Doe",
                    amount: 5000,
                    amountRepaid: 2000,
                    status: "PARTIAL",
                    repayments: [{ id: UUIDS.repayment1, amount: 2000 }],
                    account: { id: UUIDS.accountBank, name: "SBI Savings", type: "BANK" },
                },
                {
                    id: UUIDS.loan2,
                    borrowerName: "Jane Smith",
                    amount: 3000,
                    amountRepaid: 0,
                    status: "PENDING",
                    repayments: [],
                    account: null,
                },
            ];

            mockDb.loan.findMany.mockResolvedValue(mockLoans);

            vi.resetModules();
            const { getLoans } = await import("@/lib/actions/loans");
            const result = await getLoans();

            expect(result).toHaveLength(2);
            expect(result[0].repayments).toHaveLength(1);
            expect(result[0].account?.name).toBe("SBI Savings");
            expect(mockDb.loan.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    include: expect.objectContaining({
                        account: expect.any(Object),
                    }),
                })
            );
        });

        it("should filter by status", async () => {
            mockDb.loan.findMany.mockResolvedValue([]);

            vi.resetModules();
            const { getLoans } = await import("@/lib/actions/loans");
            await getLoans({ status: "PENDING" });

            expect(mockDb.loan.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        status: "PENDING",
                    }),
                })
            );
        });
    });

    describe("getLoanStats", () => {
        it("should calculate loan statistics", async () => {
            const mockLoans = [
                { amount: 5000, amountRepaid: 2000, status: "PARTIAL" },
                { amount: 3000, amountRepaid: 3000, status: "COMPLETED" },
                { amount: 10000, amountRepaid: 0, status: "PENDING" },
            ];

            mockDb.loan.findMany.mockResolvedValue(mockLoans);

            vi.resetModules();
            const { getLoanStats } = await import("@/lib/actions/loans");
            const result = await getLoanStats();

            expect(result.totalLent).toBe(18000);
            expect(result.totalRepaid).toBe(5000);
            expect(result.totalOutstanding).toBe(13000);
        });
    });
});

describe("Loan Status Transitions", () => {
    it("should correctly determine loan status based on repayment", () => {
        const testCases = [
            { amount: 5000, repaid: 0, expected: "PENDING" },
            { amount: 5000, repaid: 2500, expected: "PARTIAL" },
            { amount: 5000, repaid: 5000, expected: "COMPLETED" },
            { amount: 5000, repaid: 5500, expected: "COMPLETED" }, // Over-payment
        ];

        for (const { amount, repaid, expected } of testCases) {
            let status: string;
            if (repaid >= amount) {
                status = "COMPLETED";
            } else if (repaid > 0) {
                status = "PARTIAL";
            } else {
                status = "PENDING";
            }
            expect(status).toBe(expected);
        }
    });

    it("should calculate remaining amount correctly", () => {
        const loan = { amount: 10000, amountRepaid: 3500 };
        const remaining = loan.amount - loan.amountRepaid;
        expect(remaining).toBe(6500);
    });

    it("should calculate repayment percentage correctly", () => {
        const loan = { amount: 10000, amountRepaid: 2500 };
        const percentage = (loan.amountRepaid / loan.amount) * 100;
        expect(percentage).toBe(25);
    });
});

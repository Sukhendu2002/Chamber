import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database client
const mockDb = {
    loan: {
        create: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        aggregate: vi.fn(),
    },
    repayment: {
        create: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        delete: vi.fn(),
    },
};

vi.mock("@/lib/db", () => ({
    db: mockDb,
}));

describe("Loan Actions", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("createLoan", () => {
        it("should create a loan with required fields", async () => {
            const mockLoan = {
                id: "loan-1",
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
        });
    });

    describe("addRepayment", () => {
        it("should add repayment and update loan", async () => {
            const mockLoan = {
                id: "loan-1",
                userId: "test-user-id",
                amount: 5000,
                amountRepaid: 0,
                status: "PENDING",
            };

            const mockRepayment = {
                id: "repayment-1",
                loanId: "loan-1",
                amount: 2000,
                date: new Date(),
                note: "First payment",
                receiptUrls: [],
                createdAt: new Date(),
            };

            mockDb.loan.findFirst.mockResolvedValue(mockLoan);
            mockDb.repayment.create.mockResolvedValue(mockRepayment);
            mockDb.loan.update.mockResolvedValue({
                ...mockLoan,
                amountRepaid: 2000,
                status: "PARTIAL",
            });

            vi.resetModules();
            const { addRepayment } = await import("@/lib/actions/loans");

            const result = await addRepayment({
                loanId: "loan-1",
                amount: 2000,
                date: new Date(),
                note: "First payment",
            });

            expect(result.id).toBe("repayment-1");
            expect(result.amount).toBe(2000);
            expect(mockDb.loan.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        status: "PARTIAL",
                    }),
                })
            );
        });

        it("should mark loan as COMPLETED when fully repaid", async () => {
            const mockLoan = {
                id: "loan-1",
                userId: "test-user-id",
                amount: 5000,
                amountRepaid: 3000,
                status: "PARTIAL",
            };

            mockDb.loan.findFirst.mockResolvedValue(mockLoan);
            mockDb.repayment.create.mockResolvedValue({
                id: "repayment-2",
                loanId: "loan-1",
                amount: 2000,
                date: new Date(),
                note: "Final payment",
                receiptUrls: [],
                createdAt: new Date(),
            });
            mockDb.loan.update.mockResolvedValue({
                ...mockLoan,
                amountRepaid: 5000,
                status: "COMPLETED",
            });

            vi.resetModules();
            const { addRepayment } = await import("@/lib/actions/loans");

            await addRepayment({
                loanId: "loan-1",
                amount: 2000,
                date: new Date(),
                note: "Final payment",
            });

            expect(mockDb.loan.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        status: "COMPLETED",
                    }),
                })
            );
        });
    });

    describe("getLoans", () => {
        it("should return all loans with repayments", async () => {
            const mockLoans = [
                {
                    id: "loan-1",
                    borrowerName: "John Doe",
                    amount: 5000,
                    amountRepaid: 2000,
                    status: "PARTIAL",
                    repayments: [{ id: "repayment-1", amount: 2000 }],
                },
                {
                    id: "loan-2",
                    borrowerName: "Jane Smith",
                    amount: 3000,
                    amountRepaid: 0,
                    status: "PENDING",
                    repayments: [],
                },
            ];

            mockDb.loan.findMany.mockResolvedValue(mockLoans);

            vi.resetModules();
            const { getLoans } = await import("@/lib/actions/loans");
            const result = await getLoans();

            expect(result).toHaveLength(2);
            expect(result[0].repayments).toHaveLength(1);
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

    describe("deleteLoan", () => {
        it("should delete a loan", async () => {
            mockDb.loan.findFirst.mockResolvedValue({
                id: "loan-1",
                userId: "test-user-id",
            });
            mockDb.loan.delete.mockResolvedValue({ id: "loan-1" });

            vi.resetModules();
            const { deleteLoan } = await import("@/lib/actions/loans");
            await deleteLoan("loan-1");

            expect(mockDb.loan.delete).toHaveBeenCalledWith({
                where: { id: "loan-1" },
            });
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

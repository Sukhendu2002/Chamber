"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export type ReceiptExpense = {
    id: string;
    date: Date;
    amount: number;
    category: string;
    merchant: string | null;
    description: string | null;
    receiptCount: number;
    thumbnailUrl: string;
    thumbnailIsPdf: boolean;
};

export async function getExpensesWithReceipts(options?: {
    search?: string;
    category?: string;
}): Promise<ReceiptExpense[]> {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const where: Record<string, unknown> = {
        userId,
        OR: [
            { receiptUrl: { not: null } },
            { receiptUrls: { isEmpty: false } },
        ],
    };

    if (options?.category && options.category !== "All") {
        where.category = options.category;
        delete where.OR;
        where.AND = [
            { category: options.category },
            {
                OR: [
                    { receiptUrl: { not: null } },
                    { receiptUrls: { isEmpty: false } },
                ],
            },
        ];
    }

    if (options?.search) {
        const searchConditions = [
            { description: { contains: options.search, mode: "insensitive" as const } },
            { merchant: { contains: options.search, mode: "insensitive" as const } },
            { category: { contains: options.search, mode: "insensitive" as const } },
        ];
        if (options?.category && options.category !== "All") {
            // Already handled with AND above, add search to AND clause
            (where.AND as Record<string, unknown>[]).push({ OR: searchConditions });
            delete where.OR;
        } else {
            // Combine receipt filter + search
            where.AND = [
                {
                    OR: [
                        { receiptUrl: { not: null } },
                        { receiptUrls: { isEmpty: false } },
                    ],
                },
                { OR: searchConditions },
            ];
            delete where.OR;
        }
    }

    const expenses = await db.expense.findMany({
        where,
        orderBy: [{ date: "desc" }, { id: "desc" }],
        select: {
            id: true,
            date: true,
            amount: true,
            category: true,
            merchant: true,
            description: true,
            receiptUrl: true,
            receiptUrls: true,
        },
    });

    return expenses.map((e) => {
        const receipts: string[] = [...(e.receiptUrls || [])];
        if (e.receiptUrl && !receipts.includes(e.receiptUrl)) {
            receipts.unshift(e.receiptUrl);
        }
        const firstKey = receipts[0] || "";
        const isPdf = firstKey.toLowerCase().endsWith(".pdf");
        return {
            id: e.id,
            date: e.date,
            amount: e.amount,
            category: e.category,
            merchant: e.merchant,
            description: e.description,
            receiptCount: receipts.length,
            thumbnailUrl: `/api/receipt/${e.id}?index=0`,
            thumbnailIsPdf: isPdf,
        };
    });
}

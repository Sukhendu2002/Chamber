import { getExpensesWithReceipts } from "@/lib/actions/receipts";
import { getUserSettings } from "@/lib/actions/settings";
import { ReceiptGallery } from "@/components/receipt-gallery";

export default async function ReceiptsPage({
    searchParams,
}: {
    searchParams: Promise<{ search?: string; category?: string }>;
}) {
    const params = await searchParams;
    const search = params.search || "";
    const category = params.category || "";

    const [expenses, settings] = await Promise.all([
        getExpensesWithReceipts({
            search: search || undefined,
            category: category || undefined,
        }),
        getUserSettings(),
    ]);

    return (
        <div className="p-4 md:p-6">
            {/* Header */}
            <div className="mb-6 sm:mb-8">
                <h1 className="text-2xl font-bold">Receipts</h1>
                <p className="text-sm text-muted-foreground">
                    All your uploaded receipts in one place
                </p>
            </div>

            <ReceiptGallery
                expenses={expenses}
                currency={settings.currency}
                currentSearch={search}
                currentCategory={category}
            />
        </div>
    );
}

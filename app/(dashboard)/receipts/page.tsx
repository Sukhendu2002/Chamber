import { getExpensesWithReceipts } from "@/lib/actions/receipts";
import { getUserSettings } from "@/lib/actions/settings";
import { ReceiptGallery } from "@/components/receipt-gallery";
import { PageShell } from "@/components/page-shell";

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
        <PageShell>
            <ReceiptGallery
                key={`${search}:${category}`}
                expenses={expenses}
                currency={settings.currency}
                currentSearch={search}
                currentCategory={category}
            />
        </PageShell>
    );
}

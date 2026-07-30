import { getAccounts, getAccountStats } from "@/lib/actions/accounts";
import { getUserSettings } from "@/lib/actions/settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  IconBuildingBank, 
  IconChartLine, 
  IconWallet, 
  IconCash,
  IconCoin,
  IconCreditCard,
} from "@tabler/icons-react";
import { AccountList } from "@/components/account-list";
import { AddAccountDialog } from "@/components/add-account-dialog";
import { BankTransferDialog } from "@/components/bank-transfer-dialog";
import { HiddenAmount } from "@/components/hidden-amount";
import { PageHeader, PageShell } from "@/components/page-shell";

export default async function AccountsPage() {
  const [accounts, stats, settings] = await Promise.all([
    getAccounts(),
    getAccountStats(),
    getUserSettings(),
  ]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: settings.currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };
  const summaryItems = [
    {
      label: "Net Worth",
      amount: stats.totalNetWorth,
      icon: IconCoin,
      valueClassName: "",
      note: `${stats.accountCount} accounts`,
    },
    {
      label: "Card Debt",
      amount: stats.totalCreditCardOutstanding,
      icon: IconCreditCard,
      valueClassName: "text-red-600",
      note:
        stats.totalCardCredit > 0
          ? `${formatCurrency(stats.totalCardCredit)} card credit`
          : undefined,
    },
    {
      label: "Bank Balance",
      amount: stats.totalBankBalance,
      icon: IconBuildingBank,
      valueClassName: "text-blue-600",
    },
    {
      label: "Investments",
      amount: stats.totalInvestments,
      icon: IconChartLine,
      valueClassName: "text-green-600",
    },
    {
      label: "Wallet",
      amount: stats.totalWallet,
      icon: IconWallet,
      valueClassName: "text-purple-600",
    },
    {
      label: "Cash",
      amount: stats.totalCash,
      icon: IconCash,
      valueClassName: "text-yellow-600",
    },
  ];

  return (
    <PageShell className="flex flex-col gap-4">
      <PageHeader
        className="mb-0"
        title="Accounts"
        description="Track assets, card liabilities, and net worth"
        actions={
          <>
          <BankTransferDialog
            accounts={accounts
              .filter((account) => account.type !== "CREDIT_CARD")
              .map((account) => ({
                id: account.id,
                name: account.name,
                type: account.type,
                currentBalance: account.currentBalance,
              }))}
            currency={settings.currency}
          />
          <AddAccountDialog currency={settings.currency} />
          </>
        }
      />

      {/* Compact account summary */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border bg-border md:grid-cols-3 xl:grid-cols-6">
        {summaryItems.map((item) => (
          <div key={item.label} className="min-w-0 bg-card p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="truncate text-xs font-medium text-muted-foreground">{item.label}</p>
              <item.icon className="size-4 shrink-0 text-muted-foreground" />
            </div>
            <HiddenAmount
              amount={formatCurrency(item.amount)}
              className={`truncate text-lg font-bold tabular-nums ${item.valueClassName}`}
            />
            {item.note && (
              <p className="mt-0.5 truncate text-[0.6875rem] text-muted-foreground">
                {item.note}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Accounts List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            All Accounts ({accounts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AccountList accounts={accounts} currency={settings.currency} />
        </CardContent>
      </Card>
    </PageShell>
  );
}

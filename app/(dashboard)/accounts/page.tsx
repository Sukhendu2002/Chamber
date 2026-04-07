import { getAccounts, getAccountStats } from "@/lib/actions/accounts";
import { getUserSettings } from "@/lib/actions/settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  IconBuildingBank, 
  IconChartLine, 
  IconWallet, 
  IconCash,
  IconCoin
} from "@tabler/icons-react";
import { AccountList } from "@/components/account-list";
import { AddAccountDialog } from "@/components/add-account-dialog";
import { BankTransferDialog } from "@/components/bank-transfer-dialog";
import { HiddenAmount } from "@/components/hidden-amount";

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

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Accounts</h1>
          <p className="text-muted-foreground">
            Track your bank balances and investments
          </p>
        </div>
        <div className="flex items-center gap-2">
          <BankTransferDialog
            accounts={accounts.map((a) => ({
              id: a.id,
              name: a.name,
              type: a.type,
              currentBalance: a.currentBalance,
            }))}
            currency={settings.currency}
          />
          <AddAccountDialog currency={settings.currency} />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Worth</CardTitle>
            <IconCoin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <HiddenAmount amount={formatCurrency(stats.totalNetWorth)} className="text-2xl font-bold" />
            <p className="text-xs text-muted-foreground">
              {stats.accountCount} accounts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bank Balance</CardTitle>
            <IconBuildingBank className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <HiddenAmount amount={formatCurrency(stats.totalBankBalance)} className="text-2xl font-bold text-blue-600" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Investments</CardTitle>
            <IconChartLine className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <HiddenAmount amount={formatCurrency(stats.totalInvestments)} className="text-2xl font-bold text-green-600" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wallet</CardTitle>
            <IconWallet className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <HiddenAmount amount={formatCurrency(stats.totalWallet)} className="text-2xl font-bold text-purple-600" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cash</CardTitle>
            <IconCash className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <HiddenAmount amount={formatCurrency(stats.totalCash)} className="text-2xl font-bold text-yellow-600" />
          </CardContent>
        </Card>
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
    </div>
  );
}

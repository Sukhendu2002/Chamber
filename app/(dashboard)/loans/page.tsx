import { getLoans, getLoanStats } from "@/lib/actions/loans";
import { getUserSettings } from "@/lib/actions/settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IconCash, IconCashOff, IconUsers, IconCheck } from "@tabler/icons-react";
import { LoanList } from "@/components/loan-list";
import { AddLoanDialog } from "@/components/add-loan-dialog";

export default async function LoansPage() {
  const [loans, stats, settings] = await Promise.all([
    getLoans(),
    getLoanStats(),
    getUserSettings(),
  ]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: settings.currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Lent Money</h1>
          <p className="text-muted-foreground">
            Track money you&apos;ve lent to others
          </p>
        </div>
        <AddLoanDialog currency={settings.currency} />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Lent</CardTitle>
            <IconCash className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalLent)}</div>
            <p className="text-xs text-muted-foreground">
              Across {stats.totalLoans} loans
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <IconCashOff className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(stats.totalOutstanding)}
            </div>
            <p className="text-xs text-muted-foreground">
              Yet to be repaid
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <IconUsers className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingCount}</div>
            <p className="text-xs text-muted-foreground">
              Active loans
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <IconCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completedCount}</div>
            <p className="text-xs text-muted-foreground">
              Fully repaid
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Loans List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            All Loans ({loans.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LoanList loans={loans} currency={settings.currency} />
        </CardContent>
      </Card>
    </div>
  );
}

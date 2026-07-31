"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import { toLocalDateString } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CreditCardPaymentDialog } from "@/components/credit-card-payment-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  IconChevronDown,
  IconDotsVertical,
  IconRefresh,
  IconTrash,
  IconEdit,
  IconBuildingBank,
  IconChartLine,
  IconWallet,
  IconCash,
  IconQuestionMark,
  IconHistory,
  IconBrandTelegram,
  IconCalculator,
} from "@tabler/icons-react";
import { 
  updateBalance, 
  deleteAccount, 
  updateAccount,
  getAccountWithHistory,
  deleteBalanceHistory,
  toggleShowOnTelegram,
  toggleIncludeInNetWorth,
} from "@/lib/actions/accounts";

type BalanceHistoryItem = {
  id: string;
  balance: number;
  date: Date;
  note: string | null;
};

type Account = {
  id: string;
  name: string;
  type: "BANK" | "INVESTMENT" | "WALLET" | "CASH" | "CREDIT_CARD" | "DEBIT_CARD" | "OTHER";
  currentBalance: number;
  creditLimit: number | null;
  description: string | null;
  isActive: boolean;
  showOnTelegram: boolean;
  includeInNetWorth: boolean;
  balanceHistory: BalanceHistoryItem[];
};

type AccountListProps = {
  accounts: Account[];
  currency: string;
};

type AccountGroupId =
  | "banking"
  | "credit-cards"
  | "investments"
  | "wallets-cash"
  | "other";

type AccountGroup = {
  id: AccountGroupId;
  label: string;
  types: Account["type"][];
  iconType: Account["type"];
};

const accountTypes = [
  { value: "BANK", label: "Bank Account" },
  { value: "CREDIT_CARD", label: "Credit Card" },
  { value: "DEBIT_CARD", label: "Debit Card" },
  { value: "INVESTMENT", label: "Investment" },
  { value: "WALLET", label: "Digital Wallet" },
  { value: "CASH", label: "Cash" },
  { value: "OTHER", label: "Other" },
];

const ACCOUNT_GROUPS: AccountGroup[] = [
  {
    id: "banking",
    label: "Banking",
    types: ["BANK", "DEBIT_CARD"],
    iconType: "BANK",
  },
  {
    id: "credit-cards",
    label: "Credit cards",
    types: ["CREDIT_CARD"],
    iconType: "CREDIT_CARD",
  },
  {
    id: "investments",
    label: "Investments",
    types: ["INVESTMENT"],
    iconType: "INVESTMENT",
  },
  {
    id: "wallets-cash",
    label: "Wallets & cash",
    types: ["WALLET", "CASH"],
    iconType: "WALLET",
  },
  {
    id: "other",
    label: "Other",
    types: ["OTHER"],
    iconType: "OTHER",
  },
];

export function AccountList({ accounts, currency }: AccountListProps) {
  const router = useRouter();
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [historyData, setHistoryData] = useState<BalanceHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Update balance form
  const [newBalance, setNewBalance] = useState("");
  const [updateNote, setUpdateNote] = useState("");
  const [updateDate, setUpdateDate] = useState(toLocalDateString());

  // Edit form
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState<Account["type"]>("BANK");
  const [editDescription, setEditDescription] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<AccountGroupId>>(
    new Set()
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getTypeIcon = (type: Account["type"]) => {
    switch (type) {
      case "BANK":
        return <IconBuildingBank className="h-4 w-4 text-blue-500" />;
      case "INVESTMENT":
        return <IconChartLine className="h-4 w-4 text-green-500" />;
      case "WALLET":
        return <IconWallet className="h-4 w-4 text-purple-500" />;
      case "CASH":
        return <IconCash className="h-4 w-4 text-yellow-500" />;
      case "CREDIT_CARD":
        return <IconWallet className="h-4 w-4 text-red-500" />;
      case "DEBIT_CARD":
        return <IconWallet className="h-4 w-4 text-orange-500" />;
      default:
        return <IconQuestionMark className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTypeBadge = (type: Account["type"]) => {
    const colors: Record<Account["type"], string> = {
      BANK: "bg-blue-500",
      INVESTMENT: "bg-green-500",
      WALLET: "bg-purple-500",
      CASH: "bg-yellow-500",
      CREDIT_CARD: "bg-red-500",
      DEBIT_CARD: "bg-orange-500",
      OTHER: "bg-gray-500",
    };
    return <Badge className={colors[type]}>{type}</Badge>;
  };

  const populatedGroups = ACCOUNT_GROUPS.map((group) => ({
    ...group,
    accounts: accounts.filter((account) => group.types.includes(account.type)),
  })).filter((group) => group.accounts.length > 0);

  const allGroupsCollapsed = populatedGroups.every((group) =>
    collapsedGroups.has(group.id)
  );

  const toggleGroup = (groupId: AccountGroupId) => {
    setCollapsedGroups((current) => {
      const next = new Set(current);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const toggleAllGroups = () => {
    setCollapsedGroups(
      allGroupsCollapsed
        ? new Set()
        : new Set(populatedGroups.map((group) => group.id))
    );
  };

  const getGroupSummary = (
    group: (typeof populatedGroups)[number]
  ): string => {
    const total = group.accounts.reduce(
      (sum, account) => sum + account.currentBalance,
      0
    );

    if (group.id !== "credit-cards") {
      return formatCurrency(total);
    }

    if (total < 0) {
      return `${formatCurrency(Math.abs(total))} credit`;
    }

    return `${formatCurrency(total)} outstanding`;
  };

  const renderGroupToggle = (
    group: (typeof populatedGroups)[number],
    contentId: string
  ) => {
    const isCollapsed = collapsedGroups.has(group.id);

    return (
      <button
        type="button"
        className="flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 bg-muted/35 px-3 py-2 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        aria-expanded={!isCollapsed}
        aria-controls={contentId}
        onClick={() => toggleGroup(group.id)}
      >
        <span className="flex min-w-0 items-center gap-2">
          {getTypeIcon(group.iconType)}
          <span className="truncate text-sm font-semibold">{group.label}</span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {group.accounts.length}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span className="text-xs font-medium tabular-nums text-muted-foreground sm:text-sm">
            {getGroupSummary(group)}
          </span>
          <IconChevronDown
            className={`size-4 text-muted-foreground transition-transform ${
              isCollapsed ? "-rotate-90" : ""
            }`}
            aria-hidden="true"
          />
        </span>
      </button>
    );
  };

  const openUpdateDialog = (account: Account) => {
    setSelectedAccount(account);
    setNewBalance(account.currentBalance.toString());
    setUpdateNote("");
    setUpdateDate(toLocalDateString());
    setShowUpdateDialog(true);
  };

  const openEditDialog = (account: Account) => {
    setSelectedAccount(account);
    setEditName(account.name);
    setEditType(account.type);
    setEditDescription(account.description || "");
    setShowEditDialog(true);
  };

  const openDeleteDialog = (account: Account) => {
    setSelectedAccount(account);
    setShowDeleteDialog(true);
  };

  const openHistoryDialog = async (account: Account) => {
    setSelectedAccount(account);
    setLoading(true);
    try {
      const accountWithHistory = await getAccountWithHistory(account.id, 12);
      if (accountWithHistory) {
        setHistoryData(accountWithHistory.balanceHistory.reverse());
      }
      setShowHistoryDialog(true);
    } catch (error) {
      console.error("Failed to load history:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBalance = async () => {
    if (!selectedAccount || !newBalance) return;

    setLoading(true);
    try {
      await updateBalance({
        accountId: selectedAccount.id,
        newBalance: parseFloat(newBalance),
        note: updateNote || undefined,
        date: new Date(updateDate),
      });
      setShowUpdateDialog(false);
      router.refresh();
    } catch (error) {
      console.error("Failed to update balance:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditAccount = async () => {
    if (!selectedAccount) return;

    setLoading(true);
    try {
      await updateAccount(selectedAccount.id, {
        name: editName,
        type: editType,
        description: editDescription || undefined,
      });
      setShowEditDialog(false);
      router.refresh();
    } catch (error) {
      console.error("Failed to update account:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!selectedAccount) return;

    setLoading(true);
    try {
      await deleteAccount(selectedAccount.id);
      setShowDeleteDialog(false);
      router.refresh();
    } catch (error) {
      console.error("Failed to delete account:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteHistoryEntry = async (historyId: string) => {
    setLoading(true);
    try {
      await deleteBalanceHistory(historyId);
      // Refresh history data
      if (selectedAccount) {
        const accountWithHistory = await getAccountWithHistory(selectedAccount.id, 12);
        if (accountWithHistory) {
          setHistoryData(accountWithHistory.balanceHistory.reverse());
        }
      }
      router.refresh();
    } catch (error) {
      console.error("Failed to delete history entry:", error);
    } finally {
      setLoading(false);
    }
  };

  const currencySymbol = currency === "INR" ? "₹" : currency === "USD" ? "$" : currency === "EUR" ? "€" : "£";

  if (accounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <IconBuildingBank className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">No accounts yet</h3>
        <p className="text-sm text-muted-foreground">
          Add your bank accounts and investments to track
        </p>
      </div>
    );
  }

  const renderAccountMenu = (account: Account) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <IconDotsVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => openUpdateDialog(account)}>
          <IconRefresh className="mr-2 h-4 w-4" />
          Update Balance
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => openHistoryDialog(account)}>
          <IconHistory className="mr-2 h-4 w-4" />
          View History
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => openEditDialog(account)}>
          <IconEdit className="mr-2 h-4 w-4" />
          Edit Account
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={async () => {
            await toggleShowOnTelegram(account.id);
            router.refresh();
          }}
        >
          <IconBrandTelegram className="mr-2 h-4 w-4" />
          {account.showOnTelegram ? "Hide from Telegram" : "Show on Telegram"}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={async () => {
            await toggleIncludeInNetWorth(account.id);
            router.refresh();
          }}
        >
          <IconCalculator className="mr-2 h-4 w-4" />
          {account.includeInNetWorth ? "Exclude from Net Worth" : "Include in Net Worth"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive"
          onClick={() => openDeleteDialog(account)}
        >
          <IconTrash className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const renderCreditCardBalance = (account: Account) => {
    const outstanding = Math.max(account.currentBalance, 0);
    const cardCredit = Math.max(-account.currentBalance, 0);
    const utilization = account.creditLimit
      ? (outstanding / account.creditLimit) * 100
      : 0;
    const utilizationColor =
      utilization > 60 ? "bg-red-500" :
      utilization > 30 ? "bg-yellow-500" :
      "bg-green-500";
    return (
      <div className="space-y-2">
        {outstanding > 0 ? (
          <div className="font-bold text-red-600">
            {formatCurrency(outstanding)} outstanding
          </div>
        ) : cardCredit > 0 ? (
          <div className="font-bold text-green-600">
            {formatCurrency(cardCredit)} card credit
          </div>
        ) : (
          <div className="font-bold text-green-600">No outstanding balance</div>
        )}
        {account.creditLimit && (
          <>
            <div className="text-xs text-muted-foreground">
              {formatCurrency(account.creditLimit - account.currentBalance)} available / {formatCurrency(account.creditLimit)} limit
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-24 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${utilizationColor}`}
                  style={{ width: `${Math.min(utilization, 100)}%` }}
                />
              </div>
              <span className={`text-xs font-medium ${utilization > 30 ? "text-red-600" : "text-green-600"}`}>
                {utilization.toFixed(0)}%
              </span>
            </div>
            {utilization > 30 && (
              <div className="text-xs text-red-600 font-medium">
                Over 30% utilization
              </div>
            )}
          </>
        )}
        {outstanding > 0 && (
          <CreditCardPaymentDialog
            accounts={accounts}
            currency={currency}
            cardAccountId={account.id}
          />
        )}
      </div>
    );
  };

  return (
    <>
      <div className="mb-2 flex min-h-8 items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Grouped by account type
        </p>
        {populatedGroups.length > 1 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={toggleAllGroups}
          >
            {allGroupsCollapsed ? "Expand all" : "Collapse all"}
          </Button>
        )}
      </div>

      {/* Mobile card layout */}
      <div className="space-y-2 md:hidden">
        {populatedGroups.map((group) => {
          const contentId = `account-group-${group.id}-mobile`;
          const isCollapsed = collapsedGroups.has(group.id);

          return (
            <section
              key={group.id}
              className="overflow-hidden rounded-sm border"
            >
              {renderGroupToggle(group, contentId)}
              {!isCollapsed && (
                <div id={contentId} className="divide-y border-t">
                  {group.accounts.map((account) => {
                    const lastUpdate = account.balanceHistory[0];

                    return (
                      <div key={account.id} className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2">
                            {getTypeIcon(account.type)}
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 font-medium">
                                <span className="truncate">{account.name}</span>
                                {account.showOnTelegram && (
                                  <IconBrandTelegram className="h-3.5 w-3.5 shrink-0 text-blue-400" />
                                )}
                                {!account.includeInNetWorth && (
                                  <IconCalculator
                                    className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                                    title="Excluded from Net Worth"
                                  />
                                )}
                              </div>
                              {account.description && (
                                <div className="truncate text-xs text-muted-foreground">
                                  {account.description}
                                </div>
                              )}
                            </div>
                          </div>
                          {renderAccountMenu(account)}
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <div>
                            {account.type === "CREDIT_CARD" ? (
                              renderCreditCardBalance(account)
                            ) : (
                              <div className="font-bold">
                                {formatCurrency(account.currentBalance)}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {getTypeBadge(account.type)}
                          </div>
                        </div>
                        {lastUpdate && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            Updated: {formatDate(lastUpdate.date)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {/* Desktop table layout */}
      <div className="hidden overflow-hidden rounded-sm border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Account</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Current Balance</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          {populatedGroups.map((group) => {
            const contentId = `account-group-${group.id}-desktop`;
            const isCollapsed = collapsedGroups.has(group.id);

            return (
              <Fragment key={group.id}>
                <TableBody>
                  <TableRow className="border-b hover:bg-transparent">
                    <TableCell colSpan={5} className="h-auto p-0">
                      {renderGroupToggle(group, contentId)}
                    </TableCell>
                  </TableRow>
                </TableBody>
                {!isCollapsed && (
                  <TableBody id={contentId}>
                    {group.accounts.map((account) => {
                      const lastUpdate = account.balanceHistory[0];

                      return (
                        <TableRow key={account.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getTypeIcon(account.type)}
                              <div>
                                <div className="flex items-center gap-1.5 font-medium">
                                  {account.name}
                                  {account.showOnTelegram && (
                                    <IconBrandTelegram
                                      className="h-3.5 w-3.5 text-blue-400"
                                      title="Visible on Telegram"
                                    />
                                  )}
                                  {!account.includeInNetWorth && (
                                    <IconCalculator
                                      className="h-3.5 w-3.5 text-muted-foreground"
                                      title="Excluded from Net Worth"
                                    />
                                  )}
                                </div>
                                {account.description && (
                                  <div className="text-xs text-muted-foreground">
                                    {account.description}
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{getTypeBadge(account.type)}</TableCell>
                          <TableCell className="font-bold">
                            {account.type === "CREDIT_CARD"
                              ? renderCreditCardBalance(account)
                              : formatCurrency(account.currentBalance)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {lastUpdate ? formatDate(lastUpdate.date) : "-"}
                          </TableCell>
                          <TableCell>{renderAccountMenu(account)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                )}
              </Fragment>
            );
          })}
        </Table>
      </div>

      {/* Update Balance Dialog */}
      <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedAccount?.type === "CREDIT_CARD"
                ? "Reconcile card outstanding"
                : "Update Balance"}
            </DialogTitle>
            <DialogDescription>
              {selectedAccount?.type === "CREDIT_CARD"
                ? `Use this only to reconcile ${selectedAccount.name} with the issuer. Use Pay card to record a bill payment.`
                : `Update the current balance for ${selectedAccount?.name}`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Previous Balance</Label>
              <div className="text-lg font-bold">
                {selectedAccount && formatCurrency(selectedAccount.currentBalance)}
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="newBalance">
                {selectedAccount?.type === "CREDIT_CARD"
                  ? "Current outstanding *"
                  : "New Balance *"}
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {currencySymbol}
                </span>
                <Input
                  id="newBalance"
                  type="number"
                  placeholder="0.00"
                  className="pl-8"
                  value={newBalance}
                  onChange={(e) => setNewBalance(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="updateDate">Date</Label>
              <Input
                id="updateDate"
                type="date"
                value={updateDate}
                max={toLocalDateString()}
                onChange={(e) => setUpdateDate(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="updateNote">Note (optional)</Label>
              <Textarea
                id="updateNote"
                placeholder="Reason for update"
                value={updateNote}
                onChange={(e) => setUpdateNote(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpdateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateBalance} disabled={loading || !newBalance}>
              {loading ? "Updating..." : "Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Account Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Account</DialogTitle>
            <DialogDescription>
              Update account details
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="editName">Account Name *</Label>
              <Input
                id="editName"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="editType">Account Type</Label>
              <Select value={editType} onValueChange={(v) => setEditType(v as Account["type"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {accountTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="editDescription">Description</Label>
              <Textarea
                id="editDescription"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditAccount} disabled={loading || !editName}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedAccount?.name} and all its balance history.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Balance History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Balance History</DialogTitle>
            <DialogDescription>
              {selectedAccount?.name} - All balance updates
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            {historyData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No history records found
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyData.map((entry, index) => {
                    const prevEntry = historyData[index + 1];
                    const change = prevEntry ? entry.balance - prevEntry.balance : 0;
                    // For credit cards, balance increase = more debt (bad/red), decrease = paying off (good/green)
                    // For all other accounts, balance increase = good (green), decrease = bad (red)
                    const isCreditCard = selectedAccount?.type === "CREDIT_CARD";
                    const isPositiveChange = isCreditCard ? change < 0 : change > 0;

                    return (
                      <TableRow key={entry.id}>
                        <TableCell>{formatDate(entry.date)}</TableCell>
                        <TableCell>
                          <div className="font-medium">{formatCurrency(entry.balance)}</div>
                          {change !== 0 && (
                            <div className={`text-xs ${isPositiveChange ? "text-green-600" : "text-red-600"}`}>
                              {change > 0 ? "+" : ""}{formatCurrency(change)}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {entry.note || "-"}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleDeleteHistoryEntry(entry.id)}
                            disabled={loading || historyData.length === 1}
                            title={historyData.length === 1 ? "Cannot delete last entry" : "Delete"}
                          >
                            <IconTrash className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHistoryDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

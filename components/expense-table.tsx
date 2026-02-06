"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  IconEdit,
  IconTrash,
  IconArrowUp,
  IconArrowDown,
  IconUpload,
  IconPhoto,
  IconX,
} from "@tabler/icons-react";
import { updateExpense, deleteExpense } from "@/lib/actions/expenses";

type AccountOption = {
  id: string;
  name: string;
  type: string;
};

const categories = [
  "Food",
  "Travel",
  "Entertainment",
  "Bills",
  "Shopping",
  "Health",
  "Education",
  "Investments",
  "Subscription",
  "General",
];

const sourceColors: Record<string, string> = {
  TELEGRAM: "bg-blue-100 text-blue-800",
  WEB: "bg-green-100 text-green-800",
  STATEMENT: "bg-purple-100 text-purple-800",
};

type Expense = {
  id: string;
  amount: number;
  category: string;
  merchant: string | null;
  description: string | null;
  source: string;
  paymentMethod: string | null;
  accountId: string | null;
  date: Date;
  isVerified: boolean;
  receiptUrl: string | null;  // Legacy single receipt
  receiptUrls: string[];      // Multiple receipts array
};

type SortField = "date" | "amount" | "category";
type SortOrder = "asc" | "desc";

type ExpenseTableProps = {
  expenses: Expense[];
  currency: string;
  accounts?: AccountOption[];
};

export function ExpenseTable({ expenses: initialExpenses, currency, accounts = [] }: ExpenseTableProps) {
  const router = useRouter();
  const [expenses, setExpenses] = useState(initialExpenses);
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // Sync state with props when they change (e.g., from SSE refresh)
  useEffect(() => {
    setExpenses(initialExpenses);
  }, [initialExpenses]);
  
  // Edit state
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editMerchant, setEditMerchant] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editAccountId, setEditAccountId] = useState("");
  const [editReceipt, setEditReceipt] = useState<File | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  
  // Delete state
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [reverseBalance, setReverseBalance] = useState(true);

  // Receipt state
  const [viewingReceipt, setViewingReceipt] = useState<string | null>(null);
  const [uploadingExpenseId, setUploadingExpenseId] = useState<string | null>(null);

  // Custom setters to ensure only one dialog is open at a time
  const openReceiptViewer = (expenseId: string) => {
    setEditingExpense(null);
    setDeletingExpense(null);
    setViewingReceipt(expenseId);
  };

  const openEditDialogSafe = (expense: Expense) => {
    setViewingReceipt(null);
    setDeletingExpense(null);
    openEditDialog(expense);
  };

  const handleReceiptUpload = async (expenseId: string, file: File) => {
    setUploadingExpenseId(expenseId);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("expenseId", expenseId);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        router.refresh();
      } else {
        const errorData = await response.json();
        console.error("Upload failed:", errorData);
        alert(`Upload failed: ${errorData.details || errorData.error}`);
      }
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setUploadingExpenseId(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Get all receipts for an expense (combining legacy receiptUrl and new receiptUrls array)
  const getReceipts = (expense: Expense): string[] => {
    const receipts: string[] = [...(expense.receiptUrls || [])];
    if (expense.receiptUrl && !receipts.includes(expense.receiptUrl)) {
      receipts.unshift(expense.receiptUrl);
    }
    return receipts;
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const sortedExpenses = [...expenses].sort((a, b) => {
    let comparison = 0;
    switch (sortField) {
      case "date":
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
        break;
      case "amount":
        comparison = a.amount - b.amount;
        break;
      case "category":
        comparison = a.category.localeCompare(b.category);
        break;
    }
    return sortOrder === "asc" ? comparison : -comparison;
  });

  const openEditDialog = (expense: Expense) => {
    setViewingReceipt(null); // Close receipt viewer if open
    setEditingExpense(expense);
    setEditAmount(expense.amount.toString());
    setEditCategory(expense.category);
    setEditDescription(expense.description || "");
    setEditMerchant(expense.merchant || "");
    setEditDate(new Date(expense.date).toISOString().split("T")[0]);
    setEditAccountId(expense.accountId || "");
    setEditReceipt(null);
  };

  const handleEdit = async () => {
    if (!editingExpense) return;
    setEditLoading(true);
    try {
      const accountName = accounts.find(a => a.id === editAccountId)?.name;
      await updateExpense(editingExpense.id, {
        amount: parseFloat(editAmount),
        category: editCategory,
        description: editDescription || undefined,
        merchant: editMerchant || undefined,
        date: new Date(editDate),
        paymentMethod: accountName || undefined,
        accountId: editAccountId || undefined,
      });

      // If there's a new receipt, upload it
      if (editReceipt) {
        const formData = new FormData();
        formData.append("file", editReceipt);
        formData.append("expenseId", editingExpense.id);
        await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
      }

      setEditingExpense(null);
      router.refresh();
    } catch (error) {
      console.error("Failed to update expense:", error);
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingExpense) return;
    setDeleteLoading(true);
    try {
      await deleteExpense(deletingExpense.id, reverseBalance);
      setDeletingExpense(null);
      setReverseBalance(true);
      router.refresh();
    } catch (error) {
      console.error("Failed to delete expense:", error);
    } finally {
      setDeleteLoading(false);
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortOrder === "asc" ? (
      <IconArrowUp className="ml-1 h-3 w-3 inline" />
    ) : (
      <IconArrowDown className="ml-1 h-3 w-3 inline" />
    );
  };

  const renderActions = (expense: Expense) => (
    <div className="flex gap-1">
      {(() => {
        const receipts = getReceipts(expense);
        if (receipts.length > 0) {
          return (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-blue-600 hover:text-blue-700"
                onClick={() => openReceiptViewer(expense.id)}
                title={`View ${receipts.length} receipt(s)`}
              >
                <span className="relative">
                  <IconPhoto className="h-4 w-4" />
                  {receipts.length > 1 && (
                    <span className="absolute -right-1 -top-1 flex h-3 w-3 items-center justify-center rounded-full bg-blue-600 text-[8px] text-white">
                      {receipts.length}
                    </span>
                  )}
                </span>
              </Button>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleReceiptUpload(expense.id, file);
                  }}
                  disabled={uploadingExpenseId === expense.id}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={uploadingExpenseId === expense.id}
                  asChild
                >
                  <span title="Add Receipt">
                    <IconUpload className="h-4 w-4" />
                  </span>
                </Button>
              </label>
            </>
          );
        }
        return (
          <label className="cursor-pointer">
            <input
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleReceiptUpload(expense.id, file);
              }}
              disabled={uploadingExpenseId === expense.id}
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={uploadingExpenseId === expense.id}
              asChild
            >
              <span title="Upload Receipt">
                <IconUpload className="h-4 w-4" />
              </span>
            </Button>
          </label>
        );
      })()}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => openEditDialogSafe(expense)}
      >
        <IconEdit className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-destructive hover:text-destructive"
        onClick={() => setDeletingExpense(expense)}
      >
        <IconTrash className="h-4 w-4" />
      </Button>
    </div>
  );

  return (
    <>
      {/* Mobile card layout */}
      <div className="space-y-3 md:hidden">
        {sortedExpenses.map((expense) => (
          <div key={expense.id} className="rounded-lg border p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">
                  {expense.description || expense.merchant || expense.category}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>
                    {new Date(expense.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <Badge variant="secondary" className="text-xs">{expense.category}</Badge>
                  <span
                    className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium ${
                      sourceColors[expense.source] || "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {expense.source}
                  </span>
                </div>
                {expense.paymentMethod && (
                  <span className="mt-1 inline-flex items-center rounded-full bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {expense.paymentMethod}
                  </span>
                )}
              </div>
              <p className="text-sm font-bold whitespace-nowrap">
                {formatCurrency(expense.amount)}
              </p>
            </div>
            <div className="mt-2 flex justify-end border-t pt-2">
              {renderActions(expense)}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table layout */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                className="cursor-pointer hover:bg-muted"
                onClick={() => handleSort("date")}
              >
                Date <SortIcon field="date" />
              </TableHead>
              <TableHead>Description</TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted"
                onClick={() => handleSort("category")}
              >
                Category <SortIcon field="category" />
              </TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted text-right"
                onClick={() => handleSort("amount")}
              >
                Amount <SortIcon field="amount" />
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedExpenses.map((expense) => (
              <TableRow key={expense.id}>
                <TableCell className="text-muted-foreground">
                  {new Date(expense.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </TableCell>
                <TableCell className="font-medium">
                  {expense.description || expense.merchant || "-"}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{expense.category}</Badge>
                </TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                      sourceColors[expense.source] || "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {expense.source}
                  </span>
                </TableCell>
                <TableCell>
                  {expense.paymentMethod ? (
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {expense.paymentMethod}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(expense.amount)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end">
                    {renderActions(expense)}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      {!viewingReceipt && (
      <Dialog open={!!editingExpense} onOpenChange={() => setEditingExpense(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-amount">Amount</Label>
                <Input
                  id="edit-amount"
                  type="number"
                  step="0.01"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-category">Category</Label>
                <Select value={editCategory} onValueChange={setEditCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-merchant">Merchant</Label>
                <Input
                  id="edit-merchant"
                  value={editMerchant}
                  onChange={(e) => setEditMerchant(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-date">Date</Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-payment">Payment Method</Label>
                <Select value={editAccountId} onValueChange={setEditAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Receipts</Label>
                {(() => {
                  const receipts = editingExpense ? getReceipts(editingExpense) : [];
                  return (
                    <div className="space-y-2">
                      {receipts.length > 0 && (
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => openReceiptViewer(editingExpense!.id)}
                          >
                            View {receipts.length} Receipt{receipts.length > 1 ? 's' : ''}
                          </Button>
                        </div>
                      )}
                      {editReceipt ? (
                        <div className="flex items-center gap-2 rounded-md border p-2">
                          <span className="flex-1 truncate text-sm">{editReceipt.name}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => setEditReceipt(null)}
                          >
                            <IconX className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed p-2 hover:bg-muted/50">
                          <IconUpload className="h-4 w-4" />
                          <span className="text-sm">{receipts.length > 0 ? 'Add More' : 'Upload'}</span>
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            className="hidden"
                            onChange={(e) => setEditReceipt(e.target.files?.[0] || null)}
                          />
                        </label>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingExpense(null)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={editLoading}>
              {editLoading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingExpense} onOpenChange={(open) => { if (!open) { setDeletingExpense(null); setReverseBalance(true); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this expense? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deletingExpense?.accountId && (
            <div className="flex items-center gap-3 rounded-md border p-3">
              <button
                type="button"
                role="switch"
                aria-checked={reverseBalance}
                onClick={() => setReverseBalance(!reverseBalance)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  reverseBalance ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  className={`pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform ${
                    reverseBalance ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
              <div className="text-sm">
                <div className="font-medium">Reverse balance deduction</div>
                <div className="text-muted-foreground text-xs">
                  {reverseBalance
                    ? "The account balance will be restored"
                    : "The account balance will remain unchanged"}
                </div>
              </div>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Receipt Viewer */}
      <Dialog open={!!viewingReceipt} onOpenChange={() => setViewingReceipt(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Receipts</DialogTitle>
          </DialogHeader>
          {viewingReceipt && (() => {
            // Find the expense by ID to get all receipts
            const expense = expenses.find(e => e.id === viewingReceipt);
            if (!expense) return null;
            const receipts = getReceipts(expense);
            
            return (
              <div className="space-y-4">
                {receipts.length === 0 ? (
                  <p className="text-center text-muted-foreground">No receipts</p>
                ) : (
                  <div className="grid gap-4">
                    {receipts.map((url, index) => {
                      const isPdf = url.endsWith('.pdf');
                      return (
                        <div key={index} className="border rounded-lg p-2">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">Receipt {index + 1}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">{isPdf ? 'PDF' : 'Image'}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-destructive hover:text-destructive"
                                onClick={async () => {
                                  if (confirm('Delete this receipt?')) {
                                    await fetch(`/api/receipt/${expense.id}?index=${index}`, { method: 'DELETE' });
                                    router.refresh();
                                  }
                                }}
                              >
                                <IconTrash className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          {isPdf ? (
                            <iframe
                              src={`/api/receipt/${expense.id}?index=${index}`}
                              className="w-full h-[50vh] rounded border"
                              title={`Receipt ${index + 1}`}
                            />
                          ) : (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={`/api/receipt/${expense.id}?index=${index}`}
                              alt={`Receipt ${index + 1}`}
                              className="max-h-[50vh] w-full object-contain rounded"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="flex justify-center">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleReceiptUpload(expense.id, file);
                          setViewingReceipt(null);
                        }
                      }}
                    />
                    <Button variant="outline" asChild>
                      <span>
                        <IconUpload className="mr-2 h-4 w-4" />
                        Add Another Receipt
                      </span>
                    </Button>
                  </label>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </>
  );
}

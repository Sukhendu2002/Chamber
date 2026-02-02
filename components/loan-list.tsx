"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { Progress } from "@/components/ui/progress";
import {
  IconDotsVertical,
  IconPlus,
  IconTrash,
  IconEdit,
  IconReceipt,
  IconPhone,
  IconCalendar,
  IconUpload,
  IconX,
  IconPhoto,
} from "@tabler/icons-react";
import { addRepayment, deleteLoan, deleteRepayment, updateLoan, addLoanReceipt, addRepaymentReceipt } from "@/lib/actions/loans";

type Repayment = {
  id: string;
  amount: number;
  date: Date;
  note: string | null;
  receiptUrls: string[];
};

type Loan = {
  id: string;
  borrowerName: string;
  borrowerPhone: string | null;
  amount: number;
  amountRepaid: number;
  status: "PENDING" | "PARTIAL" | "COMPLETED";
  lendDate: Date;
  dueDate: Date | null;
  description: string | null;
  receiptUrls: string[];
  repayments: Repayment[];
};

type LoanListProps = {
  loans: Loan[];
  currency: string;
};

export function LoanList({ loans, currency }: LoanListProps) {
  const router = useRouter();
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [showRepaymentDialog, setShowRepaymentDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  // Repayment form
  const [repaymentAmount, setRepaymentAmount] = useState("");
  const [repaymentDate, setRepaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [repaymentNote, setRepaymentNote] = useState("");
  const [repaymentFiles, setRepaymentFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  // Edit form
  const [editBorrowerName, setEditBorrowerName] = useState("");
  const [editBorrowerPhone, setEditBorrowerPhone] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editLendDate, setEditLendDate] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <Badge className="bg-green-500">Completed</Badge>;
      case "PARTIAL":
        return <Badge className="bg-yellow-500">Partial</Badge>;
      default:
        return <Badge variant="destructive">Pending</Badge>;
    }
  };

  const openRepaymentDialog = (loan: Loan) => {
    setSelectedLoan(loan);
    setRepaymentAmount("");
    setRepaymentDate(new Date().toISOString().split("T")[0]);
    setRepaymentNote("");
    setRepaymentFiles([]);
    setShowRepaymentDialog(true);
  };

  const handleRepaymentFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setRepaymentFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeRepaymentFile = (index: number) => {
    setRepaymentFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const openEditDialog = (loan: Loan) => {
    setSelectedLoan(loan);
    setEditBorrowerName(loan.borrowerName);
    setEditBorrowerPhone(loan.borrowerPhone || "");
    setEditAmount(loan.amount.toString());
    setEditLendDate(new Date(loan.lendDate).toISOString().split("T")[0]);
    setEditDueDate(loan.dueDate ? new Date(loan.dueDate).toISOString().split("T")[0] : "");
    setEditDescription(loan.description || "");
    setShowEditDialog(true);
  };

  const openDeleteDialog = (loan: Loan) => {
    setSelectedLoan(loan);
    setShowDeleteDialog(true);
  };

  const openDetailsDialog = (loan: Loan) => {
    setSelectedLoan(loan);
    setShowDetailsDialog(true);
  };

  const handleAddRepayment = async () => {
    if (!selectedLoan || !repaymentAmount) return;

    setLoading(true);
    try {
      const repayment = await addRepayment({
        loanId: selectedLoan.id,
        amount: parseFloat(repaymentAmount),
        date: new Date(repaymentDate),
        note: repaymentNote || undefined,
      });

      // Upload receipts if any
      if (repaymentFiles.length > 0 && repayment) {
        setUploading(true);
        for (const file of repaymentFiles) {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("type", "repayment");
          formData.append("repaymentId", repayment.id);

          const response = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });

          if (response.ok) {
            const { url } = await response.json();
            await addRepaymentReceipt(repayment.id, url);
          }
        }
        setUploading(false);
      }

      setShowRepaymentDialog(false);
      router.refresh();
    } catch (error) {
      console.error("Failed to add repayment:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateLoan = async () => {
    if (!selectedLoan) return;

    setLoading(true);
    try {
      await updateLoan(selectedLoan.id, {
        borrowerName: editBorrowerName,
        borrowerPhone: editBorrowerPhone || undefined,
        amount: parseFloat(editAmount),
        lendDate: new Date(editLendDate),
        dueDate: editDueDate ? new Date(editDueDate) : undefined,
        description: editDescription || undefined,
      });
      setShowEditDialog(false);
      router.refresh();
    } catch (error) {
      console.error("Failed to update loan:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLoan = async () => {
    if (!selectedLoan) return;

    setLoading(true);
    try {
      await deleteLoan(selectedLoan.id);
      setShowDeleteDialog(false);
      router.refresh();
    } catch (error) {
      console.error("Failed to delete loan:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRepayment = async (repaymentId: string) => {
    setLoading(true);
    try {
      await deleteRepayment(repaymentId);
      router.refresh();
      // Refresh the selected loan data
      if (selectedLoan) {
        const updatedLoan = loans.find((l) => l.id === selectedLoan.id);
        if (updatedLoan) {
          setSelectedLoan(updatedLoan);
        }
      }
    } catch (error) {
      console.error("Failed to delete repayment:", error);
    } finally {
      setLoading(false);
    }
  };

  const currencySymbol = currency === "INR" ? "₹" : currency === "USD" ? "$" : currency === "EUR" ? "€" : "£";

  if (loans.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <IconReceipt className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">No lent money yet</h3>
        <p className="text-sm text-muted-foreground">
          Start tracking money you&apos;ve lent to others
        </p>
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Borrower</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Repaid</TableHead>
            <TableHead>Progress</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Lend Date</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loans.map((loan) => {
            const progress = (loan.amountRepaid / loan.amount) * 100;
            const isOverdue = loan.dueDate && new Date(loan.dueDate) < new Date() && loan.status !== "COMPLETED";

            return (
              <TableRow
                key={loan.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => openDetailsDialog(loan)}
              >
                <TableCell>
                  <div>
                    <div className="font-medium">{loan.borrowerName}</div>
                    {loan.borrowerPhone && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <IconPhone className="h-3 w-3" />
                        {loan.borrowerPhone}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="font-medium">{formatCurrency(loan.amount)}</TableCell>
                <TableCell className="text-green-600">{formatCurrency(loan.amountRepaid)}</TableCell>
                <TableCell>
                  <div className="w-24">
                    <Progress value={progress} className="h-2" />
                    <span className="text-xs text-muted-foreground">{progress.toFixed(0)}%</span>
                  </div>
                </TableCell>
                <TableCell>{getStatusBadge(loan.status)}</TableCell>
                <TableCell>{formatDate(loan.lendDate)}</TableCell>
                <TableCell>
                  {loan.dueDate ? (
                    <span className={isOverdue ? "text-destructive font-medium" : ""}>
                      {formatDate(loan.dueDate)}
                      {isOverdue && " (Overdue)"}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <IconDotsVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openRepaymentDialog(loan)}>
                        <IconPlus className="mr-2 h-4 w-4" />
                        Add Repayment
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openEditDialog(loan)}>
                        <IconEdit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => openDeleteDialog(loan)}
                      >
                        <IconTrash className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Add Repayment Dialog */}
      <Dialog open={showRepaymentDialog} onOpenChange={setShowRepaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Repayment</DialogTitle>
            <DialogDescription>
              Record a repayment from {selectedLoan?.borrowerName}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Outstanding Amount</Label>
              <div className="text-lg font-bold text-destructive">
                {selectedLoan && formatCurrency(selectedLoan.amount - selectedLoan.amountRepaid)}
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="repaymentAmount">Repayment Amount *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {currencySymbol}
                </span>
                <Input
                  id="repaymentAmount"
                  type="number"
                  placeholder="0.00"
                  className="pl-8"
                  value={repaymentAmount}
                  onChange={(e) => setRepaymentAmount(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="repaymentDate">Date</Label>
              <Input
                id="repaymentDate"
                type="date"
                value={repaymentDate}
                onChange={(e) => setRepaymentDate(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="repaymentNote">Note (optional)</Label>
              <Textarea
                id="repaymentNote"
                placeholder="Any notes about this repayment"
                value={repaymentNote}
                onChange={(e) => setRepaymentNote(e.target.value)}
                rows={2}
              />
            </div>
            <div className="grid gap-2">
              <Label>Receipts (optional)</Label>
              <div className="flex flex-wrap gap-2">
                {repaymentFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-1 bg-muted px-2 py-1 rounded text-sm"
                  >
                    <span className="truncate max-w-[150px]">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeRepaymentFile(index)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <IconX className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
              <label className="cursor-pointer">
                <div className="flex items-center gap-2 border border-dashed rounded-md p-3 hover:bg-muted/50 transition-colors">
                  <IconUpload className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Add receipt images</span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleRepaymentFileChange}
                />
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRepaymentDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddRepayment} disabled={loading || uploading || !repaymentAmount}>
              {loading ? (uploading ? "Uploading..." : "Adding...") : "Add Repayment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Loan Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Details</DialogTitle>
            <DialogDescription>
              Update lent money details
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="editBorrowerName">Borrower Name *</Label>
              <Input
                id="editBorrowerName"
                value={editBorrowerName}
                onChange={(e) => setEditBorrowerName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="editBorrowerPhone">Phone (optional)</Label>
              <Input
                id="editBorrowerPhone"
                value={editBorrowerPhone}
                onChange={(e) => setEditBorrowerPhone(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="editAmount">Amount *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {currencySymbol}
                </span>
                <Input
                  id="editAmount"
                  type="number"
                  className="pl-8"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="editLendDate">Lend Date</Label>
                <Input
                  id="editLendDate"
                  type="date"
                  value={editLendDate}
                  onChange={(e) => setEditLendDate(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="editDueDate">Due Date</Label>
                <Input
                  id="editDueDate"
                  type="date"
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="editDescription">Notes</Label>
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
            <Button onClick={handleUpdateLoan} disabled={loading || !editBorrowerName || !editAmount}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <DialogTitle>Delete Record?</DialogTitle>
            <AlertDialogDescription>
              This will permanently delete the lent money record to {selectedLoan?.borrowerName} and all its repayment records.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteLoan}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Loan Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Details</DialogTitle>
            <DialogDescription>
              Money lent to {selectedLoan?.borrowerName}
            </DialogDescription>
          </DialogHeader>
          {selectedLoan && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Total Amount</div>
                  <div className="text-xl font-bold">{formatCurrency(selectedLoan.amount)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Outstanding</div>
                  <div className="text-xl font-bold text-destructive">
                    {formatCurrency(selectedLoan.amount - selectedLoan.amountRepaid)}
                  </div>
                </div>
              </div>

              <div>
                <Progress value={(selectedLoan.amountRepaid / selectedLoan.amount) * 100} className="h-3" />
                <div className="flex justify-between text-sm text-muted-foreground mt-1">
                  <span>Repaid: {formatCurrency(selectedLoan.amountRepaid)}</span>
                  <span>{((selectedLoan.amountRepaid / selectedLoan.amount) * 100).toFixed(0)}%</span>
                </div>
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <IconCalendar className="h-4 w-4 text-muted-foreground" />
                  <span>Lent on: {formatDate(selectedLoan.lendDate)}</span>
                </div>
                {selectedLoan.dueDate && (
                  <div className="flex items-center gap-2">
                    <IconCalendar className="h-4 w-4 text-muted-foreground" />
                    <span>Due: {formatDate(selectedLoan.dueDate)}</span>
                  </div>
                )}
                {selectedLoan.borrowerPhone && (
                  <div className="flex items-center gap-2">
                    <IconPhone className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedLoan.borrowerPhone}</span>
                  </div>
                )}
              </div>

              {selectedLoan.description && (
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Notes</div>
                  <div className="text-sm bg-muted p-2 rounded">{selectedLoan.description}</div>
                </div>
              )}

              {/* Loan Receipts */}
              {selectedLoan.receiptUrls.length > 0 && (
                <div>
                  <div className="text-sm font-medium mb-2">Receipts</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedLoan.receiptUrls.map((url, index) => (
                      <a
                        key={index}
                        href={`/api/loan-receipt/${selectedLoan.id}?index=${index}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 bg-muted px-2 py-1 rounded text-sm hover:bg-muted/80"
                      >
                        <IconPhoto className="h-4 w-4" />
                        Receipt {index + 1}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Repayment History */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium">Repayment History</div>
                  <Button size="sm" variant="outline" onClick={() => {
                    setShowDetailsDialog(false);
                    openRepaymentDialog(selectedLoan);
                  }}>
                    <IconPlus className="mr-1 h-3 w-3" />
                    Add
                  </Button>
                </div>
                {selectedLoan.repayments.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    No repayments recorded yet
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedLoan.repayments.map((repayment) => (
                      <div
                        key={repayment.id}
                        className="flex items-center justify-between p-2 bg-muted/50 rounded"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-green-600">
                            +{formatCurrency(repayment.amount)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDate(repayment.date)}
                            {repayment.note && ` • ${repayment.note}`}
                          </div>
                          {repayment.receiptUrls.length > 0 && (
                            <div className="flex gap-1 mt-1">
                              {repayment.receiptUrls.map((_, idx) => (
                                <a
                                  key={idx}
                                  href={`/api/repayment-receipt/${repayment.id}?index=${idx}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-500 hover:underline flex items-center gap-0.5"
                                >
                                  <IconPhoto className="h-3 w-3" />
                                  {idx + 1}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDeleteRepayment(repayment.id)}
                          disabled={loading}
                        >
                          <IconTrash className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

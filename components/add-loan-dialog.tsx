"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { IconPlus, IconUpload, IconX } from "@tabler/icons-react";
import { createLoan, addLoanReceipt } from "@/lib/actions/loans";

type AddLoanDialogProps = {
  currency: string;
};

export function AddLoanDialog({ currency }: AddLoanDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [borrowerName, setBorrowerName] = useState("");
  const [borrowerPhone, setBorrowerPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [lendDate, setLendDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");
  const [receiptFiles, setReceiptFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const resetForm = () => {
    setBorrowerName("");
    setBorrowerPhone("");
    setAmount("");
    setLendDate(new Date().toISOString().split("T")[0]);
    setDueDate("");
    setDescription("");
    setReceiptFiles([]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setReceiptFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setReceiptFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!borrowerName || !amount) return;

    setLoading(true);
    try {
      const loan = await createLoan({
        borrowerName,
        borrowerPhone: borrowerPhone || undefined,
        amount: parseFloat(amount),
        lendDate: new Date(lendDate),
        dueDate: dueDate ? new Date(dueDate) : undefined,
        description: description || undefined,
      });

      // Upload receipts if any
      if (receiptFiles.length > 0 && loan) {
        setUploading(true);
        for (const file of receiptFiles) {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("type", "loan");
          formData.append("loanId", loan.id);

          const response = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });

          if (response.ok) {
            const { url } = await response.json();
            await addLoanReceipt(loan.id, url);
          }
        }
        setUploading(false);
      }

      resetForm();
      setOpen(false);
      router.refresh();
    } catch (error) {
      console.error("Failed to create loan:", error);
    } finally {
      setLoading(false);
    }
  };

  const currencySymbol = currency === "INR" ? "₹" : currency === "USD" ? "$" : currency === "EUR" ? "€" : "£";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <IconPlus className="mr-2 h-4 w-4" />
          Lend Money
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Lend Money</DialogTitle>
          <DialogDescription>
            Record money you&apos;ve lent to someone.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="borrowerName">Borrower Name *</Label>
            <Input
              id="borrowerName"
              placeholder="Who did you lend to?"
              value={borrowerName}
              onChange={(e) => setBorrowerName(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="borrowerPhone">Phone (optional)</Label>
            <Input
              id="borrowerPhone"
              placeholder="Contact number"
              value={borrowerPhone}
              onChange={(e) => setBorrowerPhone(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="amount">Amount *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {currencySymbol}
              </span>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                className="pl-8"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="lendDate">Lend Date *</Label>
              <Input
                id="lendDate"
                type="date"
                value={lendDate}
                onChange={(e) => setLendDate(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dueDate">Due Date (optional)</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Notes (optional)</Label>
            <Textarea
              id="description"
              placeholder="What was the loan for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="grid gap-2">
            <Label>Receipts (optional)</Label>
            <div className="flex flex-wrap gap-2">
              {receiptFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-1 bg-muted px-2 py-1 rounded text-sm"
                >
                  <span className="truncate max-w-[150px]">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
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
                onChange={handleFileChange}
              />
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || uploading || !borrowerName || !amount}>
            {loading ? (uploading ? "Uploading..." : "Adding...") : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

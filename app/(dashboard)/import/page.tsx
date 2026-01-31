"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  IconUpload,
  IconFileTypeCsv,
  IconFileTypePdf,
  IconCheck,
  IconAlertTriangle,
} from "@tabler/icons-react";

// Mock imported transactions
const importedTransactions = [
  {
    id: "1",
    date: "2026-01-28",
    description: "NETFLIX.COM",
    amount: 649,
    status: "matched",
    matchedWith: "Netflix Subscription",
  },
  {
    id: "2",
    date: "2026-01-27",
    description: "AMAZON PAY",
    amount: 1299,
    status: "new",
    matchedWith: null,
  },
  {
    id: "3",
    date: "2026-01-26",
    description: "SWIGGY ORDER",
    amount: 450,
    status: "duplicate",
    matchedWith: "Lunch at Cafe",
  },
];

const statusConfig: Record<
  string,
  { label: string; color: string; icon: React.ComponentType<{ className?: string }> }
> = {
  matched: {
    label: "Matched",
    color: "bg-green-100 text-green-800",
    icon: IconCheck,
  },
  new: {
    label: "New",
    color: "bg-blue-100 text-blue-800",
    icon: IconCheck,
  },
  duplicate: {
    label: "Duplicate",
    color: "bg-yellow-100 text-yellow-800",
    icon: IconAlertTriangle,
  },
};

export default function ImportPage() {
  const [isDragging, setIsDragging] = useState(false);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Import</h1>
        <p className="text-sm text-muted-foreground">
          Upload bank statements for reconciliation
        </p>
      </div>

      {/* Upload Section */}
      <Card className="mb-6 border">
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Upload Bank Statement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors ${
              isDragging
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
            }}
          >
            <IconUpload className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="mb-2 text-sm font-medium">
              Drag and drop your file here
            </p>
            <p className="mb-4 text-xs text-muted-foreground">
              Supports CSV and PDF formats
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <IconFileTypeCsv className="mr-2 h-4 w-4" />
                Upload CSV
              </Button>
              <Button variant="outline" size="sm">
                <IconFileTypePdf className="mr-2 h-4 w-4" />
                Upload PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Imported Transactions */}
      <Card className="border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">
              Imported Transactions
            </CardTitle>
            <Badge variant="secondary">
              {importedTransactions.length} transactions
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Matched With</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {importedTransactions.map((transaction) => {
                const status = statusConfig[transaction.status];
                const StatusIcon = status.icon;
                return (
                  <TableRow key={transaction.id}>
                    <TableCell className="text-muted-foreground">
                      {new Date(transaction.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="font-medium">
                      {transaction.description}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${status.color}`}
                      >
                        <StatusIcon className="h-3 w-3" />
                        {status.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {transaction.matchedWith || "-"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ₹{transaction.amount.toFixed(2)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

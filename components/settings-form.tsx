"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { IconDeviceFloppy, IconDownload, IconTrash, IconLayoutDashboard } from "@tabler/icons-react";
import { updateUserSettings, exportExpensesCSV, deleteAllUserData } from "@/lib/actions/settings";
import { DashboardWidgets, DEFAULT_DASHBOARD_WIDGETS, DASHBOARD_WIDGET_OPTIONS } from "@/types/dashboard";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const currencies = [
  { value: "INR", label: "Indian Rupee (₹)" },
  { value: "USD", label: "US Dollar ($)" },
  { value: "EUR", label: "Euro (€)" },
  { value: "GBP", label: "British Pound (£)" },
];

const categories = [
  "Food",
  "Travel",
  "Entertainment",
  "Bills",
  "Shopping",
  "Health",
  "Education",
  "General",
];

type SettingsFormProps = {
  initialSettings: {
    monthlyBudget: number;
    currency: string;
    dashboardWidgets: DashboardWidgets;
  };
};

export function SettingsForm({ initialSettings }: SettingsFormProps) {
  const [monthlyBudget, setMonthlyBudget] = useState(
    initialSettings.monthlyBudget.toString()
  );
  const [currency, setCurrency] = useState(initialSettings.currency);
  const [dashboardWidgets, setDashboardWidgets] = useState<DashboardWidgets>(
    initialSettings.dashboardWidgets || DEFAULT_DASHBOARD_WIDGETS
  );
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const toggleWidget = (key: keyof DashboardWidgets) => {
    setDashboardWidgets((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const data = await exportExpensesCSV();

      // Download expenses CSV
      const expenseBlob = new Blob([data.expenses], { type: "text/csv" });
      const expenseUrl = URL.createObjectURL(expenseBlob);
      const expenseLink = document.createElement("a");
      expenseLink.href = expenseUrl;
      expenseLink.download = `expenses_${new Date().toISOString().split("T")[0]}.csv`;
      expenseLink.click();
      URL.revokeObjectURL(expenseUrl);

      // Download subscriptions CSV
      const subBlob = new Blob([data.subscriptions], { type: "text/csv" });
      const subUrl = URL.createObjectURL(subBlob);
      const subLink = document.createElement("a");
      subLink.href = subUrl;
      subLink.download = `subscriptions_${new Date().toISOString().split("T")[0]}.csv`;
      subLink.click();
      URL.revokeObjectURL(subUrl);
    } catch (error) {
      console.error("Failed to export data:", error);
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAll = async () => {
    setDeleting(true);
    try {
      await deleteAllUserData();
      window.location.reload();
    } catch (error) {
      console.error("Failed to delete data:", error);
    } finally {
      setDeleting(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateUserSettings({
        monthlyBudget: parseFloat(monthlyBudget) || 0,
        currency,
        dashboardWidgets,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error("Failed to save settings:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Budget Settings */}
      <Card className="mb-6 border">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Budget Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="budget">Monthly Budget</Label>
              <Input
                id="budget"
                type="number"
                value={monthlyBudget}
                onChange={(e) => setMonthlyBudget(e.target.value)}
                placeholder="Enter your monthly budget"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((curr) => (
                    <SelectItem key={curr.value} value={curr.value}>
                      {curr.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dashboard Widget Settings */}
      <Card className="mb-6 border">
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <IconLayoutDashboard className="h-4 w-4" />
            Dashboard Widgets
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground mb-4">
            Choose which widgets to display on your dashboard.
          </p>
          <div className="grid gap-3">
            {DASHBOARD_WIDGET_OPTIONS.map((widget) => (
              <div
                key={widget.key}
                className="flex items-center justify-between rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => toggleWidget(widget.key)}
              >
                <div>
                  <p className="font-medium text-sm">{widget.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {widget.description}
                  </p>
                </div>
                <div
                  className={`h-5 w-9 rounded-full transition-colors ${dashboardWidgets[widget.key]
                      ? "bg-primary"
                      : "bg-muted"
                    }`}
                >
                  <div
                    className={`h-4 w-4 mt-0.5 rounded-full bg-white shadow-sm transition-transform ${dashboardWidgets[widget.key]
                        ? "translate-x-4.5 ml-0.5"
                        : "translate-x-0.5"
                      }`}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Category Settings */}
      <Card className="mb-6 border">
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Expense Categories
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <div
                key={category}
                className="rounded-md border bg-muted px-3 py-1.5 text-sm"
              >
                {category}
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Categories are automatically assigned by AI based on your expense
            descriptions.
          </p>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card className="mb-6 border">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Data Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Export Data</p>
              <p className="text-sm text-muted-foreground">
                Download all your expenses and subscriptions as CSV
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
              <IconDownload className="mr-2 h-4 w-4" />
              {exporting ? "Exporting..." : "Export CSV"}
            </Button>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-destructive">Delete All Data</p>
              <p className="text-sm text-muted-foreground">
                Permanently delete all your expenses and subscriptions
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={deleting}>
                  <IconTrash className="mr-2 h-4 w-4" />
                  {deleting ? "Deleting..." : "Delete"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete all your
                    expenses, subscriptions, and reset your settings.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete Everything
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={loading}>
          <IconDeviceFloppy className="mr-2 h-4 w-4" />
          {loading ? "Saving..." : saved ? "Saved!" : "Save Changes"}
        </Button>
      </div>
    </>
  );
}

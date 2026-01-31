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
import { IconDeviceFloppy } from "@tabler/icons-react";
import { updateUserSettings } from "@/lib/actions/settings";

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
  };
};

export function SettingsForm({ initialSettings }: SettingsFormProps) {
  const [monthlyBudget, setMonthlyBudget] = useState(
    initialSettings.monthlyBudget.toString()
  );
  const [currency, setCurrency] = useState(initialSettings.currency);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateUserSettings({
        monthlyBudget: parseFloat(monthlyBudget) || 0,
        currency,
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
                Download all your expenses as CSV
              </p>
            </div>
            <Button variant="outline" size="sm">
              Export CSV
            </Button>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-destructive">Delete All Data</p>
              <p className="text-sm text-muted-foreground">
                Permanently delete all your expenses and settings
              </p>
            </div>
            <Button variant="destructive" size="sm">
              Delete
            </Button>
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

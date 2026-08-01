"use client";

import { useState } from "react";
import {
  IconAlertCircle,
  IconChartDots,
  IconCheck,
  IconCircleCheck,
  IconDatabase,
  IconDeviceFloppy,
  IconDownload,
  IconLayoutDashboard,
  IconLoader2,
  IconPalette,
  IconTag,
  IconTrash,
  IconWallet,
} from "@tabler/icons-react";

import { useDemoMode } from "@/components/demo-mode-provider";
import { PageHeader } from "@/components/page-shell";
import { ThemeSelector } from "@/components/theme-selector";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  deleteAllUserData,
  exportExpensesCSV,
  updateUserSettings,
} from "@/lib/actions/settings";
import {
  type DashboardWidgets,
  DASHBOARD_WIDGET_OPTIONS,
  DEFAULT_DASHBOARD_WIDGETS,
} from "@/types/dashboard";

const CURRENCIES = [
  { value: "INR", label: "Indian Rupee (₹)" },
  { value: "USD", label: "US Dollar ($)" },
  { value: "EUR", label: "Euro (€)" },
  { value: "GBP", label: "British Pound (£)" },
];

const TIMEZONES = [
  { value: "UTC", label: "UTC (Coordinated Universal Time)" },
  { value: "Asia/Kolkata", label: "India (IST) · Asia/Kolkata" },
  { value: "America/New_York", label: "Eastern Time (ET) · America/New_York" },
  { value: "America/Chicago", label: "Central Time (CT) · America/Chicago" },
  { value: "America/Denver", label: "Mountain Time (MT) · America/Denver" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT) · America/Los_Angeles" },
  { value: "Europe/London", label: "London (GMT/BST) · Europe/London" },
  { value: "Europe/Paris", label: "Paris (CET/CEST) · Europe/Paris" },
  { value: "Europe/Berlin", label: "Berlin (CET/CEST) · Europe/Berlin" },
  { value: "Asia/Tokyo", label: "Tokyo (JST) · Asia/Tokyo" },
  { value: "Asia/Shanghai", label: "Shanghai (CST) · Asia/Shanghai" },
  { value: "Asia/Singapore", label: "Singapore (SGT) · Asia/Singapore" },
  { value: "Asia/Dubai", label: "Dubai (GST) · Asia/Dubai" },
  { value: "Australia/Sydney", label: "Sydney (AEST/AEDT) · Australia/Sydney" },
  { value: "Pacific/Auckland", label: "Auckland (NZST/NZDT) · Pacific/Auckland" },
];

const CATEGORIES = [
  "Food",
  "Travel",
  "Entertainment",
  "Bills",
  "Shopping",
  "Health",
  "Education",
  "Investments",
  "Subscription",
  "Lent Money",
  "General",
];

const SETTINGS_SECTIONS = [
  { id: "general", label: "General" },
  { id: "dashboard", label: "Dashboard" },
  { id: "appearance", label: "Appearance" },
  { id: "categories", label: "Categories" },
  { id: "data", label: "Data" },
] as const;

type SettingsSectionId = (typeof SETTINGS_SECTIONS)[number]["id"];

interface SettingsFormProps {
  initialSettings: {
    monthlyBudget: number;
    currency: string;
    timezone: string;
    dashboardWidgets: DashboardWidgets;
    forecastHorizonMonths: number;
    savingsTargetPercent: number;
    monthlyIncome: number;
    salaryDay: number;
  };
}

interface SavedSettingsSnapshot {
  monthlyBudget: string;
  currency: string;
  timezone: string;
  dashboardWidgets: DashboardWidgets;
  forecastHorizonMonths: string;
  savingsTargetPercent: string;
  monthlyIncome: string;
  salaryDay: string;
}

interface SettingsPanelHeaderProps {
  id: string;
  title: string;
  description?: string;
  icon: typeof IconWallet;
}

interface SettingsToggleProps {
  checked: boolean;
  label: string;
  description?: string;
  onCheckedChange: () => void;
  className?: string;
}

function SettingsPanelHeader({
  id,
  title,
  description,
  icon: Icon,
}: SettingsPanelHeaderProps) {
  return (
    <CardHeader className="border-b px-4 py-3">
      <div className="flex items-start gap-2.5">
        <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0 stroke-[1.8]" />
        <div className="min-w-0">
          <h2 id={id} className="text-sm font-semibold leading-5">
            {title}
          </h2>
          {description && (
            <p className="mt-0.5 text-xs leading-4 text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </div>
    </CardHeader>
  );
}

function SettingsToggle({
  checked,
  label,
  description,
  onCheckedChange,
  className,
}: SettingsToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={description ? `${label}: ${description}` : label}
      title={description}
      onClick={onCheckedChange}
      className={cn(
        "flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 px-4 py-2 text-left outline-none transition-colors hover:bg-muted/45 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/30",
        className
      )}
    >
      <span className="min-w-0">
        <span className="block text-xs font-medium leading-4">{label}</span>
        {description && (
          <span className="mt-0.5 block text-[0.6875rem] leading-4 text-muted-foreground">
            {description}
          </span>
        )}
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full border transition-colors duration-200",
          checked ? "border-primary bg-primary" : "border-border bg-muted"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 flex size-4 items-center justify-center rounded-full bg-white text-primary shadow-sm transition-transform duration-200",
            checked ? "translate-x-[1.0625rem]" : "translate-x-0.5"
          )}
        >
          {checked && <IconCheck className="size-2.5 stroke-[2.5]" />}
        </span>
      </span>
    </button>
  );
}

export function SettingsForm({ initialSettings }: SettingsFormProps) {
  const initialDashboardWidgets =
    initialSettings.dashboardWidgets || DEFAULT_DASHBOARD_WIDGETS;
  const [monthlyBudget, setMonthlyBudget] = useState(
    initialSettings.monthlyBudget.toString()
  );
  const [currency, setCurrency] = useState(initialSettings.currency);
  const [timezone, setTimezone] = useState(
    initialSettings.timezone || "Asia/Kolkata"
  );
  const [dashboardWidgets, setDashboardWidgets] = useState<DashboardWidgets>(
    initialDashboardWidgets
  );
  const [forecastHorizonMonths, setForecastHorizonMonths] = useState(
    initialSettings.forecastHorizonMonths?.toString() || "6"
  );
  const [savingsTargetPercent, setSavingsTargetPercent] = useState(
    initialSettings.savingsTargetPercent?.toString() || "20"
  );
  const [monthlyIncome, setMonthlyIncome] = useState(
    initialSettings.monthlyIncome?.toString() || "0"
  );
  const [salaryDay, setSalaryDay] = useState(
    initialSettings.salaryDay?.toString() || "1"
  );
  const [savedSnapshot, setSavedSnapshot] = useState<SavedSettingsSnapshot>({
    monthlyBudget: initialSettings.monthlyBudget.toString(),
    currency: initialSettings.currency,
    timezone: initialSettings.timezone || "Asia/Kolkata",
    dashboardWidgets: { ...initialDashboardWidgets },
    forecastHorizonMonths:
      initialSettings.forecastHorizonMonths?.toString() || "6",
    savingsTargetPercent:
      initialSettings.savingsTargetPercent?.toString() || "20",
    monthlyIncome: initialSettings.monthlyIncome?.toString() || "0",
    salaryDay: initialSettings.salaryDay?.toString() || "1",
  });
  const [activeSection, setActiveSection] =
    useState<SettingsSectionId>("general");
  const [loading, setLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { isDemoMode, toggleDemoMode } = useDemoMode();

  const hasChanges =
    monthlyBudget !== savedSnapshot.monthlyBudget ||
    currency !== savedSnapshot.currency ||
    timezone !== savedSnapshot.timezone ||
    forecastHorizonMonths !== savedSnapshot.forecastHorizonMonths ||
    savingsTargetPercent !== savedSnapshot.savingsTargetPercent ||
    monthlyIncome !== savedSnapshot.monthlyIncome ||
    salaryDay !== savedSnapshot.salaryDay ||
    DASHBOARD_WIDGET_OPTIONS.some(
      ({ key }) =>
        dashboardWidgets[key] !== savedSnapshot.dashboardWidgets[key]
    );

  const toggleWidget = (key: keyof DashboardWidgets) => {
    setDashboardWidgets((previousWidgets) => ({
      ...previousWidgets,
      [key]: !previousWidgets[key],
    }));
    setSaveError(null);
  };

  const handleSectionClick = (sectionId: SettingsSectionId) => {
    setActiveSection(sectionId);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const data = await exportExpensesCSV();

      const expenseBlob = new Blob([data.expenses], { type: "text/csv" });
      const expenseUrl = URL.createObjectURL(expenseBlob);
      const expenseLink = document.createElement("a");
      expenseLink.href = expenseUrl;
      expenseLink.download = `expenses_${new Date().toISOString().split("T")[0]}.csv`;
      expenseLink.click();
      URL.revokeObjectURL(expenseUrl);

      const subscriptionBlob = new Blob([data.subscriptions], {
        type: "text/csv",
      });
      const subscriptionUrl = URL.createObjectURL(subscriptionBlob);
      const subscriptionLink = document.createElement("a");
      subscriptionLink.href = subscriptionUrl;
      subscriptionLink.download = `subscriptions_${new Date().toISOString().split("T")[0]}.csv`;
      subscriptionLink.click();
      URL.revokeObjectURL(subscriptionUrl);

      if (data.expensesTruncated) {
        window.alert(
          `The export contains the newest ${data.exportedExpenseCount.toLocaleString()} expenses. ` +
            "Use a filtered export for older records."
        );
      }
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
    setSaveError(null);
    try {
      const horizon = Math.min(
        24,
        Math.max(1, Number.parseInt(forecastHorizonMonths, 10) || 6)
      );
      const savings = Math.min(
        100,
        Math.max(0, Number.parseFloat(savingsTargetPercent) || 20)
      );
      const normalizedSalaryDay = Math.min(
        28,
        Math.max(1, Number.parseInt(salaryDay, 10) || 1)
      );

      await updateUserSettings({
        monthlyBudget: Number.parseFloat(monthlyBudget) || 0,
        currency,
        timezone,
        dashboardWidgets,
        forecastHorizonMonths: horizon,
        savingsTargetPercent: savings,
        monthlyIncome: Number.parseFloat(monthlyIncome) || 0,
        salaryDay: normalizedSalaryDay,
      });

      const normalizedSnapshot = {
        monthlyBudget,
        currency,
        timezone,
        dashboardWidgets: { ...dashboardWidgets },
        forecastHorizonMonths: horizon.toString(),
        savingsTargetPercent: savings.toString(),
        monthlyIncome,
        salaryDay: normalizedSalaryDay.toString(),
      };

      setForecastHorizonMonths(normalizedSnapshot.forecastHorizonMonths);
      setSavingsTargetPercent(normalizedSnapshot.savingsTargetPercent);
      setSalaryDay(normalizedSnapshot.salaryDay);
      setSavedSnapshot(normalizedSnapshot);
    } catch (error) {
      console.error("Failed to save settings:", error);
      setSaveError("Couldn’t save changes. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const status = saveError
    ? { label: saveError, icon: IconAlertCircle, className: "text-destructive" }
    : loading
      ? {
          label: "Saving changes…",
          icon: IconLoader2,
          className: "text-muted-foreground",
        }
      : hasChanges
        ? {
            label: "Unsaved changes",
            icon: IconAlertCircle,
            className: "text-amber-700 dark:text-amber-400",
          }
        : {
            label: "All changes saved",
            icon: IconCircleCheck,
            className: "text-emerald-700 dark:text-emerald-400",
          };
  const StatusIcon = status.icon;

  return (
    <>
      <PageHeader
        title="Settings"
        description="Manage your account and product preferences"
        actions={
          <>
            <div
              aria-live="polite"
              className={cn(
                "hidden items-center gap-1.5 text-xs sm:flex",
                status.className
              )}
            >
              <StatusIcon
                aria-hidden="true"
                className={cn("size-4", loading && "animate-spin")}
              />
              <span>{status.label}</span>
            </div>
            <Button
              size="lg"
              onClick={handleSave}
              disabled={loading}
              className="min-w-32"
            >
              {loading ? (
                <IconLoader2 className="animate-spin" />
              ) : (
                <IconDeviceFloppy />
              )}
              {loading ? "Saving…" : "Save changes"}
            </Button>
          </>
        }
      />

      <nav
        aria-label="Settings sections"
        className="sticky top-14 z-20 mb-4 overflow-x-auto border-y bg-background/95 backdrop-blur md:static md:rounded-md md:border"
      >
        <div className="flex min-w-max items-center gap-1 p-1">
          {SETTINGS_SECTIONS.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              aria-current={activeSection === section.id ? "location" : undefined}
              onClick={() => handleSectionClick(section.id)}
              className={cn(
                "inline-flex h-9 cursor-pointer items-center rounded-md px-3 text-xs font-medium outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/30",
                activeSection === section.id
                  ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {section.label}
            </a>
          ))}
        </div>
      </nav>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.75fr)_minmax(19rem,1fr)]">
        <div className="space-y-4">
          <Card id="general" size="sm" className="scroll-mt-28 gap-0 py-0">
            <SettingsPanelHeader
              id="money-region-heading"
              title="Money & region"
              icon={IconWallet}
            />
            <CardContent
              aria-labelledby="money-region-heading"
              className="grid gap-3 px-4 py-3 sm:grid-cols-2 lg:grid-cols-6"
            >
              <div className="space-y-1.5 sm:col-span-1 lg:col-span-2">
                <Label htmlFor="budget" className="text-xs">
                  Monthly budget
                </Label>
                <Input
                  id="budget"
                  type="number"
                  min="0"
                  inputMode="decimal"
                  value={monthlyBudget}
                  onChange={(event) => {
                    setMonthlyBudget(event.target.value);
                    setSaveError(null);
                  }}
                  placeholder="50000"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-1 lg:col-span-2">
                <Label htmlFor="monthly-income" className="text-xs">
                  Monthly income
                </Label>
                <Input
                  id="monthly-income"
                  type="number"
                  min="0"
                  inputMode="decimal"
                  value={monthlyIncome}
                  onChange={(event) => {
                    setMonthlyIncome(event.target.value);
                    setSaveError(null);
                  }}
                  placeholder="80000"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-1 lg:col-span-2">
                <Label htmlFor="salary-day" className="text-xs">
                  Salary day
                </Label>
                <Input
                  id="salary-day"
                  type="number"
                  min="1"
                  max="28"
                  inputMode="numeric"
                  value={salaryDay}
                  onChange={(event) => {
                    setSalaryDay(event.target.value);
                    setSaveError(null);
                  }}
                  placeholder="1"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-1 lg:col-span-3">
                <Label htmlFor="currency" className="text-xs">
                  Currency
                </Label>
                <Select
                  value={currency}
                  onValueChange={(value) => {
                    setCurrency(value);
                    setSaveError(null);
                  }}
                >
                  <SelectTrigger id="currency" className="w-full">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((currencyOption) => (
                      <SelectItem
                        key={currencyOption.value}
                        value={currencyOption.value}
                      >
                        {currencyOption.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                <Label htmlFor="timezone" className="text-xs">
                  Timezone
                </Label>
                <Select
                  value={timezone}
                  onValueChange={(value) => {
                    setTimezone(value);
                    setSaveError(null);
                  }}
                >
                  <SelectTrigger id="timezone" className="w-full">
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((timezoneOption) => (
                      <SelectItem
                        key={timezoneOption.value}
                        value={timezoneOption.value}
                      >
                        {timezoneOption.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card size="sm" className="gap-0 py-0">
            <SettingsPanelHeader
              id="forecasting-heading"
              title="Forecasting"
              icon={IconChartDots}
            />
            <CardContent
              aria-labelledby="forecasting-heading"
              className="grid gap-3 px-4 py-3 sm:grid-cols-2"
            >
              <div className="space-y-1.5">
                <Label htmlFor="forecast-horizon" className="text-xs">
                  Forecast horizon
                </Label>
                <div className="relative">
                  <Input
                    id="forecast-horizon"
                    type="number"
                    min="1"
                    max="24"
                    inputMode="numeric"
                    value={forecastHorizonMonths}
                    onChange={(event) => {
                      setForecastHorizonMonths(event.target.value);
                      setSaveError(null);
                    }}
                    className="pr-16"
                    placeholder="6"
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-[0.6875rem] text-muted-foreground">
                    months
                  </span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="savings-target" className="text-xs">
                  Savings target
                </Label>
                <div className="relative">
                  <Input
                    id="savings-target"
                    type="number"
                    min="0"
                    max="100"
                    inputMode="decimal"
                    value={savingsTargetPercent}
                    onChange={(event) => {
                      setSavingsTargetPercent(event.target.value);
                      setSaveError(null);
                    }}
                    className="pr-8"
                    placeholder="20"
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-xs text-muted-foreground">
                    %
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            id="dashboard"
            size="sm"
            className="scroll-mt-28 gap-0 py-0"
          >
            <SettingsPanelHeader
              id="dashboard-widgets-heading"
              title="Dashboard widgets"
              description="Choose what appears on your dashboard."
              icon={IconLayoutDashboard}
            />
            <CardContent
              aria-labelledby="dashboard-widgets-heading"
              className="grid px-0 md:grid-flow-col md:grid-cols-2 md:grid-rows-4"
            >
              {DASHBOARD_WIDGET_OPTIONS.map((widget, index) => (
                <SettingsToggle
                  key={widget.key}
                  checked={dashboardWidgets[widget.key]}
                  label={widget.label}
                  description={widget.description}
                  onCheckedChange={() => toggleWidget(widget.key)}
                  className={cn(
                    "border-b last:border-b-0",
                    index < 4 && "md:border-r",
                    (index === 3 || index === 6) && "md:border-b-0"
                  )}
                />
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card
            id="appearance"
            size="sm"
            className="scroll-mt-28 gap-0 py-0"
          >
            <SettingsPanelHeader
              id="appearance-heading"
              title="Appearance"
              icon={IconPalette}
            />
            <CardContent
              aria-labelledby="appearance-heading"
              className="space-y-3 px-4 py-3"
            >
              <ThemeSelector />
            </CardContent>
            <div className="border-t">
              <SettingsToggle
                checked={isDemoMode}
                label="Demo mode"
                description="Use anonymized values in screenshots"
                onCheckedChange={toggleDemoMode}
              />
            </div>
          </Card>

          <Card
            id="categories"
            size="sm"
            className="scroll-mt-28 gap-0 py-0"
          >
            <SettingsPanelHeader
              id="categories-heading"
              title="Expense categories"
              icon={IconTag}
            />
            <CardContent
              aria-labelledby="categories-heading"
              className="px-4 py-3"
            >
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((category) => (
                  <span
                    key={category}
                    className="rounded-md border bg-muted/30 px-2 py-1 text-[0.6875rem] font-medium"
                  >
                    {category}
                  </span>
                ))}
              </div>
              <p className="mt-2.5 text-[0.6875rem] leading-4 text-muted-foreground">
                Categories are assigned automatically.
              </p>
            </CardContent>
          </Card>

          <Card
            id="data"
            size="sm"
            className="scroll-mt-28 gap-0 py-0"
          >
            <SettingsPanelHeader
              id="data-heading"
              title="Your data"
              icon={IconDatabase}
            />
            <CardContent
              aria-labelledby="data-heading"
              className="divide-y px-0"
            >
              <div className="flex min-h-16 flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-medium">Export data</p>
                  <p className="mt-0.5 text-[0.6875rem] leading-4 text-muted-foreground">
                    Expenses and subscriptions as CSV
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="self-start sm:self-auto"
                  onClick={handleExport}
                  disabled={exporting}
                >
                  {exporting ? (
                    <IconLoader2 className="animate-spin" />
                  ) : (
                    <IconDownload />
                  )}
                  {exporting ? "Exporting…" : "Export CSV"}
                </Button>
              </div>
              <div className="flex min-h-16 flex-col gap-3 bg-destructive/[0.035] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-destructive">
                    Delete all data
                  </p>
                  <p className="mt-0.5 text-[0.6875rem] leading-4 text-muted-foreground">
                    Permanently remove expenses and subscriptions
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="self-start sm:self-auto"
                      disabled={deleting}
                    >
                      {deleting ? (
                        <IconLoader2 className="animate-spin" />
                      ) : (
                        <IconTrash />
                      )}
                      {deleting ? "Deleting…" : "Delete"}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete all your data?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This cannot be undone. All expenses and subscriptions
                        will be permanently deleted, and your settings will be
                        reset.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteAll}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete everything
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

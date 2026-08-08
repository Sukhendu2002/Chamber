"use client";

import {
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import {
  IconAlertTriangle,
  IconArchive,
  IconArrowRight,
  IconCheck,
  IconDatabaseExport,
  IconFileSpreadsheet,
  IconFileTypeCsv,
  IconLock,
  IconLoader2,
  IconRefresh,
  IconShieldCheck,
  IconUpload,
} from "@tabler/icons-react";

import {
  importExpensesFromCsv,
  previewExpenseImport,
} from "@/lib/actions/data-transfer";
import { inferCsvMapping, parseCsv } from "@/lib/data-transfer/csv";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import type {
  CsvAmountMode,
  CsvDateFormat,
  CsvFieldMapping,
  DataExportFormat,
  DataExportRange,
  DataExportSection,
  DataTransferContext,
  ExpenseImportPreview,
  ExpenseImportRequest,
  ExpenseImportResult,
  ImportRowStatus,
} from "@/types/data-transfer";

const MAX_FILE_SIZE = 5_000_000;
const NONE_VALUE = "__none__";

const EXPORT_SECTIONS: Array<{
  id: DataExportSection;
  label: string;
  description: string;
}> = [
  { id: "expenses", label: "Expenses", description: "Transactions, tags, and receipt references" },
  { id: "accounts", label: "Accounts", description: "Balances and balance history" },
  { id: "transfers", label: "Transfers", description: "Account and card transfers" },
  { id: "loans", label: "Loans", description: "Loans, repayments, and receipt references" },
  { id: "subscriptions", label: "Subscriptions", description: "Billing schedules and reminders" },
  { id: "goals", label: "Goals", description: "Savings and financial goals" },
  { id: "investments", label: "Investments", description: "Holdings, products, and transactions" },
  { id: "categories", label: "Categories & tags", description: "Custom classification data" },
  { id: "settings", label: "Settings", description: "Budget, currency, and preferences" },
  { id: "insights", label: "Plans & reports", description: "Recurring patterns, plans, and AI reports" },
];

const MAPPING_FIELDS: Array<{
  id: keyof CsvFieldMapping;
  label: string;
  required?: boolean;
  helper: string;
}> = [
  { id: "date", label: "Date", required: true, helper: "Transaction or posting date" },
  { id: "amount", label: "Amount", required: true, helper: "Debit, withdrawal, or signed amount" },
  { id: "description", label: "Description", helper: "Narration, memo, or transaction details" },
  { id: "merchant", label: "Merchant", helper: "Payee or counterparty" },
  { id: "category", label: "Category", helper: "Defaults to General when omitted" },
  { id: "paymentMethod", label: "Payment method", helper: "Account or bank label" },
  { id: "type", label: "Debit / credit type", helper: "Credits are detected and skipped" },
];

const STATUS_LABELS: Record<ImportRowStatus, string> = {
  ready: "Ready",
  duplicate: "Duplicate",
  invalid: "Invalid",
  credit: "Credit skipped",
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong";
}

function ExportPanel() {
  const [format, setFormat] = useState<DataExportFormat>("csv");
  const [range, setRange] = useState<DataExportRange>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sections, setSections] = useState<DataExportSection[]>(
    EXPORT_SECTIONS.map(({ id }) => id),
  );
  const [encrypted, setEncrypted] = useState(false);
  const [password, setPassword] = useState("");
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);

  const toggleSection = (section: DataExportSection) => {
    setSections((current) =>
      current.includes(section)
        ? current.filter((value) => value !== section)
        : [...current, section],
    );
    setMessage(null);
  };

  const handleExport = async () => {
    setMessage(null);
    if (sections.length === 0) {
      setMessage({ tone: "error", text: "Select at least one data type to export." });
      return;
    }
    if (range === "custom" && (!startDate || !endDate)) {
      setMessage({ tone: "error", text: "Choose both dates for a custom range." });
      return;
    }
    if (encrypted && password.length < 12) {
      setMessage({
        tone: "error",
        text: "Encrypted backups require a password of at least 12 characters.",
      });
      return;
    }

    setExporting(true);
    try {
      const response = await fetch("/api/data-transfer/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format,
          sections,
          range,
          startDate: range === "custom" ? startDate : undefined,
          endDate: range === "custom" ? endDate : undefined,
          encryptionPassword: encrypted ? password : undefined,
        }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || "The export could not be created");
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") || "";
      const fileName = disposition.match(/filename="([^"]+)"/)?.[1] || "chamber-export";
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);

      const recordCount = Number(response.headers.get("X-Record-Count") || 0);
      setMessage({
        tone: "success",
        text: `Downloaded ${recordCount.toLocaleString()} records${encrypted ? " in an encrypted backup" : ""}.`,
      });
      if (encrypted) setPassword("");
    } catch (error) {
      setMessage({ tone: "error", text: getErrorMessage(error) });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <Card className="gap-0 py-0">
        <CardHeader className="border-b py-4">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary">
              <IconDatabaseExport aria-hidden="true" className="size-5 stroke-[1.8]" />
            </span>
            <div>
              <CardTitle role="heading" aria-level={2}>Build an export</CardTitle>
              <CardDescription>
                Choose a format, time frame, and exactly which records to include.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 py-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="export-format">Format</Label>
              <Select value={format} onValueChange={(value) => setFormat(value as DataExportFormat)}>
                <SelectTrigger id="export-format" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV files (.zip)</SelectItem>
                  <SelectItem value="xlsx">Excel workbook (.xlsx)</SelectItem>
                  <SelectItem value="json">JSON backup (.json)</SelectItem>
                  <SelectItem value="pdf">Readable archive (.pdf)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[0.6875rem] text-muted-foreground">
                CSV exports contain one file per selected data type.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="export-range">Time frame</Label>
              <Select value={range} onValueChange={(value) => setRange(value as DataExportRange)}>
                <SelectTrigger id="export-range" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All time</SelectItem>
                  <SelectItem value="last_30_days">Last 30 days</SelectItem>
                  <SelectItem value="last_year">Last 12 months</SelectItem>
                  <SelectItem value="custom">Custom dates</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[0.6875rem] text-muted-foreground">
                Date filters apply to dated records and nested histories.
              </p>
            </div>
          </div>

          {range === "custom" && (
            <div className="grid gap-4 rounded-md border bg-muted/20 p-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="export-start-date">Start date</Label>
                <Input
                  id="export-start-date"
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="export-end-date">End date</Label>
                <Input
                  id="export-end-date"
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                />
              </div>
            </div>
          )}

          <fieldset className="relative">
            <legend className="mb-3 min-h-8 py-2 text-xs font-medium">Data types</legend>
            <button
              type="button"
              className="absolute right-0 top-0 min-h-8 cursor-pointer text-[0.6875rem] font-medium underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
              onClick={() =>
                setSections(
                  sections.length === EXPORT_SECTIONS.length
                    ? []
                    : EXPORT_SECTIONS.map(({ id }) => id),
                )
              }
            >
              {sections.length === EXPORT_SECTIONS.length ? "Clear all" : "Select all"}
            </button>
            <div className="grid overflow-hidden rounded-md border sm:grid-cols-2">
              {EXPORT_SECTIONS.map((section) => (
                <label
                  key={section.id}
                  className="flex min-h-14 cursor-pointer items-start gap-3 border-b px-3 py-2.5 transition-colors last:border-b-0 hover:bg-muted/35 sm:odd:border-r sm:[&:nth-last-child(-n+2)]:border-b-0"
                >
                  <input
                    type="checkbox"
                    checked={sections.includes(section.id)}
                    onChange={() => toggleSection(section.id)}
                    className="mt-0.5 size-4 accent-primary"
                  />
                  <span>
                    <span className="block text-xs font-medium">{section.label}</span>
                    <span className="block text-[0.6875rem] leading-4 text-muted-foreground">
                      {section.description}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="rounded-md border">
            <label className="flex min-h-14 cursor-pointer items-center justify-between gap-4 px-3 py-2.5">
              <span className="flex items-start gap-3">
                <IconLock aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                <span>
                  <span className="block text-xs font-medium">Encrypt this download</span>
                  <span className="block text-[0.6875rem] leading-4 text-muted-foreground">
                    AES-256-GCM encryption; your password is never stored.
                  </span>
                </span>
              </span>
              <input
                type="checkbox"
                checked={encrypted}
                onChange={(event) => {
                  setEncrypted(event.target.checked);
                  setMessage(null);
                }}
                className="size-4 shrink-0 accent-primary"
              />
            </label>
            {encrypted && (
              <div className="border-t px-3 py-3">
                <Label htmlFor="backup-password">Backup password</Label>
                <Input
                  id="backup-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="mt-1.5"
                  placeholder="At least 12 characters"
                />
                <p className="mt-1.5 text-[0.6875rem] text-muted-foreground">
                  Chamber cannot recover this password. Store it separately from the backup.
                </p>
              </div>
            )}
          </div>

          {message && (
            <p
              role={message.tone === "error" ? "alert" : "status"}
              className={cn(
                "flex items-start gap-2 rounded-md border px-3 py-2 text-xs",
                message.tone === "error"
                  ? "border-destructive/30 bg-destructive/5 text-destructive"
                  : "bg-muted/35 text-foreground",
              )}
            >
              {message.tone === "error" ? (
                <IconAlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              ) : (
                <IconCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              )}
              {message.text}
            </p>
          )}

          <div className="flex justify-end">
            <Button onClick={handleExport} disabled={exporting || sections.length === 0}>
              {exporting ? (
                <IconLoader2 aria-hidden="true" className="animate-spin" />
              ) : (
                <IconArchive aria-hidden="true" />
              )}
              {exporting ? "Building export…" : "Download export"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <aside className="space-y-3">
        <Card size="sm">
          <CardHeader>
            <CardTitle role="heading" aria-level={3} className="flex items-center gap-2">
              <IconFileSpreadsheet aria-hidden="true" className="size-4" />
              Format guide
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-[0.6875rem] leading-4 text-muted-foreground">
            <p><strong className="text-foreground">CSV</strong> for analysis and broad compatibility.</p>
            <p><strong className="text-foreground">Excel</strong> for one organized, filterable workbook.</p>
            <p><strong className="text-foreground">JSON</strong> for complete structured backups.</p>
            <p><strong className="text-foreground">PDF</strong> for a human-readable archive.</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardTitle role="heading" aria-level={3} className="flex items-center gap-2">
              <IconShieldCheck aria-hidden="true" className="size-4" />
              Privacy
            </CardTitle>
          </CardHeader>
          <CardContent className="text-[0.6875rem] leading-4 text-muted-foreground">
            Exports are generated only after authentication, are never cached, and are not retained by Chamber.
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

function ImportPanel({ context }: { context: DataTransferContext }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState("");
  const [csvText, setCsvText] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [sampleCount, setSampleCount] = useState(0);
  const [mapping, setMapping] = useState<CsvFieldMapping>({ date: "", amount: "" });
  const [dateFormat, setDateFormat] = useState<CsvDateFormat>("auto");
  const [amountMode, setAmountMode] = useState<CsvAmountMode>("all");
  const [accountId, setAccountId] = useState("");
  const [preview, setPreview] = useState<ExpenseImportPreview | null>(null);
  const [result, setResult] = useState<ExpenseImportResult | null>(null);
  const [loading, setLoading] = useState<"preview" | "import" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setFileName("");
    setCsvText("");
    setHeaders([]);
    setSampleCount(0);
    setMapping({ date: "", amount: "" });
    setPreview(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const readFile = async (file: File) => {
    setError(null);
    setPreview(null);
    setResult(null);
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Choose a CSV file. PDF and receipt imports are not available in this flow yet.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError("CSV files are limited to 5 MB and 10,000 data rows.");
      return;
    }

    try {
      const text = await file.text();
      const parsed = parseCsv(text);
      setFileName(file.name);
      setCsvText(text);
      setHeaders(parsed.headers);
      setSampleCount(parsed.rows.length);
      setMapping(inferCsvMapping(parsed.headers));
    } catch (fileError) {
      reset();
      setError(getErrorMessage(fileError));
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void readFile(file);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) void readFile(file);
  };

  const updateMapping = (field: keyof CsvFieldMapping, value: string) => {
    setMapping((current) => ({
      ...current,
      [field]: value === NONE_VALUE ? (field === "date" || field === "amount" ? "" : undefined) : value,
    }));
    setPreview(null);
    setResult(null);
    setError(null);
  };

  const request: ExpenseImportRequest = {
    csvText,
    fileName,
    mapping,
    dateFormat,
    amountMode,
    accountId: accountId || undefined,
  };

  const handlePreview = async () => {
    setError(null);
    setResult(null);
    if (!mapping.date || !mapping.amount || (!mapping.description && !mapping.merchant)) {
      setError("Map the date, amount, and at least one description or merchant column.");
      return;
    }
    setLoading("preview");
    try {
      setPreview(await previewExpenseImport(request));
    } catch (previewError) {
      setError(getErrorMessage(previewError));
    } finally {
      setLoading(null);
    }
  };

  const handleImport = async () => {
    setError(null);
    setLoading("import");
    try {
      const imported = await importExpensesFromCsv(request);
      setResult(imported);
      setPreview(null);
    } catch (importError) {
      setError(getErrorMessage(importError));
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      <ol aria-label="Import progress" className="grid overflow-hidden rounded-md border sm:grid-cols-3">
        {[
          { label: "1. Upload", active: !csvText },
          { label: "2. Map & preview", active: Boolean(csvText && !preview && !result) },
          { label: "3. Import", active: Boolean(preview || result) },
        ].map((step) => (
          <li
            key={step.label}
            aria-current={step.active ? "step" : undefined}
            className={cn(
              "flex min-h-10 items-center justify-center border-b px-3 text-xs font-medium last:border-b-0 sm:border-r sm:border-b-0 sm:last:border-r-0",
              step.active ? "bg-secondary text-foreground" : "text-muted-foreground",
            )}
          >
            {step.label}
          </li>
        ))}
      </ol>

      <Card className="gap-0 py-0">
        <CardHeader className="border-b py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle role="heading" aria-level={2}>Upload expense CSV</CardTitle>
              <CardDescription>
                Bank statements and exports from finance apps are mapped before anything is saved.
              </CardDescription>
            </div>
            {csvText && (
              <Button variant="ghost" size="sm" onClick={reset}>
                <IconRefresh aria-hidden="true" />
                Start over
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="py-4">
          <input
            ref={fileInputRef}
            id="csv-file"
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={handleFileChange}
          />
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
            }}
            onDrop={handleDrop}
            className={cn(
              "flex min-h-40 flex-col items-center justify-center rounded-md border border-dashed p-6 text-center transition-colors",
              dragging ? "border-primary bg-primary/5" : "border-border bg-muted/15",
            )}
          >
            {csvText ? (
              <>
                <IconFileTypeCsv aria-hidden="true" className="mb-2 size-8" />
                <p className="max-w-full truncate text-sm font-medium">{fileName}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {sampleCount.toLocaleString()} rows · {headers.length} columns
                </p>
              </>
            ) : (
              <>
                <IconUpload aria-hidden="true" className="mb-2 size-8 text-muted-foreground" />
                <p className="text-sm font-medium">Drop a CSV here</p>
                <p className="mt-1 text-xs text-muted-foreground">Up to 5 MB or 10,000 rows</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Choose CSV
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {csvText && (
        <Card className="gap-0 py-0">
          <CardHeader className="border-b py-4">
            <CardTitle role="heading" aria-level={2}>Map columns</CardTitle>
            <CardDescription>
              Suggested mappings are based on common bank, PocketMoney, Trail, Splitwise, and spreadsheet headers.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 py-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {MAPPING_FIELDS.map((field) => (
                <div key={field.id} className="space-y-1.5">
                  <Label htmlFor={`mapping-${field.id}`}>
                    {field.label}{field.required ? " *" : ""}
                  </Label>
                  <Select
                    value={mapping[field.id] || NONE_VALUE}
                    onValueChange={(value) => updateMapping(field.id, value)}
                  >
                    <SelectTrigger id={`mapping-${field.id}`} className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_VALUE}>Not mapped</SelectItem>
                      {headers.map((header) => (
                        <SelectItem key={header} value={header}>{header}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[0.6875rem] leading-4 text-muted-foreground">{field.helper}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-4 rounded-md border bg-muted/15 p-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="date-format">Date format</Label>
                <Select value={dateFormat} onValueChange={(value) => { setDateFormat(value as CsvDateFormat); setPreview(null); }}>
                  <SelectTrigger id="date-format" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto (day first)</SelectItem>
                    <SelectItem value="dmy">DD/MM/YYYY</SelectItem>
                    <SelectItem value="mdy">MM/DD/YYYY</SelectItem>
                    <SelectItem value="ymd">YYYY/MM/DD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="amount-mode">Amount handling</Label>
                <Select value={amountMode} onValueChange={(value) => { setAmountMode(value as CsvAmountMode); setPreview(null); }}>
                  <SelectTrigger id="amount-mode" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All values are expenses</SelectItem>
                    <SelectItem value="negative_only">Only negative values are expenses</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="target-account">Link account</Label>
                <Select value={accountId || NONE_VALUE} onValueChange={(value) => { setAccountId(value === NONE_VALUE ? "" : value); setPreview(null); }}>
                  <SelectTrigger id="target-account" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_VALUE}>Do not link</SelectItem>
                    {context.accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name} · {account.type.replaceAll("_", " ").toLowerCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[0.6875rem] leading-4 text-muted-foreground">
                  Linking adjusts the account balance by the imported expense total.
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handlePreview} disabled={Boolean(loading)}>
                {loading === "preview" ? <IconLoader2 className="animate-spin" /> : <IconArrowRight />}
                {loading === "preview" ? "Checking rows…" : "Preview import"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <p role="alert" className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          <IconAlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      )}

      {result && (
        <Card className="border-primary/25 bg-primary/[0.025]">
          <CardContent className="flex flex-col items-start gap-3 py-1 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex size-9 items-center justify-center rounded-md bg-secondary">
                <IconCheck aria-hidden="true" className="size-5" />
              </span>
              <div>
                <p className="text-sm font-semibold">Import complete</p>
                <p className="text-xs text-muted-foreground">
                  {result.imported.toLocaleString()} imported · {result.duplicates.toLocaleString()} duplicates · {result.invalid.toLocaleString()} invalid · {result.credits.toLocaleString()} credits skipped
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={reset}>Import another file</Button>
          </CardContent>
        </Card>
      )}

      {preview && (
        <Card className="gap-0 py-0">
          <CardHeader className="border-b py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle role="heading" aria-level={2}>Dry-run preview</CardTitle>
                <CardDescription>
                  Nothing has been saved. Review the classification before importing.
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-1.5" aria-label="Import summary">
                <Badge variant="outline">{preview.summary.ready} ready</Badge>
                <Badge variant="secondary">{preview.summary.duplicates} duplicates</Badge>
                <Badge variant={preview.summary.invalid ? "destructive" : "outline"}>{preview.summary.invalid} invalid</Badge>
                <Badge variant="secondary">{preview.summary.credits} credits</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-0 py-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Row</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.rows.map((row) => (
                    <TableRow key={row.rowNumber}>
                      <TableCell className="text-muted-foreground">{row.rowNumber}</TableCell>
                      <TableCell>{row.date || "—"}</TableCell>
                      <TableCell className="max-w-72">
                        <span className="block truncate font-medium">{row.merchant || row.description || "—"}</span>
                        {row.merchant && row.description && (
                          <span className="block truncate text-[0.6875rem] text-muted-foreground">{row.description}</span>
                        )}
                      </TableCell>
                      <TableCell>{row.category}</TableCell>
                      <TableCell>
                        <Badge variant={row.status === "invalid" ? "destructive" : row.status === "ready" ? "outline" : "secondary"}>
                          {STATUS_LABELS[row.status]}
                        </Badge>
                        {row.message && <span className="sr-only">: {row.message}</span>}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.amount === null ? "—" : row.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {preview.previewTruncated && (
              <p className="border-t px-4 py-2 text-[0.6875rem] text-muted-foreground">
                Showing the first 200 rows. Summary counts include the entire file.
              </p>
            )}
            <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[0.6875rem] leading-4 text-muted-foreground">
                Duplicate protection is enforced again when the import is saved.
              </p>
              <Button onClick={handleImport} disabled={Boolean(loading) || preview.summary.ready === 0}>
                {loading === "import" ? <IconLoader2 className="animate-spin" /> : <IconCheck />}
                {loading === "import" ? "Importing…" : `Import ${preview.summary.ready.toLocaleString()} expenses`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function DataTransferWorkspace({ context }: { context: DataTransferContext }) {
  return (
    <Tabs defaultValue="export" className="gap-4">
      <TabsList aria-label="Data transfer mode">
        <TabsTrigger value="export">
          <IconDatabaseExport aria-hidden="true" />
          Export
        </TabsTrigger>
        <TabsTrigger value="import">
          <IconUpload aria-hidden="true" />
          Import expenses
        </TabsTrigger>
      </TabsList>
      <TabsContent value="export">
        <ExportPanel />
      </TabsContent>
      <TabsContent value="import">
        <ImportPanel context={context} />
      </TabsContent>
    </Tabs>
  );
}

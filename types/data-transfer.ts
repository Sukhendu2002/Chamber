export const DATA_EXPORT_SECTIONS = [
  "expenses",
  "accounts",
  "transfers",
  "loans",
  "subscriptions",
  "goals",
  "investments",
  "categories",
  "settings",
  "insights",
] as const;

export type DataExportSection = (typeof DATA_EXPORT_SECTIONS)[number];

export const DATA_EXPORT_FORMATS = ["csv", "xlsx", "json", "pdf"] as const;

export type DataExportFormat = (typeof DATA_EXPORT_FORMATS)[number];

export const DATA_EXPORT_RANGES = [
  "all",
  "last_30_days",
  "last_year",
  "custom",
] as const;

export type DataExportRange = (typeof DATA_EXPORT_RANGES)[number];

export interface DataExportRequest {
  format: DataExportFormat;
  sections: DataExportSection[];
  range: DataExportRange;
  startDate?: string;
  endDate?: string;
  encryptionPassword?: string;
}

export const CSV_IMPORT_FIELDS = [
  "date",
  "amount",
  "description",
  "merchant",
  "category",
  "paymentMethod",
  "type",
] as const;

export type CsvImportField = (typeof CSV_IMPORT_FIELDS)[number];

export interface CsvFieldMapping {
  date: string;
  amount: string;
  description?: string;
  merchant?: string;
  category?: string;
  paymentMethod?: string;
  type?: string;
}

export type CsvDateFormat = "auto" | "dmy" | "mdy" | "ymd";
export type CsvAmountMode = "all" | "negative_only";

export interface ExpenseImportRequest {
  csvText: string;
  fileName: string;
  mapping: CsvFieldMapping;
  dateFormat: CsvDateFormat;
  amountMode: CsvAmountMode;
  accountId?: string;
}

export type ImportRowStatus = "ready" | "duplicate" | "invalid" | "credit";

export interface ImportPreviewRow {
  rowNumber: number;
  date: string | null;
  amount: number | null;
  description: string;
  merchant: string;
  category: string;
  paymentMethod: string;
  status: ImportRowStatus;
  message?: string;
}

export interface ImportPreviewSummary {
  total: number;
  ready: number;
  duplicates: number;
  invalid: number;
  credits: number;
}

export interface ExpenseImportPreview {
  rows: ImportPreviewRow[];
  summary: ImportPreviewSummary;
  previewTruncated: boolean;
}

export interface ExpenseImportResult {
  imported: number;
  duplicates: number;
  invalid: number;
  credits: number;
}

export interface DataTransferContext {
  accounts: Array<{
    id: string;
    name: string;
    type: string;
  }>;
  categories: string[];
}

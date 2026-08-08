import type {
  CsvAmountMode,
  CsvDateFormat,
  CsvFieldMapping,
} from "@/types/data-transfer";

const MAX_CSV_ROWS = 10_000;

interface ParsedCsv {
  headers: string[];
  rows: Array<Record<string, string>>;
}

export interface NormalizedImportRow {
  rowNumber: number;
  date: Date | null;
  amount: number | null;
  description: string;
  merchant: string;
  category: string;
  paymentMethod: string;
  isCredit: boolean;
  error?: string;
}

const FIELD_ALIASES: Record<keyof CsvFieldMapping, string[]> = {
  date: [
    "date",
    "transaction date",
    "txn date",
    "value date",
    "posted date",
    "booking date",
  ],
  amount: [
    "debit",
    "debit amount",
    "withdrawal",
    "withdrawal amount",
    "withdrawal amt",
    "expense amount",
    "cost",
    "amount",
    "transaction amount",
  ],
  description: [
    "description",
    "narration",
    "transaction details",
    "details",
    "particulars",
    "memo",
    "note",
  ],
  merchant: ["merchant", "payee", "vendor", "counterparty", "name"],
  category: ["category", "expense category", "group"],
  paymentMethod: [
    "payment method",
    "account",
    "account name",
    "bank",
    "wallet",
  ],
  type: [
    "type",
    "transaction type",
    "debit credit",
    "debit/credit",
    "dr/cr",
    "direction",
  ],
};

function normalizeHeader(value: string) {
  return value
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ");
}

export function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createLocalDate(year: number, month: number, day: number) {
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

export function parseCsv(text: string, maxRows = MAX_CSV_ROWS): ParsedCsv {
  if (!text.trim()) throw new Error("The CSV file is empty");

  const firstLine = text.split(/\r?\n/, 1)[0] || "";
  const delimiter = ([",", ";", "\t"] as const).reduce(
    (selected, candidate) =>
      firstLine.split(candidate).length > firstLine.split(selected).length
        ? candidate
        : selected,
    "," as "," | ";" | "\t",
  );
  const matrix: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (character === delimiter && !quoted) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value.trim())) matrix.push(row);
      row = [];
      cell = "";
      if (matrix.length > maxRows + 1) {
        throw new Error(`CSV files are limited to ${maxRows.toLocaleString()} data rows`);
      }
      continue;
    }

    cell += character;
  }

  if (quoted) throw new Error("The CSV contains an unclosed quoted value");

  row.push(cell);
  if (row.some((value) => value.trim())) matrix.push(row);
  if (matrix.length > maxRows + 1) {
    throw new Error(`CSV files are limited to ${maxRows.toLocaleString()} data rows`);
  }

  const headerRow = matrix[0];
  if (!headerRow) throw new Error("The CSV file has no header row");

  const headers = headerRow.map((header, index) => {
    const trimmed = header.replace(/^\uFEFF/, "").trim();
    return trimmed || `Column ${index + 1}`;
  });
  const uniqueHeaders = new Set(headers.map(normalizeHeader));
  if (uniqueHeaders.size !== headers.length) {
    throw new Error("The CSV contains duplicate column names");
  }

  const rows = matrix.slice(1).map((values) =>
    Object.fromEntries(headers.map((header, index) => [header, values[index]?.trim() || ""])),
  );

  return { headers, rows };
}

export function inferCsvMapping(headers: string[]): CsvFieldMapping {
  const normalizedHeaders = headers.map((header) => ({
    original: header,
    normalized: normalizeHeader(header),
  }));

  const mapping: CsvFieldMapping = { date: "", amount: "" };

  for (const field of Object.keys(FIELD_ALIASES) as Array<keyof CsvFieldMapping>) {
    const aliases = FIELD_ALIASES[field];
    const exactMatch = normalizedHeaders.find(({ normalized }) =>
      aliases.includes(normalized),
    );
    const fuzzyMatch = normalizedHeaders.find(({ normalized }) =>
      aliases.some((alias) => normalized.includes(alias)),
    );
    const match = exactMatch || fuzzyMatch;
    if (match) mapping[field] = match.original;
  }

  return mapping;
}

function parseDateValue(value: string, format: CsvDateFormat): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^\d{4}-\d{1,2}-\d{1,2}/.test(trimmed)) {
    const [year, month, day] = trimmed.slice(0, 10).split("-").map(Number);
    return createLocalDate(year, month, day);
  }

  const numericParts = trimmed.match(/^(\d{1,4})[\/.\-](\d{1,2})[\/.\-](\d{1,4})$/);
  if (numericParts) {
    const first = Number(numericParts[1]);
    const second = Number(numericParts[2]);
    const third = Number(numericParts[3]);
    let year: number;
    let month: number;
    let day: number;

    if (format === "ymd" || numericParts[1].length === 4) {
      year = first;
      month = second;
      day = third;
    } else if (format === "mdy") {
      month = first;
      day = second;
      year = third;
    } else if (format === "auto" && second > 12) {
      month = first;
      day = second;
      year = third;
    } else if (format === "dmy" || first > 12) {
      day = first;
      month = second;
      year = third;
    } else {
      day = first;
      month = second;
      year = third;
    }

    if (year < 100) year += year >= 70 ? 1900 : 2000;
    return createLocalDate(year, month, day);
  }

  const timestamp = Date.parse(trimmed);
  if (Number.isNaN(timestamp)) return null;
  const parsed = new Date(timestamp);
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

function parseAmountValue(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "-") return null;

  const isParenthesized = /^\(.*\)$/.test(trimmed);
  const hasTrailingDebit = /\bDR\.?$/i.test(trimmed);
  const cleaned = trimmed
    .replace(/\b(?:DR|CR)\.?$/i, "")
    .replace(/[^\d.,+\-]/g, "")
    .replace(/,/g, "");
  const parsed = Number.parseFloat(cleaned);
  if (!Number.isFinite(parsed)) return null;
  return isParenthesized || hasTrailingDebit ? -Math.abs(parsed) : parsed;
}

function isCreditValue(value: string) {
  const normalized = value.trim().toLowerCase();
  return /^(cr|credit|deposit|income|inflow|refund|received)$/.test(normalized);
}

function isDebitValue(value: string) {
  const normalized = value.trim().toLowerCase();
  return /^(dr|debit|withdrawal|expense|outflow|paid)$/.test(normalized);
}

function valueFor(row: Record<string, string>, header?: string) {
  return header ? row[header]?.trim() || "" : "";
}

export function normalizeCsvRows(
  rows: Array<Record<string, string>>,
  mapping: CsvFieldMapping,
  dateFormat: CsvDateFormat,
  amountMode: CsvAmountMode,
): NormalizedImportRow[] {
  return rows.map((row, index) => {
    const date = parseDateValue(valueFor(row, mapping.date), dateFormat);
    const parsedAmount = parseAmountValue(valueFor(row, mapping.amount));
    const typeValue = valueFor(row, mapping.type);
    const isCredit =
      isCreditValue(typeValue) ||
      (amountMode === "negative_only" &&
        parsedAmount !== null &&
        parsedAmount >= 0 &&
        !isDebitValue(typeValue));
    const amount = parsedAmount === null ? null : Math.abs(parsedAmount);
    const description = valueFor(row, mapping.description).slice(0, 500);
    const merchant = valueFor(row, mapping.merchant).slice(0, 200);
    const category = valueFor(row, mapping.category).slice(0, 50) || "General";
    const paymentMethod = valueFor(row, mapping.paymentMethod).slice(0, 100);
    let error: string | undefined;

    if (!date) error = "Invalid or missing date";
    else if (amount === null || amount <= 0) error = "Invalid or missing amount";
    else if (!description && !merchant) error = "Map a description or merchant column";

    return {
      rowNumber: index + 2,
      date,
      amount,
      description,
      merchant,
      category,
      paymentMethod,
      isCredit,
      error,
    };
  });
}

function normalizeFingerprintText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 200);
}

export function createExpenseFingerprint(input: {
  date: Date;
  amount: number;
  merchant?: string | null;
  description?: string | null;
}) {
  const date = formatLocalDate(input.date);
  const amount = Math.round(input.amount * 100);
  const label = normalizeFingerprintText(input.merchant || input.description || "");
  return `${date}|${amount}|${label}`;
}

function csvCell(value: unknown) {
  if (value === null || value === undefined) return '""';
  let serialized =
    typeof value === "object" ? JSON.stringify(value) : String(value);
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(serialized)) {
    serialized = `'${serialized}`;
  }
  return `"${serialized.replace(/"/g, '""')}"`;
}

export function recordsToCsv(rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) return "";
  const headers = Array.from(
    rows.reduce((keys, row) => {
      Object.keys(row).forEach((key) => keys.add(key));
      return keys;
    }, new Set<string>()),
  );
  return [
    headers.map(csvCell).join(","),
    ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(",")),
  ].join("\n");
}

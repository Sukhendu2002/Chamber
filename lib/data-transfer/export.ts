import { createCipheriv, randomBytes, scryptSync } from "node:crypto";

import ExcelJS from "exceljs";
import JSZip from "jszip";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import { db } from "@/lib/db";
import { recordsToCsv } from "@/lib/data-transfer/csv";
import type {
  DataExportRequest,
  DataExportSection,
} from "@/types/data-transfer";

interface ExportTable {
  key: string;
  label: string;
  rows: Array<Record<string, unknown>>;
}

interface ExportPayload {
  metadata: {
    version: number;
    exportedAt: string;
    range: DataExportRequest["range"];
    startDate: string | null;
    endDate: string | null;
    sections: DataExportSection[];
  };
  tables: ExportTable[];
}

export interface GeneratedExport {
  body: Buffer;
  contentType: string;
  fileName: string;
  recordCount: number;
  encrypted: boolean;
}

interface DateFilter {
  gte: Date;
  lte: Date;
}

function parseLocalDate(value: string, endOfDay = false) {
  const [year, month, day] = value.split("-").map(Number);
  return endOfDay
    ? new Date(year, month - 1, day, 23, 59, 59, 999)
    : new Date(year, month - 1, day);
}

function getDateFilter(request: DataExportRequest): DateFilter | undefined {
  if (request.range === "all") return undefined;

  const end = request.range === "custom" && request.endDate
    ? parseLocalDate(request.endDate, true)
    : new Date();
  const start = request.range === "custom" && request.startDate
    ? parseLocalDate(request.startDate)
    : new Date(end);

  if (request.range === "last_30_days") start.setUTCDate(start.getUTCDate() - 30);
  if (request.range === "last_year") start.setUTCFullYear(start.getUTCFullYear() - 1);

  return { gte: start, lte: end };
}

function serializeValue(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "bigint") return value.toString();
  if (Buffer.isBuffer(value)) return value.toString("base64");
  if (Array.isArray(value)) return value.map(serializeValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, serializeValue(nestedValue)]),
    );
  }
  return value;
}

function serializeRows(rows: unknown[]): Array<Record<string, unknown>> {
  return rows.map((row) => serializeValue(row) as Record<string, unknown>);
}

export async function collectUserExport(
  userId: string,
  request: DataExportRequest,
): Promise<ExportPayload> {
  const selected = new Set(request.sections);
  const date = getDateFilter(request);
  const tasks: Array<Promise<ExportTable[]>> = [];

  if (selected.has("expenses")) {
    tasks.push(
      db.expense
        .findMany({
          where: { userId, ...(date ? { date } : {}) },
          orderBy: { date: "desc" },
          include: { tags: { include: { tag: true } } },
        })
        .then((rows) => [
          {
            key: "expenses",
            label: "Expenses",
            rows: serializeRows(
              rows.map(({ tags, ...expense }) => ({
                ...expense,
                tags: tags.map(({ tag }) => tag.name),
              })),
            ),
          },
        ]),
    );
  }

  if (selected.has("accounts")) {
    tasks.push(
      db.account
        .findMany({
          where: { userId },
          orderBy: { createdAt: "asc" },
          include: {
            balanceHistory: {
              where: date ? { date } : undefined,
              orderBy: { date: "asc" },
            },
          },
        })
        .then((rows) => [
          { key: "accounts", label: "Accounts", rows: serializeRows(rows) },
        ]),
    );
  }

  if (selected.has("transfers")) {
    tasks.push(
      db.transfer
        .findMany({
          where: { userId, ...(date ? { date } : {}) },
          orderBy: { date: "desc" },
          include: {
            fromAccount: { select: { name: true } },
            toAccount: { select: { name: true } },
          },
        })
        .then((rows) => [
          { key: "transfers", label: "Transfers", rows: serializeRows(rows) },
        ]),
    );
  }

  if (selected.has("loans")) {
    tasks.push(
      db.loan
        .findMany({
          where: { userId, ...(date ? { lendDate: date } : {}) },
          orderBy: { lendDate: "desc" },
          include: {
            repayments: {
              where: date ? { date } : undefined,
              orderBy: { date: "asc" },
            },
          },
        })
        .then((rows) => [
          { key: "loans", label: "Loans", rows: serializeRows(rows) },
        ]),
    );
  }

  if (selected.has("subscriptions")) {
    tasks.push(
      db.subscription
        .findMany({
          where: { userId, ...(date ? { nextBillingDate: date } : {}) },
          orderBy: { nextBillingDate: "asc" },
        })
        .then((rows) => [
          {
            key: "subscriptions",
            label: "Subscriptions",
            rows: serializeRows(rows),
          },
        ]),
    );
  }

  if (selected.has("goals")) {
    tasks.push(
      Promise.all([
        db.goal.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
        db.financialGoal.findMany({
          where: { userId },
          orderBy: { targetDate: "asc" },
        }),
      ]).then(([goals, financialGoals]) => [
        { key: "goals", label: "Savings goals", rows: serializeRows(goals) },
        {
          key: "financial-goals",
          label: "Financial goals",
          rows: serializeRows(financialGoals),
        },
      ]),
    );
  }

  if (selected.has("investments")) {
    tasks.push(
      Promise.all([
        db.investment.findMany({ where: { userId }, orderBy: { startDate: "asc" } }),
        db.investmentProduct.findMany({
          where: { userId },
          orderBy: { purchaseDate: "asc" },
          include: {
            account: { select: { name: true } },
            livePrice: true,
            transactions: {
              where: date ? { date } : undefined,
              orderBy: { date: "asc" },
            },
          },
        }),
      ]).then(([investments, products]) => [
        {
          key: "investments",
          label: "Investments",
          rows: serializeRows(investments),
        },
        {
          key: "investment-products",
          label: "Investment products",
          rows: serializeRows(products),
        },
      ]),
    );
  }

  if (selected.has("categories")) {
    tasks.push(
      Promise.all([
        db.userCategory.findMany({ where: { userId }, orderBy: { sortOrder: "asc" } }),
        db.tag.findMany({ where: { userId }, orderBy: { name: "asc" } }),
      ]).then(([categories, tags]) => [
        {
          key: "categories",
          label: "Categories",
          rows: serializeRows(categories),
        },
        { key: "tags", label: "Tags", rows: serializeRows(tags) },
      ]),
    );
  }

  if (selected.has("settings")) {
    tasks.push(
      db.userSettings.findUnique({ where: { userId } }).then((settings) => [
        {
          key: "settings",
          label: "Settings",
          rows: settings ? serializeRows([settings]) : [],
        },
      ]),
    );
  }

  if (selected.has("insights")) {
    tasks.push(
      Promise.all([
        db.recurringPattern.findMany({
          where: { userId, ...(date ? { lastOccurrence: date } : {}) },
          orderBy: { lastOccurrence: "desc" },
        }),
        db.monthlyPlan.findMany({
          where: { userId, ...(date ? { createdAt: date } : {}) },
          orderBy: [{ year: "desc" }, { month: "desc" }],
        }),
        db.aiReport.findMany({
          where: { userId, ...(date ? { createdAt: date } : {}) },
          orderBy: { createdAt: "desc" },
        }),
      ]).then(([patterns, plans, reports]) => [
        {
          key: "recurring-patterns",
          label: "Recurring patterns",
          rows: serializeRows(patterns),
        },
        {
          key: "monthly-plans",
          label: "Monthly plans",
          rows: serializeRows(plans),
        },
        {
          key: "ai-reports",
          label: "AI reports",
          rows: serializeRows(reports),
        },
      ]),
    );
  }

  const tables = (await Promise.all(tasks)).flat();
  const filter = getDateFilter(request);

  return {
    metadata: {
      version: 1,
      exportedAt: new Date().toISOString(),
      range: request.range,
      startDate: filter?.gte.toISOString() || null,
      endDate: filter?.lte.toISOString() || null,
      sections: request.sections,
    },
    tables,
  };
}

function cellValue(value: unknown) {
  if (value === null || value === undefined) return "";
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

async function createCsvArchive(payload: ExportPayload) {
  const archive = new JSZip();
  archive.file("manifest.json", JSON.stringify(payload.metadata, null, 2));
  payload.tables.forEach((table) => {
    archive.file(`${table.key}.csv`, recordsToCsv(table.rows));
  });
  return archive.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
}

async function createExcelWorkbook(payload: ExportPayload) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Chamber";
  workbook.created = new Date(payload.metadata.exportedAt);

  payload.tables.forEach((table) => {
    const worksheet = workbook.addWorksheet(table.label.slice(0, 31));
    const headers = Array.from(
      table.rows.reduce((keys, row) => {
        Object.keys(row).forEach((key) => keys.add(key));
        return keys;
      }, new Set<string>()),
    );
    worksheet.columns = headers.map((header) => ({
      header,
      key: header,
      width: Math.min(40, Math.max(12, header.length + 2)),
    }));
    table.rows.forEach((row) => {
      worksheet.addRow(Object.fromEntries(headers.map((header) => [header, cellValue(row[header])])));
    });
    worksheet.views = [{ state: "frozen", ySplit: 1 }];
    worksheet.autoFilter = headers.length > 0
      ? { from: { row: 1, column: 1 }, to: { row: 1, column: headers.length } }
      : undefined;
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).alignment = { vertical: "middle" };
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function printableText(value: unknown) {
  return cellValue(value)
    .replace(/₹/g, "INR ")
    .replace(/[^\x20-\x7E]/g, "?")
    .replace(/\s+/g, " ");
}

async function createPdfReport(payload: ExportPayload) {
  const document = await PDFDocument.create();
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const pageSize: [number, number] = [841.89, 595.28];
  const margin = 36;
  const fontSize = 7;
  const lineHeight = 11;
  let page = document.addPage(pageSize);
  let y = page.getHeight() - margin;

  const ensureSpace = (height = lineHeight) => {
    if (y - height < margin) {
      page = document.addPage(pageSize);
      y = page.getHeight() - margin;
    }
  };
  const drawLine = (text: string, options?: { bold?: boolean; size?: number }) => {
    const size = options?.size || fontSize;
    ensureSpace(size + 5);
    page.drawText(text.slice(0, 150), {
      x: margin,
      y,
      size,
      font: options?.bold ? bold : regular,
      color: rgb(0.12, 0.12, 0.12),
    });
    y -= Math.max(lineHeight, size + 4);
  };

  drawLine("Chamber data export", { bold: true, size: 18 });
  drawLine(`Created: ${payload.metadata.exportedAt}`, { size: 9 });
  drawLine(`Range: ${payload.metadata.range}`, { size: 9 });
  y -= 8;

  for (const table of payload.tables) {
    ensureSpace(36);
    drawLine(`${table.label} (${table.rows.length.toLocaleString()} records)`, {
      bold: true,
      size: 12,
    });
    if (table.rows.length === 0) {
      drawLine("No records");
      y -= 5;
      continue;
    }

    for (const [rowIndex, row] of table.rows.entries()) {
      ensureSpace(24);
      drawLine(`Record ${rowIndex + 1}`, { bold: true, size: 8 });
      for (const [key, value] of Object.entries(row)) {
        const prefix = `${printableText(key)}: `;
        const text = `${prefix}${printableText(value)}`;
        const chunks = text.match(/.{1,130}(?:\s|$)|.{1,130}/g) || [text];
        chunks.forEach((chunk, index) => {
          drawLine(index === 0 ? chunk.trim() : `  ${chunk.trim()}`);
        });
      }
      y -= 4;
    }
    y -= 8;
  }

  const bytes = await document.save();
  return Buffer.from(bytes);
}

function encryptExport(
  body: Buffer,
  password: string,
  originalFileName: string,
  originalContentType: string,
) {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const scrypt = { N: 16_384, r: 8, p: 1 };
  const key = scryptSync(password, salt, 32, scrypt);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(body), cipher.final()]);
  const envelope = {
    version: 1,
    algorithm: "AES-256-GCM",
    keyDerivation: { name: "scrypt", ...scrypt },
    originalFileName,
    originalContentType,
    salt: salt.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
    ciphertext: encrypted.toString("base64"),
  };
  return Buffer.from(JSON.stringify(envelope));
}

export async function generateUserExport(
  userId: string,
  request: DataExportRequest,
): Promise<GeneratedExport> {
  const payload = await collectUserExport(userId, request);
  const date = new Date().toISOString().slice(0, 10);
  let body: Buffer;
  let contentType: string;
  let fileName: string;

  if (request.format === "csv") {
    body = await createCsvArchive(payload);
    contentType = "application/zip";
    fileName = `chamber-export-${date}.zip`;
  } else if (request.format === "xlsx") {
    body = await createExcelWorkbook(payload);
    contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    fileName = `chamber-export-${date}.xlsx`;
  } else if (request.format === "pdf") {
    body = await createPdfReport(payload);
    contentType = "application/pdf";
    fileName = `chamber-export-${date}.pdf`;
  } else {
    body = Buffer.from(
      JSON.stringify(
        {
          ...payload.metadata,
          data: Object.fromEntries(payload.tables.map((table) => [table.key, table.rows])),
        },
        null,
        2,
      ),
    );
    contentType = "application/json";
    fileName = `chamber-export-${date}.json`;
  }

  const recordCount = payload.tables.reduce((total, table) => total + table.rows.length, 0);
  if (request.encryptionPassword) {
    body = encryptExport(body, request.encryptionPassword, fileName, contentType);
    fileName = `${fileName}.chamber`;
    contentType = "application/vnd.chamber.encrypted+json";
  }

  return {
    body,
    contentType,
    fileName,
    recordCount,
    encrypted: Boolean(request.encryptionPassword),
  };
}

import { describe, expect, it } from "vitest";

import {
  createExpenseFingerprint,
  inferCsvMapping,
  normalizeCsvRows,
  parseCsv,
  recordsToCsv,
} from "@/lib/data-transfer/csv";

describe("data transfer CSV utilities", () => {
  it("parses quoted cells, escaped quotes, and line breaks", () => {
    const parsed = parseCsv(
      '\uFEFFDate,Narration,Debit\r\n2026-08-01,"Coffee, \"\"large\"\"",120.50\r\n',
    );

    expect(parsed.headers).toEqual(["Date", "Narration", "Debit"]);
    expect(parsed.rows).toEqual([
      {
        Date: "2026-08-01",
        Narration: 'Coffee, "large"',
        Debit: "120.50",
      },
    ]);
  });

  it("infers common bank statement columns", () => {
    expect(
      inferCsvMapping(["Txn Date", "Narration", "Withdrawal Amt.", "Dr/Cr"]),
    ).toEqual(
      expect.objectContaining({
        date: "Txn Date",
        amount: "Withdrawal Amt.",
        description: "Narration",
        type: "Dr/Cr",
      }),
    );
  });

  it("accepts semicolon-delimited bank exports", () => {
    const parsed = parseCsv("Date;Description;Cost\n2026-08-01;Lunch;250");

    expect(parsed.headers).toEqual(["Date", "Description", "Cost"]);
    expect(inferCsvMapping(parsed.headers).amount).toBe("Cost");
  });

  it("normalizes date and amount formats while identifying credits", () => {
    const rows = normalizeCsvRows(
      [
        { Date: "31/07/2026", Details: "Groceries", Amount: "₹1,250.40", Type: "DR" },
        { Date: "01/08/2026", Details: "Salary", Amount: "50,000", Type: "CR" },
      ],
      {
        date: "Date",
        amount: "Amount",
        description: "Details",
        type: "Type",
      },
      "dmy",
      "all",
    );

    expect(rows[0]).toEqual(
      expect.objectContaining({
        amount: 1250.4,
        description: "Groceries",
        isCredit: false,
      }),
    );
    expect(rows[0].date).toEqual(new Date(2026, 6, 31));
    expect(rows[1].isCredit).toBe(true);
  });

  it("auto-detects unambiguous month-first dates", () => {
    const [row] = normalizeCsvRows(
      [{ Date: "07/31/2026", Details: "Groceries", Amount: "-20" }],
      { date: "Date", amount: "Amount", description: "Details" },
      "auto",
      "negative_only",
    );

    expect(row.date).toEqual(new Date(2026, 6, 31));
    expect(row.isCredit).toBe(false);
  });

  it("creates stable fingerprints and safely escapes generated CSV", () => {
    const first = createExpenseFingerprint({
      date: new Date("2026-08-01T12:30:00Z"),
      amount: 10.2,
      merchant: "  Coffee   Shop ",
    });
    const second = createExpenseFingerprint({
      date: new Date("2026-08-01T00:00:00Z"),
      amount: 10.2,
      merchant: "coffee shop",
    });

    expect(first).toBe(second);
    expect(recordsToCsv([{ name: 'A "quoted" value', amount: 10 }])).toContain(
      '"A ""quoted"" value"',
    );
    expect(recordsToCsv([{ name: "=HYPERLINK(\"https://example.com\")" }])).toContain(
      "'=HYPERLINK",
    );
  });
});

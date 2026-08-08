import { z } from "zod";

import {
  DATA_EXPORT_FORMATS,
  DATA_EXPORT_RANGES,
  DATA_EXPORT_SECTIONS,
} from "@/types/data-transfer";

export const DataExportRequestSchema = z
  .object({
    format: z.enum(DATA_EXPORT_FORMATS),
    sections: z
      .array(z.enum(DATA_EXPORT_SECTIONS))
      .min(1)
      .max(DATA_EXPORT_SECTIONS.length)
      .refine((sections) => new Set(sections).size === sections.length, {
        message: "Each export section can only be selected once",
      }),
    range: z.enum(DATA_EXPORT_RANGES),
    startDate: z.iso.date().optional(),
    endDate: z.iso.date().optional(),
    encryptionPassword: z.string().min(12).max(128).optional(),
  })
  .superRefine((value, context) => {
    if (value.range === "custom" && (!value.startDate || !value.endDate)) {
      context.addIssue({
        code: "custom",
        message: "Choose both a start and end date",
        path: ["startDate"],
      });
    }

    if (value.startDate && value.endDate && value.startDate > value.endDate) {
      context.addIssue({
        code: "custom",
        message: "The start date must be before the end date",
        path: ["startDate"],
      });
    }
  });

const CsvFieldMappingSchema = z.object({
  date: z.string().trim().min(1).max(200),
  amount: z.string().trim().min(1).max(200),
  description: z.string().trim().max(200).optional(),
  merchant: z.string().trim().max(200).optional(),
  category: z.string().trim().max(200).optional(),
  paymentMethod: z.string().trim().max(200).optional(),
  type: z.string().trim().max(200).optional(),
});

export const ExpenseImportRequestSchema = z.object({
  csvText: z.string().min(1).max(5_000_000),
  fileName: z.string().trim().min(1).max(255),
  mapping: CsvFieldMappingSchema,
  dateFormat: z.enum(["auto", "dmy", "mdy", "ymd"]),
  amountMode: z.enum(["all", "negative_only"]),
  accountId: z.string().uuid().optional(),
});

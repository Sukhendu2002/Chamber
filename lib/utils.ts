import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Returns YYYY-MM-DD string in local timezone (avoids UTC offset bug with toISOString)
export function toLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Get current date in user's timezone
export function getNowInTimezone(timezone: string): Date {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const partsMap = new Map(parts.map((p) => [p.type, p.value]));

  const year = parseInt(partsMap.get("year") || "0", 10);
  const month = parseInt(partsMap.get("month") || "0", 10) - 1; // 0-indexed
  const day = parseInt(partsMap.get("day") || "0", 10);
  const hour = parseInt(partsMap.get("hour") || "0", 10);
  const minute = parseInt(partsMap.get("minute") || "0", 10);
  const second = parseInt(partsMap.get("second") || "0", 10);

  return new Date(year, month, day, hour, minute, second);
}

// Get start of month in user's timezone
export function getStartOfMonthInTimezone(timezone: string): Date {
  const now = getNowInTimezone(timezone);
  return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
}

// Get end of month in user's timezone
export function getEndOfMonthInTimezone(timezone: string): Date {
  const now = getNowInTimezone(timezone);
  return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
}

"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";

interface DashboardMonthPickerProps {
  value: string;
}

function formatMonth(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function DashboardMonthPicker({ value }: DashboardMonthPickerProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const navigateToMonth = (month: string) => {
    if (!/^\d{4}-\d{2}$/.test(month)) return;

    const params = new URLSearchParams(searchParams.toString());
    params.set("month", month);
    router.push(`${pathname}?${params.toString()}`);
  };

  const moveMonth = (offset: number) => {
    const [year, month] = value.split("-").map(Number);
    navigateToMonth(formatMonth(new Date(year, month - 1 + offset, 1)));
  };

  return (
    <div className="flex h-9 items-center rounded-md border bg-card shadow-xs">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="h-full rounded-r-none border-r shadow-none"
        onClick={() => moveMonth(-1)}
        aria-label="Show previous month"
      >
        <IconChevronLeft className="size-4" />
      </Button>
      <input
        type="month"
        value={value}
        min="2000-01"
        max="2100-12"
        onChange={(event) => navigateToMonth(event.target.value)}
        aria-label="Dashboard month"
        className="h-full min-w-36 cursor-pointer bg-transparent px-2.5 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="h-full rounded-l-none border-l shadow-none"
        onClick={() => moveMonth(1)}
        aria-label="Show next month"
      >
        <IconChevronRight className="size-4" />
      </Button>
    </div>
  );
}

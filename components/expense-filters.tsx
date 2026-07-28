"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IconSearch, IconX, IconCalendar } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import type { DateRangePreset } from "@/lib/actions/expenses";

const FALLBACK_CATEGORIES = [
  "All",
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

const DATE_RANGE_OPTIONS: { value: DateRangePreset; label: string }[] = [
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "last_3_months", label: "Last 3 Months" },
  { value: "last_6_months", label: "Last 6 Months" },
  { value: "this_year", label: "This Year" },
];

type ExpenseFiltersProps = {
  currentSearch: string;
  currentCategory: string;
  currentExcludeCategory?: string;
  currentTags?: string[];
  currentDateRange?: DateRangePreset;
  allTags?: string[];
  categories?: string[];
};

export function ExpenseFilters({
  currentSearch,
  currentCategory,
  currentExcludeCategory,
  currentTags = [],
  currentDateRange,
  allTags = [],
  categories = FALLBACK_CATEGORIES,
}: ExpenseFiltersProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(currentSearch);

  const updateFilters = (updates: {
    search?: string;
    category?: string;
    tags?: string[];
    dateRange?: DateRangePreset | "";
  }) => {
    const params = new URLSearchParams();

    const newSearch = updates.search !== undefined ? updates.search : search;
    const newCategory = updates.category !== undefined ? updates.category : currentCategory;
    const newTags = updates.tags !== undefined ? updates.tags : currentTags;
    const newDateRange = updates.dateRange !== undefined ? updates.dateRange : currentDateRange;

    if (newSearch) params.set("search", newSearch);
    if (newCategory && newCategory !== "All") {
      params.set("category", newCategory);
    } else if (currentExcludeCategory && !newCategory) {
      params.set("excludeCategory", currentExcludeCategory);
    }
    for (const t of newTags) params.append("tags", t);
    if (newDateRange) params.set("dateRange", newDateRange);

    startTransition(() => {
      router.push(`/expenses?${params.toString()}`);
    });
  };

  const toggleTag = (tag: string) => {
    const next = currentTags.includes(tag)
      ? currentTags.filter((t) => t !== tag)
      : [...currentTags, tag];
    updateFilters({ tags: next });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ search });
  };

  const clearFilters = () => {
    setSearch("");
    startTransition(() => router.push("/expenses"));
  };

  const hasFilters =
    currentSearch || currentCategory || currentExcludeCategory || currentTags.length > 0 || currentDateRange;

  // Preserve existing searchParams for category change (keep other filters)
  const handleCategoryChange = (value: string) => {
    updateFilters({ category: value });
  };

  const handleDateRangeChange = (value: string) => {
    updateFilters({ dateRange: value === "all" ? "" : (value as DateRangePreset) });
  };

  return (
    <div className="mb-6 space-y-3">
      {/* Row 1: search + category + date range + clear */}
      <div className="flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <div className="relative">
            <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search expenses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-56 pl-9"
            />
          </div>
          <Button type="submit" variant="secondary" size="sm" disabled={isPending}>
            Search
          </Button>
        </form>

        <Select value={currentCategory || "All"} onValueChange={handleCategoryChange}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {["All", ...categories.filter((category) => category !== "All")].map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={currentDateRange || "all"} onValueChange={handleDateRangeChange}>
          <SelectTrigger className="w-40">
            <IconCalendar className="mr-1 h-3.5 w-3.5 text-muted-foreground" />
            <SelectValue placeholder="Date range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All time</SelectItem>
            {DATE_RANGE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} disabled={isPending}>
            <IconX className="mr-1 h-4 w-4" />
            Clear
          </Button>
        )}
      </div>

      {/* Row 2: tag pills (multi-select) */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Tags:</span>
          {allTags.map((t) => {
            const active = currentTags.includes(t);
            return (
              <Badge
                key={t}
                variant={active ? "default" : "secondary"}
                className={cn(
                  "cursor-pointer text-[11px] px-2 py-0.5 transition-colors select-none",
                  active ? "hover:bg-primary/90" : "hover:bg-secondary/80",
                )}
                onClick={() => toggleTag(t)}
              >
                {t}
              </Badge>
            );
          })}
          {currentTags.length > 0 && (
            <button
              type="button"
              className="text-[11px] text-muted-foreground hover:text-foreground underline"
              onClick={() => updateFilters({ tags: [] })}
            >
              clear tags
            </button>
          )}
        </div>
      )}
    </div>
  );
}

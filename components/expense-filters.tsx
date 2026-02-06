"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IconSearch, IconX } from "@tabler/icons-react";

const categories = [
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
  "General",
];

type ExpenseFiltersProps = {
  currentSearch: string;
  currentCategory: string;
};

export function ExpenseFilters({ currentSearch, currentCategory }: ExpenseFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(currentSearch);

  const updateFilters = (newSearch: string, newCategory: string) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (newSearch) {
      params.set("search", newSearch);
    } else {
      params.delete("search");
    }
    
    if (newCategory && newCategory !== "All") {
      params.set("category", newCategory);
    } else {
      params.delete("category");
    }
    
    // Reset to page 1 when filters change
    params.delete("page");
    
    startTransition(() => {
      router.push(`/expenses?${params.toString()}`);
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters(search, currentCategory);
  };

  const handleCategoryChange = (value: string) => {
    updateFilters(search, value);
  };

  const clearFilters = () => {
    setSearch("");
    startTransition(() => {
      router.push("/expenses");
    });
  };

  const hasFilters = currentSearch || currentCategory;

  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
      <form onSubmit={handleSearch} className="flex items-center gap-2">
        <div className="relative flex-1 sm:flex-initial">
          <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search expenses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 sm:w-64"
          />
        </div>
        <Button type="submit" variant="secondary" disabled={isPending}>
          Search
        </Button>
      </form>

      <div className="flex items-center gap-3">
        <Select
          value={currentCategory || "All"}
          onValueChange={handleCategoryChange}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            disabled={isPending}
          >
            <IconX className="mr-1 h-4 w-4" />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}

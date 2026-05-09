"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useRef, useTransition } from "react";
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
import { IconSearch, IconX, IconTag } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

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
  currentExcludeCategory?: string;
  currentTag?: string;
  allTags?: string[];
};

export function ExpenseFilters({
  currentSearch,
  currentCategory,
  currentExcludeCategory,
  currentTag = "",
  allTags = [],
}: ExpenseFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(currentSearch);
  const [tag, setTag] = useState(currentTag);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const tagInputRef = useRef<HTMLInputElement>(null);

  const filteredSuggestions = allTags.filter(
    (t) =>
      t.toLowerCase().includes(tag.toLowerCase()) &&
      t !== tag,
  );

  const updateFilters = (
    newSearch: string,
    newCategory: string,
    newTag: string,
  ) => {
    const params = new URLSearchParams(searchParams.toString());

    if (newSearch) {
      params.set("search", newSearch);
    } else {
      params.delete("search");
    }

    if (newCategory && newCategory !== "All") {
      params.set("category", newCategory);
      params.delete("excludeCategory");
    } else {
      params.delete("category");
      if (currentExcludeCategory) {
        params.set("excludeCategory", currentExcludeCategory);
      }
    }

    if (newTag) {
      params.set("tag", newTag);
    } else {
      params.delete("tag");
    }

    params.delete("page");

    startTransition(() => {
      router.push(`/expenses?${params.toString()}`);
    });
  };

  const selectTag = (selectedTag: string) => {
    setTag(selectedTag);
    setShowSuggestions(false);
    setHighlightedIndex(-1);
    updateFilters(search, currentCategory, selectedTag);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters(search, currentCategory, tag);
  };

  const handleCategoryChange = (value: string) => {
    updateFilters(search, value, tag);
  };

  const handleTagChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTag(e.target.value);
    setShowSuggestions(true);
    setHighlightedIndex(-1);
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0 && filteredSuggestions[highlightedIndex]) {
        selectTag(filteredSuggestions[highlightedIndex]);
      } else {
        setShowSuggestions(false);
        updateFilters(search, currentCategory, tag);
      }
    } else if (e.key === "ArrowDown" && filteredSuggestions.length > 0) {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filteredSuggestions.length - 1 ? prev + 1 : 0,
      );
    } else if (e.key === "ArrowUp" && filteredSuggestions.length > 0) {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredSuggestions.length - 1,
      );
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setHighlightedIndex(-1);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setTag("");
    startTransition(() => {
      router.push("/expenses");
    });
  };

  const hasFilters =
    currentSearch || currentCategory || currentExcludeCategory || currentTag;

  return (
    <div className="mb-6 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
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

          <div className="relative">
            <div className="relative">
              <IconTag className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={tagInputRef}
                type="text"
                placeholder="Filter by tag..."
                value={tag}
                onChange={handleTagChange}
                onKeyDown={handleTagKeyDown}
                onFocus={() => {
                  if (tag || allTags.length > 0) setShowSuggestions(true);
                }}
                onBlur={() => {
                  setTimeout(() => {
                    setShowSuggestions(false);
                    setHighlightedIndex(-1);
                  }, 150);
                }}
                className="w-full pl-7 sm:w-36"
              />
            </div>
            {showSuggestions && filteredSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-32 overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
                {filteredSuggestions.map((suggestion, index) => (
                  <button
                    key={suggestion}
                    type="button"
                    className={cn(
                      "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs",
                      index === highlightedIndex
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-muted",
                    )}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      selectTag(suggestion);
                    }}
                    onMouseEnter={() => setHighlightedIndex(index)}
                  >
                    <IconTag className="h-3 w-3 text-muted-foreground" />
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>

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

      {allTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Tags:</span>
          {allTags.map((t) => (
            <Badge
              key={t}
              variant={t === currentTag ? "default" : "secondary"}
              className={cn(
                "cursor-pointer text-[11px] px-2 py-0.5 transition-colors",
                t === currentTag
                  ? "hover:bg-primary/90"
                  : "hover:bg-secondary/80",
              )}
              onClick={() => {
                if (t === currentTag) {
                  setTag("");
                  updateFilters(search, currentCategory, "");
                } else {
                  setTag(t);
                  updateFilters(search, currentCategory, t);
                }
              }}
            >
              {t}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

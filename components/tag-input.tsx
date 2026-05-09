"use client";

import { useState, useRef, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconX, IconTag } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

type TagInputProps = {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions: string[];
  placeholder?: string;
};

export function TagInput({
  value,
  onChange,
  suggestions,
  placeholder = "Add tags...",
}: TagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredSuggestions = suggestions.filter(
    (s) =>
      s.toLowerCase().includes(inputValue.toLowerCase()) &&
      !value.includes(s),
  );

  const addTag = useCallback(
    (tag: string) => {
      const trimmed = tag.trim().toLowerCase();
      if (!trimmed || trimmed.length > 50) return;
      if (!value.includes(trimmed)) {
        onChange([...value, trimmed]);
      }
      setInputValue("");
      setShowSuggestions(false);
      setHighlightedIndex(-1);
      inputRef.current?.focus();
    },
    [value, onChange],
  );

  const removeTag = useCallback(
    (tag: string) => {
      onChange(value.filter((t) => t !== tag));
    },
    [value, onChange],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (highlightedIndex >= 0 && filteredSuggestions[highlightedIndex]) {
        addTag(filteredSuggestions[highlightedIndex]);
      } else if (inputValue.trim()) {
        addTag(inputValue);
      }
    } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
      removeTag(value[value.length - 1]);
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

  const handleBlur = () => {
    // Small delay to allow click on suggestion
    setTimeout(() => {
      setShowSuggestions(false);
      setHighlightedIndex(-1);
    }, 150);
  };

  return (
    <div ref={containerRef} className="relative space-y-1.5">
      <div className="flex min-h-8 flex-wrap items-center gap-1 rounded-md border border-input bg-transparent px-2.5 py-1 text-xs transition-colors focus-within:border-ring focus-within:ring-1 focus-within:ring-ring/50">
        <IconTag className="h-3.5 w-3.5 text-muted-foreground" />
        {value.map((tag) => (
          <Badge
            key={tag}
            variant="secondary"
            className="group/tag flex h-5 items-center gap-0.5 rounded-sm px-1.5 text-[11px] font-medium hover:bg-secondary/80"
          >
            {tag}
            <Button
              variant="ghost"
              size="icon"
              className="ml-0.5 h-3 w-3 opacity-50 hover:opacity-100"
              onClick={() => removeTag(tag)}
              tabIndex={-1}
            >
              <IconX className="h-2.5 w-2.5" />
            </Button>
          </Badge>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setShowSuggestions(true);
            setHighlightedIndex(-1);
          }}
          onFocus={() => {
            if (inputValue || suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? placeholder : ""}
          className="min-w-[80px] flex-1 bg-transparent py-0.5 text-xs outline-none placeholder:text-muted-foreground"
        />
      </div>

      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-40 overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
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
                addTag(suggestion);
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
  );
}

"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface HiddenAmountProps {
  amount: string;
  className?: string;
  prefix?: string;
}

export function HiddenAmount({ amount, className, prefix = "₹" }: HiddenAmountProps) {
  const [isHidden, setIsHidden] = useState(true);

  return (
    <button
      type="button"
      onClick={() => setIsHidden(!isHidden)}
      className={cn(
        "cursor-pointer transition-colors hover:text-foreground/80",
        isHidden && "text-muted-foreground",
        className
      )}
      title={isHidden ? "Click to reveal amount" : "Click to hide amount"}
    >
      {isHidden ? `${prefix}••••••` : amount}
    </button>
  );
}
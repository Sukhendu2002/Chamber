"use client";

import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AI_MODEL_GROUP_LABELS,
  AI_MODEL_GROUPS,
  type AiModelOption,
} from "@/types/ai-model";

interface AiModelSelectProps {
  id: string;
  value: string;
  models: AiModelOption[];
  onValueChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  showDetails?: boolean;
}

function formatPrice(value: number): string {
  if (value === 0) return "$0";
  if (value < 0.01) return `$${value.toFixed(3)}`;
  return `$${value.toFixed(2)}`;
}

function getModelPriceLabel(model: AiModelOption): string {
  if (model.isFree) return "Free";
  return `${formatPrice(model.promptPricePerMillion)} in · ${formatPrice(model.completionPricePerMillion)} out / 1M`;
}

function formatContextLength(contextLength: number): string {
  if (contextLength >= 1_000_000) {
    return `${(contextLength / 1_000_000).toFixed(contextLength % 1_000_000 === 0 ? 0 : 1)}M context`;
  }
  if (contextLength >= 1_000) return `${Math.round(contextLength / 1_000)}K context`;
  return contextLength > 0 ? `${contextLength} context` : "Context varies";
}

export function AiModelSelect({
  id,
  value,
  models,
  onValueChange,
  disabled = false,
  className,
  showDetails = true,
}: AiModelSelectProps) {
  const selectedModel = models.find((model) => model.id === value) || null;

  return (
    <div className="space-y-1.5">
      <Select value={value || undefined} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger
          id={id}
          aria-label="AI analysis model"
          className={cn("min-h-11 w-full", className)}
        >
          <SelectValue placeholder={models.length > 0 ? "Choose an AI model" : "Models unavailable"} />
        </SelectTrigger>
        <SelectContent position="popper" align="start" className="max-w-[min(32rem,calc(100vw-2rem))]">
          {AI_MODEL_GROUPS.map((group) => {
            const groupedModels = models.filter((model) => model.group === group);
            if (groupedModels.length === 0) return null;

            return (
              <SelectGroup key={group}>
                <SelectLabel>{AI_MODEL_GROUP_LABELS[group]}</SelectLabel>
                {groupedModels.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.name} · {getModelPriceLabel(model)}
                  </SelectItem>
                ))}
              </SelectGroup>
            );
          })}
        </SelectContent>
      </Select>

      {showDetails && selectedModel && (
        <p className="text-[0.6875rem] leading-4 text-muted-foreground">
          {selectedModel.id} · {formatContextLength(selectedModel.contextLength)} · {getModelPriceLabel(selectedModel)}
        </p>
      )}
    </div>
  );
}

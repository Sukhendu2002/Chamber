export const AI_MODEL_GROUPS = ["FREE", "POPULAR", "NEW"] as const;

export type AiModelGroup = (typeof AI_MODEL_GROUPS)[number];

export interface AiModelOption {
  id: string;
  name: string;
  group: AiModelGroup;
  contextLength: number;
  promptPricePerMillion: number;
  completionPricePerMillion: number;
  isFree: boolean;
  supportsReasoningControl: boolean;
}

export const AI_MODEL_GROUP_LABELS: Record<AiModelGroup, string> = {
  FREE: "Free models",
  POPULAR: "Popular models",
  NEW: "New models",
};

import { z } from "zod";

import type { AiModelGroup, AiModelOption } from "@/types/ai-model";

const OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models";
const MODEL_CATALOG_REVALIDATE_SECONDS = 60 * 60;
const MODEL_ID_PATTERN = /^[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._:-]*$/i;

const OpenRouterModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  created: z.number(),
  context_length: z.number().nullable().optional(),
  pricing: z.object({
    prompt: z.string(),
    completion: z.string(),
  }),
  supported_parameters: z.array(z.string()).nullable().optional(),
  architecture: z.object({
    output_modalities: z.array(z.string()).optional(),
  }).optional(),
  reasoning: z.object({
    mandatory: z.boolean().optional(),
  }).nullable().optional(),
});

const OpenRouterModelsResponseSchema = z.object({
  data: z.array(OpenRouterModelSchema),
});

type OpenRouterModel = z.infer<typeof OpenRouterModelSchema>;

function getCatalogHeaders(): HeadersInit {
  const apiKey = process.env.OPENROUTER_API_KEY;
  return apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
}

async function fetchModelCatalog(sort: "most-popular" | "newest"): Promise<OpenRouterModel[]> {
  const searchParams = new URLSearchParams({
    output_modalities: "text",
    supported_parameters: "structured_outputs",
    sort,
  });
  const response = await fetch(`${OPENROUTER_MODELS_URL}?${searchParams}`, {
    headers: getCatalogHeaders(),
    next: { revalidate: MODEL_CATALOG_REVALIDATE_SECONDS },
  });

  if (!response.ok) {
    throw new Error(`OpenRouter model catalog returned ${response.status}`);
  }

  return OpenRouterModelsResponseSchema.parse(await response.json() as unknown).data
    .filter((model) => {
      const parameters = model.supported_parameters || [];
      const outputModalities = model.architecture?.output_modalities || ["text"];
      return isValidAiModelId(model.id)
        && outputModalities.includes("text")
        && model.reasoning?.mandatory !== true
        && parameters.includes("structured_outputs")
        && parameters.includes("response_format")
        && parameters.includes("temperature")
        && parameters.includes("max_tokens");
    });
}

function toPricePerMillion(pricePerToken: string): number {
  const value = Number(pricePerToken) * 1_000_000;
  return Number.isFinite(value) ? Math.round(value * 1_000_000) / 1_000_000 : 0;
}

function toModelOption(model: OpenRouterModel, group: AiModelGroup): AiModelOption {
  const promptPricePerMillion = toPricePerMillion(model.pricing.prompt);
  const completionPricePerMillion = toPricePerMillion(model.pricing.completion);

  return {
    id: model.id,
    name: model.name,
    group,
    contextLength: model.context_length || 0,
    promptPricePerMillion,
    completionPricePerMillion,
    isFree: promptPricePerMillion === 0 && completionPricePerMillion === 0,
    supportsReasoningControl: (model.supported_parameters || []).includes("reasoning"),
  };
}

function isFreeModel(model: OpenRouterModel): boolean {
  return Number(model.pricing.prompt) === 0 && Number(model.pricing.completion) === 0;
}

function addUniqueModels(
  target: AiModelOption[],
  seen: Set<string>,
  models: OpenRouterModel[],
  group: AiModelGroup,
  limit: number,
  predicate: (model: OpenRouterModel) => boolean,
): void {
  let added = 0;
  for (const model of models) {
    if (added >= limit) break;
    if (seen.has(model.id) || !predicate(model)) continue;
    seen.add(model.id);
    target.push(toModelOption(model, group));
    added++;
  }
}

export function isValidAiModelId(modelId: string): boolean {
  return modelId.length <= 180 && MODEL_ID_PATTERN.test(modelId);
}

export async function getOpenRouterAnalysisModels(): Promise<AiModelOption[]> {
  const [popularResult, newestResult] = await Promise.allSettled([
    fetchModelCatalog("most-popular"),
    fetchModelCatalog("newest"),
  ]);
  const popular = popularResult.status === "fulfilled" ? popularResult.value : [];
  const newest = newestResult.status === "fulfilled" ? newestResult.value : [];

  if (popular.length === 0 && newest.length === 0) {
    console.error("OpenRouter model catalog is unavailable", {
      popular: popularResult.status === "rejected" ? popularResult.reason : undefined,
      newest: newestResult.status === "rejected" ? newestResult.reason : undefined,
    });
    return [];
  }

  const options: AiModelOption[] = [];
  const seen = new Set<string>();
  const combined = [...popular, ...newest];

  addUniqueModels(options, seen, combined, "FREE", 6, isFreeModel);
  addUniqueModels(options, seen, popular, "POPULAR", 12, (model) => !isFreeModel(model));
  addUniqueModels(options, seen, newest, "NEW", 10, (model) => !isFreeModel(model));

  return options;
}

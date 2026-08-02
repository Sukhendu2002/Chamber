import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getOpenRouterAnalysisModels,
  isValidAiModelId,
} from "@/lib/openrouter-models";

function createModel({
  id,
  name,
  created,
  prompt = "0",
  completion = "0",
}: {
  id: string;
  name: string;
  created: number;
  prompt?: string;
  completion?: string;
}) {
  return {
    id,
    name,
    created,
    context_length: 131072,
    pricing: { prompt, completion },
    supported_parameters: [
      "structured_outputs",
      "response_format",
      "temperature",
      "max_tokens",
    ],
    architecture: { output_modalities: ["text"] },
  };
}

describe("OpenRouter model catalog", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("builds deduplicated free, popular, and new model groups", async () => {
    const freeModel = createModel({
      id: "nvidia/nemotron-3-super-120b-a12b:free",
      name: "NVIDIA: Nemotron 3 Super (free)",
      created: 1773245239,
    });
    const popularModel = createModel({
      id: "google/gemini-3-flash-preview",
      name: "Google: Gemini 3 Flash Preview",
      created: 1765987078,
      prompt: "0.0000005",
      completion: "0.000003",
    });
    const newModel = createModel({
      id: "deepseek/deepseek-v4-flash",
      name: "DeepSeek: DeepSeek V4 Flash",
      created: 1777000666,
      prompt: "0.00000014",
      completion: "0.00000028",
    });
    const fetchMock = vi.fn().mockImplementation((input: string | URL | Request) => {
      const isNewest = String(input).includes("sort=newest");
      return Promise.resolve({
        ok: true,
        json: vi.fn().mockResolvedValue({
          data: isNewest
            ? [newModel, popularModel, freeModel]
            : [freeModel, popularModel],
        }),
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const models = await getOpenRouterAnalysisModels();

    expect(models.map((model) => [model.id, model.group])).toEqual([
      [freeModel.id, "FREE"],
      [popularModel.id, "POPULAR"],
      [newModel.id, "NEW"],
    ]);
    expect(models[1]).toEqual(expect.objectContaining({
      promptPricePerMillion: 0.5,
      completionPricePerMillion: 3,
      isFree: false,
    }));
  });

  it("validates canonical OpenRouter model identifiers", () => {
    expect(isValidAiModelId("anthropic/claude-sonnet-4.6")).toBe(true);
    expect(isValidAiModelId("nvidia/model:free")).toBe(true);
    expect(isValidAiModelId("missing-provider")).toBe(false);
    expect(isValidAiModelId("provider/model with spaces")).toBe(false);
  });
});

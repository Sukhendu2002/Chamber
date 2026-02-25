const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const SITE_URL = "https://chamber.sukhendu2002.in";
const SITE_TITLE = "Chamber Expense Tracker";

// Free models for text-only parsing (no credits used)
const FREE_TEXT_MODELS = [
  "google/gemma-3-4b-it:free",
  "meta-llama/llama-3.2-3b-instruct:free",
  "mistralai/mistral-small-3.1-24b-instruct:free",
];

// Premium vision model for image/PDF analysis (uses credits)
const VISION_MODEL = "openai/gpt-4.1-nano";

type ParsedExpense = {
  amount: number;
  category: string;
  description: string;
  merchant?: string;
  confidence: number;
};

type AIResponse = {
  success: boolean;
  expense?: ParsedExpense;
  error?: string;
};

// Shared categories list
const CATEGORIES = "Food, Travel, Entertainment, Bills, Shopping, Health, Education, Investments, Subscription, General";

// JSON format hint for free models (they don't support structured outputs)
const JSON_FORMAT = '{"amount":<number>,"category":"<category>","description":"<brief>","merchant":"<name|null>","confidence":<0-1>}';
const JSON_ERROR_FORMAT = '{"error":"<reason>"}';

// Text prompt for free models (verbose is fine — no cost)
const TEXT_SYSTEM_PROMPT = `Extract expense info from text. Categories: ${CATEGORIES}.
Respond ONLY with JSON: ${JSON_FORMAT}
If unparseable: ${JSON_ERROR_FORMAT}`;

// Vision prompt — concise for token efficiency (paid model)
const VISION_SYSTEM_PROMPT = `Extract expense from this receipt/screenshot/invoice. Indian UPI apps (GPay, PhonePe, Paytm) common. Categories: ${CATEGORIES}.`;

// Structured output schema for GPT-4.1 Nano (guarantees valid JSON)
const EXPENSE_JSON_SCHEMA = {
  name: "expense",
  strict: true,
  schema: {
    type: "object",
    properties: {
      amount: { type: "number", description: "Expense amount in INR" },
      category: { type: "string", description: "Expense category" },
      description: { type: "string", description: "Brief description" },
      merchant: { type: ["string", "null"], description: "Merchant/recipient name if known" },
      confidence: { type: "number", description: "Confidence score 0-1" },
      error: { type: ["string", "null"], description: "Error message if expense cannot be parsed, null otherwise" },
    },
    required: ["amount", "category", "description", "merchant", "confidence", "error"],
    additionalProperties: false,
  },
};

// Shared headers for all OpenRouter requests
function getHeaders(): Record<string, string> {
  return {
    "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
    "Content-Type": "application/json",
    "HTTP-Referer": SITE_URL,
    "X-OpenRouter-Title": SITE_TITLE,
  };
}

/**
 * Parse a JSON response from AI, extracting the expense data.
 * Used for free models that don't support structured outputs.
 */
function parseAIJsonResponse(content: string): AIResponse {
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return { success: false, error: "Could not parse AI response" };
  }

  const parsed = JSON.parse(jsonMatch[0]);

  if (parsed.error) {
    return { success: false, error: parsed.error };
  }

  return {
    success: true,
    expense: {
      amount: parsed.amount,
      category: parsed.category || "General",
      description: parsed.description || "",
      merchant: parsed.merchant,
      confidence: parsed.confidence || 0.8,
    },
  };
}

/**
 * Parse structured output from GPT-4.1 Nano (guaranteed valid JSON).
 */
function parseStructuredResponse(content: string): AIResponse {
  try {
    const parsed = JSON.parse(content);

    if (parsed.error) {
      return { success: false, error: parsed.error };
    }

    return {
      success: true,
      expense: {
        amount: parsed.amount,
        category: parsed.category || "General",
        description: parsed.description || "",
        merchant: parsed.merchant,
        confidence: parsed.confidence || 0.8,
      },
    };
  } catch {
    // Fallback to regex extraction in case of unexpected format
    return parseAIJsonResponse(content);
  }
}

/**
 * Parse expense from plain text using FREE models (no credits used).
 */
export async function parseExpenseWithAI(text: string): Promise<AIResponse> {
  if (!OPENROUTER_API_KEY) {
    console.error("OPENROUTER_API_KEY not configured");
    return { success: false, error: "AI not configured" };
  }

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        model: FREE_TEXT_MODELS[0],
        route: "fallback",
        models: FREE_TEXT_MODELS,
        messages: [
          // Free models (Gemma, Llama) don't support system role, so inline it
          { role: "user", content: `${TEXT_SYSTEM_PROMPT}\n\nParse: "${text}"` },
        ],
        temperature: 0.1,
        max_tokens: 150,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("OpenRouter API error:", error);
      return { success: false, error: "AI request failed" };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return { success: false, error: "No response from AI" };
    }

    // Free models don't support structured outputs, use regex fallback
    return parseAIJsonResponse(content);
  } catch (error) {
    console.error("AI parsing error:", error);
    return { success: false, error: "Failed to parse expense" };
  }
}

/**
 * Parse receipt/screenshot using GPT-4.1 Nano vision (uses credits).
 * Sends the image directly to the model — no OCR intermediary.
 * Uses structured outputs for guaranteed valid JSON.
 */
export async function parseReceiptWithVision(
  imageBase64: string,
  mimeType: string = "image/jpeg",
  caption?: string,
): Promise<AIResponse> {
  if (!OPENROUTER_API_KEY) {
    console.error("OPENROUTER_API_KEY not configured");
    return { success: false, error: "AI not configured" };
  }

  try {
    console.log("Sending image directly to GPT-4.1 Nano vision...");

    const userContent: Array<Record<string, unknown>> = [
      {
        type: "image_url",
        image_url: {
          url: `data:${mimeType};base64,${imageBase64}`,
        },
      },
    ];

    // Only add caption as text if provided
    if (caption) {
      userContent.push({ type: "text", text: `Caption: "${caption}"` });
    }

    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        model: VISION_MODEL,
        messages: [
          { role: "system", content: VISION_SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        response_format: {
          type: "json_schema",
          json_schema: EXPENSE_JSON_SCHEMA,
        },
        temperature: 0.1,
        max_tokens: 150,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Vision API error:", error);
      return { success: false, error: "Vision AI request failed" };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return { success: false, error: "No response from Vision AI" };
    }

    console.log("Vision AI response:", content);
    return parseStructuredResponse(content);
  } catch (error) {
    console.error("Vision AI error:", error);
    return { success: false, error: "Failed to process image with Vision AI" };
  }
}

/**
 * Parse a PDF document using GPT-4.1 Nano with file-parser plugin (uses credits).
 * Uses OpenRouter's `file` content type with the free `pdf-text` engine.
 * Uses structured outputs for guaranteed valid JSON.
 */
export async function parsePDFWithVision(
  pdfBase64: string,
  caption?: string,
): Promise<AIResponse> {
  if (!OPENROUTER_API_KEY) {
    console.error("OPENROUTER_API_KEY not configured");
    return { success: false, error: "AI not configured" };
  }

  try {
    console.log("Sending PDF to GPT-4.1 Nano via file-parser plugin...");

    // Use OpenRouter's file content type for PDFs (not image_url which only supports images)
    const userContent: Array<Record<string, unknown>> = [
      {
        type: "file",
        file: {
          filename: "receipt.pdf",
          file_data: `data:application/pdf;base64,${pdfBase64}`,
        },
      },
      {
        type: "text",
        text: caption ? `Caption: "${caption}"` : "Extract the expense.",
      },
    ];

    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        model: VISION_MODEL,
        messages: [
          { role: "system", content: VISION_SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        // Use pdf-text engine (free) instead of mistral-ocr ($2/1K pages)
        plugins: [
          {
            id: "file-parser",
            pdf: { engine: "pdf-text" },
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: EXPENSE_JSON_SCHEMA,
        },
        temperature: 0.1,
        max_tokens: 150,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("PDF Vision API error:", error);
      return { success: false, error: "Vision AI request failed for PDF" };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return { success: false, error: "No response from Vision AI for PDF" };
    }

    console.log("PDF Vision AI response:", content);
    return parseStructuredResponse(content);
  } catch (error) {
    console.error("PDF Vision AI error:", error);
    return { success: false, error: "Failed to process PDF with Vision AI" };
  }
}

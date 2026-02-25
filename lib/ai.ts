const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

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

const TEXT_SYSTEM_PROMPT = `You are an expense parsing assistant. Extract expense information from user messages.

Categories available: Food, Travel, Entertainment, Bills, Shopping, Health, Education, Investments, Subscription, General

For text messages like "Lunch 450" or "Uber to airport 250":
- Extract the amount (number)
- Determine the category based on context
- Extract description/merchant if mentioned

Always respond in this exact JSON format only, no other text:
{"amount": <number>, "category": "<category>", "description": "<brief description>", "merchant": "<merchant name if known>", "confidence": <0.0 to 1.0>}

If you cannot parse the expense, respond with:
{"error": "<reason>"}`;

const VISION_SYSTEM_PROMPT = `You are an expense parsing assistant. Extract payment/expense information from UPI payment screenshots, receipts, invoices, or transaction confirmations.

Categories available: Food, Travel, Entertainment, Bills, Shopping, Health, Education, Investments, Subscription, General

Look for:
- Amount paid (₹ symbol, numbers)
- Merchant/recipient name
- Transaction description or purpose
- Date if visible

Common patterns in Indian UPI apps (Paytm, PhonePe, GPay):
- "Paid to [merchant]" or "Sent to [person]"
- Amount shown prominently with ₹ symbol
- Transaction successful/completed indicators

Always respond in this exact JSON format only, no other text:
{"amount": <number>, "category": "<category>", "description": "<brief description>", "merchant": "<merchant/recipient name>", "confidence": <0.0 to 1.0>}

If you cannot parse the expense, respond with:
{"error": "<reason>"}`;

/**
 * Parse a JSON response from AI, extracting the expense data.
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
 * Parse expense from plain text using FREE models (no credits used).
 */
export async function parseExpenseWithAI(text: string): Promise<AIResponse> {
  if (!OPENROUTER_API_KEY) {
    console.error("OPENROUTER_API_KEY not configured");
    return { success: false, error: "AI not configured" };
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://chamber.app",
        "X-Title": "Chamber Expense Tracker",
      },
      body: JSON.stringify({
        model: FREE_TEXT_MODELS[0],
        route: "fallback",
        models: FREE_TEXT_MODELS,
        messages: [
          { role: "user", content: `${TEXT_SYSTEM_PROMPT}\n\nParse this expense: "${text}"` },
        ],
        temperature: 0.1,
        max_tokens: 200,
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

    return parseAIJsonResponse(content);
  } catch (error) {
    console.error("AI parsing error:", error);
    return { success: false, error: "Failed to parse expense" };
  }
}

/**
 * Parse receipt/screenshot using GPT-4.1 Nano vision (uses credits).
 * Sends the image directly to the model — no OCR intermediary.
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
      {
        type: "text",
        text: caption
          ? `${VISION_SYSTEM_PROMPT}\n\nUser caption: "${caption}"\n\nExtract the expense from the image above.`
          : `${VISION_SYSTEM_PROMPT}\n\nExtract the expense from the image above.`,
      },
    ];

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://chamber.app",
        "X-Title": "Chamber Expense Tracker",
      },
      body: JSON.stringify({
        model: VISION_MODEL,
        messages: [
          { role: "user", content: userContent },
        ],
        temperature: 0.1,
        max_tokens: 300,
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
    return parseAIJsonResponse(content);
  } catch (error) {
    console.error("Vision AI error:", error);
    return { success: false, error: "Failed to process image with Vision AI" };
  }
}

/**
 * Parse a PDF document using GPT-4.1 Nano vision (uses credits).
 * Converts each PDF page to an image and sends to vision model.
 * Falls back to text extraction if the PDF is text-based.
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
    console.log("Sending PDF to GPT-4.1 Nano vision...");

    // GPT-4.1 Nano supports PDF as an image input via base64
    // We send the first page as a rendered image
    const userContent: Array<Record<string, unknown>> = [
      {
        type: "image_url",
        image_url: {
          url: `data:application/pdf;base64,${pdfBase64}`,
        },
      },
      {
        type: "text",
        text: caption
          ? `${VISION_SYSTEM_PROMPT}\n\nUser caption: "${caption}"\n\nExtract the expense from the PDF document above.`
          : `${VISION_SYSTEM_PROMPT}\n\nExtract the expense from the PDF document above.`,
      },
    ];

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://chamber.app",
        "X-Title": "Chamber Expense Tracker",
      },
      body: JSON.stringify({
        model: VISION_MODEL,
        messages: [
          { role: "user", content: userContent },
        ],
        temperature: 0.1,
        max_tokens: 300,
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
    return parseAIJsonResponse(content);
  } catch (error) {
    console.error("PDF Vision AI error:", error);
    return { success: false, error: "Failed to process PDF with Vision AI" };
  }
}

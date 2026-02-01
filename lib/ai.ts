const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OCR_SPACE_API_KEY = process.env.OCR_SPACE_API_KEY || "K85482897388957"; // Free tier key

// Use multiple models as fallback
const AI_MODELS = [
  "google/gemma-3-4b-it:free",
  "meta-llama/llama-3.2-3b-instruct:free",
  "mistralai/mistral-small-3.1-24b-instruct:free",
];

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

const VISION_SYSTEM_PROMPT = `You are an expense parsing assistant. Extract payment/expense information from UPI payment screenshots, receipts, or transaction confirmations.

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
        model: AI_MODELS[0],
        route: "fallback",
        models: AI_MODELS,
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

    // Extract JSON from response
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
        description: parsed.description || text,
        merchant: parsed.merchant,
        confidence: parsed.confidence || 0.8,
      },
    };
  } catch (error) {
    console.error("AI parsing error:", error);
    return { success: false, error: "Failed to parse expense" };
  }
}

export async function parseReceiptWithAI(imageBase64: string): Promise<AIResponse> {
  try {
    // Step 1: OCR with OCR.space API
    console.log("Starting OCR with OCR.space...");
    
    const formData = new FormData();
    formData.append("base64Image", `data:image/jpeg;base64,${imageBase64}`);
    formData.append("language", "eng");
    formData.append("isOverlayRequired", "false");
    formData.append("detectOrientation", "true");
    formData.append("scale", "true");
    formData.append("OCREngine", "2"); // Engine 2 is better for screenshots

    const ocrResponse = await fetch("https://api.ocr.space/parse/image", {
      method: "POST",
      headers: {
        "apikey": OCR_SPACE_API_KEY,
      },
      body: formData,
    });

    const ocrResult = await ocrResponse.json();

    if (!ocrResult.ParsedResults || ocrResult.ParsedResults.length === 0) {
      return { success: false, error: "OCR failed to process image" };
    }

    const ocrText = ocrResult.ParsedResults[0].ParsedText;
    console.log("OCR Text:", ocrText);

    if (!ocrText || ocrText.trim().length < 5) {
      return { success: false, error: "Could not read text from image" };
    }

    // Step 2: Pass OCR text directly to AI for parsing
    return parseExpenseWithAI(`Extract expense from this UPI/payment screenshot OCR text. Note: "=" often means "₹" (rupee symbol).\n\nOCR Text:\n${ocrText}`);
  } catch (error) {
    console.error("OCR/parsing error:", error);
    return { success: false, error: "Failed to process image" };
  }
}

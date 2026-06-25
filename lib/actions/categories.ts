"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// ponytail: flat category model with optional parentId for hierarchy.
// Full tree UI (drag-drop, nested select) add when users explicitly ask.

const CreateCategorySchema = z.object({
  name: z.string().min(1).max(50),
  icon: z.string().max(10).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  parentId: z.string().uuid().optional(),
  sortOrder: z.number().int().nonnegative().optional(),
});

const UpdateCategorySchema = CreateCategorySchema.partial();

export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>;
export type UserCategoryRecord = {
  id: string;
  userId: string;
  name: string;
  icon: string | null;
  color: string | null;
  parentId: string | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

// Default seed categories — created once per user on first request
const DEFAULT_CATEGORIES: { name: string; icon: string; color: string }[] = [
  { name: "Food", icon: "🍔", color: "#0088FE" },
  { name: "Travel", icon: "✈️", color: "#00C49F" },
  { name: "Entertainment", icon: "🎬", color: "#FFBB28" },
  { name: "Bills", icon: "📄", color: "#FF8042" },
  { name: "Shopping", icon: "🛍️", color: "#8884D8" },
  { name: "Health", icon: "🏥", color: "#FF6B6B" },
  { name: "Education", icon: "📚", color: "#4ECDC4" },
  { name: "Investments", icon: "📈", color: "#00C853" },
  { name: "Subscription", icon: "🔄", color: "#AB47BC" },
  { name: "General", icon: "📦", color: "#95A5A6" },
];

export async function seedDefaultCategoriesIfNeeded(userId: string) {
  const count = await db.userCategory.count({ where: { userId } });
  if (count > 0) return;

  await db.userCategory.createMany({
    data: DEFAULT_CATEGORIES.map((c, i) => ({
      userId,
      name: c.name,
      icon: c.icon,
      color: c.color,
      sortOrder: i,
    })),
  });
}

export async function getUserCategories(): Promise<UserCategoryRecord[]> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  await seedDefaultCategoriesIfNeeded(userId);

  return db.userCategory.findMany({
    where: { userId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function createCategory(input: CreateCategoryInput) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const validated = CreateCategorySchema.parse(input);

  const existing = await db.userCategory.findUnique({
    where: { userId_name: { userId, name: validated.name } },
  });
  if (existing) throw new Error("Category with this name already exists");

  const category = await db.userCategory.create({
    data: { userId, ...validated },
  });

  revalidatePath("/expenses");
  revalidatePath("/settings");
  return category;
}

export async function updateCategory(id: string, input: z.infer<typeof UpdateCategorySchema>) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const validated = UpdateCategorySchema.parse(input);

  const existing = await db.userCategory.findFirst({ where: { id, userId } });
  if (!existing) throw new Error("Category not found");

  // If renaming, check uniqueness
  if (validated.name && validated.name !== existing.name) {
    const dup = await db.userCategory.findUnique({
      where: { userId_name: { userId, name: validated.name } },
    });
    if (dup) throw new Error("Category with this name already exists");
  }

  const updated = await db.userCategory.update({
    where: { id },
    data: validated,
  });

  revalidatePath("/expenses");
  revalidatePath("/settings");
  return updated;
}

export async function deleteCategory(id: string, reassignTo?: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const category = await db.userCategory.findFirst({ where: { id, userId } });
  if (!category) throw new Error("Category not found");

  await db.$transaction(async (tx) => {
    const targetCategory = reassignTo || "General";

    // Reassign expenses from this category to the target
    await tx.expense.updateMany({
      where: { userId, category: category.name },
      data: { category: targetCategory },
    });

    // Delete sub-categories too
    await tx.userCategory.deleteMany({
      where: { OR: [{ id }, { parentId: id }], userId },
    });
  });

  revalidatePath("/expenses");
  revalidatePath("/settings");
}

// ── Smart Categorization ──────────────────────────────────────────
// ponytail: simple merchant-name matching first. AI only when no match found.

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

type SmartCategoryResult = {
  category: string;
  confidence: "high" | "medium" | "low";
};

// Known merchant-to-category mappings for common patterns
const MERCHANT_CATEGORIES: Record<string, string[]> = {
  Food: ["restaurant", "cafe", "coffee", "pizza", "burger", "sushi", "bakery", "diner", "starbucks", "mcdonald", "swiggy", "zomato", "uber eats", "food"],
  Travel: ["uber", "ola", "cab", "taxi", "flight", "hotel", "airbnb", "booking.com", "make my trip", "irctc", "redbus", "metro", "fuel", "petrol", "gas station"],
  Shopping: ["amazon", "flipkart", "myntra", "ajio", "meesho", "nykaa", "zara", "hm", "nike", "adidas", "mall", "store", "shop", "retail"],
  Entertainment: ["netflix", "prime", "hotstar", "disney", "youtube", "spotify", "bookmyshow", "pvr", "cinema", "movie", "theatre", "concert"],
  Bills: ["electricity", "water", "gas", "bill", "rent", "maintenance", "society", "broadband", "airtel", "jio", "vi"],
  Health: ["hospital", "clinic", "doctor", "pharmacy", "medicine", "dental", "lab", "health", "fitness", "gym"],
  Education: ["udemy", "coursera", "unacademy", "byju", "vedantu", "college", "tution", "course", "book"],
};

export async function smartCategorize(merchant?: string | null, description?: string | null): Promise<SmartCategoryResult> {
  const text = [merchant, description].filter(Boolean).join(" ").toLowerCase();
  if (!text) return { category: "General", confidence: "low" };

  // First pass: keyword-based match
  for (const [category, keywords] of Object.entries(MERCHANT_CATEGORIES)) {
    for (const kw of keywords) {
      if (text.includes(kw)) {
        return { category, confidence: "high" };
      }
    }
  }

  // Second pass: AI-assisted if API key available
  if (OPENROUTER_API_KEY) {
    try {
      const AI_MODELS = [
        "google/gemma-3-4b-it:free",
        "meta-llama/llama-3.2-3b-instruct:free",
      ];

      const prompt = `Categorize this expense into one of: Food, Travel, Entertainment, Bills, Shopping, Health, Education, Investments, Subscription, General.
Merchant: ${merchant || "unknown"}
Description: ${description || "unknown"}

Respond with ONLY the category name, nothing else.`;

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: AI_MODELS[0],
          route: "fallback",
          models: AI_MODELS,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.1,
          max_tokens: 50,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const cat = data.choices?.[0]?.message?.content?.trim();
        const VALID_CATEGORIES = ["Food", "Travel", "Entertainment", "Bills", "Shopping", "Health", "Education", "Investments", "Subscription", "General"];
        if (cat && VALID_CATEGORIES.includes(cat)) {
          return { category: cat, confidence: "medium" };
        }
      }
    } catch {
      // fallback to General
    }
  }

  return { category: "General", confidence: "low" };
}

// Re-categorize all expenses matching merchant/amount patterns
export async function smartReCategorize(options: { merchant?: string; minAmount?: number; maxAmount?: number }) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const where: Record<string, unknown> = { userId };
  if (options.merchant) {
    where.merchant = { contains: options.merchant, mode: "insensitive" };
  }
  if (options.minAmount !== undefined || options.maxAmount !== undefined) {
    where.amount = {};
    if (options.minAmount !== undefined) (where.amount as Record<string, number>).gte = options.minAmount;
    if (options.maxAmount !== undefined) (where.amount as Record<string, number>).lte = options.maxAmount;
  }

  const expenses = await db.expense.findMany({ where, select: { id: true, merchant: true, description: true } });
  let updated = 0;

  for (const expense of expenses) {
    const result = await smartCategorize(expense.merchant, expense.description);
    if (result.category) {
      await db.expense.update({
        where: { id: expense.id },
        data: { category: result.category },
      });
      updated++;
    }
  }

  revalidatePath("/expenses");
  revalidatePath("/analytics");

  return { updated, total: expenses.length };
}

// ── Category Analytics ─────────────────────────────────────────────

export async function getCategoryAnalytics(startDate?: Date, endDate?: Date) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const where: Record<string, unknown> = { userId };
  if (startDate || endDate) {
    where.date = {};
    if (startDate) (where.date as Record<string, Date>).gte = startDate;
    if (endDate) (where.date as Record<string, Date>).lte = endDate;
  }

  const expenses = await db.expense.findMany({
    where,
    select: { category: true, amount: true, tags: { include: { tag: { select: { name: true } } } } },
  });

  const categoryBreakdown: Record<string, number> = {};
  const tagBreakdown: Record<string, number> = {};
  let totalSpent = 0;

  for (const e of expenses) {
    categoryBreakdown[e.category] = (categoryBreakdown[e.category] || 0) + e.amount;
    totalSpent += e.amount;
    for (const et of e.tags) {
      tagBreakdown[et.tag.name] = (tagBreakdown[et.tag.name] || 0) + e.amount;
    }
  }

  const categoryColors: Record<string, string> = {
    Food: "#0088FE", Travel: "#00C49F", Entertainment: "#FFBB28", Bills: "#FF8042",
    Shopping: "#8884D8", Health: "#FF6B6B", Education: "#4ECDC4", General: "#95A5A6",
    Investments: "#00C853", Subscription: "#AB47BC",
  };

  const categoryData = Object.entries(categoryBreakdown)
    .map(([name, value]) => ({ name, value, color: categoryColors[name] || "#95A5A6" }))
    .sort((a, b) => b.value - a.value);

  const tagData = Object.entries(tagBreakdown)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 20); // top 20 tags

  return { categoryData, tagData, totalSpent };
}

// ── Bulk Tag Operations ────────────────────────────────────────────

export async function bulkTagExpenses(expenseIds: string[], tags: string[]) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const trimmedTags = tags.map((t) => t.trim().toLowerCase()).filter(Boolean);

  await db.$transaction(async (tx) => {
    for (const expenseId of expenseIds) {
      // Verify ownership
      const expense = await tx.expense.findFirst({ where: { id: expenseId, userId } });
      if (!expense) continue;

      for (const tagName of trimmedTags) {
        const tag = await tx.tag.upsert({
          where: { userId_name: { userId, name: tagName } },
          update: {},
          create: { userId, name: tagName },
        });
        // Use upsert to avoid duplicates
        await tx.expenseTag.upsert({
          where: { expenseId_tagId: { expenseId, tagId: tag.id } },
          update: {},
          create: { expenseId, tagId: tag.id },
        });
      }
    }
  });

  revalidatePath("/expenses");
  return { tagged: expenseIds.length, tags: trimmedTags.length };
}

export async function bulkCategorizeExpenses(expenseIds: string[], category: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const result = await db.expense.updateMany({
    where: { id: { in: expenseIds }, userId },
    data: { category },
  });

  revalidatePath("/expenses");
  return { updated: result.count };
}

export async function bulkDeleteTagsFromExpenses(expenseIds: string[], tags: string[]) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const userTags = await db.tag.findMany({
    where: { userId, name: { in: tags.map((t) => t.trim().toLowerCase()) } },
    select: { id: true },
  });
  const tagIds = userTags.map((t) => t.id);

  if (tagIds.length === 0) return { removed: 0 };

  await db.expenseTag.deleteMany({
    where: { expenseId: { in: expenseIds }, tagId: { in: tagIds } },
  });

  revalidatePath("/expenses");
  return { removed: expenseIds.length };
}

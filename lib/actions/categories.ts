"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const CategoryNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(50)
  .regex(/^[^\u0000-\u001F\u007F]+$/, "Category name contains invalid characters");

const CreateCategorySchema = z.object({
  name: CategoryNameSchema,
  icon: z.string().max(10).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  parentId: z.string().uuid().optional(),
  sortOrder: z.number().int().nonnegative().optional(),
});

const UpdateCategorySchema = CreateCategorySchema.partial();
const ExpenseIdsSchema = z.array(z.string().uuid()).min(1).max(100);
const TagNamesSchema = z
  .array(z.string().trim().min(1).max(50))
  .min(1)
  .max(20)
  .transform((tags) => [...new Set(tags.map((tag) => tag.toLowerCase()))]);
const SmartReCategorizeSchema = z
  .object({
    merchant: z.string().trim().min(1).max(200).optional(),
    minAmount: z.number().finite().optional(),
    maxAmount: z.number().finite().optional(),
  })
  .refine(
    ({ minAmount, maxAmount }) =>
      minAmount === undefined || maxAmount === undefined || minAmount <= maxAmount,
    "Minimum amount cannot exceed maximum amount",
  );

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
  { name: "Lent Money", icon: "🤝", color: "#42A5F5" },
  { name: "General", icon: "📦", color: "#95A5A6" },
];
const DEFAULT_CATEGORY_NAMES = new Set(
  DEFAULT_CATEGORIES.map((category) => category.name),
);

async function seedDefaultCategoriesIfNeeded(userId: string) {
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
    skipDuplicates: true,
  });
}

async function validateParentCategory(
  userId: string,
  parentId: string | undefined,
  categoryId?: string,
) {
  if (!parentId) return;

  const visited = new Set<string>();
  let currentId: string | null = parentId;

  while (currentId) {
    if (currentId === categoryId || visited.has(currentId)) {
      throw new Error("Category hierarchy cannot contain a cycle");
    }
    visited.add(currentId);

    const current: { parentId: string | null } | null =
      await db.userCategory.findFirst({
      where: { id: currentId, userId },
      select: { parentId: true },
    });
    if (!current) throw new Error("Parent category not found");
    currentId = current.parentId;
  }
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

  await seedDefaultCategoriesIfNeeded(userId);
  const validated = CreateCategorySchema.parse(input);
  await validateParentCategory(userId, validated.parentId);

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
  if (
    DEFAULT_CATEGORY_NAMES.has(existing.name) &&
    validated.name &&
    validated.name !== existing.name
  ) {
    throw new Error("Default category names cannot be changed");
  }
  if (validated.parentId !== undefined) {
    await validateParentCategory(userId, validated.parentId, id);
  }

  // If renaming, check uniqueness
  if (validated.name && validated.name !== existing.name) {
    const dup = await db.userCategory.findUnique({
      where: { userId_name: { userId, name: validated.name } },
    });
    if (dup) throw new Error("Category with this name already exists");
  }

  const updated = await db.$transaction(async (tx) => {
    const result = await tx.userCategory.update({
      where: { id },
      data: validated,
    });

    if (validated.name && validated.name !== existing.name) {
      await tx.expense.updateMany({
        where: { userId, category: existing.name },
        data: { category: validated.name },
      });
    }

    return result;
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
  if (DEFAULT_CATEGORY_NAMES.has(category.name)) {
    throw new Error("Default categories cannot be deleted");
  }

  const targetName = CategoryNameSchema.parse(reassignTo || "General");
  const targetCategory = await db.userCategory.findFirst({
    where: { userId, name: targetName },
  });
  if (!targetCategory || targetCategory.id === id) {
    throw new Error("Reassignment category not found");
  }

  await db.$transaction(async (tx) => {
    // Reassign expenses from this category to the target
    await tx.expense.updateMany({
      where: { userId, category: category.name },
      data: { category: targetCategory.name },
    });

    // Child categories are preserved and detached by the SetNull foreign key.
    await tx.userCategory.delete({
      where: { id },
    });
  });

  revalidatePath("/expenses");
  revalidatePath("/settings");
}

// ── Smart Categorization ──────────────────────────────────────────
// ponytail: simple merchant-name matching first. AI only when no match found.

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const SmartCategorizeInputSchema = z.object({
  merchant: z.string().trim().max(200).nullish(),
  description: z.string().trim().max(500).nullish(),
});

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

async function getAllowedCategoryNames(userId: string): Promise<string[]> {
  await seedDefaultCategoriesIfNeeded(userId);
  const categories = await db.userCategory.findMany({
    where: { userId },
    select: { name: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return categories.map((category) => category.name);
}

async function categorizeExpenseText(
  merchant: string | null | undefined,
  description: string | null | undefined,
  allowedCategories: string[],
): Promise<SmartCategoryResult> {
  const fallbackCategory = allowedCategories.includes("General")
    ? "General"
    : allowedCategories[0] || "General";
  const text = [merchant, description].filter(Boolean).join(" ").toLowerCase();
  if (!text) return { category: fallbackCategory, confidence: "low" };

  // First pass: keyword-based match
  for (const [category, keywords] of Object.entries(MERCHANT_CATEGORIES)) {
    if (!allowedCategories.includes(category)) continue;
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

      const prompt = `Categorize this expense into exactly one of these categories: ${JSON.stringify(allowedCategories)}.
Merchant: ${JSON.stringify(merchant || "unknown")}
Description: ${JSON.stringify(description || "unknown")}

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
        const data: unknown = await response.json();
        const cat =
          typeof data === "object" &&
          data !== null &&
          "choices" in data &&
          Array.isArray(data.choices) &&
          typeof data.choices[0]?.message?.content === "string"
            ? data.choices[0].message.content.trim()
            : null;
        if (cat && allowedCategories.includes(cat)) {
          return { category: cat, confidence: "medium" };
        }
      }
    } catch {
      // fallback to General
    }
  }

  return { category: fallbackCategory, confidence: "low" };
}

export async function smartCategorize(
  merchant?: string | null,
  description?: string | null,
): Promise<SmartCategoryResult> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const validated = SmartCategorizeInputSchema.parse({ merchant, description });
  const allowedCategories = await getAllowedCategoryNames(userId);
  return categorizeExpenseText(
    validated.merchant,
    validated.description,
    allowedCategories,
  );
}

// Re-categorize all expenses matching merchant/amount patterns
export async function smartReCategorize(options: { merchant?: string; minAmount?: number; maxAmount?: number }) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  const validated = SmartReCategorizeSchema.parse(options);

  const where: Record<string, unknown> = {
    userId,
    loanId: null,
    repaymentId: null,
  };
  if (validated.merchant) {
    where.merchant = { contains: validated.merchant, mode: "insensitive" };
  }
  if (validated.minAmount !== undefined || validated.maxAmount !== undefined) {
    where.amount = {};
    if (validated.minAmount !== undefined) {
      (where.amount as Record<string, number>).gte = validated.minAmount;
    }
    if (validated.maxAmount !== undefined) {
      (where.amount as Record<string, number>).lte = validated.maxAmount;
    }
  }

  const expenses = await db.expense.findMany({
    where,
    select: { id: true, merchant: true, description: true },
    take: 200,
  });
  const allowedCategories = await getAllowedCategoryNames(userId);
  const updates = new Map<string, string[]>();
  let updated = 0;

  for (const expense of expenses) {
    const result = await categorizeExpenseText(
      expense.merchant,
      expense.description,
      allowedCategories,
    );
    if (result.category) {
      const ids = updates.get(result.category) || [];
      ids.push(expense.id);
      updates.set(result.category, ids);
    }
  }

  for (const [category, ids] of updates) {
    const result = await db.expense.updateMany({
      where: {
        id: { in: ids },
        userId,
        loanId: null,
        repaymentId: null,
      },
      data: { category },
    });
    updated += result.count;
  }

  revalidatePath("/expenses");
  revalidatePath("/analytics");

  return { updated, total: expenses.length, limited: expenses.length === 200 };
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

  const validatedExpenseIds = ExpenseIdsSchema.parse(expenseIds);
  const trimmedTags = TagNamesSchema.parse(tags);

  const tagged = await db.$transaction(async (tx) => {
    const ownedExpenses = await tx.expense.findMany({
      where: { id: { in: validatedExpenseIds }, userId },
      select: { id: true },
    });

    for (const tagName of trimmedTags) {
      const tag = await tx.tag.upsert({
        where: { userId_name: { userId, name: tagName } },
        update: {},
        create: { userId, name: tagName },
      });

      for (const expense of ownedExpenses) {
        await tx.expenseTag.upsert({
          where: {
            expenseId_tagId: { expenseId: expense.id, tagId: tag.id },
          },
          update: {},
          create: { expenseId: expense.id, tagId: tag.id },
        });
      }
    }

    return ownedExpenses.length;
  });

  revalidatePath("/expenses");
  revalidatePath("/analytics");
  return { tagged, tags: trimmedTags.length };
}

export async function bulkCategorizeExpenses(expenseIds: string[], category: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  const validatedExpenseIds = ExpenseIdsSchema.parse(expenseIds);
  const validatedCategory = CategoryNameSchema.parse(category);

  const ownedCategory = await db.userCategory.findFirst({
    where: { userId, name: validatedCategory },
  });
  if (!ownedCategory) throw new Error("Category not found");

  const result = await db.expense.updateMany({
    where: {
      id: { in: validatedExpenseIds },
      userId,
      loanId: null,
      repaymentId: null,
    },
    data: { category: ownedCategory.name },
  });

  revalidatePath("/expenses");
  revalidatePath("/analytics");
  return { updated: result.count };
}

export async function bulkDeleteTagsFromExpenses(expenseIds: string[], tags: string[]) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  const validatedExpenseIds = ExpenseIdsSchema.parse(expenseIds);
  const validatedTags = TagNamesSchema.parse(tags);

  const userTags = await db.tag.findMany({
    where: { userId, name: { in: validatedTags } },
    select: { id: true },
  });
  const tagIds = userTags.map((t) => t.id);

  if (tagIds.length === 0) return { removed: 0 };

  const result = await db.expenseTag.deleteMany({
    where: {
      expense: {
        id: { in: validatedExpenseIds },
        userId,
      },
      tagId: { in: tagIds },
    },
  });

  revalidatePath("/expenses");
  revalidatePath("/analytics");
  return { removed: result.count };
}

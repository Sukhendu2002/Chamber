import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { generateUserExport } from "@/lib/data-transfer/export";
import { DataExportRequestSchema } from "@/lib/data-transfer/schemas";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rateLimit = checkRateLimit(`data-export:${userId}`, 10, 60_000);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: `Too many exports. Try again in ${rateLimit.retryAfter} seconds` },
      { status: 429, headers: { "Retry-After": rateLimit.retryAfter.toString() } },
    );
  }

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON request" }, { status: 400 });
    }
    const input = DataExportRequestSchema.parse(body);
    const generated = await generateUserExport(userId, input);

    return new Response(new Uint8Array(generated.body), {
      headers: {
        "Content-Type": generated.contentType,
        "Content-Disposition": `attachment; filename="${generated.fileName}"`,
        "Content-Length": generated.body.length.toString(),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "X-Record-Count": generated.recordCount.toString(),
        "X-Export-Encrypted": generated.encrypted ? "true" : "false",
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "Invalid export options" },
        { status: 400 },
      );
    }
    console.error("Data export failed", error);
    return NextResponse.json({ error: "Failed to create export" }, { status: 500 });
  }
}

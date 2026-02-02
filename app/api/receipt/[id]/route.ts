import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { S3Client, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { db } from "@/lib/db";

function getR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("R2 credentials not configured");
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: expenseId } = await params;
    const { searchParams } = new URL(request.url);
    const indexParam = searchParams.get("index");

    // Get expense and verify ownership
    const expense = await db.expense.findFirst({
      where: { id: expenseId, userId },
    });

    if (!expense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    // Get all receipts (combining legacy receiptUrl and new receiptUrls array)
    const receipts: string[] = [...(expense.receiptUrls || [])];
    if (expense.receiptUrl && !receipts.includes(expense.receiptUrl)) {
      receipts.unshift(expense.receiptUrl);
    }

    if (receipts.length === 0) {
      return NextResponse.json({ error: "No receipts found" }, { status: 404 });
    }

    // Get the specific receipt by index, or first one if no index
    const index = indexParam !== null ? parseInt(indexParam, 10) : 0;
    const receiptUrl = receipts[index];

    if (!receiptUrl) {
      return NextResponse.json({ error: "Receipt not found at index" }, { status: 404 });
    }

    // Extract R2 key from the URL if it's a full URL
    let r2Key = receiptUrl;
    if (receiptUrl.startsWith("http")) {
      // Extract the key from the full URL (e.g., https://bucket.r2.cloudflarestorage.com/receipts/...)
      try {
        const url = new URL(receiptUrl);
        // Remove leading slash from pathname
        r2Key = url.pathname.startsWith("/") ? url.pathname.slice(1) : url.pathname;
      } catch {
        // If URL parsing fails, use the original value
        r2Key = receiptUrl;
      }
    }

    // Always fetch from R2 to ensure proper authorization
    const r2Client = getR2Client();
    const bucketName = process.env.R2_BUCKET_NAME;

    const response = await r2Client.send(
      new GetObjectCommand({
        Bucket: bucketName,
        Key: r2Key,
      })
    );

    if (!response.Body) {
      return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
    }

    // Convert stream to buffer
    const chunks: Uint8Array[] = [];
    const reader = response.Body.transformToWebStream().getReader();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    const buffer = Buffer.concat(chunks);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": response.ContentType || "image/jpeg",
        "Cache-Control": "public, max-age=31536000",
      },
    });
  } catch (error) {
    console.error("Receipt fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch receipt" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: expenseId } = await params;
    const { searchParams } = new URL(request.url);
    const indexParam = searchParams.get("index");

    // Get expense and verify ownership
    const expense = await db.expense.findFirst({
      where: { id: expenseId, userId },
    });

    if (!expense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    // Get all receipts (combining legacy receiptUrl and new receiptUrls array)
    const receipts: string[] = [...(expense.receiptUrls || [])];
    if (expense.receiptUrl && !receipts.includes(expense.receiptUrl)) {
      receipts.unshift(expense.receiptUrl);
    }

    if (receipts.length === 0) {
      return NextResponse.json({ error: "No receipts found" }, { status: 404 });
    }

    // Get the specific receipt by index
    const index = indexParam !== null ? parseInt(indexParam, 10) : 0;
    const receiptUrl = receipts[index];

    if (!receiptUrl) {
      return NextResponse.json({ error: "Receipt not found at index" }, { status: 404 });
    }

    // Delete from R2
    const r2Client = getR2Client();
    const bucketName = process.env.R2_BUCKET_NAME;

    await r2Client.send(
      new DeleteObjectCommand({
        Bucket: bucketName,
        Key: receiptUrl,
      })
    );

    // Update database - remove from receiptUrls array or clear receiptUrl
    const newReceiptUrls = expense.receiptUrls?.filter((url: string) => url !== receiptUrl) || [];
    
    // If it was the legacy receiptUrl, clear it
    const newReceiptUrl = expense.receiptUrl === receiptUrl ? null : expense.receiptUrl;

    await db.expense.update({
      where: { id: expenseId },
      data: {
        receiptUrls: newReceiptUrls,
        receiptUrl: newReceiptUrl,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Receipt delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete receipt" },
      { status: 500 }
    );
  }
}

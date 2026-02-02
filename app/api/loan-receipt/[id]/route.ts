import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
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
    const { id: loanId } = await params;
    const { searchParams } = new URL(request.url);
    const indexParam = searchParams.get("index");

    // Get loan and verify ownership
    const loan = await db.loan.findFirst({
      where: { id: loanId, userId },
    });

    if (!loan) {
      return NextResponse.json({ error: "Loan not found" }, { status: 404 });
    }

    if (loan.receiptUrls.length === 0) {
      return NextResponse.json({ error: "No receipts found" }, { status: 404 });
    }

    // Get the specific receipt by index, or first one if no index
    const index = indexParam !== null ? parseInt(indexParam, 10) : 0;
    const receiptUrl = loan.receiptUrls[index];

    if (!receiptUrl) {
      return NextResponse.json({ error: "Receipt not found at index" }, { status: 404 });
    }

    // If receiptUrl is a full URL, redirect to it
    if (receiptUrl.startsWith("http")) {
      return NextResponse.redirect(receiptUrl);
    }

    // Otherwise, fetch from R2
    const r2Client = getR2Client();
    const bucketName = process.env.R2_BUCKET_NAME;

    const response = await r2Client.send(
      new GetObjectCommand({
        Bucket: bucketName,
        Key: receiptUrl,
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
    console.error("Loan receipt fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch receipt" },
      { status: 500 }
    );
  }
}

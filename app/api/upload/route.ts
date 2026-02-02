import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
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

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const uploadType = formData.get("type") as string || "expense";
    const expenseId = formData.get("expenseId") as string;
    const loanId = formData.get("loanId") as string;
    const repaymentId = formData.get("repaymentId") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to R2
    const r2Client = getR2Client();
    const bucketName = process.env.R2_BUCKET_NAME;
    const ext = file.name.split(".").pop() || "jpg";
    let key: string;

    if (uploadType === "loan" && loanId) {
      // Verify the loan belongs to the user
      const loan = await db.loan.findFirst({
        where: { id: loanId, userId },
      });

      if (!loan) {
        return NextResponse.json({ error: "Loan not found" }, { status: 404 });
      }

      key = `loans/${userId}/${loanId}-${Date.now()}.${ext}`;

      await r2Client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: key,
          Body: buffer,
          ContentType: file.type,
        })
      );

      return NextResponse.json({ success: true, url: key });
    } else if (uploadType === "repayment" && repaymentId) {
      // Verify the repayment belongs to the user
      const repayment = await db.repayment.findUnique({
        where: { id: repaymentId },
        include: { loan: true },
      });

      if (!repayment || repayment.loan.userId !== userId) {
        return NextResponse.json({ error: "Repayment not found" }, { status: 404 });
      }

      key = `repayments/${userId}/${repaymentId}-${Date.now()}.${ext}`;

      await r2Client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: key,
          Body: buffer,
          ContentType: file.type,
        })
      );

      return NextResponse.json({ success: true, url: key });
    } else if (expenseId) {
      // Verify the expense belongs to the user
      const expense = await db.expense.findFirst({
        where: { id: expenseId, userId },
      });

      if (!expense) {
        return NextResponse.json({ error: "Expense not found" }, { status: 404 });
      }

      key = `receipts/${userId}/${expenseId}-${Date.now()}.${ext}`;

      await r2Client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: key,
          Body: buffer,
          ContentType: file.type,
        })
      );

      // Add to receiptUrls array (support multiple receipts)
      await db.expense.update({
        where: { id: expenseId },
        data: {
          receiptUrls: {
            push: key,
          },
        },
      });

      return NextResponse.json({ success: true, url: key });
    } else {
      return NextResponse.json({ error: "No valid ID provided" }, { status: 400 });
    }
  } catch (error) {
    console.error("Upload error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to upload file", details: errorMessage },
      { status: 500 }
    );
  }
}

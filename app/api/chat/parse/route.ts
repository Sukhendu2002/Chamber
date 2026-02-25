import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { parseExpenseWithAI, parseReceiptWithVision, parsePDFWithVision } from "@/lib/ai";
import { db } from "@/lib/db";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

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
        credentials: { accessKeyId, secretAccessKey },
    });
}

export async function POST(request: NextRequest) {
    const { userId } = await auth();
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { type, text, imageBase64, mimeType, caption } = body;

        // Fetch user's currency setting
        const settings = await db.userSettings.findUnique({ where: { userId } });
        const currency = settings?.currency || "INR";

        if (type === "text" && text) {
            // Parse text expense — uses free models
            const result = await parseExpenseWithAI(text, currency);
            return NextResponse.json(result);
        }

        if (type === "image" && imageBase64) {
            // Parse image receipt — uses GPT-4.1 Nano vision
            const result = await parseReceiptWithVision(imageBase64, mimeType || "image/jpeg", caption, currency);

            // Upload image to R2 if parsing succeeded
            let receiptUrl: string | undefined;
            if (result.success) {
                try {
                    const r2Client = getR2Client();
                    const bucketName = process.env.R2_BUCKET_NAME;
                    const buffer = Buffer.from(imageBase64, "base64");
                    const ext = (mimeType || "image/jpeg").split("/")[1] || "jpg";
                    const key = `receipts/${userId}/${Date.now()}.${ext}`;

                    await r2Client.send(
                        new PutObjectCommand({
                            Bucket: bucketName,
                            Key: key,
                            Body: buffer,
                            ContentType: mimeType || "image/jpeg",
                        })
                    );
                    receiptUrl = key;
                } catch (error) {
                    console.error("Failed to upload receipt to R2:", error);
                }
            }

            return NextResponse.json({ ...result, receiptUrl });
        }

        if (type === "pdf" && imageBase64) {
            // Parse PDF — uses GPT-4.1 Nano with file-parser plugin
            const result = await parsePDFWithVision(imageBase64, caption, currency);

            // Upload PDF to R2 if parsing succeeded
            let receiptUrl: string | undefined;
            if (result.success) {
                try {
                    const r2Client = getR2Client();
                    const bucketName = process.env.R2_BUCKET_NAME;
                    const buffer = Buffer.from(imageBase64, "base64");
                    const key = `receipts/${userId}/${Date.now()}.pdf`;

                    await r2Client.send(
                        new PutObjectCommand({
                            Bucket: bucketName,
                            Key: key,
                            Body: buffer,
                            ContentType: "application/pdf",
                        })
                    );
                    receiptUrl = key;
                } catch (error) {
                    console.error("Failed to upload PDF to R2:", error);
                }
            }

            return NextResponse.json({ ...result, receiptUrl });
        }

        return NextResponse.json({ error: "Invalid request type" }, { status: 400 });
    } catch (error) {
        console.error("Chat parse error:", error);
        return NextResponse.json({ error: "Failed to parse" }, { status: 500 });
    }
}

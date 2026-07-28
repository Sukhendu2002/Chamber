import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const captureUrl = new URL("/capture", request.url);
  captureUrl.searchParams.set("source", "share-unavailable");
  return NextResponse.redirect(captureUrl, 303);
}

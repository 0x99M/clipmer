import { NextRequest, NextResponse } from "next/server";
import { generateLicenseKey } from "@/lib/license";
import { resolveCustomerEmail } from "@/lib/paddle";
import { sendLicenseEmail } from "@/lib/email";
import { handlePaddleWebhook } from "@/lib/paddle-webhook";
import { clipmerIds } from "@/lib/paddle-config";

// The logic, including which transactions are Clipmer's, is in
// lib/paddle-webhook.ts and tested in tests/paddle-webhook.test.ts.
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const result = await handlePaddleWebhook(rawBody, req.headers.get("paddle-signature"), {
    secret: process.env.PADDLE_WEBHOOK_SECRET,
    ids: clipmerIds(),
    privateKey: process.env.LICENSE_PRIVATE_KEY,
    resolveEmail: (data) => resolveCustomerEmail(data),
    generateLicenseKey,
    sendLicenseEmail,
    log: (message) => console.log(message),
    error: (message, detail) =>
      detail === undefined ? console.error(message) : console.error(message, detail),
  });
  return NextResponse.json(result.body, { status: result.status });
}

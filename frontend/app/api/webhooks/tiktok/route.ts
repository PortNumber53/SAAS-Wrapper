import { NextRequest, NextResponse } from "next/server";
import { xata } from "@/lib/xata";

export const runtime = "edge";

// Verify TikTok webhook signature
async function verifySignature(
  request: NextRequest,
  rawBody: string
): Promise<boolean> {
  const signature = request.headers.get("X-Tiktok-Signature");
  if (!signature) return false;

  const secret = process.env.TIKTOK_WEBHOOK_SECRET;
  if (!secret) {
    console.error("TikTok webhook secret not configured");
    return false;
  }

  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const signatureBytes = new Uint8Array(
      signature.split("").map((c) => c.charCodeAt(0))
    );

    const verified = await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBytes,
      encoder.encode(rawBody)
    );

    return verified;
  } catch (error) {
    console.error("Error verifying TikTok webhook signature:", error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get the raw body for signature verification
    const rawBody = await request.text();

    // Verify the webhook signature
    const isValid = await verifySignature(request, rawBody);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Parse the webhook data
    const data = JSON.parse(rawBody);
    console.log("Received TikTok webhook:", data);

    // Store the webhook event
    await xata.db.webhook_events.create({
      platform: "tiktok",
      event_type: data.event_type,
      status: "pending",
      metadata: data,
      processed_at: null,
    });

    // Return 200 OK to acknowledge receipt
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error processing TikTok webhook:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// TikTok webhook URL verification
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const challenge = searchParams.get("challenge");

    // If this is a verification request, return the challenge code
    if (challenge) {
      return NextResponse.json({ challenge });
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch (error) {
    console.error("Error handling TikTok webhook verification:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

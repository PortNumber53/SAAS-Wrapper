import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/auth";

export const runtime = "edge";

async function generateState(): Promise<string> {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
    ""
  );
}

export async function GET(request: NextRequest) {
  try {
    // Ensure user is authenticated
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the current URL to use as redirect_uri
    const url = new URL(request.url);
    const redirectUri = `${url.protocol}//${url.host}/api/integrations/tiktok/callback`;

    // TikTok OAuth parameters
    const clientKey = process.env.TIKTOK_CLIENT_KEY;
    // Using only basic scopes for sandbox testing
    const scopes = ["user.info.basic"];

    if (!clientKey) {
      console.error("TikTok client key missing");
      return NextResponse.json(
        {
          error: "Configuration error",
          details:
            "TikTok client key not configured. Please check environment variables.",
          missingKey: "TIKTOK_CLIENT_KEY",
        },
        { status: 500 }
      );
    }

    // Construct the TikTok authorization URL
    const authUrl = new URL("https://www.tiktok.com/v2/auth/authorize/");
    authUrl.searchParams.append("client_key", clientKey);
    authUrl.searchParams.append("redirect_uri", redirectUri);
    authUrl.searchParams.append("scope", scopes.join(","));
    authUrl.searchParams.append("response_type", "code");
    authUrl.searchParams.append("state", await generateState());

    return NextResponse.json({
      authUrl: authUrl.toString(),
      debug: {
        redirectUri,
        scopes: scopes.join(","),
        hasClientKey: !!clientKey,
      },
    });
  } catch (error) {
    console.error("TikTok auth URL error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate TikTok authorization URL",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

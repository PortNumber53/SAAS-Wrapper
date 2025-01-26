import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/auth";
import { xata } from "@/lib/xata";

export const runtime = "edge";

interface TikTokTokenResponse {
  access_token: string;
  open_id: string;
  expires_in: number;
  refresh_token: string;
  refresh_expires_in: number;
  scope: string;
}

interface TikTokUserResponse {
  data: {
    user: {
      open_id: string;
      union_id: string;
      avatar_url: string;
      display_name: string;
    };
  };
  error?: {
    code: string;
    message: string;
    log_id: string;
  };
}

async function exchangeCodeForToken(
  code: string,
  redirectUri: string
): Promise<{ accessToken: string; openId: string; username: string }> {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;

  if (!clientKey || !clientSecret) {
    throw new Error("TikTok credentials not configured");
  }

  console.log("Starting TikTok token exchange...");

  // Exchange code for access token
  const tokenResponse = await fetch(
    "https://open.tiktokapis.com/v2/oauth/token/",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Cache-Control": "no-cache",
      },
      body: new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    }
  );

  if (!tokenResponse.ok) {
    const errorData = await tokenResponse.text();
    console.error("Token exchange failed:", {
      status: tokenResponse.status,
      statusText: tokenResponse.statusText,
      error: errorData,
    });
    throw new Error(`Failed to exchange code for token: ${errorData}`);
  }

  const tokenData = (await tokenResponse.json()) as TikTokTokenResponse;
  console.log("Got access token:", {
    openId: tokenData.open_id,
    expiresIn: tokenData.expires_in,
    scope: tokenData.scope,
  });

  // Get user info
  const userResponse = await fetch(
    "https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name",
    {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    }
  );

  if (!userResponse.ok) {
    const errorData = await userResponse.text();
    console.error("User info fetch failed:", {
      status: userResponse.status,
      statusText: userResponse.statusText,
      error: errorData,
    });
    throw new Error(`Failed to get user info: ${errorData}`);
  }

  const userData = (await userResponse.json()) as TikTokUserResponse;
  console.log("Raw user info response:", userData);

  if (!userData.data?.user) {
    console.error("Invalid user info response:", userData);
    throw new Error("Invalid user info response from TikTok");
  }

  console.log("Got user info:", {
    openId: userData.data.user.open_id,
    displayName: userData.data.user.display_name,
  });

  return {
    accessToken: tokenData.access_token,
    openId: userData.data.user.open_id,
    username: userData.data.user.display_name,
  };
}

export async function GET(request: NextRequest) {
  try {
    // Ensure user is authenticated
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the authorization code from the URL
    const searchParams = new URL(request.url).searchParams;
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    if (error || !code) {
      console.error("TikTok OAuth error:", { error, errorDescription });
      return NextResponse.json(
        { error: errorDescription || "Failed to authenticate with TikTok" },
        { status: 400 }
      );
    }

    // Get the current URL to use as redirect_uri (must match the one used in auth-url)
    const url = new URL(request.url);
    const redirectUri = `${url.protocol}//${url.host}/api/integrations/tiktok/callback`;

    // Exchange the code for an access token and get user info
    const { accessToken, openId, username } = await exchangeCodeForToken(
      code,
      redirectUri
    );

    console.log("Attempting to store TikTok integration for user:", {
      userId: session.user.id,
      openId,
      username,
    });

    // Find or create TikTok integration for the current user
    const integration = await xata.db.integrations
      .filter({
        slug: "tiktok",
        user: session.user.id,
      })
      .getFirst();

    console.log("Existing integration found:", integration);

    const tiktokSettings = {
      access_token: accessToken,
      business_id: openId,
      username,
      connected_at: new Date().toISOString(),
      platform: "tiktok",
      last_used_at: new Date().toISOString(),
      description:
        "Connect your TikTok Business account to automatically publish content.",
    };

    try {
      if (integration) {
        console.log("Updating existing integration...");
        const updated = await xata.db.integrations.update(integration.id, {
          settings: tiktokSettings,
          is_active: true,
          user: session.user.id,
        });
        console.log("Integration updated successfully:", updated);
      } else {
        console.log("Creating new integration...");
        const created = await xata.db.integrations.create({
          slug: "tiktok",
          name: "TikTok",
          is_active: true,
          settings: tiktokSettings,
          user: session.user.id,
        });
        console.log("Integration created successfully:", created);
      }
    } catch (dbError) {
      console.error("Failed to store integration:", dbError);
      throw dbError;
    }

    // Redirect back to the integrations page
    return NextResponse.redirect(new URL("/account/integrations", request.url));
  } catch (error) {
    console.error("TikTok callback error:", error);
    // Redirect to integrations page with error
    const redirectUrl = new URL("/account/integrations", request.url);
    redirectUrl.searchParams.append("error", "tiktok_auth_failed");
    return NextResponse.redirect(redirectUrl);
  }
}

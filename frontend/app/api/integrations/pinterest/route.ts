import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/auth";
import { xata } from "@/lib/xata";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  try {
    // Ensure user is authenticated
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the Pinterest integration
    const integration = await xata.db.integrations
      .filter({ slug: "pinterest" })
      .getFirst();

    if (!integration) {
      return NextResponse.json({
        integration: null,
      });
    }

    const settings = integration.settings as {
      access_token?: string;
      username?: string;
    };

    return NextResponse.json({
      integration: {
        accessToken: settings?.access_token || "",
        username: settings?.username || "",
        is_active: integration.is_active,
      },
    });
  } catch (error) {
    console.error("Pinterest integration fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch Pinterest integration settings" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Ensure user is authenticated
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse the request body
    const body = (await request.json()) as {
      accessToken?: string;
      username?: string;
      is_active: boolean;
    };

    // Type guard and validation
    const accessToken = body.accessToken || "";
    const username = body.username || "";
    const is_active = body.is_active;

    // Validate input if integration is active
    if (is_active && !accessToken) {
      return NextResponse.json(
        { error: "Access Token is required when integration is active" },
        { status: 400 }
      );
    }

    // Prepare Pinterest settings
    const settings = {
      access_token: accessToken,
      username,
    };

    // Get the Pinterest integration if it exists
    const existingIntegration = await xata.db.integrations
      .filter({ slug: "pinterest" })
      .getFirst();

    if (existingIntegration) {
      // Update existing record
      const updatedRecord = await xata.db.integrations.update(
        existingIntegration.id,
        {
          settings,
          is_active,
        }
      );

      return NextResponse.json(
        {
          message: "Pinterest integration settings updated successfully",
          integration: {
            ...settings,
            is_active: updatedRecord.is_active,
          },
        },
        { status: 200 }
      );
    }

    // Create new record if not exists
    const newRecord = await xata.db.integrations.create({
      slug: "pinterest",
      name: "Pinterest",
      description:
        "Connect your Pinterest account to automatically publish content.",
      is_active,
      settings,
    });

    return NextResponse.json(
      {
        message: "Pinterest integration settings saved successfully",
        integration: {
          ...settings,
          is_active: newRecord.is_active,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Pinterest integration save error:", error);
    return NextResponse.json(
      { error: "Failed to save Pinterest integration settings" },
      { status: 500 }
    );
  }
}

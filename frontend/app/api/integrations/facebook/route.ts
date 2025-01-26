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

    // Get the Facebook integration
    const integration = await xata.db.integrations
      .filter({ slug: "facebook" })
      .getFirst();

    if (!integration) {
      return NextResponse.json({
        integration: null,
      });
    }

    const settings = integration.settings as {
      access_token?: string;
      page_id?: string;
      page_name?: string;
    };

    return NextResponse.json({
      integration: {
        accessToken: settings?.access_token || "",
        pageId: settings?.page_id || "",
        pageName: settings?.page_name || "",
        is_active: integration.is_active,
      },
    });
  } catch (error) {
    console.error("Facebook integration fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch Facebook integration settings" },
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
      pageId?: string;
      pageName?: string;
      is_active: boolean;
    };

    // Type guard and validation
    const accessToken = body.accessToken || "";
    const pageId = body.pageId || "";
    const pageName = body.pageName || "";
    const is_active = body.is_active;

    // Validate input if integration is active
    if (is_active && (!accessToken || !pageId)) {
      return NextResponse.json(
        {
          error:
            "Access Token and Page ID are required when integration is active",
        },
        { status: 400 }
      );
    }

    // Prepare Facebook settings
    const settings = {
      access_token: accessToken,
      page_id: pageId,
      page_name: pageName,
    };

    // Get the Facebook integration if it exists
    const existingIntegration = await xata.db.integrations
      .filter({ slug: "facebook" })
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
          message: "Facebook integration settings updated successfully",
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
      slug: "facebook",
      name: "Facebook",
      description:
        "Connect your Facebook page to automatically publish content.",
      is_active,
      settings,
    });

    return NextResponse.json(
      {
        message: "Facebook integration settings saved successfully",
        integration: {
          ...settings,
          is_active: newRecord.is_active,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Facebook integration save error:", error);
    return NextResponse.json(
      { error: "Failed to save Facebook integration settings" },
      { status: 500 }
    );
  }
}

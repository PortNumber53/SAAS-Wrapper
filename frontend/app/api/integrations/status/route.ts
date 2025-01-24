import { getXataClient } from "@/lib/xata";
import { NextResponse } from "next/server";
import { auth } from "@/app/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const xata = getXataClient();
    const [stripeIntegration, instagramIntegration] = await Promise.all([
      xata.db.integrations.filter({ slug: "stripe" }).getFirst(),
      xata.db.integrations.filter({ slug: "instagram-business" }).getFirst(),
    ]);

    const status = {
      stripe: stripeIntegration?.is_active || false,
      instagram: instagramIntegration?.is_active || false,
    };

    return NextResponse.json(status);
  } catch (error) {
    console.error("Error fetching integration status:", error);
    return NextResponse.json(
      { error: "Failed to fetch integration status" },
      { status: 500 }
    );
  }
}

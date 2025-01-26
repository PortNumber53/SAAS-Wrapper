import { NextRequest, NextResponse } from "next/server";
import type { Stripe } from "stripe";
import stripePackage from "stripe";
import { getXataClient } from "@/lib/xata";
import type { CartItem } from "@/lib/cart-context";
import type { Products } from "@/vendor/xata";
import { auth } from "@/app/auth";

export const runtime = "edge";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Missing STRIPE_SECRET_KEY environment variable");
}

const stripe = new stripePackage(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-12-18.acacia",
});

const xata = getXataClient();

interface CheckoutRequestBody {
  items: CartItem[];
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ message: "Checkout endpoint coming soon..." });
  } catch (error) {
    console.error("Checkout session error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}

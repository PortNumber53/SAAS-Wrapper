import { NextResponse } from "next/server";
import type { Stripe } from "stripe";
import stripePackage from "stripe";
import { getXataClient } from "@/lib/xata";
import type { CartItem } from "@/lib/cart-context";
import type { Products } from "@/vendor/xata";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Missing STRIPE_SECRET_KEY environment variable");
}

if (!process.env.NEXT_PUBLIC_APP_URL) {
  throw new Error("Missing NEXT_PUBLIC_APP_URL environment variable");
}

// Ensure the URL has a protocol
const baseUrl = process.env.NEXT_PUBLIC_APP_URL.startsWith("http")
  ? process.env.NEXT_PUBLIC_APP_URL
  : `https://${process.env.NEXT_PUBLIC_APP_URL}`;

const stripe = new stripePackage(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-12-18.acacia",
});

const xata = getXataClient();

interface CheckoutRequestBody {
  items: CartItem[];
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CheckoutRequestBody;
    const { items } = body;

    if (!items?.length) {
      return new NextResponse("No items in cart", { status: 400 });
    }

    // Fetch products from database to verify prices
    const productIds = items.map((item) => item.id);
    const products = await xata.db.products
      .filter({
        id: { $any: productIds },
        deleted_at: null,
        is_active: true,
      })
      .getMany();

    // Create line items for Stripe
    const lineItems = items.map((item) => {
      const product = products.find((p: Products) => p.id === item.id);
      if (!product) {
        throw new Error(`Product not found: ${item.id}`);
      }

      // Verify price matches
      if (product.price !== item.price) {
        throw new Error(`Price mismatch for product: ${item.id}`);
      }

      return {
        price_data: {
          currency: "usd",
          product_data: {
            name: product.name || "Unnamed Product",
            description: product.description || undefined,
          },
          unit_amount: Math.round(product.price * 100), // Convert to cents
        },
        quantity: item.quantity,
      };
    });

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${baseUrl}/ecommerce/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/ecommerce/cart`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return new NextResponse(
      error instanceof Error ? error.message : "Internal server error",
      { status: 500 }
    );
  }
}

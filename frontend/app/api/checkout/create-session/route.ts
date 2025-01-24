import { NextResponse } from "next/server";
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

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Get base URL from request
    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}`;

    const body = (await request.json()) as CheckoutRequestBody;
    const { items } = body;

    if (!items?.length) {
      return new NextResponse("No items in cart", { status: 400 });
    }

    // Get products from database to verify prices
    const products = await xata.db.products
      .filter({
        id: {
          $any: items.map((item) => item.id),
        },
      })
      .getAll();

    // Calculate total
    const total = items.reduce((sum, item) => {
      const product = products.find((p: Products) => p.id === item.id);
      if (!product) throw new Error(`Product not found: ${item.id}`);
      if (product.price !== item.price) {
        throw new Error(`Price mismatch for product: ${item.id}`);
      }
      return sum + item.price * item.quantity;
    }, 0);

    // Create line items for Stripe
    const lineItems = items.map((item) => {
      const product = products.find((p: Products) => p.id === item.id);
      if (!product) {
        throw new Error(`Product not found: ${item.id}`);
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
    const stripeSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${baseUrl}/ecommerce/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/ecommerce/cart`,
    });

    // Create order in pending state
    const order = await xata.db.orders.create({
      user_id: session.user.id,
      status: "pending",
      total_amount: total,
      shipping_amount: 0,
      tax_amount: 0,
      meta: {
        stripe_session_id: stripeSession.id,
        stripe_payment_intent: stripeSession.payment_intent,
      },
    });

    // Create order items
    await Promise.all(
      items.map((item) => {
        const product = products.find((p: Products) => p.id === item.id);
        if (!product) throw new Error(`Product not found: ${item.id}`);

        return xata.db.order_items.create({
          order_id: order.id,
          product_id: item.id,
          quantity: item.quantity,
          price_at_time: item.price,
          subtotal: item.price * item.quantity,
        });
      })
    );

    return NextResponse.json({ url: stripeSession.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return new NextResponse(
      error instanceof Error ? error.message : "Internal server error",
      { status: 500 }
    );
  }
}

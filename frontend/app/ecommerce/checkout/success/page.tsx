"use client";

import { useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useCart } from "@/lib/cart-context";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export const runtime = "edge";

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { clearCart } = useCart();
  const hasCleared = useRef(false);

  useEffect(() => {
    if (hasCleared.current) return;

    const sessionId = searchParams?.get("session_id");
    if (sessionId) {
      clearCart();
      hasCleared.current = true;
    }
  }, [searchParams, clearCart]);

  return (
    <div className="container mx-auto px-4 py-24">
      <div className="max-w-2xl mx-auto text-center">
        <div className="gnome-card">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-4">Thank you for your order!</h1>
          <p className="text-gray-600 mb-8">
            Your payment was successful and your order has been confirmed.
            We&apos;ll send you an email with your order details shortly.
          </p>
          <div className="space-y-4">
            <Button
              onClick={() => router.push("/ecommerce/browse")}
              className="bg-gnome-blue hover:bg-gnome-blue/90 text-white"
            >
              Continue Shopping
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

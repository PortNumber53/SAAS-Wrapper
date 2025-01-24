"use client";

import { useEffect, useState } from "react";
import { redirect } from "next/navigation";
import { useSession } from "next-auth/react";
import { getStoredIntegrationStatus } from "@/lib/integration-utils";
import { usePageTitle } from "@/lib/page-title-context";
import { ShoppingCart } from "lucide-react";

export const runtime = "edge";

export default function EcommercePage() {
  const { data: session } = useSession();
  const [isStripeEnabled, setIsStripeEnabled] = useState(false);
  const { setPageTitle } = usePageTitle();

  useEffect(() => {
    setIsStripeEnabled(getStoredIntegrationStatus().stripe || false);
    setPageTitle("E-commerce Overview", ShoppingCart);
  }, [setPageTitle]);

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="gnome-header">E-commerce Overview</h1>
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="gnome-card">
          <h2 className="text-lg font-medium text-gnome-dark dark:text-white mb-2">
            Products
          </h2>
          <p className="text-gnome-dark/70 dark:text-white/70 mb-4">
            Manage your products and inventory
          </p>
          <a
            href="/account/ecommerce/products"
            className="text-gnome-blue hover:text-gnome-blue/90"
          >
            View Products →
          </a>
        </div>

        <div className="gnome-card">
          <h2 className="text-lg font-medium text-gnome-dark dark:text-white mb-2">
            Orders
          </h2>
          <p className="text-gnome-dark/70 dark:text-white/70 mb-4">
            View and manage customer orders
          </p>
          <a
            href="/account/ecommerce/orders"
            className="text-gnome-blue hover:text-gnome-blue/90"
          >
            View Orders →
          </a>
        </div>

        {isStripeEnabled ? (
          <div className="gnome-card">
            <h2 className="text-lg font-medium text-gnome-dark dark:text-white mb-2">
              Stripe Dashboard
            </h2>
            <p className="text-gnome-dark/70 dark:text-white/70 mb-4">
              View your Stripe payments and analytics
            </p>
            <a
              href="https://dashboard.stripe.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gnome-blue hover:text-gnome-blue/90"
            >
              Open Stripe →
            </a>
          </div>
        ) : (
          <div className="gnome-card">
            <h2 className="text-lg font-medium text-gnome-dark dark:text-white mb-2">
              Enable Payments
            </h2>
            <p className="text-gnome-dark/70 dark:text-white/70 mb-4">
              Connect Stripe to start accepting payments
            </p>
            <a
              href="/account/integrations"
              className="text-gnome-blue hover:text-gnome-blue/90"
            >
              Setup Stripe →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

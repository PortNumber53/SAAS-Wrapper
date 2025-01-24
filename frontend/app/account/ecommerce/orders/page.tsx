"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { usePageTitle } from "@/lib/page-title-context";
import { ShoppingBag } from "lucide-react";

export const runtime = "edge";

export default function OrdersPage() {
  const { data: session } = useSession();
  const { setPageTitle } = usePageTitle();

  useEffect(() => {
    setPageTitle("Orders Management", ShoppingBag);
  }, [setPageTitle]);

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="gnome-header">Orders</h1>
      <div className="gnome-card">
        <p className="text-gnome-dark/70 dark:text-white/70">
          Manage and track your orders.
        </p>
        {/* TODO: Add orders management components */}
      </div>
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ShoppingCartIcon, PackageIcon, ReceiptIcon } from "lucide-react";
import { signOut } from "@/app/auth";

export const runtime = "edge";

export default function EcommercePage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    console.log("Ecommerce Page Session Status:", status);
    console.log("Ecommerce Page Session Data:", session);

    if (status === "unauthenticated") {
      console.log("No session found, redirecting to login");
      router.push("/login");
    }
  }, [status, session, router]);

  const handleSignOut = async () => {
    try {
      await signOut({ redirect: true, redirectTo: "/login" });
    } catch (error) {
      console.error("Sign out failed:", error);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex justify-center items-center h-screen">
        Loading...
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="gnome-header flex items-center">
          <ShoppingCartIcon className="mr-3 w-8 h-8 text-gnome-blue" />
          E-commerce Dashboard
        </h1>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="gnome-card hover:shadow-gnome transition-all duration-200">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gnome-dark dark:text-white">
              Total Products
            </h3>
            <PackageIcon className="w-6 h-6 text-gnome-blue" />
          </div>
          <p className="text-3xl font-bold text-gnome-blue mt-2">42</p>
        </div>
        <div className="gnome-card hover:shadow-gnome transition-all duration-200">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gnome-dark dark:text-white">
              Total Sales
            </h3>
            <ReceiptIcon className="w-6 h-6 text-gnome-green" />
          </div>
          <p className="text-3xl font-bold text-gnome-green mt-2">$12,345</p>
        </div>
        <div className="gnome-card hover:shadow-gnome transition-all duration-200">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gnome-dark dark:text-white">
              Pending Orders
            </h3>
            <ShoppingCartIcon className="w-6 h-6 text-gnome-yellow" />
          </div>
          <p className="text-3xl font-bold text-gnome-yellow mt-2">7</p>
        </div>
      </div>
    </div>
  );
}

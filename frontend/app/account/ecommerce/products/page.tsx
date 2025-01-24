"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { usePageTitle } from "@/lib/page-title-context";
import { Package } from "lucide-react";
import { getProducts } from "./actions";
import ProductManagementClient from "./ProductManagementClient";
import type { Product } from "./types";

export const runtime = "edge";

export default function ProductsPage() {
  const { data: session } = useSession();
  const { setPageTitle } = usePageTitle();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setPageTitle("Products", Package);
  }, [setPageTitle]);

  useEffect(() => {
    if (session) {
      loadProducts();
    }
  }, [session]);

  if (!session) {
    redirect("/login");
  }

  const loadProducts = async () => {
    try {
      setIsLoading(true);
      const data = await getProducts();
      setProducts(data);
    } catch (error) {
      console.error("Error loading products:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <ProductManagementClient products={products} />
    </div>
  );
}

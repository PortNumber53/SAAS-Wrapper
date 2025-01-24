"use client";

import { ShoppingCart } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { useEffect, useState } from "react";
import type { Product } from "@/app/account/ecommerce/products/types";
import { notFound } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import { getXataClient } from "@/lib/xata";
import { auth } from "@/app/auth";

export const runtime = "edge";

const xata = getXataClient();

async function getProduct(id: string): Promise<Product | null> {
  const response = await fetch(`/api/products/${id}`);
  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    throw new Error("Failed to fetch product");
  }
  return response.json();
}

export default function ProductPage({ params }: { params: { id: string } }) {
  const { addItem } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    async function loadProduct() {
      try {
        const fetchedProduct = await getProduct(params.id);
        if (!fetchedProduct) {
          notFound();
        }
        setProduct(fetchedProduct);
      } catch (error) {
        console.error("Error loading product:", error);
        notFound();
      } finally {
        setIsLoading(false);
      }
    }

    loadProduct();
  }, [params.id]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-24">
        <div className="max-w-4xl mx-auto">
          <div className="gnome-card">
            <div className="animate-pulse">
              <div className="h-8 w-1/3 bg-gray-200 rounded mb-4" />
              <div className="h-4 w-2/3 bg-gray-200 rounded mb-2" />
              <div className="h-4 w-1/2 bg-gray-200 rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return notFound();
  }

  const handleAddToCart = () => {
    if (!product) return;

    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
    });

    toast({
      title: "Added to cart",
      description: `${product.name} has been added to your cart.`,
      variant: "default",
      duration: 3000,
      action: (
        <button
          type="button"
          onClick={() => router.push("/ecommerce/cart")}
          className="bg-gnome-blue hover:bg-gnome-blue/90 text-white px-3 py-2 rounded-md text-sm"
        >
          View Cart
        </button>
      ),
    });
  };

  return (
    <div className="container mx-auto px-4 py-24">
      <div className="max-w-4xl mx-auto">
        <div className="gnome-card">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <h1 className="text-2xl font-bold text-gnome-dark dark:text-white">
                {product.name}
              </h1>

              <div className="prose dark:prose-invert">
                <p className="text-gnome-dark/70 dark:text-white/70">
                  {product.description || "No description available."}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-3xl font-bold text-gnome-dark dark:text-white">
                    ${product.price.toFixed(2)}
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gnome-dark/60 dark:text-white/60">
                    Stock:
                  </span>
                  <span
                    className={`text-sm font-medium ${
                      product.inventory_count > 0
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {product.inventory_count > 0
                      ? `${product.inventory_count} available`
                      : "Out of stock"}
                  </span>
                </div>
              </div>

              {product.inventory_count > 0 && (
                <div className="pt-4">
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    className="w-full bg-gnome-blue hover:bg-gnome-blue/90 text-white font-medium py-3 px-6 rounded-md transition-colors flex items-center justify-center space-x-2"
                  >
                    <ShoppingCart className="h-5 w-5" />
                    <span>Add to Cart</span>
                  </button>
                </div>
              )}
            </div>

            <div className="bg-gnome-dark/5 dark:bg-white/5 rounded-lg p-6">
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gnome-dark dark:text-white">
                  Product Details
                </h2>

                <dl className="space-y-2">
                  {product.sku && (
                    <div className="flex justify-between">
                      <dt className="text-sm text-gnome-dark/60 dark:text-white/60">
                        SKU
                      </dt>
                      <dd className="text-sm text-gnome-dark dark:text-white">
                        {product.sku}
                      </dd>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <dt className="text-sm text-gnome-dark/60 dark:text-white/60">
                      Category
                    </dt>
                    <dd className="text-sm text-gnome-dark dark:text-white">
                      General
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

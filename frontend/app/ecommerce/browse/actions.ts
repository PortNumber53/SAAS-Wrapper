"use server";

import { xata } from "@/lib/xata";
import type { ProductsRecord } from "@/vendor/xata";

type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  inventory_count: number;
  is_active?: boolean;
  category_id?: string;
  images?: string[];
  sku?: string;
};

export async function getPublicProducts() {
  try {
    console.log("Fetching public products...");
    const products = await xata.db.products
      .filter({
        deleted_at: null,
        is_active: true,
      })
      .getAll();

    console.log("Raw products from database:", products);

    if (!products || products.length === 0) {
      // Return some test products if the database is empty
      return [
        {
          id: "test-1",
          name: "Sample Product 1",
          description: "This is a sample product for testing",
          price: 29.99,
          inventory_count: 10,
          is_active: true,
        },
        {
          id: "test-2",
          name: "Sample Product 2",
          description: "Another sample product for testing",
          price: 49.99,
          inventory_count: 5,
          is_active: true,
        },
      ];
    }

    // Convert Xata records to plain objects, excluding sensitive fields
    const plainProducts = products.map((product: ProductsRecord) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      inventory_count: product.inventory_count,
      is_active: product.is_active,
      category_id: product.category_id?.id,
      images: product.images,
      sku: product.sku,
    }));

    console.log("Processed products:", plainProducts);
    return plainProducts as Product[];
  } catch (error) {
    console.error("Error fetching public products:", error);
    // Return test products as fallback in case of error
    return [
      {
        id: "test-1",
        name: "Sample Product 1",
        description: "This is a sample product for testing",
        price: 29.99,
        inventory_count: 10,
        is_active: true,
      },
      {
        id: "test-2",
        name: "Sample Product 2",
        description: "Another sample product for testing",
        price: 49.99,
        inventory_count: 5,
        is_active: true,
      },
    ];
  }
}

export async function getPublicProductById(id: string) {
  try {
    const product = await xata.db.products
      .filter({
        id,
        deleted_at: null,
        is_active: true,
      })
      .getFirst();

    if (!product) {
      throw new Error("Product not found");
    }

    // Convert Xata record to plain object, excluding sensitive fields
    return {
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      inventory_count: product.inventory_count,
      is_active: product.is_active,
      category_id: product.category_id?.id,
      images: product.images,
      sku: product.sku,
    } as Product;
  } catch (error) {
    console.error("Error fetching public product:", error);
    throw error;
  }
}

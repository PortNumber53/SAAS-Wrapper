"use server";

import { xata } from "@/lib/xata";
import { auth } from "@/app/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ProductsRecord } from "@/vendor/xata";
import { getXataClient } from "@/lib/xata";
import type { Product } from "./types";

type ProductMeta = {
  stripe_price_id?: string;
  [key: string]: string | undefined;
};

// Product validation schema
const ProductSchema = z.object({
  name: z
    .string()
    .min(2, { message: "Name must be at least 2 characters long" })
    .max(100, { message: "Name cannot exceed 100 characters" }),
  description: z.string().optional(),
  price: z
    .number()
    .min(0, { message: "Price must be a positive number" })
    .max(1000000, { message: "Price is too high" }),
  inventory_count: z
    .number()
    .int()
    .min(0, { message: "Inventory count must be a non-negative integer" })
    .max(10000, { message: "Inventory count is too high" }),
  stripe_price_id: z.string().optional(),
});

// Validation function
function validateProductData(formData: FormData) {
  const validationResult = ProductSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    price: Number(formData.get("price")),
    inventory_count: Number(formData.get("inventory_count")),
    stripe_price_id: formData.get("stripe_price_id")?.toString() || undefined,
  });

  if (!validationResult.success) {
    const errors = validationResult.error.errors.map((err) => ({
      field: err.path[0],
      message: err.message,
    }));

    throw new Error(JSON.stringify(errors));
  }

  return validationResult.data;
}

const xataClient = getXataClient();

export async function getProducts(): Promise<Product[]> {
  const records = await xata.db.products
    .filter({
      deleted_at: null,
    })
    .getAll();

  return records.map((record: ProductsRecord) => ({
    id: record.id,
    name: record.name || "",
    description: record.description || "",
    price: record.price || 0,
    inventory_count: record.inventory_count || 0,
    is_active: record.is_active ?? false,
    category_id: record.category_id,
    images: record.images,
    sku: record.sku,
    meta: record.meta
      ? {
          stripe_price_id: record.meta.stripe_price_id,
          ...record.meta,
        }
      : undefined,
  }));
}

export async function createProduct(data: {
  name: string;
  description?: string;
  price: number;
  inventory_count: number;
  sku?: string;
  meta?: ProductMeta;
}) {
  const session = await auth();

  if (!session) {
    throw new Error("Unauthorized");
  }

  try {
    const record = await xataClient.db.products.create({
      ...data,
      is_active: true,
    });

    // Convert to plain object
    const meta = record.meta || {};
    return {
      id: record.id,
      name: record.name || "",
      description: record.description || "",
      price: record.price || 0,
      inventory_count: record.inventory_count || 0,
      meta: {
        ...meta,
        stripe_price_id: meta.stripe_price_id || "",
      },
      is_active: record.is_active || false,
      sku: record.sku || "",
    };
  } catch (error) {
    console.error("Error creating product:", error);
    throw error;
  }
}

export async function updateProduct(
  id: string,
  data: {
    name?: string;
    description?: string;
    price?: number;
    inventory_count?: number;
    is_active?: boolean;
    sku?: string;
    meta?: ProductMeta;
  }
) {
  const session = await auth();

  if (!session) {
    throw new Error("Unauthorized");
  }

  try {
    const record = await xataClient.db.products.update(id, data);
    if (!record) throw new Error("Product not found");

    // Convert to plain object
    const meta = record.meta || {};
    return {
      id: record.id,
      name: record.name || "",
      description: record.description || "",
      price: record.price || 0,
      inventory_count: record.inventory_count || 0,
      meta: {
        ...meta,
        stripe_price_id: meta.stripe_price_id || "",
      },
      is_active: record.is_active || false,
      sku: record.sku || "",
    };
  } catch (error) {
    console.error("Error updating product:", error);
    throw error;
  }
}

export async function deleteProduct(id: string) {
  const session = await auth();

  if (!session) {
    throw new Error("Unauthorized");
  }

  try {
    await xataClient.db.products.update(id, {
      deleted_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error deleting product:", error);
    throw error;
  }
}

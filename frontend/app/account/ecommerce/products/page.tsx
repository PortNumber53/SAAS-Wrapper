import { auth } from "@/app/auth";
import { redirect } from "next/navigation";
import ProductManagementClient from "./ProductManagementClient";
import { getProducts } from "./actions";
import type { Product } from "./types"; // We'll create this file next

export const runtime = "edge";

export default async function ProductManagementPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  try {
    const products = await getProducts();

    if (!Array.isArray(products)) {
      console.error("Products is not an array:", products);
      return <ProductManagementClient products={[]} />;
    }

    return <ProductManagementClient products={products} />;
  } catch (error) {
    console.error("Failed to fetch products:", error);
    return <ProductManagementClient products={[]} />;
  }
}

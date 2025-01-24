import { getXataClient } from "@/lib/xata";
import { NextResponse } from "next/server";

const xata = getXataClient();

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const product = await xata.db.products
      .filter({
        xata_id: params.id,
        deleted_at: null,
        is_active: true,
      })
      .getFirst();

    if (!product) {
      return new NextResponse(null, { status: 404 });
    }

    return NextResponse.json({
      id: product.id,
      name: product.name || "",
      description: product.description || "",
      price: product.price || 0,
      inventory_count: product.inventory_count || 0,
      is_active: product.is_active || false,
      sku: product.sku || "",
      meta: product.meta,
    });
  } catch (error) {
    console.error("Error fetching product:", error);
    return new NextResponse(null, { status: 500 });
  }
}

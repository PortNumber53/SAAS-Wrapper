"use server";

import { auth } from "@/app/auth";
import { xata } from "@/lib/xata";
import type { OrdersRecord, OrderItemsRecord } from "@/vendor/xata";

export async function getOrders() {
  const session = await auth();
  if (!session) {
    throw new Error("Unauthorized");
  }

  // Get all orders for the current user
  const orders = await xata.db.orders
    .filter({
      user_id: session.user.id,
    })
    .sort("xata_createdat", "desc")
    .getAll();

  // Get order items for each order
  const ordersWithItems = await Promise.all(
    orders.map(async (order: OrdersRecord) => {
      const items = await xata.db.order_items
        .filter({
          order_id: order.id,
        })
        .select(["*", "product_id.*"])
        .getAll();

      return {
        id: order.id,
        status: order.status || "pending",
        total_amount: order.total_amount || 0,
        shipping_amount: order.shipping_amount || 0,
        tax_amount: order.tax_amount || 0,
        created_at: order.getMetadata().createdAt.toISOString(),
        payment_method: order.payment_method || null,
        meta: order.meta || {},
        items: items.map(
          (item: OrderItemsRecord & { product_id: { name: string } }) => ({
            id: item.id,
            product_id: item.product_id?.id || "",
            product_name: item.product_id?.name || "Unknown Product",
            quantity: item.quantity || 0,
            price_at_time: item.price_at_time || 0,
            subtotal: item.subtotal || 0,
          })
        ),
      };
    })
  );

  return ordersWithItems;
}

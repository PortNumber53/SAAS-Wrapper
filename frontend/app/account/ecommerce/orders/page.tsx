"use client";

import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const runtime = "edge";

interface Order {
  id: string;
  createdAt: string;
  customerEmail: string;
  status: "pending" | "processing" | "completed" | "cancelled";
  total: number;
}

interface ApiResponse {
  orders: Order[];
  error?: string;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await fetch("/api/ecommerce/orders");
        if (!response.ok) {
          throw new Error("Failed to fetch orders");
        }
        const result = await response.json();
        const data = result as ApiResponse;

        if (data.error) {
          throw new Error(data.error);
        }

        if (!data.orders || !Array.isArray(data.orders)) {
          throw new Error("Invalid response format");
        }

        setOrders(data.orders);
      } catch (error) {
        console.error("Error fetching orders:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, []);

  return (
    <div className="container mx-auto py-6">
      <h1 className="gnome-header mb-6">Orders</h1>
      <div className="gnome-card">
        {isLoading ? (
          <div className="flex justify-center py-8 text-gnome-dark/70 dark:text-white/70">
            Loading orders...
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-b border-gnome-dark/10 dark:border-white/10 hover:bg-gnome-dark/5 dark:hover:bg-white/5">
                <TableHead className="text-gnome-dark dark:text-white">
                  Order ID
                </TableHead>
                <TableHead className="text-gnome-dark dark:text-white">
                  Date
                </TableHead>
                <TableHead className="text-gnome-dark dark:text-white">
                  Customer
                </TableHead>
                <TableHead className="text-gnome-dark dark:text-white">
                  Status
                </TableHead>
                <TableHead className="text-right text-gnome-dark dark:text-white">
                  Total
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-gnome-dark/70 dark:text-white/70"
                  >
                    No orders found
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => (
                  <TableRow
                    key={order.id}
                    className="border-b border-gnome-dark/10 dark:border-white/10 hover:bg-gnome-dark/5 dark:hover:bg-white/5"
                  >
                    <TableCell className="font-medium text-gnome-dark dark:text-white">
                      {order.id}
                    </TableCell>
                    <TableCell className="text-gnome-dark/70 dark:text-white/70">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-gnome-dark dark:text-white">
                      {order.customerEmail}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
                          order.status === "completed"
                            ? "bg-gnome-green/10 text-gnome-green"
                            : order.status === "processing"
                            ? "bg-gnome-blue/10 text-gnome-blue"
                            : order.status === "cancelled"
                            ? "bg-gnome-red/10 text-gnome-red"
                            : "bg-gnome-yellow/10 text-gnome-yellow"
                        }`}
                      >
                        {order.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium text-gnome-dark dark:text-white">
                      ${order.total.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

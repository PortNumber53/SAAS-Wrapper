"use client";

import { ShoppingCart, Trash2, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart-context";
import { Input } from "@/components/ui/input";

export const runtime = "edge";

export default function CartPage() {
  const router = useRouter();
  const { items, removeItem, updateQuantity, toggleSaveForLater, getSubtotal } =
    useCart();

  const cartItems = items.filter((item) => !item.savedForLater);
  const savedItems = items.filter((item) => item.savedForLater);
  const subtotal = getSubtotal();

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-24">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center mb-8">
            <ShoppingCart className="h-6 w-6 mr-2" />
            <h1 className="text-2xl font-bold">Shopping Cart</h1>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2">
              <div className="gnome-card divide-y">
                <div className="py-12 text-center">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium mb-2">
                    Your cart is empty
                  </h3>
                  <p className="text-gray-500 mb-6">
                    Add some products to your cart to see them here.
                  </p>
                  <Button
                    onClick={() => router.push("/ecommerce/browse")}
                    className="bg-gnome-blue hover:bg-gnome-blue/90 text-white"
                  >
                    Browse Products
                  </Button>
                </div>
              </div>
            </div>

            <div className="md:col-span-1">
              <div className="gnome-card">
                <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>$0.00</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Shipping</span>
                    <span>Calculated at checkout</span>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex justify-between font-semibold">
                      <span>Total</span>
                      <span>$0.00</span>
                    </div>
                  </div>
                </div>
                <Button
                  className="w-full mt-6 bg-gnome-blue hover:bg-gnome-blue/90 text-white"
                  disabled={true}
                >
                  Proceed to Checkout
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-24">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center mb-8">
          <ShoppingCart className="h-6 w-6 mr-2" />
          <h1 className="text-2xl font-bold">Shopping Cart</h1>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <div className="gnome-card divide-y">
              {cartItems.map((item) => (
                <div key={item.id} className="py-6 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium">{item.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        ${item.price.toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            updateQuantity(
                              item.id,
                              Number.parseInt(e.target.value, 10)
                            )
                          }
                          className="w-16 text-center"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleSaveForLater(item.id)}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          <Heart className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(item.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="md:col-span-1">
            <div className="gnome-card">
              <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Shipping</span>
                  <span>Calculated at checkout</span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              <Button
                className="w-full mt-6 bg-gnome-blue hover:bg-gnome-blue/90 text-white"
                disabled={cartItems.length === 0}
                onClick={() => router.push("/ecommerce/checkout")}
              >
                Proceed to Checkout
              </Button>
            </div>

            {savedItems.length > 0 && (
              <div className="mt-4 gnome-card bg-gnome-dark/5 dark:bg-white/5">
                <h3 className="text-sm font-medium mb-4">Saved for Later</h3>
                <div className="space-y-4">
                  {savedItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-gray-500">
                          ${item.price.toFixed(2)}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleSaveForLater(item.id)}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          Move to Cart
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(item.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

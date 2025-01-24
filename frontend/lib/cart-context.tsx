"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useState, useEffect } from "react";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  savedForLater?: boolean;
}

type CartContextType = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity" | "savedForLater">) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  toggleSaveForLater: (id: string) => void;
  clearCart: () => void;
  getSubtotal: () => number;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [shouldSave, setShouldSave] = useState(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem("cart");
    if (savedCart) {
      try {
        setItems(JSON.parse(savedCart));
      } catch (e) {
        console.error("Error loading cart from localStorage:", e);
      }
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (shouldSave) {
      localStorage.setItem("cart", JSON.stringify(items));
      setShouldSave(false);
    }
  }, [items, shouldSave]);

  const addItem = (newItem: Omit<CartItem, "quantity" | "savedForLater">) => {
    setItems((currentItems) => {
      const existingItem = currentItems.find((item) => item.id === newItem.id);

      if (existingItem) {
        // Increment quantity if item already exists
        return currentItems.map((item) =>
          item.id === newItem.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      // Add new item with quantity 1
      return [
        ...currentItems,
        { ...newItem, quantity: 1, savedForLater: false },
      ];
    });
    setShouldSave(true);
  };

  const removeItem = (id: string) => {
    setItems((currentItems) => currentItems.filter((item) => item.id !== id));
    setShouldSave(true);
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity < 1) return;
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === id ? { ...item, quantity } : item
      )
    );
    setShouldSave(true);
  };

  const toggleSaveForLater = (id: string) => {
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === id ? { ...item, savedForLater: !item.savedForLater } : item
      )
    );
    setShouldSave(true);
  };

  const clearCart = () => {
    setItems([]);
    localStorage.removeItem("cart");
  };

  const getSubtotal = () => {
    return items
      .filter((item) => !item.savedForLater)
      .reduce((total, item) => total + item.price * item.quantity, 0);
  };

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        toggleSaveForLater,
        clearCart,
        getSubtotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { Product, CartItem, AuditEntry } from '@/types';
import { localDb, isLocalMode } from '@/lib/supabase';

interface CartContextValue {
  items: CartItem[];
  auditLog: AuditEntry[];
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  cartCount: number;
  cartSubtotal: number;
  addAuditEntry: (entry: Omit<AuditEntry, 'id' | 'timestamp'>) => void;
  clearAuditLog: () => void;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);

  const addAuditEntry = useCallback((entry: Omit<AuditEntry, 'id' | 'timestamp'>) => {
    const fullEntry: AuditEntry = {
      ...entry,
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
    };
    setAuditLog((prev) => [...prev, fullEntry]);

    // Also log to local database if in local mode
    if (isLocalMode()) {
      localDb.createAuditLog({
        action: fullEntry.action,
        description: fullEntry.description,
        status: fullEntry.status,
        amount: fullEntry.amount,
        details: fullEntry.details,
      });
    }
  }, []);

  const addToCart = useCallback((product: Product, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { product, quantity }];
    });
    addAuditEntry({
      action: 'ADD_TO_CART',
      description: `Added "${product.title}" (qty: ${quantity}) to cart`,
      amount: product.price * quantity,
      status: 'success',
      details: { productId: product.id, quantity, price: product.price },
    });
  }, [addAuditEntry]);

  const removeFromCart = useCallback((productId: string) => {
    setItems((prev) => {
      const item = prev.find((i) => i.product.id === productId);
      if (item) {
        addAuditEntry({
          action: 'REMOVE_FROM_CART',
          description: `Removed "${item.product.title}" from cart`,
          status: 'success',
          details: { productId },
        });
      }
      return prev.filter((item) => item.product.id !== productId);
    });
  }, [addAuditEntry]);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  }, [removeFromCart]);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const clearAuditLog = useCallback(() => {
    setAuditLog([]);
  }, []);

  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const cartSubtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        auditLog,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartCount,
        cartSubtotal,
        addAuditEntry,
        clearAuditLog,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}

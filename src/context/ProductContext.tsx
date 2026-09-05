import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { Product } from '@/types';
import { placeholderProducts } from '@/data/products';

interface ProductContextValue {
  products: Product[];
  addProducts: (newProducts: Product[]) => void;
  getProductById: (id: string) => Product | undefined;
  searchProducts: (query: string, category?: string) => Product[];
  getProductsByCategory: (category: string) => Product[];
  getDeals: () => Product[];
}

const ProductContext = createContext<ProductContextValue | undefined>(undefined);

export function ProductProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(placeholderProducts);

  const addProducts = useCallback((newProducts: Product[]) => {
    setProducts((prev) => {
      const existingIds = new Set(prev.map((p) => p.id));
      const unique = newProducts.filter((p) => !existingIds.has(p.id));
      return [...unique, ...prev];
    });
  }, []);

  const getProductById = useCallback((id: string) => {
    return products.find((p) => p.id === id);
  }, [products]);

  const searchProducts = useCallback((query: string, category?: string) => {
    const lower = query.toLowerCase();
    return products.filter((p) => {
      const matchesQuery = query
        ? p.title.toLowerCase().includes(lower) ||
          p.category.toLowerCase().includes(lower) ||
          (p.brand?.toLowerCase().includes(lower) ?? false)
        : true;
      const matchesCategory = !category || category === 'All' || p.category === category;
      return matchesQuery && matchesCategory;
    });
  }, [products]);

  const getProductsByCategory = useCallback((category: string) => {
    return products.filter((p) => p.category === category);
  }, [products]);

  const getDeals = useCallback(() => {
    return products.filter((p) => p.originalPrice && p.originalPrice > p.price);
  }, [products]);

  return (
    <ProductContext.Provider
      value={{ products, addProducts, getProductById, searchProducts, getProductsByCategory, getDeals }}
    >
      {children}
    </ProductContext.Provider>
  );
}

export function useProducts() {
  const ctx = useContext(ProductContext);
  if (!ctx) throw new Error('useProducts must be used within ProductProvider');
  return ctx;
}

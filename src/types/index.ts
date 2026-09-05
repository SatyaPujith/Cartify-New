export interface Product {
  id: string;
  title: string;
  price: number;
  originalPrice?: number;
  rating: number;
  reviewCount: number;
  image: string;
  images?: string[];
  category: string;
  brand?: string;
  prime: boolean;
  inStock: boolean;
  description?: string;
  features?: string[];
  url?: string;
  source?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface AgentIntent {
  rawInput: string;
  action: string;
  category?: string;
  budget?: number;
  keywords?: string[];
  recipient?: string;
  occasion?: string;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  action: string;
  description: string;
  amount?: number;
  status: 'pending' | 'success' | 'failed' | 'cancelled';
  details?: Record<string, unknown>;
}

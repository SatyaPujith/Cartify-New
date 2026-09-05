// Simple local database mock for development
// This replaces Supabase database calls when running locally

interface Order {
  id: string;
  razorpay_order_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'failed';
  agent_intent?: string;
  created_at: string;
  updated_at: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
}

interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  title: string;
  price: number;
  quantity: number;
  image?: string;
  source?: string;
}

interface AuditLog {
  id: string;
  action: string;
  description: string;
  status: 'success' | 'failed' | 'pending';
  amount?: number;
  details?: any;
  created_at: string;
}

class LocalDatabase {
  private orders: Order[] = [];
  private orderItems: OrderItem[] = [];
  private auditLogs: AuditLog[] = [];

  // Orders
  createOrder(orderData: Omit<Order, 'id' | 'created_at' | 'updated_at'>): Order {
    const order: Order = {
      ...orderData,
      id: `local_order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.orders.push(order);
    return order;
  }

  updateOrder(razorpay_order_id: string, updates: Partial<Order>): Order | null {
    const index = this.orders.findIndex(o => o.razorpay_order_id === razorpay_order_id);
    if (index === -1) return null;
    
    this.orders[index] = {
      ...this.orders[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    return this.orders[index];
  }

  getOrder(razorpay_order_id: string): Order | null {
    return this.orders.find(o => o.razorpay_order_id === razorpay_order_id) || null;
  }

  // Order Items
  createOrderItems(items: Omit<OrderItem, 'id'>[]): OrderItem[] {
    const createdItems = items.map(item => ({
      ...item,
      id: `local_item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    }));
    this.orderItems.push(...createdItems);
    return createdItems;
  }

  getOrderItems(order_id: string): OrderItem[] {
    return this.orderItems.filter(item => item.order_id === order_id);
  }

  // Audit Logs
  createAuditLog(logData: Omit<AuditLog, 'id' | 'created_at'>): AuditLog {
    const log: AuditLog = {
      ...logData,
      id: `local_log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString(),
    };
    this.auditLogs.push(log);
    return log;
  }

  getAuditLogs(limit = 50): AuditLog[] {
    return this.auditLogs
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit);
  }

  // Utility methods
  clear(): void {
    this.orders = [];
    this.orderItems = [];
    this.auditLogs = [];
  }

  getStats() {
    return {
      orders: this.orders.length,
      orderItems: this.orderItems.length,
      auditLogs: this.auditLogs.length,
      paidOrders: this.orders.filter(o => o.status === 'paid').length,
      totalRevenue: this.orders
        .filter(o => o.status === 'paid')
        .reduce((sum, o) => sum + o.amount, 0),
    };
  }
}

// Singleton instance
export const localDb = new LocalDatabase();

// Helper to check if we're in local mode
export const isLocalMode = () => {
  return import.meta.env.VITE_LOCAL_MODE === 'true' || import.meta.env.DEV;
};
import type { Product, AgentIntent } from '@/types';
import { getApiUrl, apiCall } from '@/config/api';

export interface AgentResponse {
  intent: AgentIntent;
  searchQuery: string;
  products: Product[];
  total: number;
  budget?: number;
  withinBudget: boolean;
  explanation: string;
}

export async function callAgent(prompt: string): Promise<AgentResponse> {
  const url = getApiUrl('aiAgent');
  const response = await apiCall(url, {
    method: 'POST',
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `Agent request failed (${response.status})`);
  }

  const data = await response.json();
  return data as AgentResponse;
}

export interface CreateOrderResponse {
  orderId: string;
  razorpayOrderId: string;
  amount: number;
  currency: string;
  keyId: string;
  mockMode?: boolean;
  message?: string;
}

export async function createRazorpayOrder(
  amount: number,
  cartItems: { id: string; title: string; price: number; quantity: number; image?: string; source?: string }[],
  agentIntent?: string
): Promise<CreateOrderResponse> {
  const url = getApiUrl('razorpayCreateOrder');
  const response = await apiCall(url, {
    method: 'POST',
    body: JSON.stringify({ amount, cartItems, agentIntent }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `Order creation failed (${response.status})`);
  }

  return response.json();
}

export async function verifyRazorpayPayment(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string,
  mockMode: boolean
): Promise<{ verified: boolean; orderId?: string; status: string; message?: string }> {
  const url = getApiUrl('razorpayVerifyPayment');
  const response = await apiCall(url, {
    method: 'POST',
    body: JSON.stringify({
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      mockMode,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `Payment verification failed (${response.status})`);
  }

  return response.json();
}

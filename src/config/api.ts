// API Configuration for local vs Supabase mode
const isLocalMode = import.meta.env.VITE_LOCAL_MODE === 'true' || import.meta.env.DEV;
const localApiUrl = import.meta.env.VITE_LOCAL_API_URL || 'http://localhost:3001';
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

export const API_CONFIG = {
  isLocalMode,
  baseUrl: isLocalMode ? localApiUrl : `${supabaseUrl}/functions/v1`,
  endpoints: {
    serpApi: isLocalMode ? '/api/serpapi-proxy' : '/serpapi-proxy',
    aiAgent: isLocalMode ? '/api/ai-agent' : '/ai-agent',
    razorpayCreateOrder: isLocalMode ? '/api/razorpay-checkout/create-order' : '/razorpay-checkout/create-order',
    razorpayVerifyPayment: isLocalMode ? '/api/razorpay-checkout/verify-payment' : '/razorpay-checkout/verify-payment',
  }
};

export const getApiUrl = (endpoint: keyof typeof API_CONFIG.endpoints): string => {
  return `${API_CONFIG.baseUrl}${API_CONFIG.endpoints[endpoint]}`;
};

// Helper function to make API calls with proper headers
export const apiCall = async (url: string, options: RequestInit = {}) => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add Supabase headers if not in local mode
  if (!API_CONFIG.isLocalMode) {
    headers['Authorization'] = `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`;
    headers['apikey'] = import.meta.env.VITE_SUPABASE_ANON_KEY;
  }

  return fetch(url, {
    ...options,
    headers,
  });
};
import type { Product } from '@/types';
import { getApiUrl, apiCall } from '@/config/api';

export interface SearchResponse {
  products: Product[];
  source: 'serpapi' | 'placeholder';
  query: string;
  message?: string;
}

export async function searchProducts(query: string, limit: number = 20): Promise<SearchResponse> {
  try {
    const url = getApiUrl('serpApi');
    const response = await apiCall(url, {
      method: 'POST',
      body: JSON.stringify({ query, num: limit }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Search failed' }));
      throw new Error(errorData.error || `Search request failed (${response.status})`);
    }

    const data = await response.json();
    return data as SearchResponse;
  } catch (error) {
    console.error('Search error:', error);
    
    // Return fallback mock data on error
    return {
      products: generateFallbackProducts(query, limit),
      source: 'placeholder',
      query,
      message: 'Using placeholder data - search service unavailable',
    };
  }
}

function generateFallbackProducts(query: string, limit: number): Product[] {
  const now = Date.now();
  const lowerQuery = query.toLowerCase();

  const fallbackProducts = [
    {
      id: `fallback_1_${now}`,
      title: `${query} - Premium Quality Item`,
      price: Math.floor(Math.random() * 1000) + 100,
      originalPrice: Math.floor(Math.random() * 1500) + 200,
      rating: 4.0 + Math.random(),
      reviewCount: Math.floor(Math.random() * 5000) + 100,
      image: 'https://images.unsplash.com/photo-1505740420928-5e560c3d4999?w=400',
      category: lowerQuery.includes('gift') ? 'Gifts' : 
                lowerQuery.includes('food') || lowerQuery.includes('biryani') ? 'Grocery' : 'General',
      brand: 'Premium Brand',
      prime: true,
      inStock: true,
      source: 'placeholder',
    },
    {
      id: `fallback_2_${now}`,
      title: `${query} - Best Seller`,
      price: Math.floor(Math.random() * 800) + 150,
      originalPrice: Math.floor(Math.random() * 1200) + 250,
      rating: 4.2 + Math.random() * 0.5,
      reviewCount: Math.floor(Math.random() * 3000) + 200,
      image: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400',
      category: lowerQuery.includes('gift') ? 'Gifts' : 
                lowerQuery.includes('food') || lowerQuery.includes('biryani') ? 'Grocery' : 'General',
      brand: 'Quality Brand',
      prime: true,
      inStock: true,
      source: 'placeholder',
    },
    {
      id: `fallback_3_${now}`,
      title: `${query} - Top Rated`,
      price: Math.floor(Math.random() * 600) + 200,
      originalPrice: Math.floor(Math.random() * 900) + 300,
      rating: 4.5 + Math.random() * 0.3,
      reviewCount: Math.floor(Math.random() * 2000) + 300,
      image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400',
      category: lowerQuery.includes('gift') ? 'Gifts' : 
                lowerQuery.includes('food') || lowerQuery.includes('biryani') ? 'Grocery' : 'General',
      brand: 'Top Brand',
      prime: true,
      inStock: true,
      source: 'placeholder',
    },
  ];

  return fallbackProducts.slice(0, limit);
}
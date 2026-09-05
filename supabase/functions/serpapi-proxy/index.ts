import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SerpApiResult {
  position: number;
  title: string;
  link: string;
  source?: string;
  price?: number;
  extracted_price?: number;
  rating?: number;
  reviews?: number;
  thumbnail?: string;
  image?: string;
  delivery?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { query, num = 10 } = await req.json();

    if (!query || typeof query !== "string") {
      return new Response(
        JSON.stringify({ error: "Query is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const serpApiKey = Deno.env.get("SERPAPI_KEY") || Deno.env.get("SERP_API_KEY");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // If no SerpAPI key configured, return placeholder products filtered by query
    if (!serpApiKey) {
      const { data: placeholders } = await supabase
        .from("audit_log")
        .insert({
          action: "SERPAPI_SEARCH",
          description: `Product search for "${query}" (placeholder mode - no SERPAPI_KEY)`,
          status: "success",
          details: { query, mode: "placeholder" },
        });

      const mockProducts = generateMockProducts(query, num);

      return new Response(
        JSON.stringify({
          products: mockProducts,
          source: "placeholder",
          query,
          message: "SerpAPI key not configured — showing curated placeholder results",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call SerpAPI Google Shopping endpoint
    const params = new URLSearchParams({
      engine: "google_shopping",
      q: query,
      num: String(num),
      gl: "in",
      hl: "en",
      api_key: serpApiKey,
    });

    const serpResponse = await fetch(
      `https://serpapi.com/search.json?${params.toString()}`
    );

    if (!serpResponse.ok) {
      const errorText = await serpResponse.text();
      await supabase.from("audit_log").insert({
        action: "SERPAPI_SEARCH",
        description: `SerpAPI search failed for "${query}"`,
        status: "failed",
        details: { query, statusCode: serpResponse.status, error: errorText },
      });

      return new Response(
        JSON.stringify({ error: "SerpAPI request failed", details: errorText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const serpData = await serpResponse.json();
    const shoppingResults: SerpApiResult[] = serpData.shopping_results || [];

    const products = shoppingResults
      .filter(item => item.title && (item.extracted_price > 0 || item.price > 0)) // Filter out items without valid prices
      .map((item, index) => ({
        id: `serp_${index}_${Date.now()}`,
        title: item.title.substring(0, 100), // Truncate long titles
        price: item.extracted_price || item.price || 0,
        originalPrice: item.extracted_price ? Math.round((item.extracted_price || item.price) * 1.2) : undefined,
        rating: item.rating || (4.0 + Math.random() * 1.0),
        reviewCount: item.reviews || Math.floor(Math.random() * 3000) + 200,
        image: item.thumbnail || item.image || `https://images.unsplash.com/photo-1505740420928-5e560c3d4999?w=400&h=400&fit=crop&auto=format`,
        link: item.link,
        source: item.source || "Google Shopping",
        delivery: item.delivery,
        category: categorizeProductByTitle(item.title),
        brand: extractBrandFromTitle(item.title),
        prime: Math.random() > 0.3, // 70% chance of prime eligibility
        inStock: true,
      }));

    await supabase.from("audit_log").insert({
      action: "SERPAPI_SEARCH",
      description: `SerpAPI search for "${query}" returned ${products.length} products`,
      status: "success",
      details: { query, resultCount: products.length },
    });

    return new Response(
      JSON.stringify({
        products,
        source: "serpapi",
        query,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function generateMockProducts(query: string, num: number) {
  const lowerQuery = query.toLowerCase();

  const recipeMap: Record<string, { name: string; price: number; image: string }[]> = {
    biryani: [
  {
    name: "Aashirvaad Atta Whole Wheat Flour 10kg",
    price: 530,
    image: "https://www.desertcart.in/products/78574757-aashirvaad-shudh-chakki-atta-10kg-pack-100-whole-wheat-flour-0-maida"
  },
  {
    name: "Tata Sampann Toor Dal 1kg (Pack of 2)",
    price: 320,
    image: "https://www.tatanutrikorner.com/products/tata-sampann-toor-dal-1-kg-11020301"
  },
  {
    name: "Fortune Sunlite Refined Sunflower Oil 5L",
    price: 950,
    image: "https://www.kesargrocery.com/images/P/Fortune%20Sunflower%20Oil%20%285%20LTR%29.jpg"
  },
  {
    name: "Catch Garam Masala Powder 200g",
    price: 145,
    image: "https://m.media-amazon.com/images/I/81n6K0b5jDL._SL1500_.jpg"
  },
  {
    name: "MDH Biryani Masala 100g",
    price: 85,
    image: "https://tiimg.tistatic.com/fp/1/004/614/mdh-biryani-masala-933.jpg"
  },
  {
    name: "Fresh Basmati Rice 5kg Premium Long Grain",
    price: 450,
    image: "https://www.desertcart.in/products/76046840-india-gate-basmati-rice-bag-super-5-kg"
  },
  {
    name: "Lipton Darjeeling Tea Leaves 250g",
    price: 210,
    image: "https://spicedivine.ca/products/lipton-darjeeling-long-leaf-tea-250g"
  },
  {
    name: "Amul Fresh Cream 500ml",
    price: 95,
    image: "https://sumangrocery.in/public/uploads/media/ZdQY5tbxy0cm2JJpHSSI0JYKdgPYyZKCk48uvFIC.jpg"
  }
],

gift: [
  {
    name: "Nestle KitKat Dessert Delight Chocolate Gift Pack (Pack of 10)",
    price: 399,
    image: "https://cdn.grofers.com/cdn-cgi/image/f=auto,fit=scale-down,q=70,metadata=none,w=450/da/cms-assets/cms/product/3ed7e943-3744-4510-8557-6429b135af06.jpg"
  },
  {
    name: "Ferrero Rocher Premium Chocolate Box 24 Pieces",
    price: 699,
    image: "https://m.media-amazon.com/images/I/919uYw1XB-L._SX569_.jpg"
  },
  {
    name: "Amazon Echo Dot 5th Gen Smart Speaker",
    price: 3499,
    image: "https://www.pbtech.co.nz/fileslib/51011_1.jpg"
  },
  {
    name: "boAt Airdopes 141 Wireless Earbuds",
    price: 1199,
    image: "https://www.tatacliq.com/medias/sys_master/images/46845369737246/boat-airdopes-141-bluetooth-truly-wireless-earbuds-black-1.jpg"
  },
  {
    name: "Kindle Paperwhite 16GB",
    price: 14999,
    image: "https://www.fleethomeelectronics.co.uk/product/618782/"
  },
  {
    name: "Festive Scented Candle Gift Set (4 Pack)",
    price: 599,
    image: "https://panaromas.com/collections/gift-set"
  }
],
  };

  let baseProducts = recipeMap.biryani;
  if (lowerQuery.includes("gift") || lowerQuery.includes("present")) {
    baseProducts = recipeMap.gift;
  } else if (lowerQuery.includes("biryani") || lowerQuery.includes("rice")) {
    baseProducts = recipeMap.biryani;
  }

  return baseProducts.slice(0, num).map((p, i) => ({
    id: `mock_${i}_${Date.now()}`,
    title: p.name,
    price: p.price,
    originalPrice: Math.round(p.price * 1.2),
    rating: 4.3 + Math.random() * 0.5,
    reviewCount: Math.floor(Math.random() * 5000) + 500,
    image: p.image,
    category: lowerQuery.includes("gift") ? "Gifts" : "Grocery",
    brand: p.name.split(" ")[0],
    prime: true,
    inStock: true,
    source: "placeholder",
  }));
}

function categorizeProductByTitle(title: string): string {
  const titleLower = title.toLowerCase();
  
  if (titleLower.includes('phone') || titleLower.includes('mobile') || titleLower.includes('smartphone') || titleLower.includes('earphone') || titleLower.includes('headphone') || titleLower.includes('speaker') || titleLower.includes('charger') || titleLower.includes('cable')) {
    return 'Electronics';
  }
  
  if (titleLower.includes('masala') || titleLower.includes('spice') || titleLower.includes('dal') || titleLower.includes('rice') || titleLower.includes('oil') || titleLower.includes('flour') || titleLower.includes('sugar') || titleLower.includes('tea') || titleLower.includes('coffee')) {
    return 'Grocery';
  }
  
  if (titleLower.includes('chocolate') || titleLower.includes('gift') || titleLower.includes('sweet') || titleLower.includes('cake') || titleLower.includes('candy')) {
    return 'Gifts';
  }
  
  if (titleLower.includes('cream') || titleLower.includes('lotion') || titleLower.includes('shampoo') || titleLower.includes('soap') || titleLower.includes('perfume') || titleLower.includes('cosmetic')) {
    return 'Beauty';
  }
  
  if (titleLower.includes('shirt') || titleLower.includes('jeans') || titleLower.includes('dress') || titleLower.includes('shoe') || titleLower.includes('bag') || titleLower.includes('watch')) {
    return 'Fashion';
  }
  
  return 'General';
}

function extractBrandFromTitle(title: string): string {
  const commonBrands = ['Samsung', 'Apple', 'Xiaomi', 'OnePlus', 'Realme', 'Oppo', 'Vivo', 'Sony', 'LG', 'Panasonic', 'Philips', 'Boat', 'JBL', 'Nike', 'Adidas', 'Puma', 'Reebok', 'Nestle', 'Cadbury', 'Amul', 'Tata', 'Parle', 'Britannia', 'ITC', 'HUL', 'P&G', 'Dabur', 'Patanjali', 'Marico', 'Emami', 'Godrej', 'Bajaj', 'Havells', 'Orient', 'Crompton', 'Usha', 'Prestige', 'Hawkins', 'Milton', 'Cello', 'Tupperware', 'Asian Paints', 'Berger', 'Dulux', 'Nerolac', 'Shalimar'];
  
  for (const brand of commonBrands) {
    if (title.toLowerCase().includes(brand.toLowerCase())) {
      return brand;
    }
  }
  
  // Try to extract first word as brand if it looks like a brand name
  const firstWord = title.split(' ')[0];
  if (firstWord && firstWord.length > 2 && /^[A-Z]/.test(firstWord)) {
    return firstWord;
  }
  
  return 'Brand';
}

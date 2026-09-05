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

    const products = shoppingResults.map((item, index) => ({
      id: `serp_${index}_${Date.now()}`,
      title: item.title,
      price: item.extracted_price || item.price || 0,
      rating: item.rating || 0,
      reviewCount: item.reviews || 0,
      image: item.thumbnail || item.image || "",
      link: item.link,
      source: item.source || "SerpAPI",
      delivery: item.delivery,
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
      { name: "Aashirvaad Atta Whole Wheat Flour 10kg", price: 530, image: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d0d44?w=400" },
      { name: "Tata Sampann Toor Dal 1kg (Pack of 2)", price: 320, image: "https://images.unsplash.com/photo-1599909635549-8f5c1e3e1d2e?w=400" },
      { name: "Fortune Sunlite Refined Sunflower Oil 5L", price: 950, image: "https://images.unsplash.com/photo-1620706857370-e1b977e2c83a?w=400" },
      { name: "Catch Garam Masala Powder 200g", price: 145, image: "https://images.unsplash.com/photo-1596040033229-a9821ebd05e5?w=400" },
      { name: "MDH Biryani Masala 100g", price: 85, image: "https://images.unsplash.com/photo-1596040033229-a9821ebd05e5?w=400" },
      { name: "Fresh Basmati Rice 5kg Premium Long Grain", price: 450, image: "https://images.unsplash.com/photo-1586201375761-8416509e8f5e?w=400" },
      { name: "Lipton Darjeeling Tea Leaves 250g", price: 210, image: "https://images.unsplash.com/photo-1597318181409-7f8b1d6f7e1c?w=400" },
      { name: "Amul Fresh Cream 500ml", price: 95, image: "https://images.unsplash.com/photo-1561272912-4111a5e4e0e4?w=400" },
    ],
    gift: [
      { name: "Nestle KitKat Dessert Delight Chocolate Gift Pack (Pack of 10)", price: 399, image: "https://images.unsplash.com/photo-1548901671-317b4f4a5e3f?w=400" },
      { name: "Ferrero Rocher Premium Chocolate Box 24 Pieces", price: 699, image: "https://images.unsplash.com/photo-1511381939415-e440483039b4?w=400" },
      { name: "Amazon Echo Dot 5th Gen Smart Speaker", price: 3499, image: "https://images.unsplash.com/photo-1543512214-318c7505f352?w=400" },
      { name: "boAt Airdopes 141 Wireless Earbuds", price: 1199, image: "https://images.unsplash.com/photo-1590646877753-0d1e3e6f1d2e?w=400" },
      { name: "Kindle Paperwhite 16GB", price: 14999, image: "https://images.unsplash.com/photo-1590682682525-670b4d3e1d0e?w=400" },
      { name: "Festive Scented Candle Gift Set (4 Pack)", price: 599, image: "https://images.unsplash.com/photo-1602874801006-2e2b9e4f5c1a?w=400" },
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

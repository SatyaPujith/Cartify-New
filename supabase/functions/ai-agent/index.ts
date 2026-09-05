import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AgentRequest {
  prompt: string;
  cartItems?: { id: string; title: string; price: number; quantity: number }[];
}

interface ParsedIntent {
  action: string;
  keywords: string[];
  budget?: number;
  category?: string;
  recipient?: string;
  occasion?: string;
  recipe?: string;
  maxItems?: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { prompt, cartItems = [] }: AgentRequest = await req.json();

    if (!prompt || typeof prompt !== "string") {
      return new Response(
        JSON.stringify({ error: "Prompt is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Step 1: Parse the natural language intent
    const intent = parseIntent(prompt);

    await supabase.from("audit_log").insert({
      action: "AGENT_PARSE",
      description: `AI agent parsed intent from "${prompt}"`,
      status: "success",
      details: { prompt, parsedIntent: intent },
    });

    // Step 2: Build search query from intent
    const searchQuery = buildSearchQuery(intent);

    // Step 3: Search for products (via SerpAPI proxy or placeholder)
    const serpApiKey = Deno.env.get("SERPAPI_KEY") || Deno.env.get("SERP_API_KEY");
    let products: ProductResult[] = [];

    if (serpApiKey) {
      const serpResponse = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/serpapi-proxy`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: searchQuery, num: 15 }),
        }
      );

      if (serpResponse.ok) {
        const serpData = await serpResponse.json();
        products = serpData.products || [];
      }
    }

    // Fallback to curated placeholder products if SerpAPI unavailable
    if (products.length === 0) {
      products = generatePlaceholderProducts(intent);
    }

    // Step 4: Select products within budget (budget optimization)
    const selectedProducts = selectProductsWithinBudget(products, intent.budget, intent.maxItems || 8);

    await supabase.from("audit_log").insert({
      action: "AGENT_SEARCH",
      description: `Agent found ${products.length} products, selected ${selectedProducts.length} within budget ₹${intent.budget || "unlimited"}`,
      status: "success",
      details: {
        prompt,
        searchQuery,
        totalFound: products.length,
        selectedCount: selectedProducts.length,
        budget: intent.budget,
      },
    });

    // Step 5: Calculate total
    const total = selectedProducts.reduce((sum, p) => sum + p.price, 0);

    // Step 6: Generate explanation
    const explanation = generateExplanation(intent, selectedProducts, total);

    return new Response(
      JSON.stringify({
        intent,
        searchQuery,
        products: selectedProducts,
        total,
        budget: intent.budget,
        withinBudget: intent.budget ? total <= intent.budget : true,
        explanation,
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

interface ProductResult {
  id: string;
  title: string;
  price: number;
  originalPrice?: number;
  rating?: number;
  reviewCount?: number;
  image?: string;
  category?: string;
  brand?: string;
  prime?: boolean;
  inStock?: boolean;
  source?: string;
}

function parseIntent(prompt: string): ParsedIntent {
  const lower = prompt.toLowerCase();

  let action = "search";
  let keywords: string[] = [];
  let budget: number | undefined;
  let category: string | undefined;
  let recipient: string | undefined;
  let occasion: string | undefined;
  let recipe: string | undefined;
  let maxItems = 8;

  // Detect budget (under ₹500, under 500, less than 500, within 500 rupees)
  const budgetMatch = lower.match(/(?:under|within|less than|below|max(?:imum)?|upto|up to)\s*[₹rs.]?\s*(\d[\d,]*)/);
  if (budgetMatch) {
    budget = parseInt(budgetMatch[1].replace(/,/g, ""), 10);
  }

  // Detect recipe intent
  if (lower.includes("biryani")) {
    action = "recipe";
    recipe = "biryani";
    keywords = ["biryani ingredients", "basmati rice", "biryani masala", "cooking oil", "toor dal", "garam masala"];
    category = "Grocery";
    maxItems = 8;
  } else if (lower.includes("recipe") || lower.includes("cook") || lower.includes("make")) {
    action = "recipe";
    const recipeMatch = lower.match(/(?:make|cook|prepare|recipe for)\s+(?:a\s+)?([\w\s]+)/);
    if (recipeMatch) {
      recipe = recipeMatch[1].trim();
      keywords = [recipe, `${recipe} ingredients`, `${recipe} masala`, `${recipe} essentials`];
    }
    category = "Grocery";
  }

  // Detect gift intent
  if (lower.includes("gift") || lower.includes("present") || lower.includes("surprise")) {
    action = "gift";
    category = "Gifts";
    keywords = ["gift pack", "chocolate gift box", "gift card", "gift hamper"];

    const friendMatch = lower.match(/(?:gift|present|surprise)\s+(?:for|to)\s+(\w+)/);
    if (friendMatch) {
      recipient = friendMatch[1];
    }

    const occasionMatch = lower.match(/(?:birthday|anniversary|wedding|festival|diwali|christmas|new year)/);
    if (occasionMatch) {
      occasion = occasionMatch[0];
      keywords.push(`${occasion} gift`);
    }
  }

  // Generic search keywords
  if (keywords.length === 0) {
    const cleaned = lower
      .replace(/(?:under|within|less than|below|max(?:imum)?|upto|up to)\s*[₹rs.]?\s*\d[\d,]*/g, "")
      .replace(/(?:i want|i need|get me|find|show me|buy|order|please|make|cook|prepare|recipe for|gift|present|surprise|for|to|a|an|the|some|items|ingredients?)/g, "")
      .replace(/[^\w\s]/g, "")
      .trim();

    keywords = cleaned.split(/\s+/).filter((w) => w.length > 2);
    if (keywords.length === 0) keywords = [prompt.trim()];
  }

  return { action, keywords, budget, category, recipient, occasion, recipe, maxItems };
}

function buildSearchQuery(intent: ParsedIntent): string {
  if (intent.recipe) {
    return `${intent.recipe} ingredients grocery`;
  }
  if (intent.action === "gift") {
    const parts = [intent.occasion ? `${intent.occasion} gift` : "gift", intent.recipient ? `for ${intent.recipient}` : ""].filter(Boolean);
    return parts.join(" ") || "gift pack";
  }
  return intent.keywords.join(" ");
}

function selectProductsWithinBudget(products: ProductResult[], budget?: number, maxItems = 8): ProductResult[] {
  if (!budget) return products.slice(0, maxItems);

  // First filter out products that exceed budget individually
  const affordableProducts = products.filter(p => p.price <= budget);
  
  if (affordableProducts.length === 0) {
    console.warn(`No individual products found under budget ₹${budget}`);
    // Return the cheapest products available
    return [...products].sort((a, b) => a.price - b.price).slice(0, Math.min(3, maxItems));
  }

  // Sort by value ratio (rating/price) for better selection
  const sorted = [...affordableProducts].sort((a, b) => {
    const valueA = (a.rating || 4.0) / Math.max(a.price, 1);
    const valueB = (b.rating || 4.0) / Math.max(b.price, 1);
    return valueB - valueA;
  });

  const selected = [];
  let remaining = budget;

  for (const product of sorted) {
    if (selected.length >= maxItems) break;
    
    // Only add if it fits within remaining budget
    if (product.price <= remaining) {
      selected.push(product);
      remaining -= product.price;
    }
  }

  return selected;
}


function generateExplanation(intent: ParsedIntent, products: ProductResult[], total: number): string {
  const budgetText = intent.budget ? ` within your budget of ₹${intent.budget}` : "";
  const remainingText = intent.budget ? ` (₹${intent.budget - total} remaining)` : "";

  if (intent.action === "recipe") {
    return `I found ${products.length} ingredients for making ${intent.recipe}${budgetText}. The total comes to ₹${total}${remainingText}. I've selected the best-rated, most cost-effective items to get you cooking!`;
  }
  if (intent.action === "gift") {
    const recipientText = intent.recipient ? ` for your ${intent.recipient}` : "";
    const occasionText = intent.occasion ? ` for ${intent.occasion}` : "";
    return `I curated ${products.length} gift options${recipientText}${occasionText}${budgetText}. The total is ₹${total}${remainingText}. These are top-rated picks that make a great impression!`;
  }
  return `I found ${products.length} products${budgetText}. The total comes to ₹${total}${remainingText}.`;
}

function generatePlaceholderProducts(intent: ParsedIntent): ProductResult[] {
  const now = Date.now();

  if (intent.recipe === "biryani" || intent.action === "recipe") {
    return [
      { 
        id: `mock_0_${now}`, 
        title: "Fresh Basmati Rice 5kg Premium Long Grain", 
        price: 450, 
        originalPrice: 560, 
        rating: 4.5, 
        reviewCount: 8721, 
        image: "https://images.unsplash.com/photo-1586201375761-8416509e8f5e?w=400&h=400&fit=crop&auto=format", 
        category: "Grocery", 
        brand: "Daawat", 
        prime: true, 
        inStock: true, 
        source: "placeholder" 
      },
      { 
        id: `mock_1_${now}`, 
        title: "MDH Biryani Masala 100g Authentic Spice Mix", 
        price: 85, 
        originalPrice: 120, 
        rating: 4.6, 
        reviewCount: 3210, 
        image: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&h=400&fit=crop&auto=format", 
        category: "Grocery", 
        brand: "MDH", 
        prime: true, 
        inStock: true, 
        source: "placeholder" 
      },
      { 
        id: `mock_2_${now}`, 
        title: "Fortune Sunlite Refined Oil 5L Cooking Oil", 
        price: 950, 
        originalPrice: 1100, 
        rating: 4.3, 
        reviewCount: 4521, 
        image: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&h=400&fit=crop&auto=format", 
        category: "Grocery", 
        brand: "Fortune", 
        prime: true, 
        inStock: true, 
        source: "placeholder" 
      },
      { 
        id: `mock_3_${now}`, 
        title: "Tata Sampann Toor Dal 1kg Premium Quality", 
        price: 160, 
        originalPrice: 200, 
        rating: 4.4, 
        reviewCount: 3210, 
        image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&h=400&fit=crop&auto=format", 
        category: "Grocery", 
        brand: "Tata", 
        prime: true, 
        inStock: true, 
        source: "placeholder" 
      },
      { 
        id: `mock_4_${now}`, 
        title: "Catch Garam Masala Powder 200g", 
        price: 145, 
        originalPrice: 180, 
        rating: 4.5, 
        reviewCount: 2310, 
        image: "https://images.unsplash.com/photo-1599909635549-8f5c1e3e1d2e?w=400&h=400&fit=crop&auto=format", 
        category: "Grocery", 
        brand: "Catch", 
        prime: true, 
        inStock: true, 
        source: "placeholder" 
      },
      { 
        id: `mock_5_${now}`, 
        title: "Fresh Chicken Drumstick 1kg (Halal Cut)", 
        price: 280, 
        originalPrice: 350, 
        rating: 4.2, 
        reviewCount: 1200, 
        image: "https://images.unsplash.com/photo-1604503468506-a8a13f55a3f4?w=400&h=400&fit=crop&auto=format", 
        category: "Grocery", 
        brand: "Fresh", 
        prime: true, 
        inStock: true, 
        source: "placeholder" 
      },
      { 
        id: `mock_6_${now}`, 
        title: "Amul Fresh Cream 500ml Tetra Pack", 
        price: 95, 
        originalPrice: 110, 
        rating: 4.4, 
        reviewCount: 5600, 
        image: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&h=400&fit=crop&auto=format", 
        category: "Grocery", 
        brand: "Amul", 
        prime: true, 
        inStock: true, 
        source: "placeholder" 
      },
      { 
        id: `mock_7_${now}`, 
        title: "Premium Onions 2kg Fresh Farm", 
        price: 60, 
        originalPrice: 80, 
        rating: 4.3, 
        reviewCount: 1800, 
        image: "https://images.unsplash.com/photo-1508450859948-4e04fabaa4ea?w=400&h=400&fit=crop&auto=format", 
        category: "Grocery", 
        brand: "Fresh", 
        prime: true, 
        inStock: true, 
        source: "placeholder" 
      },
    ];
  }

  if (intent.action === "gift") {
    return [
      { 
        id: `mock_0_${now}`, 
        title: "Nestle KitKat Dessert Delight Chocolate Gift Pack (Pack of 10)", 
        price: 399, 
        originalPrice: 499, 
        rating: 4.6, 
        reviewCount: 1820, 
        image: "https://images.unsplash.com/photo-1548901671-317b4f4a5e3f?w=400&h=400&fit=crop&auto=format", 
        category: "Gifts", 
        brand: "Nestle", 
        prime: true, 
        inStock: true, 
        source: "placeholder" 
      },
      { 
        id: `mock_1_${now}`, 
        title: "Ferrero Rocher Premium Chocolate Box 24 Pieces", 
        price: 699, 
        originalPrice: 899, 
        rating: 4.7, 
        reviewCount: 3200, 
        image: "https://images.unsplash.com/photo-1511381939415-e440483039b4?w=400&h=400&fit=crop&auto=format", 
        category: "Gifts", 
        brand: "Ferrero", 
        prime: true, 
        inStock: true, 
        source: "placeholder" 
      },
      { 
        id: `mock_2_${now}`, 
        title: "boAt Airdopes 141 Wireless Earbuds with 42H Playtime", 
        price: 1199, 
        originalPrice: 2990, 
        rating: 4.1, 
        reviewCount: 89231, 
        image: "https://images.unsplash.com/photo-1590646877753-0d1e3e6f1d2e?w=400&h=400&fit=crop&auto=format", 
        category: "Gifts", 
        brand: "boAt", 
        prime: true, 
        inStock: true, 
        source: "placeholder" 
      },
      { 
        id: `mock_3_${now}`, 
        title: "Amazon Echo Dot 5th Gen Smart Speaker with Alexa", 
        price: 3499, 
        originalPrice: 5499, 
        rating: 4.5, 
        reviewCount: 15672, 
        image: "https://images.unsplash.com/photo-1543512214-318c7505f352?w=400&h=400&fit=crop&auto=format", 
        category: "Gifts", 
        brand: "Amazon", 
        prime: true, 
        inStock: true, 
        source: "placeholder" 
      },
      { 
        id: `mock_4_${now}`, 
        title: "Festive Scented Candle Gift Set (4 Pack)", 
        price: 599, 
        originalPrice: 899, 
        rating: 4.4, 
        reviewCount: 2100, 
        image: "https://images.unsplash.com/photo-1602874801006-2e2b9e4f5c1a?w=400&h=400&fit=crop&auto=format", 
        category: "Gifts", 
        brand: "Festive", 
        prime: true, 
        inStock: true, 
        source: "placeholder" 
      },
      { 
        id: `mock_5_${now}`, 
        title: "Premium Leather Wallet for Men - Brown", 
        price: 799, 
        originalPrice: 1499, 
        rating: 4.3, 
        reviewCount: 3400, 
        image: "https://images.unsplash.com/photo-1627123424574-7307517d4e5e?w=400&h=400&fit=crop&auto=format", 
        category: "Gifts", 
        brand: "Urban", 
        prime: true, 
        inStock: true, 
        source: "placeholder" 
      },
    ];
  }

  return [
    { 
      id: `mock_0_${now}`, 
      title: "Generic Product 1", 
      price: 299, 
      rating: 4.2, 
      reviewCount: 500, 
      image: "https://images.unsplash.com/photo-1505740420928-5e560c3d4999?w=400&h=400&fit=crop&auto=format", 
      category: "General", 
      brand: "Generic", 
      prime: true, 
      inStock: true, 
      source: "placeholder" 
    },
    { 
      id: `mock_1_${now}`, 
      title: "Generic Product 2", 
      price: 499, 
      rating: 4.3, 
      reviewCount: 800, 
      image: "https://images.unsplash.com/photo-1505740420928-5e560c3d4999?w=400&h=400&fit=crop&auto=format", 
      category: "General", 
      brand: "Generic", 
      prime: true, 
      inStock: true, 
      source: "placeholder" 
    },
  ];
}

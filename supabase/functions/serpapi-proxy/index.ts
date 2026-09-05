import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
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
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Only accept POST requests
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({
          error: "Only POST requests are supported",
        }),
        {
          status: 405,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Parse request body
    const body = await req.json();

    const query = body?.query;
    const requestedNum = body?.num ?? 10;

    // Validate query
    if (!query || typeof query !== "string") {
      return new Response(
        JSON.stringify({
          error: "Query is required",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Validate and limit number of results
    const num = Math.min(
      Math.max(Number(requestedNum) || 10, 1),
      50
    );

    // Environment variables
    const serpApiKey =
      Deno.env.get("SERPAPI_KEY") ||
      Deno.env.get("SERP_API_KEY");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get(
      "SUPABASE_SERVICE_ROLE_KEY"
    );

    // Create Supabase client
    const supabase =
      supabaseUrl && supabaseServiceRoleKey
        ? createClient(
            supabaseUrl,
            supabaseServiceRoleKey
          )
        : null;

    // ============================================================
    // PLACEHOLDER MODE
    // ============================================================

    if (!serpApiKey) {
      console.log(
        `SERPAPI key not configured. Using placeholder products for: ${query}`
      );

      // Log only if Supabase is configured
      if (supabase) {
        const { error: auditError } = await supabase
          .from("audit_log")
          .insert({
            action: "SERPAPI_SEARCH",
            description: `Product search for "${query}" (placeholder mode - no SERPAPI_KEY)`,
            status: "success",
            details: {
              query,
              mode: "placeholder",
            },
          });

        if (auditError) {
          console.error(
            "Audit log error:",
            auditError.message
          );
        }
      }

      const mockProducts = generateMockProducts(
        query,
        num
      );

      return new Response(
        JSON.stringify({
          products: mockProducts,
          source: "placeholder",
          query,
          message:
            "SerpAPI key not configured — showing curated placeholder results",
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // ============================================================
    // SERPAPI GOOGLE SHOPPING
    // ============================================================

    const params = new URLSearchParams({
      engine: "google_shopping",
      q: query,
      num: String(num),
      gl: "in",
      hl: "en",
      api_key: serpApiKey,
    });

    console.log(
      `Searching SerpAPI for: ${query}`
    );

    const serpResponse = await fetch(
      `https://serpapi.com/search.json?${params.toString()}`
    );

    // Handle SerpAPI errors
    if (!serpResponse.ok) {
      const errorText = await serpResponse.text();

      console.error(
        "SerpAPI request failed:",
        serpResponse.status,
        errorText
      );

      if (supabase) {
        const { error: auditError } = await supabase
          .from("audit_log")
          .insert({
            action: "SERPAPI_SEARCH",
            description: `SerpAPI search failed for "${query}"`,
            status: "failed",
            details: {
              query,
              statusCode: serpResponse.status,
              error: errorText,
            },
          });

        if (auditError) {
          console.error(
            "Audit log error:",
            auditError.message
          );
        }
    name: "Cartify Echo Dot 5th Gen Smart Speaker",

      return new Response(
        JSON.stringify({
          error: "SerpAPI request failed",
          details: errorText,
        }),
        {
          status: 502,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Parse response
    const serpData = await serpResponse.json();

    const shoppingResults: SerpApiResult[] =
      Array.isArray(serpData.shopping_results)
        ? serpData.shopping_results
        : [];

    // ============================================================
    // FORMAT PRODUCTS
    // ============================================================

    const products = shoppingResults
      .filter(
        (item) =>
          item.title &&
          ((item.extracted_price ?? 0) > 0 ||
            (item.price ?? 0) > 0)
      )
      .map((item, index) => {
        const price =
          item.extracted_price ??
          item.price ??
          0;

        return {
          id: `serp_${index}_${Date.now()}`,

          title: item.title.substring(0, 100),

          price,

          // Only create a display price if there is a real price
          originalPrice: Math.round(price * 1.2),

          // Use real rating if available
          rating:
            typeof item.rating === "number"
              ? item.rating
              : 4.5,

          // Use real reviews if available
          reviewCount:
            typeof item.reviews === "number"
              ? item.reviews
              : 0,

          // Prefer SerpAPI image
          image:
            item.thumbnail ||
            item.image ||
            getFallbackImage(item.title),

          link: item.link,

          source:
            item.source ||
            "Google Shopping",

          delivery: item.delivery,

          category:
            categorizeProductByTitle(
              item.title
            ),

          brand:
            extractBrandFromTitle(
              item.title
            ),

          // These are UI/demo fields
          // and should not be treated as real marketplace data
          prime: false,

          inStock: true,
        };
      });

    // ============================================================
    // AUDIT LOG
    // ============================================================

    if (supabase) {
      const { error: auditError } =
        await supabase
          .from("audit_log")
          .insert({
            action: "SERPAPI_SEARCH",
            description: `SerpAPI search for "${query}" returned ${products.length} products`,
            status: "success",
            details: {
              query,
              resultCount: products.length,
            },
          });

      if (auditError) {
        console.error(
          "Audit log error:",
          auditError.message
        );
      }
    }

    // ============================================================
    // RESPONSE
    // ============================================================

    return new Response(
      JSON.stringify({
        products,
        source: "serpapi",
        query,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (err) {
    console.error(
      "Internal server error:",
      err
    );

    const message =
      err instanceof Error
        ? err.message
        : "Internal server error";

    return new Response(
      JSON.stringify({
        error: message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});

// ================================================================
// MOCK PRODUCTS
// ================================================================

function generateMockProducts(
  query: string,
  num: number
) {
  const lowerQuery =
    query.toLowerCase();

  const recipeMap: Record<
    string,
    {
      name: string;
      price: number;
      image: string;
      rating: number;
      reviewCount: number;
    }[]
  > = {
    // ============================================================
    // BIRYANI
    // ============================================================

    biryani: [
      {
        name: "India Gate Basmati Rice 5kg Premium Long Grain",
        price: 450,
        image:
          "https://images.unsplash.com/photo-1586201375761-8416509e8f5e?w=600&h=600&fit=crop",
        rating: 4.6,
        reviewCount: 1842,
      },

      {
        name: "MDH Biryani Masala 100g",
        price: 85,
        image:
          "https://tiimg.tistatic.com/fp/1/004/614/mdh-biryani-masala-933.jpg",
        rating: 4.5,
        reviewCount: 923,
      },

      {
        name: "Catch Garam Masala Powder 200g",
        price: 145,
        image:
          "https://m.media-amazon.com/images/I/81n6K0b5jDL._SL1500_.jpg",
        rating: 4.4,
        reviewCount: 756,
      },

      {
        name: "Fortune Sunlite Refined Sunflower Oil 5L",
        price: 950,
        image:
          "https://www.kesargrocery.com/images/P/Fortune%20Sunflower%20Oil%20%285%20LTR%29.jpg",
        rating: 4.5,
        reviewCount: 2145,
      },

      {
        name: "Amul Fresh Cream 500ml",
        price: 95,
        image:
          "https://sumangrocery.in/public/uploads/media/ZdQY5tbxy0cm2JJpHSSI0JYKdgPYyZKCk48uvFIC.jpg",
        rating: 4.6,
        reviewCount: 1102,
      },

      {
        name: "Aashirvaad Atta Whole Wheat Flour 10kg",
        price: 530,
        image:
          "https://images.unsplash.com/photo-1574323347407-f5e1ad6d0d44?w=600&h=600&fit=crop",
        rating: 4.5,
        reviewCount: 1678,
      },

      {
        name: "Tata Sampann Toor Dal 1kg",
        price: 160,
        image:
          "https://images.unsplash.com/photo-1599909635549-8f5c1e3e1d2e?w=600&h=600&fit=crop",
        rating: 4.4,
        reviewCount: 845,
      },

      {
        name: "Lipton Darjeeling Tea Leaves 250g",
        price: 210,
        image:
          "https://images.unsplash.com/photo-1597318181409-7f8b1d6f7e1c?w=600&h=600&fit=crop",
        rating: 4.3,
        reviewCount: 621,
      },
    ],

    // ============================================================
    // GIFTS
    // ============================================================

    gift: [
      {
        name: "Nestle KitKat Dessert Delight Chocolate Gift Pack",
        price: 399,
        image:
          "https://cdn.grofers.com/cdn-cgi/image/f=auto,fit=scale-down,q=70,metadata=none,w=450/da/cms-assets/cms/product/3ed7e943-3744-4510-8557-6429b135af06.jpg",
        rating: 4.6,
        reviewCount: 1280,
      },

      {
        name: "Ferrero Rocher Premium Chocolate Box 24 Pieces",
        price: 699,
        image:
          "https://m.media-amazon.com/images/I/919uYw1XB-L._SX569_.jpg",
        rating: 4.8,
        reviewCount: 3210,
      },

      {
        name: "Amazon Echo Dot 5th Gen Smart Speaker",
        price: 3499,
        image:
          "https://www.pbtech.co.nz/fileslib/51011_1.jpg",
        rating: 4.5,
        reviewCount: 2785,
      },

      {
        name: "boAt Airdopes 141 Wireless Earbuds",
        price: 1199,
        image:
          "https://www.tatacliq.com/medias/sys_master/images/46845369737246/boat-airdopes-141-bluetooth-truly-wireless-earbuds-black-1.jpg",
        rating: 4.3,
        reviewCount: 4567,
      },

      {
        name: "Kindle Paperwhite 16GB",
        price: 14999,
        image:
          "https://images.unsplash.com/photo-1592496001020-d31bd830651f?w=600&h=600&fit=crop",
        rating: 4.7,
        reviewCount: 1850,
      },

      {
        name: "Festive Scented Candle Gift Set 4 Pack",
        price: 599,
        image:
          "https://images.unsplash.com/photo-1603006905003-be475563bc59?w=600&h=600&fit=crop",
        rating: 4.4,
        reviewCount: 532,
      },
    ],
  };

  // ============================================================
  // SELECT CATEGORY
  // ============================================================

  let baseProducts =
    recipeMap.biryani;

  if (
    lowerQuery.includes("gift") ||
    lowerQuery.includes("present")
  ) {
    baseProducts =
      recipeMap.gift;
  } else if (
    lowerQuery.includes("biryani") ||
    lowerQuery.includes("rice")
  ) {
    baseProducts =
      recipeMap.biryani;
  }

  // ============================================================
  // RETURN PRODUCTS
  // ============================================================

  return baseProducts
    .slice(0, num)
    .map((p, i) => ({
      id: `mock_${i}_${Date.now()}`,

      title: p.name,

      price: p.price,

      originalPrice: Math.round(
        p.price * 1.2
      ),

      rating: p.rating,

      reviewCount:
        p.reviewCount,

      image: p.image,

      category:
        lowerQuery.includes("gift") ||
        lowerQuery.includes("present")
          ? "Gifts"
          : "Grocery",

      brand:
        extractBrandFromTitle(
          p.name
        ),

      prime: true,

      inStock: true,

      source: "placeholder",
    }));
}

// ================================================================
// FALLBACK IMAGE
// ================================================================

function getFallbackImage(
  title: string
): string {
  const category =
    categorizeProductByTitle(title);

  switch (category) {
    case "Electronics":
      return "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=600&h=600&fit=crop";

    case "Grocery":
      return "https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&h=600&fit=crop";

    case "Beauty":
      return "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&h=600&fit=crop";

    case "Fashion":
      return "https://images.unsplash.com/photo-1445205170230-053b83016050?w=600&h=600&fit=crop";

    case "Gifts":
      return "https://images.unsplash.com/photo-1512909006721-3d6018887383?w=600&h=600&fit=crop";

    default:
      return "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&h=600&fit=crop";
  }
}

// ================================================================
// PRODUCT CATEGORY
// ================================================================

function categorizeProductByTitle(
  title: string
): string {
  const titleLower =
    title.toLowerCase();

  // Electronics
  if (
    titleLower.includes("phone") ||
    titleLower.includes("mobile") ||
    titleLower.includes("smartphone") ||
    titleLower.includes("earphone") ||
    titleLower.includes("earbud") ||
    titleLower.includes("headphone") ||
    titleLower.includes("speaker") ||
    titleLower.includes("charger") ||
    titleLower.includes("cable") ||
    titleLower.includes("laptop") ||
    titleLower.includes("tablet") ||
    titleLower.includes("kindle")
  ) {
    return "Electronics";
  }

  // Grocery
  if (
    titleLower.includes("masala") ||
    titleLower.includes("spice") ||
    titleLower.includes("dal") ||
    titleLower.includes("rice") ||
    titleLower.includes("oil") ||
    titleLower.includes("flour") ||
    titleLower.includes("atta") ||
    titleLower.includes("sugar") ||
    titleLower.includes("tea") ||
    titleLower.includes("coffee") ||
    titleLower.includes("cream")
  ) {
    return "Grocery";
  }

  // Gifts
  if (
    titleLower.includes("chocolate") ||
    titleLower.includes("gift") ||
    titleLower.includes("sweet") ||
    titleLower.includes("cake") ||
    titleLower.includes("candy") ||
    titleLower.includes("rocher")
  ) {
    return "Gifts";
  }

  // Beauty
  if (
    titleLower.includes("lotion") ||
    titleLower.includes("shampoo") ||
    titleLower.includes("soap") ||
    titleLower.includes("perfume") ||
    titleLower.includes("cosmetic") ||
    titleLower.includes("makeup")
  ) {
    return "Beauty";
  }

  // Fashion
  if (
    titleLower.includes("shirt") ||
    titleLower.includes("jeans") ||
    titleLower.includes("dress") ||
    titleLower.includes("shoe") ||
    titleLower.includes("bag") ||
    titleLower.includes("watch")
  ) {
    return "Fashion";
  }

  return "General";
}

// ================================================================
// BRAND EXTRACTION
// ================================================================

function extractBrandFromTitle(
  title: string
): string {
  const commonBrands = [
    "Samsung",
    "Apple",
    "Xiaomi",
    "OnePlus",
    "Realme",
    "Oppo",
    "Vivo",
    "Sony",
    "LG",
    "Panasonic",
    "Philips",
    "Boat",
    "boAt",
    "JBL",
    "Nike",
    "Adidas",
    "Puma",
    "Reebok",
    "Nestle",
    "Cadbury",
    "Amul",
    "Tata",
    "Parle",
    "Britannia",
    "ITC",
    "HUL",
    "P&G",
    "Dabur",
    "Patanjali",
    "Marico",
    "Emami",
    "Godrej",
    "Bajaj",
    "Havells",
    "Orient",
    "Crompton",
    "Usha",
    "Prestige",
    "Hawkins",
    "Milton",
    "Cello",
    "Tupperware",
    "Asian Paints",
    "Berger",
    "Dulux",
    "Nerolac",
    "Shalimar",
    "Aashirvaad",
    "Fortune",
    "Catch",
    "MDH",
    "Lipton",
    "Ferrero",
    "Amazon",
    "Kindle",
  ];

  for (const brand of commonBrands) {
    if (
      title
        .toLowerCase()
        .includes(brand.toLowerCase())
    ) {
      return brand;
    }
  }

  // Try first word as brand
  const firstWord =
    title.split(" ")[0];

  if (
    firstWord &&
    firstWord.length > 2 &&
    /^[A-Z]/.test(firstWord)
  ) {
    return firstWord;
  }

  return "Brand";
}
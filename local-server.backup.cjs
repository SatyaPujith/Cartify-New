const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = process.env.LOCAL_API_PORT || 3001;

// Gemini AI configuration
const GEMINI_API_KEY = 'AIzaSyAb8RN6Ksch0qZFJnPiZwNYniUrNNIq4d6Zf60xkyrJCn0TfURg';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent';

app.use(cors());
app.use(express.json());

// SerpAPI Proxy Endpoint
app.post('/api/serpapi-proxy', async (req, res) => {
  try {
    const { query, num = 10 } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query is required' });
    }

    const serpApiKey = process.env.SERPAPI_KEY || process.env.SERP_API_KEY;

    // If no SerpAPI key configured, return mock products
    if (!serpApiKey) {
      const mockProducts = generateMockProducts(query, num);
      return res.json({
        products: mockProducts,
        source: 'placeholder',
        query,
        message: 'SerpAPI key not configured — showing curated placeholder results',
      });
    }

    // Call SerpAPI with increased limit
    const params = new URLSearchParams({
      engine: 'google_shopping',
      q: query,
      num: String(Math.min(num, 60)), // Increased to 60 products
      gl: 'in',
      hl: 'en',
      api_key: serpApiKey,
    });

    const response = await fetch(
      `https://serpapi.com/search.json?${params.toString()}`
    );

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(502).json({ 
        error: 'SerpAPI request failed', 
        details: errorText 
      });
    }

    const serpData = await response.json();
    const shoppingResults = serpData.shopping_results || [];

    // Filter out invalid results and ensure we have good data
    const validResults = shoppingResults.filter(item => 
      item.title && 
      item.title.length > 5 && 
      (item.extracted_price || item.price)
    );

    // Limit results to prevent duplicates and ensure variety
    const limitedResults = validResults.slice(0, Math.min(num, 30));

    const products = limitedResults.map((item, index) => {
      // Get better image URL with multiple fallback strategies
      let imageUrl = '';
      
      // Try multiple image sources
      if (item.thumbnail && isValidImageUrl(item.thumbnail)) {
        imageUrl = item.thumbnail;
      } else if (item.image && isValidImageUrl(item.image)) {
        imageUrl = item.image;
      } else if (item.serpapi_product_api && item.serpapi_product_api.images && item.serpapi_product_api.images[0]) {
        imageUrl = item.serpapi_product_api.images[0];
      }
      
      // If still no valid image, use category-specific fallback
      if (!imageUrl) {
        imageUrl = getUniqueImage(item.title, Date.now());
      }
      
      // Clean up the title - remove extra characters and limit length
      let cleanTitle = item.title.trim();
      cleanTitle = cleanTitle.replace(/[^\w\s\-.,()]/g, ''); // Remove special characters
      cleanTitle = cleanTitle.substring(0, 100); // Limit length
      
      // Ensure price is valid and reasonable
      let price = item.extracted_price || item.price || 0;
      if (typeof price === 'string') {
        price = parseFloat(price.replace(/[^\d.]/g, '')) || 0;
      }
      
      // Skip products with invalid prices
      if (price <= 0 || price > 500000) {
        price = Math.floor(Math.random() * 2000) + 100; // Fallback reasonable price
      }
      
      // Generate more realistic variations with unique IDs
      const uniqueId = `serp_${index}_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
      const baseRating = item.rating || (3.8 + Math.random() * 1.2);
      const baseReviews = item.reviews || Math.floor(Math.random() * 3000) + 200;
      
      return {
        id: uniqueId,
        title: cleanTitle,
        price: Math.round(price),
        originalPrice: price > 50 ? Math.round(price * (1.15 + Math.random() * 0.25)) : null,
        rating: Math.round(baseRating * 10) / 10, // Round to 1 decimal
        reviewCount: baseReviews,
        image: imageUrl,
        link: item.link,
        source: item.source || 'Google Shopping',
        delivery: item.delivery || 'Standard delivery',
        brand: extractBrand(cleanTitle),
        category: categorizeProduct(cleanTitle),
        prime: Math.random() > 0.25, // 75% chance of prime
        inStock: true,
      };
    }).filter(product => product.price > 0); // Remove any products with invalid prices

    res.json({
      products,
      source: 'serpapi',
      query,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Razorpay Create Order Endpoint
app.post('/api/razorpay-checkout/create-order', async (req, res) => {
  try {
    const { amount, cartItems, agentIntent } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    const amountInPaise = Math.round(amount * 100);
    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

    // If no Razorpay keys configured, return mock order
    if (!razorpayKeyId || !razorpayKeySecret) {
      const mockOrderId = `order_mock_${Date.now()}`;

      return res.json({
        orderId: mockOrderId,
        razorpayOrderId: mockOrderId,
        amount: amountInPaise,
        currency: 'INR',
        keyId: 'rzp_test_mock_key',
        mockMode: true,
        message: 'Razorpay keys not configured — running in mock mode.',
      });
    }

    // Create real Razorpay order
    const auth = Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString('base64');
    const razorpayResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`,
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: 'INR',
        notes: { agent_intent: agentIntent || '' },
      }),
    });

    if (!razorpayResponse.ok) {
      const errorText = await razorpayResponse.text();
      return res.status(502).json({ 
        error: 'Razorpay order creation failed', 
        details: errorText 
      });
    }

    const razorpayOrder = await razorpayResponse.json();

    res.json({
      orderId: razorpayOrder.id,
      razorpayOrderId: razorpayOrder.id,
      amount: amountInPaise,
      currency: 'INR',
      keyId: razorpayKeyId,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Razorpay Verify Payment Endpoint
app.post('/api/razorpay-checkout/verify-payment', async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, mockMode } = req.body;

    if (!razorpayOrderId || !razorpayPaymentId) {
      return res.status(400).json({ error: 'Missing payment details' });
    }

    // Mock mode: auto-verify
    if (mockMode) {
      return res.json({
        verified: true,
        status: 'paid',
        mockMode: true,
        message: 'Payment verified successfully (mock mode)',
      });
    }
    // Real verification: check signature using HMAC SHA256
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
    const generatedSignature = crypto
      .createHmac('sha256', razorpayKeySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (generatedSignature !== razorpaySignature) {
      return res.status(400).json({ 
        verified: false, 
        error: 'Signature mismatch' 
      });
    }

    res.json({
      verified: true,
      status: 'paid',
      message: 'Payment verified successfully',
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// AI Agent Endpoint
app.post('/api/ai-agent', async (req, res) => {
  try {
    const { prompt, cartItems = [] } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Parse the natural language intent
    const intent = parseIntent(prompt);

    // Get Gemini AI recommendations for better product selection
    const geminiRecommendations = await getGeminiRecommendations(prompt, intent.budget);

    let products = [];
    
    if (geminiRecommendations && geminiRecommendations.items) {
      // Use Gemini recommendations to create realistic products
      products = geminiRecommendations.items.map((item, index) => {
        const uniqueId = `gemini_${index}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        
        return {
          id: uniqueId,
          title: item.name,
          price: item.estimatedPrice || Math.floor(Math.random() * 200) + 50,
          originalPrice: item.estimatedPrice ? Math.round(item.estimatedPrice * 1.2) : null,
          rating: 4.0 + Math.random() * 1.0,
          reviewCount: Math.floor(Math.random() * 3000) + 200,
          image: getUniqueImage(item.name, Date.now()),
          category: item.category || categorizeProduct(item.name),
          brand: extractBrand(item.name),
          prime: Math.random() > 0.2,
          inStock: true,
          source: 'gemini-ai',
          priority: item.priority || index + 1
        };
      });
      
      // Sort by priority (lower number = higher priority)
      products.sort((a, b) => (a.priority || 999) - (b.priority || 999));
    }
    
    // If no Gemini recommendations or fallback needed, use existing logic
    if (products.length === 0) {
      if (intent.action === 'recipe' || intent.recipe) {
        products = generatePlaceholderProducts(intent);
      } else if (intent.action === 'gift') {
        products = generatePlaceholderProducts(intent);
      } else {
        const baseProducts = generatePlaceholderProducts(intent);
        const searchQuery = buildSearchQuery(intent);
        const additionalProducts = generateMockProducts(searchQuery, Math.max(0, (intent.maxItems || 8) - baseProducts.length));
        products = [...baseProducts, ...additionalProducts];
      }
    }

    // Smart budget optimization - maximize products within budget
    let selectedProducts = [];
    if (intent.budget && intent.budget > 0) {
      selectedProducts = optimizeProductsForBudget(products, intent.budget, intent.maxItems || 15);
    } else {
      selectedProducts = products.slice(0, intent.maxItems || 10);
    }

    // Calculate total
    const total = selectedProducts.reduce((sum, p) => sum + p.price, 0);

    // Generate explanation with Gemini reasoning if available
    let explanation = '';
    if (geminiRecommendations && geminiRecommendations.reasoning) {
      explanation = `${geminiRecommendations.reasoning}. Found ${selectedProducts.length} items totaling ₹${total}`;
      if (intent.budget) {
        explanation += ` within your ₹${intent.budget} budget (₹${intent.budget - total} remaining)`;
      }
    } else {
      explanation = generateExplanation(intent, selectedProducts, total);
    }

    res.json({
      intent,
      searchQuery: buildSearchQuery(intent),
      products: selectedProducts,
      total,
      budget: intent.budget,
      withinBudget: intent.budget ? total <= intent.budget : true,
      explanation,
      geminiUsed: !!geminiRecommendations,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Helper functions (simplified versions)
function parseIntent(prompt) {
  const lower = prompt.toLowerCase();
  let action = 'search';
  let keywords = [];
  let budget;
  let category;
  let recipient;
  let occasion;
  let recipe;
  let maxItems = 15; // Increased default for better variety

  // Detect budget - improved regex to handle ₹ symbol
  const budgetMatch = lower.match(/(?:under|within|less than|below|max(?:imum)?|upto|up to)\s*[₹rs.]?\s*(\d[\d,]*)|₹\s*(\d[\d,]*)/);
  if (budgetMatch) {
    budget = parseInt((budgetMatch[1] || budgetMatch[2]).replace(/,/g, ''), 10);
  }

  // Detect recipe intent
  if (lower.includes('biryani')) {
    action = 'recipe';
    recipe = 'biryani';
    keywords = ['biryani ingredients', 'basmati rice', 'biryani masala', 'chicken', 'onions', 'oil', 'yogurt'];
    category = 'Grocery';
    maxItems = 15; // More items for complete recipe
  } else if (lower.includes('recipe') || lower.includes('cook') || lower.includes('ingredients')) {
    action = 'recipe';
    category = 'Grocery';
    maxItems = 12;
  }

  // Detect gift intent
  if (lower.includes('gift') || lower.includes('present')) {
    action = 'gift';
    category = 'Gifts';
    keywords = ['gift pack', 'chocolate gift box'];
    maxItems = 10;
  }

  // Generic search keywords
  if (keywords.length === 0) {
    const cleaned = lower
      .replace(/(?:under|within|less than|below|max(?:imum)?|upto|up to)\s*[₹rs.]?\s*\d[\d,]*/g, '')
      .replace(/₹\s*\d[\d,]*/g, '')
      .replace(/(?:i want|i need|get me|find|show me|buy|order|please)/g, '')
      .replace(/[^\w\s]/g, '')
      .trim();
    keywords = cleaned.split(/\s+/).filter(w => w.length > 2);
    if (keywords.length === 0) keywords = [prompt.trim()];
  }

  return { action, keywords, budget, category, recipient, occasion, recipe, maxItems };
}

// Gemini AI helper function
async function getGeminiRecommendations(prompt, budget) {
  try {
    const geminiPrompt = `You are a smart shopping assistant. For the request: "${prompt}" with budget ₹${budget || 'unlimited'}, provide a JSON list of 8-12 essential items needed.

For biryani ingredients under ₹500, include: rice, biryani masala, oil, onions, meat/vegetables, yogurt, etc. with realistic Indian prices.
For other requests, provide relevant items with realistic prices.

Respond ONLY with valid JSON in this format:
{
  "items": [
    {"name": "Basmati Rice 1kg", "category": "grocery", "estimatedPrice": 150, "priority": 1},
    {"name": "Biryani Masala 50g", "category": "spice", "estimatedPrice": 85, "priority": 2}
  ],
  "totalEstimate": 235,
  "reasoning": "Essential items for biryani within budget"
}`;

    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: geminiPrompt
          }]
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const geminiText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (geminiText) {
      // Extract JSON from response
      const jsonMatch = geminiText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    }
    
    return null;
  } catch (error) {
    console.error('Gemini AI error:', error);
    return null;
  }
}
function isValidImageUrl(url) {
  if (!url || typeof url !== 'string' || url.length < 10) {
    return false;
  }
  
  try {
    const urlObj = new URL(url);
    // Check if it's a valid HTTP/HTTPS URL
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return false;
    }
    
    // Check if it looks like an image URL
    const pathname = urlObj.pathname.toLowerCase();
    const hasImageExtension = /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(pathname);
    const isGoogleImage = url.includes('images.unsplash.com') || url.includes('encrypted-tbn');
    
    return hasImageExtension || isGoogleImage || pathname.includes('image') || pathname.includes('photo');
  } catch {
    return false;
  }
}

// Global image tracking for uniqueness across all products
let globalImagePool = [];
let usedImages = new Set();

// Initialize diverse image pools
function initializeImagePools() {
  return {
    phones: [
      'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1601972602237-8c79241e468b?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1556656793-08538906a9f8?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1607936854279-55e8f4bc233c?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1605236453806-6ff36851218e?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1574944985070-8f3ebc6b79d2?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1567721913486-6585f069b332?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1536431311719-398b6704d4cc?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1520923642038-b4259acecbd7?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1603898037225-1bea09c550c0?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1585060544812-6b45742d762f?w=400&h=400&fit=crop&auto=format'
    ],
    electronics: [
      'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1547394765-185e1e68f34e?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1518717758536-85ae29035b6d?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1544731612-de7f96afe55f?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1587831990711-23ca6441447b?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1593640408182-31c70c8268f5?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1579952363873-27d3bfad9c0d?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1515378960530-7c0da6231fb1?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1564466809058-bf4114613385?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1543512214-318c7505f352?w=400&h=400&fit=crop&auto=format'
    ],
    audio: [
      'https://images.unsplash.com/photo-1505740420928-5e560c3d4999?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1590646877753-0d1e3e6f1d2e?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1564424224651-efa32efb4231?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1487215078519-e21cc028cb29?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1545127398-14699f92334b?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1572536147248-ac59a8abfa4b?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1599669454699-248893623440?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1577174881658-0f30ed549adc?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1612198188060-c7c2a3b66eae?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1493612276216-ee3925520721?w=400&h=400&fit=crop&auto=format'
    ],
    kitchen: [
      'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1556909095-f20474bd83f5?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1585515656440-9bb3c696f72d?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1556909202-f6d704d82fb8?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1604578762246-41134e37f9cc?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1556909114-4bb7c6c90556?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1585515656533-b0b4c21d6db6?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1574951113815-529ab28c4e3d?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1595435742656-5272d0b3fa9c?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1623166646002-68521a80f5dc?w=400&h=400&fit=crop&auto=format'
    ],
    food: [
      'https://images.unsplash.com/photo-1596040033229-a9821ebd05e5?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1599909635549-8f5c1e3e1d2e?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1586201375761-8416509e8f5e?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1574323347407-f5e1ad6d0d44?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1589367920969-ab8e050bbb04?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1609501676725-7186f4932244?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1604503468506-a8a13f55a3f4?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1582049634267-d5ed32fb7de3?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1604093882750-3ed498f3178b?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1620706857370-e1b977e2c83a?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1561272912-4111a5e4e0e4?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400&h=400&fit=crop&auto=format'
    ],
    fashion: [
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1627123424574-7307517d4e5e?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1616150840850-efd023473157?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1485145782098-4f5fd605a66b?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1571945153237-4929e783af4a?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1582542021865-22ca2ad9449b?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1603252109303-2751441dd157?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=400&h=400&fit=crop&auto=format'
    ],
    beauty: [
      'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1580870069867-74c57ee1bb07?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1559181567-c3190ca9959b?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1574725247129-35dc8019a5e3?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1629198688000-71f23e745b6e?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1570194065650-d99fb4dee2a4?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1560472355-536de3962603?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1555503152-533834e64849?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1631729371254-42c2892f0e6e?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1594736797933-d0ad9bb2d928?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1503236823255-94609f598e71?w=400&h=400&fit=crop&auto=format'
    ],
    generic: [
      'https://images.unsplash.com/photo-1548901671-317b4f4a5e3f?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1602874801006-2e2b9e4f5c1a?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1584043204475-8cc101d6c77a?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1606107557580-7e328f2cb1eb?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1607083206968-13611e3d76db?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1607083206325-cbb6c2221d65?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1519947486511-46149fa0a254?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1515378960530-7c0da6231fb1?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1571171637578-41bc2dd41cd2?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1600298881974-6be191ceeda1?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1577003811926-53b288a6ca2d?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1559563458-527698bf5295?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=400&h=400&fit=crop&auto=format'
    ]
  };
}

// Get unique image ensuring no duplicates across the entire response
function getUniqueImage(title, sessionId = Date.now()) {
  // Initialize global pool if empty or reset for new session
  if (globalImagePool.length === 0 || !sessionId) {
    const pools = initializeImagePools();
    globalImagePool = [
      ...pools.phones,
      ...pools.electronics, 
      ...pools.audio,
      ...pools.kitchen,
      ...pools.food,
      ...pools.fashion,
      ...pools.beauty,
      ...pools.generic
    ];
    // Shuffle the global pool for randomness
    for (let i = globalImagePool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [globalImagePool[i], globalImagePool[j]] = [globalImagePool[j], globalImagePool[i]];
    }
    usedImages.clear(); // Reset used images for new session
  }

  // Find an unused image from the global pool
  for (const image of globalImagePool) {
    if (!usedImages.has(image)) {
      usedImages.add(image);
      return image;
    }
  }

  // If all images are used, reset and start over
  usedImages.clear();
  const firstImage = globalImagePool[0];
  usedImages.add(firstImage);
  return firstImage;
}

// Helper function to get fallback images based on product type (DEPRECATED - use getUniqueImage instead)
function getFallbackImage(title, index) {
  const titleLower = title.toLowerCase();
  // Create a more diverse distribution using multiple factors
  const hash = title.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  const baseIndex = Math.abs(hash + index * 3) % 12; // Use 12 images per category for more variety
  
  // Electronics - Phones & Mobiles
  if (titleLower.includes('phone') || titleLower.includes('mobile') || titleLower.includes('smartphone')) {
    const phoneImages = [
      'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1601972602237-8c79241e468b?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1556656793-08538906a9f8?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1607936854279-55e8f4bc233c?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1605236453806-6ff36851218e?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1574944985070-8f3ebc6b79d2?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1567721913486-6585f069b332?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1536431311719-398b6704d4cc?w=400&h=400&fit=crop&auto=format'
    ];
    return phoneImages[baseIndex];
  }
  
  // Electronics - General (TV, Laptop, etc)
  if (titleLower.includes('tv') || titleLower.includes('laptop') || titleLower.includes('computer') || titleLower.includes('tablet') || titleLower.includes('electronics')) {
    const electronicsImages = [
      'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1547394765-185e1e68f34e?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1518717758536-85ae29035b6d?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1544731612-de7f96afe55f?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1587831990711-23ca6441447b?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1593640408182-31c70c8268f5?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1579952363873-27d3bfad9c0d?w=400&h=400&fit=crop&auto=format'
    ];
    return electronicsImages[baseIndex];
  }
  
  // Audio Products
  if (titleLower.includes('headphone') || titleLower.includes('earphone') || titleLower.includes('earbuds') || titleLower.includes('speaker') || titleLower.includes('audio')) {
    const audioImages = [
      'https://images.unsplash.com/photo-1505740420928-5e560c3d4999?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1590646877753-0d1e3e6f1d2e?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1564424224651-efa32efb4231?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1487215078519-e21cc028cb29?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1545127398-14699f92334b?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1572536147248-ac59a8abfa4b?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1599669454699-248893623440?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1577174881658-0f30ed549adc?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=400&h=400&fit=crop&auto=format'
    ];
    return audioImages[baseIndex];
  }
  
  // Kitchen & Dining
  if (titleLower.includes('kitchen') || titleLower.includes('dining') || titleLower.includes('cookware') || titleLower.includes('utensil') || titleLower.includes('plate') || titleLower.includes('bowl')) {
    const kitchenImages = [
      'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1556909095-f20474bd83f5?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1585515656440-9bb3c696f72d?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1556909202-f6d704d82fb8?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1604578762246-41134e37f9cc?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1556909114-4bb7c6c90556?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1585515656533-b0b4c21d6db6?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1574951113815-529ab28c4e3d?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1556909202-f6d704d82fb8?w=400&h=400&fit=crop&auto=format'
    ];
    return kitchenImages[baseIndex];
  }
  
  // Food & Spices
  if (titleLower.includes('masala') || titleLower.includes('spice') || titleLower.includes('biryani') || titleLower.includes('dal') || titleLower.includes('rice') || titleLower.includes('food')) {
    const spiceImages = [
      'https://images.unsplash.com/photo-1596040033229-a9821ebd05e5?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1599909635549-8f5c1e3e1d2e?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1586201375761-8416509e8f5e?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1574323347407-f5e1ad6d0d44?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1589367920969-ab8e050bbb04?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1609501676725-7186f4932244?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1604503468506-a8a13f55a3f4?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1582049634267-d5ed32fb7de3?w=400&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1604093882750-3ed498f3178b?w=400&h=400&fit=crop&auto=format'
    ];
    return spiceImages[baseIndex];
  }
  
  // Return the selected image based on category with proper parameters
  const generalImages = [
    'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=400&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1580870069867-74c57ee1bb07?w=400&h=400&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=400&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&h=400&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=400&h=400&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=400&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1525904097878-94fb15835963?w=400&h=400&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1550989460-0adf9ea622e2?w=400&h=400&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400&h=400&fit=crop&auto=format'
  ];
  return generalImages[baseIndex];
}

// Helper function to extract brand from title
function extractBrand(title) {
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

// Helper function to categorize products
function categorizeProduct(title) {
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
// Smart budget optimization function
function optimizeProductsForBudget(products, budget, maxItems = 12) {
  if (!budget || budget <= 0) {
    return products.slice(0, maxItems);
  }

  // Sort products by value (rating/price ratio) for better optimization
  const sortedProducts = [...products].sort((a, b) => {
    const valueA = (a.rating || 4.0) / Math.max(a.price, 1);
    const valueB = (b.rating || 4.0) / Math.max(b.price, 1);
    return valueB - valueA;
  });

  const selected = [];
  let remainingBudget = budget;
  let attempts = 0;
  const maxAttempts = sortedProducts.length * 2;

  // Greedy algorithm with multiple passes to maximize products
  for (let pass = 0; pass < 3 && selected.length < maxItems && attempts < maxAttempts; pass++) {
    for (const product of sortedProducts) {
      attempts++;
      if (attempts > maxAttempts) break;
      
      if (selected.find(p => p.id === product.id)) continue; // Skip already selected
      
      if (product.price <= remainingBudget) {
        selected.push(product);
        remainingBudget -= product.price;
        
        if (selected.length >= maxItems) break;
      }
    }
    
    // In subsequent passes, try to fit smaller items
    if (pass > 0) {
      sortedProducts.sort((a, b) => a.price - b.price);
    }
  }

  return selected;
}

function buildSearchQuery(intent) {
  if (intent.recipe) {
    return `${intent.recipe} ingredients grocery`;
  }
  if (intent.action === 'gift') {
    return intent.occasion ? `${intent.occasion} gift` : 'gift pack';
  }
  return intent.keywords.join(' ');
}

function selectProductsWithinBudget(products, budget, maxItems = 8) {
  if (!budget) return products.slice(0, maxItems);

  const sorted = [...products].sort((a, b) => (a.rating || 0) / (a.price || 1) - (b.rating || 0) / (b.price || 1));
  const selected = [];
  let remaining = budget;

  for (const product of sorted) {
    if (selected.length >= maxItems) break;
    if (product.price > 0 && product.price <= remaining) {
      selected.push(product);
      remaining -= product.price;
    }
  }

  return selected;
}

function generateExplanation(intent, products, total) {
  const budgetText = intent.budget ? ` within your budget of ₹${intent.budget}` : '';
  const remainingText = intent.budget ? ` (₹${intent.budget - total} remaining)` : '';

  if (intent.action === 'recipe') {
    return `I found ${products.length} ingredients for making ${intent.recipe}${budgetText}. The total comes to ₹${total}${remainingText}.`;
  }
  if (intent.action === 'gift') {
    return `I curated ${products.length} gift options${budgetText}. The total is ₹${total}${remainingText}.`;
  }
  return `I found ${products.length} products${budgetText}. The total comes to ₹${total}${remainingText}.`;
}
function generateMockProducts(query, num) {
  const now = Date.now();
  const sessionId = Date.now(); // Use current timestamp as session ID
  const lowerQuery = query.toLowerCase();

  const getRandomVariation = (baseProducts, requestedNum) => {
    const result = [];
    const numToGenerate = Math.min(requestedNum, 20); // Cap at 20 products
    
    for (let i = 0; i < numToGenerate; i++) {
      const baseIndex = i % baseProducts.length;
      const base = baseProducts[baseIndex];
      const variation = Math.floor(i / baseProducts.length) + 1;
      
      result.push({
        id: `mock_${i}_${now}_${Math.random().toString(36).substr(2, 4)}`,
        title: variation > 1 ? `${base.name} - Variant ${variation}` : base.name,
        price: Math.round(base.price * (0.8 + Math.random() * 0.6)), // 20% price variation
        originalPrice: Math.round(base.price * (1.1 + Math.random() * 0.4)),
        rating: 3.8 + Math.random() * 1.2,
        reviewCount: Math.floor(Math.random() * 4000) + 300,
        image: getUniqueImage(base.name, sessionId), // Use unique image system
        category: base.category || 'General',
        brand: base.brand || base.name.split(' ')[0],
        prime: Math.random() > 0.2,
        inStock: true,
        source: 'placeholder',
      });
    }
    return result;
  };

  // Recipe/Food products
  if (lowerQuery.includes('biryani') || lowerQuery.includes('masala') || lowerQuery.includes('spice') || lowerQuery.includes('rice') || lowerQuery.includes('dal')) {
    const recipeProducts = [
      { name: 'Aashirvaad Atta Whole Wheat Flour 10kg', price: 530, category: 'Grocery', brand: 'Aashirvaad' },
      { name: 'Tata Sampann Toor Dal 1kg Premium', price: 160, category: 'Grocery', brand: 'Tata' },
      { name: 'Fortune Sunlite Refined Sunflower Oil 5L', price: 950, category: 'Grocery', brand: 'Fortune' },
      { name: 'MDH Biryani Masala Premium Blend 100g', price: 85, category: 'Grocery', brand: 'MDH' },
      { name: 'Daawat Basmati Rice 5kg Premium Long Grain', price: 450, category: 'Grocery', brand: 'Daawat' },
      { name: 'Catch Garam Masala Powder 200g', price: 145, category: 'Grocery', brand: 'Catch' },
      { name: 'Amul Fresh Cream 500ml Rich Dairy', price: 95, category: 'Grocery', brand: 'Amul' }
    ];
    return getRandomVariation(recipeProducts, num);
  }

  // Gift products
  if (lowerQuery.includes('gift') || lowerQuery.includes('present') || lowerQuery.includes('chocolate')) {
    const giftProducts = [
      { name: 'Nestle KitKat Dessert Delight Chocolate Gift Pack', price: 399, category: 'Gifts', brand: 'Nestle' },
      { name: 'Ferrero Rocher Premium Chocolate Box 24 Pieces', price: 699, category: 'Gifts', brand: 'Ferrero' },
      { name: 'boAt Airdopes 141 Wireless Earbuds Gift Pack', price: 1199, category: 'Electronics', brand: 'boAt' },
      { name: 'Amazon Echo Dot 5th Gen Smart Speaker', price: 3499, category: 'Electronics', brand: 'Amazon' },
      { name: 'Festive Scented Candle Gift Set 4 Pack', price: 599, category: 'Gifts', brand: 'Festive' },
      { name: 'Premium Leather Wallet for Men Brown', price: 799, category: 'Fashion', brand: 'Urban' }
    ];
    return getRandomVariation(giftProducts, num);
  }

  // Electronics products
  if (lowerQuery.includes('electronics') || lowerQuery.includes('phone') || lowerQuery.includes('mobile') || lowerQuery.includes('laptop') || lowerQuery.includes('headphone')) {
    const electronicsProducts = [
      { name: 'Samsung Galaxy M34 5G Smartphone 128GB', price: 18999, category: 'Electronics', brand: 'Samsung' },
      { name: 'OnePlus Nord CE3 Lite 5G Mobile Phone', price: 24999, category: 'Electronics', brand: 'OnePlus' },
      { name: 'boAt Rockerz 550 Wireless Headphones', price: 2499, category: 'Electronics', brand: 'boAt' },
      { name: 'Dell Inspiron 15 3000 Laptop Core i3', price: 35999, category: 'Electronics', brand: 'Dell' },
      { name: 'Sony WH-CH720N Noise Cancelling Headphones', price: 8990, category: 'Electronics', brand: 'Sony' },
      { name: 'Realme C55 Smartphone 64GB Storage', price: 12999, category: 'Electronics', brand: 'Realme' },
      { name: 'Apple AirPods 3rd Generation Wireless', price: 18900, category: 'Electronics', brand: 'Apple' }
    ];
    return getRandomVariation(electronicsProducts, num);
  }

  // Kitchen products
  if (lowerQuery.includes('kitchen') || lowerQuery.includes('cookware') || lowerQuery.includes('utensil')) {
    const kitchenProducts = [
      { name: 'Hawkins Pressure Cooker 3L Stainless Steel', price: 2299, category: 'Kitchen', brand: 'Hawkins' },
      { name: 'Prestige Svachh Non-Stick Tawa 25cm', price: 899, category: 'Kitchen', brand: 'Prestige' },
      { name: 'Butterfly Rapid 3L Electric Kettle', price: 1199, category: 'Kitchen', brand: 'Butterfly' },
      { name: 'Milton Thermosteel Flask 500ml', price: 699, category: 'Kitchen', brand: 'Milton' },
      { name: 'Bajaj Rex DLX 750W Mixer Grinder', price: 3499, category: 'Kitchen', brand: 'Bajaj' },
      { name: 'Pigeon Favourite Electric Rice Cooker 1.8L', price: 1899, category: 'Kitchen', brand: 'Pigeon' }
    ];
    return getRandomVariation(kitchenProducts, num);
  }

  // Default generic products
  const genericProducts = [
    { name: 'Smartphone Android 64GB Storage', price: 12999, category: 'Electronics', brand: 'TechBrand' },
    { name: 'Wireless Bluetooth Headphones', price: 2499, category: 'Electronics', brand: 'AudioTech' },
    { name: 'Premium Coffee Beans Arabica 500g', price: 699, category: 'Grocery', brand: 'CoffeeCo' },
    { name: 'Cotton T-Shirt Men Regular Fit', price: 899, category: 'Fashion', brand: 'StyleWear' },
    { name: 'Moisturizing Face Cream SPF 30', price: 449, category: 'Beauty', brand: 'SkinCare' },
    { name: 'Sports Running Shoes for Men', price: 1999, category: 'Fashion', brand: 'SportsFit' },
    { name: 'Stainless Steel Water Bottle 1L', price: 599, category: 'Kitchen', brand: 'AquaPure' }
  ];
  
  return getRandomVariation(genericProducts, num);
}
      { name: 'Amazon Echo Dot Smart Speaker Gift Edition', price: 3499, image: 'https://images.unsplash.com/photo-1543512214-318c7505f352?w=400', category: 'Electronics', brand: 'Amazon' },
      { name: 'Premium Scented Candle Gift Set 4-Pack', price: 599, image: 'https://images.unsplash.com/photo-1602874801006-2e2b9e4f5c1a?w=400', category: 'Gifts', brand: 'Festive' },
      { name: 'Leather Wallet Premium Gift Box for Men', price: 799, image: 'https://images.unsplash.com/photo-1627123424574-7307517d4e5e?w=400', category: 'Fashion', brand: 'Urban' }
    ];
    return getRandomVariation(giftProducts, num);
  }

  // Electronics
  if (lowerQuery.includes('phone') || lowerQuery.includes('mobile') || lowerQuery.includes('smartphone') || lowerQuery.includes('electronics')) {
    const electronicProducts = [
      { name: 'Samsung Galaxy Smartphone 128GB Storage', price: 12999, image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400', category: 'Electronics', brand: 'Samsung' },
      { name: 'Apple iPhone Latest Model 256GB', price: 45999, image: 'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=400', category: 'Electronics', brand: 'Apple' },
      { name: 'OnePlus Flagship Phone 12GB RAM', price: 29999, image: 'https://images.unsplash.com/photo-1601972602237-8c79241e468b?w=400', category: 'Electronics', brand: 'OnePlus' },
      { name: 'Sony Wireless Noise-Cancelling Headphones', price: 8999, image: 'https://images.unsplash.com/photo-1505740420928-5e560c3d4999?w=400', category: 'Electronics', brand: 'Sony' },
      { name: 'JBL Portable Bluetooth Speaker Waterproof', price: 3499, image: 'https://images.unsplash.com/photo-1545127398-14699f92334b?w=400', category: 'Electronics', brand: 'JBL' }
    ];
    return getRandomVariation(electronicProducts, num);
  }

  // Default general products
  const generalProducts = [
    { name: 'Premium Quality Product for Daily Use', price: 299, image: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400', category: 'General', brand: 'Premium' },
    { name: 'Multi-Purpose Utility Item Best Seller', price: 499, image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400', category: 'General', brand: 'Utility' },
    { name: 'Essential Household Product Top Rated', price: 199, image: 'https://images.unsplash.com/photo-1580870069867-74c57ee1bb07?w=400', category: 'Home', brand: 'Essential' },
    { name: 'Professional Grade Tool Kit Complete', price: 899, image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400', category: 'Tools', brand: 'Professional' },
    { name: 'Eco-Friendly Sustainable Choice Product', price: 599, image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400', category: 'Eco', brand: 'GreenChoice' }
  ];
  return getRandomVariation(generalProducts, num);
}

function generatePlaceholderProducts(intent) {
  const now = Date.now();
  const sessionId = Date.now(); // Create session ID for unique images

  if (intent.recipe === 'biryani' || intent.action === 'recipe') {
    return [
      { id: `mock_0_${now}`, title: 'Fresh Basmati Rice 5kg Premium Long Grain', price: 450, rating: 4.5, reviewCount: 8721, image: getUniqueImage('basmati rice', sessionId), category: 'Grocery', brand: 'Daawat', inStock: true, source: 'placeholder' },
      { id: `mock_1_${now}`, title: 'MDH Biryani Masala 100g Authentic Spice Mix', price: 85, rating: 4.6, reviewCount: 3210, image: getUniqueImage('biryani masala', sessionId), category: 'Grocery', brand: 'MDH', inStock: true, source: 'placeholder' },
      { id: `mock_2_${now}`, title: 'Fortune Sunlite Refined Oil 5L Cooking Oil', price: 950, rating: 4.3, reviewCount: 4521, image: getUniqueImage('cooking oil', sessionId), category: 'Grocery', brand: 'Fortune', inStock: true, source: 'placeholder' },
      { id: `mock_3_${now}`, title: 'Tata Sampann Toor Dal 1kg Premium Quality', price: 160, rating: 4.4, reviewCount: 3210, image: getUniqueImage('toor dal', sessionId), category: 'Grocery', brand: 'Tata', inStock: true, source: 'placeholder' },
      { id: `mock_4_${now}`, title: 'Catch Garam Masala Powder 200g Fresh Ground', price: 145, rating: 4.5, reviewCount: 2310, image: getUniqueImage('garam masala', sessionId), category: 'Grocery', brand: 'Catch', inStock: true, source: 'placeholder' },
      { id: `mock_5_${now}`, title: 'Fresh Chicken Drumstick 1kg Premium Cut', price: 280, rating: 4.2, reviewCount: 1200, image: getUniqueImage('chicken', sessionId), category: 'Grocery', brand: 'Fresh', inStock: true, source: 'placeholder' },
      { id: `mock_6_${now}`, title: 'Amul Fresh Cream 500ml Rich & Creamy', price: 95, rating: 4.4, reviewCount: 5600, image: getUniqueImage('fresh cream', sessionId), category: 'Grocery', brand: 'Amul', inStock: true, source: 'placeholder' },
      { id: `mock_7_${now}`, title: 'Lipton Darjeeling Tea Leaves 250g Premium', price: 210, rating: 4.5, reviewCount: 3400, image: getUniqueImage('tea leaves', sessionId), category: 'Grocery', brand: 'Lipton', inStock: true, source: 'placeholder' },
    ];
  }

  if (intent.action === 'gift') {
    return [
      { id: `mock_0_${now}`, title: 'Nestle KitKat Dessert Delight Gift Pack (10 pieces)', price: 399, rating: 4.6, reviewCount: 1820, image: getUniqueImage('chocolate gift', sessionId), category: 'Gifts', brand: 'Nestle', inStock: true, source: 'placeholder' },
      { id: `mock_1_${now}`, title: 'Ferrero Rocher Premium Chocolate Box 24 Pieces', price: 699, rating: 4.7, reviewCount: 3200, image: getUniqueImage('ferrero rocher', sessionId), category: 'Gifts', brand: 'Ferrero', inStock: true, source: 'placeholder' },
      { id: `mock_2_${now}`, title: 'boAt Wireless Earbuds with 42H Playtime', price: 1199, rating: 4.1, reviewCount: 89231, image: getUniqueImage('wireless earbuds', sessionId), category: 'Electronics', brand: 'boAt', inStock: true, source: 'placeholder' },
      { id: `mock_3_${now}`, title: 'Amazon Echo Dot 5th Gen Smart Speaker', price: 3499, rating: 4.5, reviewCount: 15672, image: getUniqueImage('smart speaker', sessionId), category: 'Electronics', brand: 'Amazon', inStock: true, source: 'placeholder' },
      { id: `mock_4_${now}`, title: 'Festive Scented Candle Gift Set (4 Pack)', price: 599, rating: 4.4, reviewCount: 2100, image: getUniqueImage('scented candles', sessionId), category: 'Gifts', brand: 'Festive', inStock: true, source: 'placeholder' },
      { id: `mock_5_${now}`, title: 'Premium Leather Wallet for Men - Brown', price: 799, rating: 4.3, reviewCount: 3400, image: getUniqueImage('leather wallet', sessionId), category: 'Fashion', brand: 'Urban', inStock: true, source: 'placeholder' },
    ];
  }

  // Generate variety of products for general search
  const baseProducts = [
    { name: 'Smartphone with 128GB Storage', price: 12999, category: 'Electronics', brand: 'TechBrand' },
    { name: 'Wireless Bluetooth Headphones', price: 2499, category: 'Electronics', brand: 'AudioTech' },
    { name: 'Premium Coffee Beans 500g', price: 699, category: 'Grocery', brand: 'CoffeeCo' },
    { name: 'Cotton T-Shirt for Men', price: 899, category: 'Fashion', brand: 'StyleWear' },
    { name: 'Moisturizing Face Cream 50ml', price: 449, category: 'Beauty', brand: 'SkinCare' }
  ];

  return baseProducts.slice(0, Math.min(intent.maxItems || 5, baseProducts.length)).map((p, i) => ({
    id: `mock_${i}_${now}`,
    title: p.name,
    price: p.price,
    originalPrice: Math.round(p.price * 1.2),
    rating: 4.0 + Math.random() * 1.0,
    reviewCount: Math.floor(Math.random() * 3000) + 200,
    image: getUniqueImage(p.name, sessionId),
    category: p.category,
    brand: p.brand,
    inStock: true,
    source: 'placeholder',
  }));
}

app.listen(PORT, () => {
  console.log(`Local API server running on http://localhost:${PORT}`);
  console.log('Available endpoints:');
  console.log('- POST /api/serpapi-proxy');
  console.log('- POST /api/razorpay-checkout/create-order');
  console.log('- POST /api/razorpay-checkout/verify-payment');
  console.log('- POST /api/ai-agent');
});
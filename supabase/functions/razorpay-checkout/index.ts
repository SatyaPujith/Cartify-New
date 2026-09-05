import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const url = new URL(req.url);
    const path = url.pathname.replace("/functions/v1/razorpay-checkout", "");

    if (path === "/create-order" && req.method === "POST") {
      return await handleCreateOrder(req, supabase);
    }

    if (path === "/verify-payment" && req.method === "POST") {
      return await handleVerifyPayment(req, supabase);
    }

    return new Response(
      JSON.stringify({ error: "Not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function handleCreateOrder(req: Request, supabase: ReturnType<typeof createClient>) {
  const { amount, cartItems, agentIntent } = await req.json();

  if (!amount || amount <= 0) {
    return new Response(
      JSON.stringify({ error: "Valid amount is required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const amountInPaise = Math.round(amount * 100);

  const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID");
  const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET");

  // If no Razorpay keys configured, return mock order for demo
  if (!razorpayKeyId || !razorpayKeySecret) {
    const mockOrderId = `order_mock_${Date.now()}`;

    const { data: order } = await supabase
      .from("orders")
      .insert({
        razorpay_order_id: mockOrderId,
        amount: amountInPaise,
        currency: "INR",
        status: "pending",
        agent_intent: agentIntent || null,
      })
      .select()
      .single();

    if (cartItems && order) {
      const items = cartItems.map((item: { id: string; title: string; price: number; quantity: number; image?: string; source?: string }) => ({
        order_id: order.id,
        product_id: item.id,
        title: item.title,
        price: Math.round(item.price * 100),
        quantity: item.quantity,
        image: item.image || null,
        source: item.source || "placeholder",
      }));
      await supabase.from("order_items").insert(items);
    }

    await supabase.from("audit_log").insert({
      action: "PAYMENT_INITIATED",
      description: `Payment initiated for ₹${amount} (mock mode - no Razorpay keys)`,
      amount: amountInPaise,
      status: "pending",
      details: { orderId: mockOrderId, mode: "mock", cartItemCount: cartItems?.length || 0 },
    });

    return new Response(
      JSON.stringify({
        orderId: mockOrderId,
        razorpayOrderId: mockOrderId,
        amount: amountInPaise,
        currency: "INR",
        keyId: "rzp_test_mock_key",
        mockMode: true,
        message: "Razorpay keys not configured — running in mock mode. Payment will be simulated.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Create real Razorpay order via API
  const auth = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);

  const razorpayResponse = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Basic ${auth}`,
    },
    body: JSON.stringify({
      amount: amountInPaise,
      currency: "INR",
      notes: { agent_intent: agentIntent || "" },
    }),
  });

  if (!razorpayResponse.ok) {
    const errorText = await razorpayResponse.text();

    await supabase.from("audit_log").insert({
      action: "PAYMENT_INITIATED",
      description: `Razorpay order creation failed for ₹${amount}`,
      amount: amountInPaise,
      status: "failed",
      details: { error: errorText, statusCode: razorpayResponse.status },
    });

    return new Response(
      JSON.stringify({ error: "Razorpay order creation failed", details: errorText }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const razorpayOrder = await razorpayResponse.json();

  // Save order to database
  const { data: order } = await supabase
    .from("orders")
    .insert({
      razorpay_order_id: razorpayOrder.id,
      amount: amountInPaise,
      currency: "INR",
      status: "pending",
      agent_intent: agentIntent || null,
    })
    .select()
    .single();

  if (cartItems && order) {
    const items = cartItems.map((item: { id: string; title: string; price: number; quantity: number; image?: string; source?: string }) => ({
      order_id: order.id,
      product_id: item.id,
      title: item.title,
      price: Math.round(item.price * 100),
      quantity: item.quantity,
      image: item.image || null,
      source: item.source || "placeholder",
    }));
    await supabase.from("order_items").insert(items);
  }

  await supabase.from("audit_log").insert({
    action: "PAYMENT_INITIATED",
    description: `Razorpay order created for ₹${amount}`,
    amount: amountInPaise,
    status: "pending",
    details: { razorpayOrderId: razorpayOrder.id, cartItemCount: cartItems?.length || 0 },
  });

  return new Response(
    JSON.stringify({
      orderId: razorpayOrder.id,
      razorpayOrderId: razorpayOrder.id,
      amount: amountInPaise,
      currency: "INR",
      keyId: razorpayKeyId,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function handleVerifyPayment(req: Request, supabase: ReturnType<typeof createClient>) {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature, mockMode } = await req.json();

  if (!razorpayOrderId || !razorpayPaymentId) {
    return new Response(
      JSON.stringify({ error: "Missing payment details" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Mock mode: auto-verify
  if (mockMode) {
    const { data: order } = await supabase
      .from("orders")
      .update({
        razorpay_payment_id: razorpayPaymentId,
        razorpay_signature: razorpaySignature || "mock_signature",
        status: "paid",
        updated_at: new Date().toISOString(),
      })
      .eq("razorpay_order_id", razorpayOrderId)
      .select()
      .single();

    await supabase.from("audit_log").insert({
      action: "PAYMENT_SUCCESS",
      description: `Payment verified (mock mode) for order ${razorpayOrderId}`,
      amount: order?.amount,
      status: "success",
      details: { razorpayOrderId, razorpayPaymentId, mockMode: true },
    });

    return new Response(
      JSON.stringify({
        verified: true,
        orderId: order?.id,
        status: "paid",
        mockMode: true,
        message: "Payment verified successfully (mock mode)",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Real verification: check signature using HMAC SHA256
  const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET")!;

  const generatedSignature = await generateHmacSha256(
    `${razorpayOrderId}|${razorpayPaymentId}`,
    razorpayKeySecret
  );

  if (generatedSignature !== razorpaySignature) {
    const { data: order } = await supabase
      .from("orders")
      .update({ status: "failed", updated_at: new Date().toISOString() })
      .eq("razorpay_order_id", razorpayOrderId)
      .select()
      .single();

    await supabase.from("audit_log").insert({
      action: "PAYMENT_FAILED",
      description: `Payment signature verification failed for order ${razorpayOrderId}`,
      amount: order?.amount,
      status: "failed",
      details: { razorpayOrderId, razorpayPaymentId },
    });

    return new Response(
      JSON.stringify({ verified: false, error: "Signature mismatch" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Signature matches — mark as paid
  const { data: order } = await supabase
    .from("orders")
    .update({
      razorpay_payment_id: razorpayPaymentId,
      razorpay_signature: razorpaySignature,
      status: "paid",
      updated_at: new Date().toISOString(),
    })
    .eq("razorpay_order_id", razorpayOrderId)
    .select()
    .single();

  await supabase.from("audit_log").insert({
    action: "PAYMENT_SUCCESS",
    description: `Payment verified for order ${razorpayOrderId}`,
    amount: order?.amount,
    status: "success",
    details: { razorpayOrderId, razorpayPaymentId },
  });

  return new Response(
    JSON.stringify({
      verified: true,
      orderId: order?.id,
      status: "paid",
      message: "Payment verified successfully",
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function generateHmacSha256(message: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  const bytes = new Uint8Array(signature);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

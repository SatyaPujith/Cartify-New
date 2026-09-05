/*
# Create orders, order_items, and audit_log tables

## Purpose
This migration creates the core data tables for an AI-powered shopping agent that
processes payments via Razorpay test mode. The app has no sign-in screen, so all
tables are single-tenant with anon+authenticated access.

## New Tables

### 1. orders
- `id` (uuid, primary key) — unique order identifier
- `razorpay_order_id` (text) — Razorpay order ID returned by Razorpay API
- `razorpay_payment_id` (text, nullable) — payment ID after successful payment
- `razorpay_signature` (text, nullable) — signature for payment verification
- `amount` (integer, not null) — total order amount in paise (1 INR = 100 paise)
- `currency` (text, default 'INR') — payment currency
- `status` (text, default 'pending') — order status: pending, paid, failed, cancelled
- `agent_intent` (text, nullable) — the original natural language prompt from the user
- `created_at` (timestamptz, default now()) — order creation timestamp
- `updated_at` (timestamptz, default now()) — last update timestamp

### 2. order_items
- `id` (uuid, primary key) — unique line item identifier
- `order_id` (uuid, foreign key to orders.id, cascade delete) — parent order
- `product_id` (text, not null) — product identifier from search results
- `title` (text, not null) — product name at time of purchase
- `price` (integer, not null) — unit price in paise
- `quantity` (integer, not null, default 1) — quantity purchased
- `image` (text, nullable) — product image URL
- `source` (text, nullable) — where the product was found (serpapi, placeholder)
- `created_at` (timestamptz, default now()) — creation timestamp

### 3. audit_log
- `id` (uuid, primary key) — unique audit entry identifier
- `action` (text, not null) — action type: ADD_TO_CART, REMOVE_FROM_CART, AGENT_SEARCH,
  AGENT_ADD_ITEMS, PAYMENT_INITIATED, PAYMENT_SUCCESS, PAYMENT_FAILED, PAYMENT_CANCELLED
- `description` (text, not null) — human-readable description of the action
- `amount` (integer, nullable) — monetary amount in paise if applicable
- `status` (text, default 'success') — action status: success, failed, pending, cancelled
- `details` (jsonb, nullable) — additional structured details about the action
- `created_at` (timestamptz, default now()) — timestamp of the action

## Security
- RLS enabled on all tables.
- All tables allow anon+authenticated CRUD (single-tenant, no-auth app).
- `USING (true)` is intentional — data is intentionally shared/public for this demo app.

## Notes
1. Amounts are stored in paise (1 INR = 100 paise) to match Razorpay's format.
2. The audit_log table serves as the hackathon's required "audit trail" for every
   money action — explainable, bounded, and gated.
3. order_items cascade-delete with their parent order.
*/

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  razorpay_order_id text,
  razorpay_payment_id text,
  razorpay_signature text,
  amount integer NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  status text NOT NULL DEFAULT 'pending',
  agent_intent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_orders" ON orders;
CREATE POLICY "anon_select_orders" ON orders FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_orders" ON orders;
CREATE POLICY "anon_insert_orders" ON orders FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_orders" ON orders;
CREATE POLICY "anon_update_orders" ON orders FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_orders" ON orders;
CREATE POLICY "anon_delete_orders" ON orders FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id text NOT NULL,
  title text NOT NULL,
  price integer NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  image text,
  source text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_order_items" ON order_items;
CREATE POLICY "anon_select_order_items" ON order_items FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_order_items" ON order_items;
CREATE POLICY "anon_insert_order_items" ON order_items FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_order_items" ON order_items;
CREATE POLICY "anon_update_order_items" ON order_items FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_order_items" ON order_items;
CREATE POLICY "anon_delete_order_items" ON order_items FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  description text NOT NULL,
  amount integer,
  status text NOT NULL DEFAULT 'success',
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_audit_log" ON audit_log;
CREATE POLICY "anon_select_audit_log" ON audit_log FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_audit_log" ON audit_log;
CREATE POLICY "anon_insert_audit_log" ON audit_log FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_audit_log" ON audit_log;
CREATE POLICY "anon_update_audit_log" ON audit_log FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_audit_log" ON audit_log;
CREATE POLICY "anon_delete_audit_log" ON audit_log FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);

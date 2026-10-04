/*
# Create subscriptions table

1. New Tables
- `subscriptions` — platform subscription records for municipalities, businesses, and recyclers
  - `org_name` (text, not null) — organization name
  - `org_type` (text, not null) — organization type: municipality, business, recycler
  - `plan` (text, not null) — subscription plan: basic, pro, enterprise
  - `status` (text, not null) — subscription status: active, trial, expired, suspended, pending
  - `start_date` (text, not null) — subscription start date
  - `end_date` (text, not null) — subscription end date
  - `monthly_fee` (integer, not null) — monthly fee in DZD
  - `included_users` (integer, not null) — max users allowed
  - `used_users` (integer, not null) — current user count
  - `included_zones` (integer, not null) — max zones allowed
  - `used_zones` (integer, not null) — current zone count
  - `api_calls_limit` (integer, not null) — monthly API call limit
  - `api_calls_used` (integer, not null) — API calls used this month
  - `storage_limit_gb` (integer, not null) — storage limit in GB
  - `storage_used_gb` (integer, not null) — storage used in GB
  - `auto_renew` (boolean, not null) — whether subscription auto-renews
  - `payment_method` (text, not null) — payment method
  - `contact_name` (text, not null) — contact person name
  - `contact_email` (text, not null) — contact email
  - `contact_phone` (text, not null) — contact phone

2. Security
- RLS enabled on `subscriptions`.
- All policies use `TO anon, authenticated` (single-tenant app, no sign-in).
- All CRUD operations are public (USING (true) / WITH CHECK (true)).

3. Notes
- Uses `gen_random_uuid()` for primary key.
- Created_at timestamp defaults to now().
*/

CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_name text NOT NULL,
  org_type text NOT NULL CHECK (org_type IN ('municipality','business','recycler')),
  plan text NOT NULL CHECK (plan IN ('basic','pro','enterprise')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('active','trial','expired','suspended','pending')),
  start_date text NOT NULL,
  end_date text NOT NULL,
  monthly_fee integer NOT NULL DEFAULT 0,
  included_users integer NOT NULL DEFAULT 0,
  used_users integer NOT NULL DEFAULT 0,
  included_zones integer NOT NULL DEFAULT 0,
  used_zones integer NOT NULL DEFAULT 0,
  api_calls_limit integer NOT NULL DEFAULT 0,
  api_calls_used integer NOT NULL DEFAULT 0,
  storage_limit_gb integer NOT NULL DEFAULT 0,
  storage_used_gb integer NOT NULL DEFAULT 0,
  auto_renew boolean NOT NULL DEFAULT false,
  payment_method text NOT NULL,
  contact_name text NOT NULL,
  contact_email text NOT NULL,
  contact_phone text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_subscriptions" ON subscriptions;
CREATE POLICY "anon_select_subscriptions" ON subscriptions FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_subscriptions" ON subscriptions;
CREATE POLICY "anon_insert_subscriptions" ON subscriptions FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_subscriptions" ON subscriptions;
CREATE POLICY "anon_update_subscriptions" ON subscriptions FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_subscriptions" ON subscriptions;
CREATE POLICY "anon_delete_subscriptions" ON subscriptions FOR DELETE
TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan ON subscriptions(plan);
CREATE INDEX IF NOT EXISTS idx_subscriptions_org_type ON subscriptions(org_type);

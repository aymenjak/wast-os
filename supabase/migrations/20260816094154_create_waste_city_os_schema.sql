/*
# Create Waste City OS schema (single-tenant, no auth)

1. New Tables
- `citizen_reports` — reports submitted by citizens (overflowing containers, illegal dumping, etc.)
- `work_orders` — operational work orders derived from reports or B2B requests
- `containers` — waste containers with IoT sensor data
- `vehicles` — fleet vehicles with live tracking data
- `drivers` — driver profiles and assignments
- `routes` — collection routes with progress tracking
- `businesses` — B2B customer businesses
- `contracts` — service contracts with businesses
- `collection_requests` — one-off collection requests from businesses
- `invoices` — invoices issued to businesses
- `payments` — payments received against invoices
- `recycler_centers` — recycling facilities
- `material_inventory` — recycled material stock levels
- `marketplace_listings` — material listings for sale
- `weighbridge_transactions` — vehicle weighbridge tickets
- `transfer_stations` — waste transfer stations with storage tracking
- `maintenance_records` — vehicle maintenance records
- `audit_logs` — audit trail of sensitive actions
- `eco_profiles` — citizen gamification profiles with eco points
- `zones` — zone performance statistics
- `waste_by_type` — waste composition data by type
- `monthly_collection` — monthly collection volume trends
- `activity_feed` — live activity feed items
- `kpi_data` — dashboard KPI metrics

2. Security
- RLS enabled on every table.
- All policies use `TO anon, authenticated` since this is a single-tenant app with no sign-in screen.
- All CRUD operations are public (USING (true) / WITH CHECK (true)) because the data is intentionally shared.

3. Notes
- All tables use `gen_random_uuid()` for primary keys.
- Timestamps default to `now()`.
- Enums are modeled as TEXT with CHECK constraints to match the TypeScript union types.
*/

-- Citizen reports
CREATE TABLE IF NOT EXISTS citizen_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id text NOT NULL UNIQUE,
  type text NOT NULL CHECK (type IN ('overflowing_container','illegal_dumping','missed_collection','damaged_container','waste_scattered','large_waste','hazardous_waste','bad_smell','other')),
  status text NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED','RECEIVED','AI_REVIEW','VERIFIED','ASSIGNED','EN_ROUTE','IN_PROGRESS','RESOLVED','REJECTED','DUPLICATE','CLOSED')),
  priority text NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('CRITICAL','HIGH','NORMAL','LOW')),
  citizen_name text NOT NULL,
  location text NOT NULL,
  zone text NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  description text NOT NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  assigned_team text,
  estimated_response text,
  resolved_at timestamptz,
  rating integer,
  ai_confidence double precision,
  has_photo boolean NOT NULL DEFAULT false
);

ALTER TABLE citizen_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_citizen_reports" ON citizen_reports;
CREATE POLICY "anon_select_citizen_reports" ON citizen_reports FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_citizen_reports" ON citizen_reports;
CREATE POLICY "anon_insert_citizen_reports" ON citizen_reports FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_citizen_reports" ON citizen_reports;
CREATE POLICY "anon_update_citizen_reports" ON citizen_reports FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_citizen_reports" ON citizen_reports;
CREATE POLICY "anon_delete_citizen_reports" ON citizen_reports FOR DELETE TO anon, authenticated USING (true);

-- Work orders
CREATE TABLE IF NOT EXISTS work_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text NOT NULL UNIQUE,
  type text NOT NULL CHECK (type IN ('citizen_complaint','b2b_collection','container_maintenance','emergency_cleanup','scheduled_route','illegal_dumping')),
  status text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','ASSIGNED','IN_PROGRESS','COMPLETED','CANCELLED','OVERDUE')),
  priority text NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('CRITICAL','HIGH','NORMAL','LOW')),
  location text NOT NULL,
  zone text NOT NULL,
  description text NOT NULL,
  assigned_team text,
  assigned_vehicle text,
  driver text,
  due_time timestamptz NOT NULL DEFAULT now(),
  sla_status text NOT NULL DEFAULT 'ON_TRACK' CHECK (sla_status IN ('ON_TRACK','AT_RISK','BREACHED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  progress integer NOT NULL DEFAULT 0
);

ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_work_orders" ON work_orders;
CREATE POLICY "anon_select_work_orders" ON work_orders FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_work_orders" ON work_orders;
CREATE POLICY "anon_insert_work_orders" ON work_orders FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_work_orders" ON work_orders;
CREATE POLICY "anon_update_work_orders" ON work_orders FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_work_orders" ON work_orders;
CREATE POLICY "anon_delete_work_orders" ON work_orders FOR DELETE TO anon, authenticated USING (true);

-- Containers
CREATE TABLE IF NOT EXISTS containers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  container_id text NOT NULL UNIQUE,
  type text NOT NULL,
  capacity integer NOT NULL,
  fill_level integer NOT NULL DEFAULT 0,
  waste_type text NOT NULL CHECK (waste_type IN ('GENERAL','ORGANIC','PLASTIC','PAPER','CARDBOARD','GLASS','METAL','ELECTRONIC','CONSTRUCTION','MEDICAL','HAZARDOUS','LARGE_WASTE','USED_OIL','OTHER')),
  zone text NOT NULL,
  location text NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','FULL','DAMAGED','MAINTENANCE','REMOVED')),
  last_collection timestamptz,
  next_collection timestamptz,
  has_sensor boolean NOT NULL DEFAULT false
);

ALTER TABLE containers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_containers" ON containers;
CREATE POLICY "anon_select_containers" ON containers FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_containers" ON containers;
CREATE POLICY "anon_insert_containers" ON containers FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_containers" ON containers;
CREATE POLICY "anon_update_containers" ON containers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_containers" ON containers;
CREATE POLICY "anon_delete_containers" ON containers FOR DELETE TO anon, authenticated USING (true);

-- Vehicles
CREATE TABLE IF NOT EXISTS vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plate text NOT NULL UNIQUE,
  type text NOT NULL,
  capacity integer NOT NULL,
  current_load integer NOT NULL DEFAULT 0,
  driver text NOT NULL,
  status text NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE','ON_ROUTE','LOADING','MAINTENANCE','OFFLINE')),
  zone text NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  mileage integer NOT NULL DEFAULT 0,
  fuel integer NOT NULL DEFAULT 100,
  speed integer NOT NULL DEFAULT 0,
  route_progress integer NOT NULL DEFAULT 0,
  next_stop text NOT NULL DEFAULT 'N/A',
  eta text NOT NULL DEFAULT 'N/A'
);

ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_vehicles" ON vehicles;
CREATE POLICY "anon_select_vehicles" ON vehicles FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_vehicles" ON vehicles;
CREATE POLICY "anon_insert_vehicles" ON vehicles FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_vehicles" ON vehicles;
CREATE POLICY "anon_update_vehicles" ON vehicles FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_vehicles" ON vehicles;
CREATE POLICY "anon_delete_vehicles" ON vehicles FOR DELETE TO anon, authenticated USING (true);

-- Drivers
CREATE TABLE IF NOT EXISTS drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL,
  license text NOT NULL,
  assigned_vehicle text NOT NULL,
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available','on_route','off_duty','on_leave')),
  rating double precision NOT NULL DEFAULT 5.0,
  completed_routes integer NOT NULL DEFAULT 0,
  hours_this_week integer NOT NULL DEFAULT 0,
  zone text NOT NULL
);

ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_drivers" ON drivers;
CREATE POLICY "anon_select_drivers" ON drivers FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_drivers" ON drivers;
CREATE POLICY "anon_insert_drivers" ON drivers FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_drivers" ON drivers;
CREATE POLICY "anon_update_drivers" ON drivers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_drivers" ON drivers;
CREATE POLICY "anon_delete_drivers" ON drivers FOR DELETE TO anon, authenticated USING (true);

-- Routes
CREATE TABLE IF NOT EXISTS routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id text NOT NULL UNIQUE,
  driver text NOT NULL,
  vehicle text NOT NULL,
  zone text NOT NULL,
  stops integer NOT NULL DEFAULT 0,
  distance double precision NOT NULL DEFAULT 0,
  estimated_duration text NOT NULL,
  collected_weight double precision NOT NULL DEFAULT 0,
  progress integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','active','completed','delayed')),
  start_time timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_routes" ON routes;
CREATE POLICY "anon_select_routes" ON routes FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_routes" ON routes;
CREATE POLICY "anon_insert_routes" ON routes FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_routes" ON routes;
CREATE POLICY "anon_update_routes" ON routes FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_routes" ON routes;
CREATE POLICY "anon_delete_routes" ON routes FOR DELETE TO anon, authenticated USING (true);

-- Businesses
CREATE TABLE IF NOT EXISTS businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,
  legal_id text NOT NULL,
  address text NOT NULL,
  zone text NOT NULL,
  contact_name text NOT NULL,
  contact_email text NOT NULL,
  contact_phone text NOT NULL,
  contract_status text NOT NULL DEFAULT 'none' CHECK (contract_status IN ('active','expired','pending','none')),
  monthly_volume double precision NOT NULL DEFAULT 0,
  recycling_rate integer NOT NULL DEFAULT 0,
  outstanding_balance integer NOT NULL DEFAULT 0,
  locations integer NOT NULL DEFAULT 1,
  containers integer NOT NULL DEFAULT 0
);

ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_businesses" ON businesses;
CREATE POLICY "anon_select_businesses" ON businesses FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_businesses" ON businesses;
CREATE POLICY "anon_insert_businesses" ON businesses FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_businesses" ON businesses;
CREATE POLICY "anon_update_businesses" ON businesses FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_businesses" ON businesses;
CREATE POLICY "anon_delete_businesses" ON businesses FOR DELETE TO anon, authenticated USING (true);

-- Contracts
CREATE TABLE IF NOT EXISTS contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id text NOT NULL UNIQUE,
  customer text NOT NULL,
  start_date text NOT NULL,
  end_date text NOT NULL,
  waste_types text[] NOT NULL DEFAULT '{}',
  frequency text NOT NULL,
  container_count integer NOT NULL DEFAULT 0,
  monthly_price integer NOT NULL DEFAULT 0,
  extra_pickup_price integer NOT NULL DEFAULT 0,
  sla text NOT NULL,
  payment_terms text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('active','expiring','expired','pending'))
);

ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_contracts" ON contracts;
CREATE POLICY "anon_select_contracts" ON contracts FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_contracts" ON contracts;
CREATE POLICY "anon_insert_contracts" ON contracts FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_contracts" ON contracts;
CREATE POLICY "anon_update_contracts" ON contracts FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_contracts" ON contracts;
CREATE POLICY "anon_delete_contracts" ON contracts FOR DELETE TO anon, authenticated USING (true);

-- Collection requests
CREATE TABLE IF NOT EXISTS collection_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id text NOT NULL UNIQUE,
  business text NOT NULL,
  waste_type text NOT NULL,
  quantity integer NOT NULL DEFAULT 0,
  container text NOT NULL,
  location text NOT NULL,
  preferred_date text NOT NULL,
  priority text NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('CRITICAL','HIGH','NORMAL','LOW')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','priced','dispatched','collected','completed','cancelled')),
  notes text,
  price integer
);

ALTER TABLE collection_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_collection_requests" ON collection_requests;
CREATE POLICY "anon_select_collection_requests" ON collection_requests FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_collection_requests" ON collection_requests;
CREATE POLICY "anon_insert_collection_requests" ON collection_requests FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_collection_requests" ON collection_requests;
CREATE POLICY "anon_update_collection_requests" ON collection_requests FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_collection_requests" ON collection_requests;
CREATE POLICY "anon_delete_collection_requests" ON collection_requests FOR DELETE TO anon, authenticated USING (true);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id text NOT NULL UNIQUE,
  customer text NOT NULL,
  issue_date text NOT NULL,
  due_date text NOT NULL,
  items text[] NOT NULL DEFAULT '{}',
  amount integer NOT NULL DEFAULT 0,
  tax integer NOT NULL DEFAULT 0,
  total integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','ISSUED','SENT','PARTIALLY_PAID','PAID','OVERDUE','CANCELLED'))
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_invoices" ON invoices;
CREATE POLICY "anon_select_invoices" ON invoices FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_invoices" ON invoices;
CREATE POLICY "anon_insert_invoices" ON invoices FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_invoices" ON invoices;
CREATE POLICY "anon_update_invoices" ON invoices FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_invoices" ON invoices;
CREATE POLICY "anon_delete_invoices" ON invoices FOR DELETE TO anon, authenticated USING (true);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id text NOT NULL UNIQUE,
  invoice_ref text NOT NULL,
  customer text NOT NULL,
  amount integer NOT NULL DEFAULT 0,
  method text NOT NULL,
  date text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('completed','pending','failed'))
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_payments" ON payments;
CREATE POLICY "anon_select_payments" ON payments FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_payments" ON payments;
CREATE POLICY "anon_insert_payments" ON payments FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_payments" ON payments;
CREATE POLICY "anon_update_payments" ON payments FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_payments" ON payments;
CREATE POLICY "anon_delete_payments" ON payments FOR DELETE TO anon, authenticated USING (true);

-- Recycler centers
CREATE TABLE IF NOT EXISTS recycler_centers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location text NOT NULL,
  zone text NOT NULL,
  capacity integer NOT NULL DEFAULT 0,
  incoming_today integer NOT NULL DEFAULT 0,
  processed_today integer NOT NULL DEFAULT 0,
  recovered_today integer NOT NULL DEFAULT 0,
  rejects_today integer NOT NULL DEFAULT 0,
  efficiency integer NOT NULL DEFAULT 0,
  materials text[] NOT NULL DEFAULT '{}'
);

ALTER TABLE recycler_centers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_recycler_centers" ON recycler_centers;
CREATE POLICY "anon_select_recycler_centers" ON recycler_centers FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_recycler_centers" ON recycler_centers;
CREATE POLICY "anon_insert_recycler_centers" ON recycler_centers FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_recycler_centers" ON recycler_centers;
CREATE POLICY "anon_update_recycler_centers" ON recycler_centers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_recycler_centers" ON recycler_centers;
CREATE POLICY "anon_delete_recycler_centers" ON recycler_centers FOR DELETE TO anon, authenticated USING (true);

-- Material inventory
CREATE TABLE IF NOT EXISTS material_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material text NOT NULL,
  unit text NOT NULL,
  opening_stock integer NOT NULL DEFAULT 0,
  incoming integer NOT NULL DEFAULT 0,
  processed integer NOT NULL DEFAULT 0,
  sold integer NOT NULL DEFAULT 0,
  current_stock integer NOT NULL DEFAULT 0,
  quality text NOT NULL CHECK (quality IN ('A','B','C')),
  price_per_ton integer NOT NULL DEFAULT 0
);

ALTER TABLE material_inventory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_material_inventory" ON material_inventory;
CREATE POLICY "anon_select_material_inventory" ON material_inventory FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_material_inventory" ON material_inventory;
CREATE POLICY "anon_insert_material_inventory" ON material_inventory FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_material_inventory" ON material_inventory;
CREATE POLICY "anon_update_material_inventory" ON material_inventory FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_material_inventory" ON material_inventory;
CREATE POLICY "anon_delete_material_inventory" ON material_inventory FOR DELETE TO anon, authenticated USING (true);

-- Marketplace listings
CREATE TABLE IF NOT EXISTS marketplace_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id text NOT NULL UNIQUE,
  material text NOT NULL,
  quantity integer NOT NULL DEFAULT 0,
  unit text NOT NULL,
  quality text NOT NULL,
  price integer NOT NULL DEFAULT 0,
  location text NOT NULL,
  seller text NOT NULL,
  available_date text NOT NULL,
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available','reserved','sold'))
);

ALTER TABLE marketplace_listings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_marketplace_listings" ON marketplace_listings;
CREATE POLICY "anon_select_marketplace_listings" ON marketplace_listings FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_marketplace_listings" ON marketplace_listings;
CREATE POLICY "anon_insert_marketplace_listings" ON marketplace_listings FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_marketplace_listings" ON marketplace_listings;
CREATE POLICY "anon_update_marketplace_listings" ON marketplace_listings FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_marketplace_listings" ON marketplace_listings;
CREATE POLICY "anon_delete_marketlistings" ON marketplace_listings FOR DELETE TO anon, authenticated USING (true);

-- Weighbridge transactions
CREATE TABLE IF NOT EXISTS weighbridge_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id text NOT NULL UNIQUE,
  vehicle text NOT NULL,
  driver text NOT NULL,
  gross_weight integer NOT NULL DEFAULT 0,
  tare_weight integer NOT NULL DEFAULT 0,
  net_weight integer NOT NULL DEFAULT 0,
  waste_type text NOT NULL,
  origin text NOT NULL,
  destination text NOT NULL,
  timestamp timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'entered' CHECK (status IN ('entered','weighed','completed'))
);

ALTER TABLE weighbridge_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_weighbridge_transactions" ON weighbridge_transactions;
CREATE POLICY "anon_select_weighbridge_transactions" ON weighbridge_transactions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_weighbridge_transactions" ON weighbridge_transactions;
CREATE POLICY "anon_insert_weighbridge_transactions" ON weighbridge_transactions FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_weighbridge_transactions" ON weighbridge_transactions;
CREATE POLICY "anon_update_weighbridge_transactions" ON weighbridge_transactions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_weighbridge_transactions" ON weighbridge_transactions;
CREATE POLICY "anon_delete_weighbridge_transactions" ON weighbridge_transactions FOR DELETE TO anon, authenticated USING (true);

-- Transfer stations
CREATE TABLE IF NOT EXISTS transfer_stations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location text NOT NULL,
  zone text NOT NULL,
  incoming_today integer NOT NULL DEFAULT 0,
  outgoing_today integer NOT NULL DEFAULT 0,
  storage_current integer NOT NULL DEFAULT 0,
  storage_capacity integer NOT NULL DEFAULT 0,
  trucks_processed integer NOT NULL DEFAULT 0,
  avg_wait_time text NOT NULL,
  status text NOT NULL DEFAULT 'operational' CHECK (status IN ('operational','near_capacity','offline'))
);

ALTER TABLE transfer_stations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_transfer_stations" ON transfer_stations;
CREATE POLICY "anon_select_transfer_stations" ON transfer_stations FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_transfer_stations" ON transfer_stations;
CREATE POLICY "anon_insert_transfer_stations" ON transfer_stations FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_transfer_stations" ON transfer_stations;
CREATE POLICY "anon_update_transfer_stations" ON transfer_stations FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_transfer_stations" ON transfer_stations;
CREATE POLICY "anon_delete_transfer_stations" ON transfer_stations FOR DELETE TO anon, authenticated USING (true);

-- Maintenance records
CREATE TABLE IF NOT EXISTS maintenance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle text NOT NULL,
  type text NOT NULL,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('in_progress','scheduled','completed')),
  assigned_to text NOT NULL,
  start_date text NOT NULL,
  est_completion text NOT NULL,
  cost integer NOT NULL DEFAULT 0,
  mileage integer NOT NULL DEFAULT 0
);

ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_maintenance_records" ON maintenance_records;
CREATE POLICY "anon_select_maintenance_records" ON maintenance_records FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_maintenance_records" ON maintenance_records;
CREATE POLICY "anon_insert_maintenance_records" ON maintenance_records FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_maintenance_records" ON maintenance_records;
CREATE POLICY "anon_update_maintenance_records" ON maintenance_records FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_maintenance_records" ON maintenance_records;
CREATE POLICY "anon_delete_maintenance_records" ON maintenance_records FOR DELETE TO anon, authenticated USING (true);

-- Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_name text NOT NULL,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id text NOT NULL,
  timestamp timestamptz NOT NULL DEFAULT now(),
  ip text NOT NULL,
  before_value text,
  after_value text
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_audit_logs" ON audit_logs;
CREATE POLICY "anon_select_audit_logs" ON audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_audit_logs" ON audit_logs;
CREATE POLICY "anon_insert_audit_logs" ON audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_audit_logs" ON audit_logs;
CREATE POLICY "anon_update_audit_logs" ON audit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_audit_logs" ON audit_logs;
CREATE POLICY "anon_delete_audit_logs" ON audit_logs FOR DELETE TO anon, authenticated USING (true);

-- Eco profiles
CREATE TABLE IF NOT EXISTS eco_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  citizen text NOT NULL,
  eco_points integer NOT NULL DEFAULT 0,
  level text NOT NULL,
  total_reports integer NOT NULL DEFAULT 0,
  verified_reports integer NOT NULL DEFAULT 0,
  recycling_actions integer NOT NULL DEFAULT 0,
  cleanups integer NOT NULL DEFAULT 0
);

ALTER TABLE eco_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_eco_profiles" ON eco_profiles;
CREATE POLICY "anon_select_eco_profiles" ON eco_profiles FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_eco_profiles" ON eco_profiles;
CREATE POLICY "anon_insert_eco_profiles" ON eco_profiles FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_eco_profiles" ON eco_profiles;
CREATE POLICY "anon_update_eco_profiles" ON eco_profiles FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_eco_profiles" ON eco_profiles;
CREATE POLICY "anon_delete_eco_profiles" ON eco_profiles FOR DELETE TO anon, authenticated USING (true);

-- Zones
CREATE TABLE IF NOT EXISTS zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone text NOT NULL,
  reports integer NOT NULL DEFAULT 0,
  waste_collected integer NOT NULL DEFAULT 0,
  recycling_rate integer NOT NULL DEFAULT 0,
  sla_compliance integer NOT NULL DEFAULT 0
);

ALTER TABLE zones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_zones" ON zones;
CREATE POLICY "anon_select_zones" ON zones FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_zones" ON zones;
CREATE POLICY "anon_insert_zones" ON zones FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_zones" ON zones;
CREATE POLICY "anon_update_zones" ON zones FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_zones" ON zones;
CREATE POLICY "anon_delete_zones" ON zones FOR DELETE TO anon, authenticated USING (true);

-- Waste by type
CREATE TABLE IF NOT EXISTS waste_by_type (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  tons integer NOT NULL DEFAULT 0,
  color text NOT NULL
);

ALTER TABLE waste_by_type ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_waste_by_type" ON waste_by_type;
CREATE POLICY "anon_select_waste_by_type" ON waste_by_type FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_waste_by_type" ON waste_by_type;
CREATE POLICY "anon_insert_waste_by_type" ON waste_by_type FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_waste_by_type" ON waste_by_type;
CREATE POLICY "anon_update_waste_by_type" ON waste_by_type FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_waste_by_type" ON waste_by_type;
CREATE POLICY "anon_delete_waste_by_type" ON waste_by_type FOR DELETE TO anon, authenticated USING (true);

-- Monthly collection
CREATE TABLE IF NOT EXISTS monthly_collection (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month text NOT NULL,
  collected integer NOT NULL DEFAULT 0,
  recycled integer NOT NULL DEFAULT 0,
  landfilled integer NOT NULL DEFAULT 0
);

ALTER TABLE monthly_collection ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_monthly_collection" ON monthly_collection;
CREATE POLICY "anon_select_monthly_collection" ON monthly_collection FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_monthly_collection" ON monthly_collection;
CREATE POLICY "anon_insert_monthly_collection" ON monthly_collection FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_monthly_collection" ON monthly_collection;
CREATE POLICY "anon_update_monthly_collection" ON monthly_collection FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_monthly_collection" ON monthly_collection;
CREATE POLICY "anon_delete_monthly_collection" ON monthly_collection FOR DELETE TO anon, authenticated USING (true);

-- Activity feed
CREATE TABLE IF NOT EXISTS activity_feed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('report','workorder','collection','alert','vehicle','invoice')),
  message text NOT NULL,
  time text NOT NULL,
  priority text
);

ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_activity_feed" ON activity_feed;
CREATE POLICY "anon_select_activity_feed" ON activity_feed FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_activity_feed" ON activity_feed;
CREATE POLICY "anon_insert_activity_feed" ON activity_feed FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_activity_feed" ON activity_feed;
CREATE POLICY "anon_update_activity_feed" ON activity_feed FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_activity_feed" ON activity_feed;
CREATE POLICY "anon_delete_activity_feed" ON activity_feed FOR DELETE TO anon, authenticated USING (true);

-- KPI data
CREATE TABLE IF NOT EXISTS kpi_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  value text NOT NULL,
  change double precision NOT NULL DEFAULT 0,
  trend text NOT NULL CHECK (trend IN ('up','down','neutral')),
  icon text NOT NULL,
  sparkline integer[] NOT NULL DEFAULT '{}'
);

ALTER TABLE kpi_data ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_kpi_data" ON kpi_data;
CREATE POLICY "anon_select_kpi_data" ON kpi_data FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_kpi_data" ON kpi_data;
CREATE POLICY "anon_insert_kpi_data" ON kpi_data FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_kpi_data" ON kpi_data;
CREATE POLICY "anon_update_kpi_data" ON kpi_data FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_kpi_data" ON kpi_data;
CREATE POLICY "anon_delete_kpi_data" ON kpi_data FOR DELETE TO anon, authenticated USING (true);

-- Indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_citizen_reports_status ON citizen_reports(status);
CREATE INDEX IF NOT EXISTS idx_citizen_reports_priority ON citizen_reports(priority);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_sla_status ON work_orders(sla_status);
CREATE INDEX IF NOT EXISTS idx_containers_zone ON containers(zone);
CREATE INDEX IF NOT EXISTS idx_containers_status ON containers(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_routes_status ON routes(status);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_collection_requests_status ON collection_requests(status);
CREATE INDEX IF NOT EXISTS idx_weighbridge_transactions_timestamp ON weighbridge_transactions(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);

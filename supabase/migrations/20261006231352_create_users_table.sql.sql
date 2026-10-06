
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  phone text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'CITIZEN' CHECK (role IN (
    'SUPER_ADMIN', 'PLATFORM_ADMIN', 'MUNICIPALITY_ADMIN', 'MUNICIPALITY_MANAGER',
    'OPERATIONS_MANAGER', 'DISPATCHER', 'SUPERVISOR', 'DRIVER', 'FIELD_WORKER',
    'B2B_ADMIN', 'B2B_USER', 'RECYCLER_ADMIN', 'WEIGHBRIDGE_OPERATOR',
    'ACCOUNTANT', 'AUDITOR', 'CITIZEN'
  )),
  organization text NOT NULL DEFAULT '',
  zone text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'suspended')),
  last_active text NOT NULL DEFAULT '',
  avatar text NOT NULL DEFAULT ''
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_users" ON users;
CREATE POLICY "anon_select_users" ON users FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_users" ON users;
CREATE POLICY "anon_insert_users" ON users FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_users" ON users;
CREATE POLICY "anon_update_users" ON users FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_users" ON users;
CREATE POLICY "anon_delete_users" ON users FOR DELETE TO anon, authenticated USING (true);

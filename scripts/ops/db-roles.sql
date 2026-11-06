-- Least-privilege database roles (SECURITY.md §Database). Run once per database as the database administrator
-- (postgres, or a role with CREATEROLE), connected to the NEXVO database:
--   sudo -u postgres psql -d nexvo -v app_role=nexvo_app -v app_password='<strong random password>' -f scripts/ops/db-roles.sql
-- Then: the application uses the app role (DATABASE_URL), migrations keep using the owner (run `prisma migrate deploy`
-- with the owner URL). The app role can read and write rows, nothing else: no DDL, no TRUNCATE, no ALTER TABLE (so it
-- cannot disable the append-only triggers on AuditEvent and StockMovement), no DROP, no role or extension changes.
\set ON_ERROR_STOP on
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS', :'app_role', :'app_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'app_role') \gexec
SELECT format('ALTER ROLE %I PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS', :'app_role', :'app_password') \gexec

SELECT format('GRANT CONNECT ON DATABASE %I TO %I', current_database(), :'app_role') \gexec
SELECT format('GRANT USAGE ON SCHEMA public TO %I', :'app_role') \gexec
SELECT format('REVOKE CREATE ON SCHEMA public FROM %I', :'app_role') \gexec
SELECT format('GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO %I', :'app_role') \gexec
SELECT format('REVOKE TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public FROM %I', :'app_role') \gexec
SELECT format('GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO %I', :'app_role') \gexec
SELECT format('GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO %I', :'app_role') \gexec
-- Tables created by future migrations (run as the owner) get the same grants automatically.
-- (applies to objects created by the role that owns the schema's tables, i.e. the migration owner, detected here)
SELECT tableowner AS owner_role FROM pg_tables WHERE schemaname = 'public' AND tablename = '_prisma_migrations' \gset
SELECT format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO %I', :'owner_role', :'app_role') \gexec
SELECT format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO %I', :'owner_role', :'app_role') \gexec
SELECT format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO %I', :'owner_role', :'app_role') \gexec
-- Migration history is the owner's business.
SELECT format('REVOKE INSERT, UPDATE, DELETE ON TABLE public."_prisma_migrations" FROM %I', :'app_role') \gexec

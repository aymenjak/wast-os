-- Audit trail is append-only, even for the application's own database role (SECURITY.md gap 6, partial).
-- UPDATE and DELETE raise an error. TRUNCATE (test reset, DBA maintenance) is not affected; deleting an organization
-- (never done by the application) would now fail while it has audit events — intended: audit retention is a
-- deliberate DBA operation, not a side effect.
CREATE OR REPLACE FUNCTION nexvo_audit_append_only() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'AuditEvent is append-only (% refused)', TG_OP USING ERRCODE = 'insufficient_privilege';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "AuditEvent_append_only"
  BEFORE UPDATE OR DELETE ON "AuditEvent"
  FOR EACH ROW EXECUTE FUNCTION nexvo_audit_append_only();

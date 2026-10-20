ALTER TABLE report_people ADD COLUMN IF NOT EXISTS display_name text NOT NULL DEFAULT '';
-- statement-break
ALTER TABLE investment_positions ADD COLUMN IF NOT EXISTS source_details jsonb NOT NULL DEFAULT '{}';
-- statement-break
CREATE TABLE IF NOT EXISTS investor_import_batches (
 id uuid PRIMARY KEY, digest text UNIQUE NOT NULL, source_key text NOT NULL, actor_id text NOT NULL,
 imported_at timestamptz NOT NULL DEFAULT now(), summary jsonb NOT NULL
);
-- statement-break
CREATE TABLE IF NOT EXISTS investor_preview_sessions (
 token_hash text PRIMARY KEY, admin_id text NOT NULL, person_id uuid NOT NULL REFERENCES report_people(id),
 mode text NOT NULL CHECK(mode IN ('investor','draft')), expires_at timestamptz NOT NULL, ended_at timestamptz
);
-- statement-break
CREATE TABLE IF NOT EXISTS investor_operations_audit (
 id uuid PRIMARY KEY, actor_id text NOT NULL, person_id uuid, action text NOT NULL,
 resource_id text, created_at timestamptz NOT NULL DEFAULT now()
);
-- statement-break
ALTER TABLE investor_import_batches ENABLE ROW LEVEL SECURITY;
-- statement-break
ALTER TABLE investor_preview_sessions ENABLE ROW LEVEL SECURITY;
-- statement-break
ALTER TABLE investor_operations_audit ENABLE ROW LEVEL SECURITY;
-- statement-break
REVOKE ALL ON investor_import_batches,investor_preview_sessions,investor_operations_audit FROM PUBLIC;
-- statement-break
-- statement-break
CREATE OR REPLACE FUNCTION protect_investor_audit() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Investor audit records are append-only'; END $$;
-- statement-break
DROP TRIGGER IF EXISTS immutable_investor_audit ON investor_operations_audit;
-- statement-break
CREATE TRIGGER immutable_investor_audit BEFORE UPDATE OR DELETE OR TRUNCATE ON investor_operations_audit
FOR EACH STATEMENT EXECUTE FUNCTION protect_investor_audit();
-- statement-break
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN REVOKE ALL ON investor_import_batches,investor_preview_sessions,investor_operations_audit FROM anon; END IF;
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN REVOKE ALL ON investor_import_batches,investor_preview_sessions,investor_operations_audit FROM authenticated; END IF;
END $$;

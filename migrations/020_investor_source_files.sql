-- Original evidence is private and immutable, separate from investor-facing documents.
CREATE TABLE IF NOT EXISTS investor_source_files (
 id uuid PRIMARY KEY,
 snapshot_id uuid NOT NULL REFERENCES investor_source_snapshots(id),
 filename text NOT NULL, sha256 text NOT NULL CHECK(sha256 ~ '^[0-9a-f]{64}$'),
 content bytea NOT NULL, uploaded_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(snapshot_id,filename)
);
-- statement-break
ALTER TABLE investor_source_files ENABLE ROW LEVEL SECURITY;
-- statement-break
REVOKE ALL ON investor_source_files FROM PUBLIC;
-- statement-break
DROP TRIGGER IF EXISTS immutable_investor_source_file ON investor_source_files;
-- statement-break
CREATE TRIGGER immutable_investor_source_file BEFORE UPDATE OR DELETE ON investor_source_files
FOR EACH ROW EXECUTE FUNCTION reject_investor_snapshot_mutation();
-- statement-break
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN REVOKE ALL ON investor_source_files FROM anon; END IF;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN REVOKE ALL ON investor_source_files FROM authenticated; END IF;
END $$;

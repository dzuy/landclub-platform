-- All existing documents intentionally require a new scan before downloading.
CREATE TABLE IF NOT EXISTS document_audit_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 occurred_at timestamptz NOT NULL DEFAULT now(),
 actor text NOT NULL,
 resource_type text NOT NULL,
 resource_id text NOT NULL,
 event text NOT NULL
);
-- statement-break
ALTER TABLE document_audit_events ENABLE ROW LEVEL SECURITY;
-- statement-break
REVOKE ALL ON document_audit_events FROM PUBLIC;
-- statement-break
ALTER TABLE member_documents ADD COLUMN IF NOT EXISTS scan_status text NOT NULL DEFAULT 'quarantined' CHECK(scan_status IN ('quarantined','clean','blocked'));
-- statement-break
ALTER TABLE member_documents ADD COLUMN IF NOT EXISTS scanned_sha256 text;
-- statement-break
ALTER TABLE member_documents ADD COLUMN IF NOT EXISTS scanned_at timestamptz;
-- statement-break
ALTER TABLE group_documents ADD COLUMN IF NOT EXISTS scan_status text NOT NULL DEFAULT 'quarantined' CHECK(scan_status IN ('quarantined','clean','blocked'));
-- statement-break
ALTER TABLE group_documents ADD COLUMN IF NOT EXISTS scanned_sha256 text;
-- statement-break
ALTER TABLE group_documents ADD COLUMN IF NOT EXISTS scanned_at timestamptz;
-- statement-break
CREATE OR REPLACE FUNCTION audit_document_change() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE record_data jsonb; actor_id text; resource text; event_name text;
BEGIN
 record_data=CASE WHEN TG_OP='DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
 actor_id=COALESCE(NULLIF(current_setting('land_club.audit_actor',true),''),
 CASE WHEN TG_OP='INSERT' THEN record_data->>'uploaded_by' ELSE NULL END,
 record_data->>'updated_by',record_data->>'granted_by','database:'||current_user);
 resource=COALESCE(record_data->>'id',record_data->>'user_id','unknown');
 event_name=CASE WHEN TG_TABLE_NAME IN ('member_documents','group_documents') THEN
 CASE TG_OP WHEN 'INSERT' THEN 'upload_quarantined' WHEN 'DELETE' THEN 'delete' ELSE 'metadata_or_scan_changed' END
 ELSE 'access_changed_'||lower(TG_OP) END;
 INSERT INTO document_audit_events(actor,resource_type,resource_id,event) VALUES(actor_id,TG_TABLE_NAME,resource,event_name);
 RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END $$;
-- statement-break
DO $$ DECLARE table_name text; BEGIN
 FOREACH table_name IN ARRAY ARRAY['member_documents','group_documents','member_properties','user_roles','prepared_members'] LOOP
  IF to_regclass(table_name) IS NOT NULL THEN
   EXECUTE format('DROP TRIGGER IF EXISTS document_security_audit ON %I',table_name);
   EXECUTE format('CREATE TRIGGER document_security_audit AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION audit_document_change()',table_name);
  END IF;
 END LOOP;
END $$;
-- statement-break
CREATE OR REPLACE FUNCTION protect_document_audit() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Document audit history is append-only'; END $$;
-- statement-break
DROP TRIGGER IF EXISTS document_audit_immutable ON document_audit_events;
-- statement-break
CREATE TRIGGER document_audit_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON document_audit_events FOR EACH STATEMENT EXECUTE FUNCTION protect_document_audit();

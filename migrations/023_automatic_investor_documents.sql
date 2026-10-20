CREATE TABLE IF NOT EXISTS automatic_investor_documents (
 document_id uuid PRIMARY KEY REFERENCES member_documents(id),
 person_id uuid NOT NULL UNIQUE REFERENCES report_people(id),
 content_hash text,
 refreshed_at timestamptz
);
-- statement-break
CREATE TABLE IF NOT EXISTS investor_document_versions (
 document_id uuid NOT NULL REFERENCES member_documents(id),
 version integer NOT NULL,
 filename text NOT NULL,
 content text NOT NULL,
 saved_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(document_id,version)
);
-- statement-break
ALTER TABLE automatic_investor_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE investor_document_versions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON automatic_investor_documents,investor_document_versions FROM PUBLIC;
-- statement-break
CREATE OR REPLACE FUNCTION protect_investor_document_version() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Investor document history is immutable'; END $$;
-- statement-break
DROP TRIGGER IF EXISTS immutable_investor_document_versions ON investor_document_versions;
CREATE TRIGGER immutable_investor_document_versions BEFORE UPDATE OR DELETE ON investor_document_versions
 FOR EACH ROW EXECUTE FUNCTION protect_investor_document_version();

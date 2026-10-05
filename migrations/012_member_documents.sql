CREATE TABLE IF NOT EXISTS member_documents (
 id uuid PRIMARY KEY,
 member_id uuid NOT NULL,
 filename text NOT NULL,
 byte_size integer NOT NULL CHECK(byte_size > 0 AND byte_size <= 20971520),
 content text NOT NULL,
 tags text[] NOT NULL DEFAULT '{}',
 version integer NOT NULL DEFAULT 1,
 uploaded_by text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS member_documents_member ON member_documents(member_id);
ALTER TABLE member_documents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON member_documents FROM PUBLIC;

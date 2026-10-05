CREATE TABLE IF NOT EXISTS group_documents (
 id uuid PRIMARY KEY,
 filename text NOT NULL,
 byte_size integer NOT NULL CHECK(byte_size > 0 AND byte_size <= 20971520),
 content text NOT NULL,
 tags text[] NOT NULL DEFAULT '{}',
 everyone boolean NOT NULL DEFAULT false,
 property_ids uuid[] NOT NULL DEFAULT '{}',
 roles text[] NOT NULL DEFAULT '{}',
 version integer NOT NULL DEFAULT 1,
 uploaded_by text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(array_position(property_ids,NULL) IS NULL),
 CHECK(array_position(roles,NULL) IS NULL AND roles <@ ARRAY['member','prospect','investor','owner','admin']::text[]),
 CHECK((everyone AND cardinality(property_ids)=0 AND cardinality(roles)=0) OR (NOT everyone AND (cardinality(property_ids)>0 OR cardinality(roles)>0)))
);
ALTER TABLE group_documents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON group_documents FROM PUBLIC;

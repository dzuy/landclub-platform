CREATE TABLE prepared_members (
 id uuid PRIMARY KEY,email text NOT NULL UNIQUE CHECK(email=lower(email)),info jsonb NOT NULL,
 roles text[] NOT NULL CHECK(cardinality(roles)>0 AND roles <@ ARRAY['member','prospect','investor','owner','admin']::text[]),
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','sending','invited')),
 created_by text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),auth_user_id uuid UNIQUE,failure_reason text,invitation_id uuid
);
ALTER TABLE prepared_members ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON prepared_members FROM PUBLIC;

CREATE TABLE invitations (
 id uuid PRIMARY KEY,
 email text NOT NULL CHECK (email = lower(email)),
 roles text[] NOT NULL DEFAULT ARRAY['member']::text[],
 status text NOT NULL CHECK (status IN ('sending','pending','accepted','failed')),
 auth_user_id uuid UNIQUE,
 invited_by text NOT NULL,
 failure_reason text,
 created_at timestamptz NOT NULL DEFAULT now(),
 sent_at timestamptz,
 accepted_at timestamptz,
 CHECK (cardinality(roles) > 0),
 CHECK (roles <@ ARRAY['member','prospect','investor','owner','admin']::text[])
);
CREATE UNIQUE INDEX invitations_active_email ON invitations ((lower(email))) WHERE status IN ('sending','pending');
CREATE INDEX invitations_created_at ON invitations (created_at DESC);

CREATE TABLE user_roles (
 user_id uuid NOT NULL,
 role text NOT NULL CHECK (role IN ('member','prospect','investor','owner','admin')),
 invitation_id uuid REFERENCES invitations(id),
 granted_by text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (user_id,role)
);

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON invitations,user_roles FROM PUBLIC;

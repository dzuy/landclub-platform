CREATE TABLE IF NOT EXISTS member_properties (
 user_id uuid NOT NULL,
 property_id uuid NOT NULL REFERENCES properties(id),
 role text NOT NULL CHECK (role IN ('prospect','investor','owner','guest','manager')),
 version integer NOT NULL DEFAULT 1,
 updated_by text NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,property_id)
);
ALTER TABLE member_properties ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON member_properties FROM PUBLIC;

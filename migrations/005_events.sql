CREATE TABLE IF NOT EXISTS events (
 id uuid PRIMARY KEY,
 details jsonb NOT NULL,
 version integer NOT NULL DEFAULT 1,
 created_by text NOT NULL,
 updated_by text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON events FROM PUBLIC;

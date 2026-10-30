-- Following is a display preference, never a property/document/financial grant.
-- Text supports the existing isolated local-developer identity as well as auth UUIDs.
CREATE TABLE IF NOT EXISTS property_follows (
 user_id text NOT NULL,
 property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (user_id, property_id)
);
ALTER TABLE property_follows ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS property_follows_property ON property_follows(property_id);

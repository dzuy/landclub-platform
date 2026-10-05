CREATE TABLE IF NOT EXISTS property_photos (
 id uuid PRIMARY KEY,
 property_id uuid NOT NULL REFERENCES properties(id),
 mime text NOT NULL,
 content text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE property_photos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON property_photos FROM PUBLIC;

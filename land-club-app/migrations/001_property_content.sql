
CREATE TABLE IF NOT EXISTS properties (
 id uuid PRIMARY KEY, draft jsonb NOT NULL, published jsonb,
 version integer NOT NULL DEFAULT 1, published_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS properties_draft_slug ON properties ((draft->>'slug'));
CREATE UNIQUE INDEX IF NOT EXISTS properties_published_slug ON properties ((published->>'slug')) WHERE published IS NOT NULL;
CREATE TABLE IF NOT EXISTS property_revisions (
 id uuid PRIMARY KEY, property_id uuid NOT NULL REFERENCES properties(id),
 action text NOT NULL CHECK(action IN ('created','saved','published','unpublished')),
 actor text NOT NULL, version integer NOT NULL, snapshot jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);

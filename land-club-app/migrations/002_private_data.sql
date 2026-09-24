-- These tables are exclusively accessed by the trusted Next.js server.
-- No Supabase Data API policies or browser access are granted.
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_revisions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA land_club FROM PUBLIC;

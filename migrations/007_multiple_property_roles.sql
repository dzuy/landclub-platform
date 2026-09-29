-- Keep the legacy role column for compatibility during rolling deployment.
ALTER TABLE member_properties ADD COLUMN IF NOT EXISTS roles text[]
 CHECK (roles IS NULL OR (cardinality(roles) > 0 AND array_position(roles,NULL) IS NULL AND roles <@ ARRAY['prospect','investor','owner','guest','manager']::text[]));
UPDATE member_properties SET roles=ARRAY[role] WHERE roles IS NULL;

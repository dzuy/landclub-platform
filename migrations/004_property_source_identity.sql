-- Additive: all existing snapshots and revisions remain unchanged.
-- Nearby places and phases belong to each versioned property snapshot, so
-- draft changes cannot leak into a published property's related content.
CREATE UNIQUE INDEX IF NOT EXISTS properties_notion_source
 ON properties ((draft->'source'->>'pageId'))
 WHERE draft->'source'->>'pageId' IS NOT NULL;

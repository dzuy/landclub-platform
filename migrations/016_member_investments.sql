-- Investment records do not confer property, document, or club-role access.
-- Do not backfill member_properties: those include prospects, guests and managers.
CREATE TABLE IF NOT EXISTS member_investments (
 user_id uuid PRIMARY KEY,
 entities jsonb NOT NULL DEFAULT '[]' CHECK(jsonb_typeof(entities)='array'),
 version integer NOT NULL DEFAULT 1,
 updated_by text NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE member_investments ENABLE ROW LEVEL SECURITY;

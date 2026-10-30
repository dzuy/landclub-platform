CREATE TABLE IF NOT EXISTS member_property_card_order (
 user_id text PRIMARY KEY,
 property_ids jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(property_ids) = 'array'),
 version integer NOT NULL DEFAULT 1,
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE member_property_card_order ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON member_property_card_order FROM PUBLIC;

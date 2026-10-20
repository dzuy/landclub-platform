-- One explicit project mapping supports all of its investors and future positions.
ALTER TABLE investment_entities ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES properties(id);

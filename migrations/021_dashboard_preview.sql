-- Explicit identity link; never infer access from a matching name or email.
ALTER TABLE report_people ADD COLUMN IF NOT EXISTS prepared_member_id uuid;
-- statement-break
CREATE UNIQUE INDEX IF NOT EXISTS report_people_prepared_member ON report_people(prepared_member_id) WHERE prepared_member_id IS NOT NULL;

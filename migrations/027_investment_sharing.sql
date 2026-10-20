-- Explicit authority must be reviewed and provisioned by staff. Existing access is
-- not proof of ownership. No production identities or grants are seeded.
CREATE TABLE IF NOT EXISTS investment_account_owners (
 person_id uuid NOT NULL REFERENCES report_people(id), holder_id uuid NOT NULL REFERENCES investment_holders(id),
 granted_by text NOT NULL, revoked_at timestamptz, PRIMARY KEY(person_id,holder_id)
);
-- statement-break
CREATE TABLE IF NOT EXISTS investment_sharing_invitations (
 id uuid PRIMARY KEY, owner_person_id uuid NOT NULL REFERENCES report_people(id),
 email text NOT NULL CHECK(email=lower(email)), token_hash text UNIQUE NOT NULL,
 status text NOT NULL CHECK(status IN ('pending','accepted','revoked','failed')),
 recipient_person_id uuid REFERENCES report_people(id), created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL, accepted_at timestamptz, revoked_at timestamptz,
 delivery_state text NOT NULL DEFAULT 'pending' CHECK(delivery_state IN ('pending','sent','failed')),
 CHECK((status='accepted') = (accepted_at IS NOT NULL AND revoked_at IS NULL))
);
-- statement-break
CREATE TABLE IF NOT EXISTS investment_sharing_scope (
 invitation_id uuid NOT NULL REFERENCES investment_sharing_invitations(id),
 position_id uuid NOT NULL REFERENCES investment_positions(id), PRIMARY KEY(invitation_id,position_id)
);
-- statement-break
ALTER TABLE investment_account_owners ENABLE ROW LEVEL SECURITY;
-- statement-break
ALTER TABLE investment_sharing_invitations ENABLE ROW LEVEL SECURITY;
-- statement-break
ALTER TABLE investment_sharing_scope ENABLE ROW LEVEL SECURITY;
-- statement-break
REVOKE ALL ON investment_account_owners,investment_sharing_invitations,investment_sharing_scope FROM PUBLIC;
-- statement-break
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN REVOKE ALL ON investment_account_owners,investment_sharing_invitations,investment_sharing_scope FROM anon; END IF;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN REVOKE ALL ON investment_account_owners,investment_sharing_invitations,investment_sharing_scope FROM authenticated; END IF;
END $$;
-- statement-break
CREATE INDEX IF NOT EXISTS sharing_scope_position ON investment_sharing_scope(position_id);
-- statement-break
CREATE INDEX IF NOT EXISTS sharing_invitation_recipient ON investment_sharing_invitations(recipient_person_id) WHERE status='accepted';
-- statement-break
CREATE INDEX IF NOT EXISTS sharing_invitation_owner ON investment_sharing_invitations(owner_person_id,created_at DESC);

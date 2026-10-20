-- Reviewed terms never overwrite imported terms or dated source balances.
CREATE TABLE IF NOT EXISTS investment_term_revisions (
 id uuid PRIMARY KEY, position_id uuid NOT NULL REFERENCES investment_positions(id), version integer NOT NULL,
 terms jsonb NOT NULL, confirmed boolean NOT NULL, review jsonb NOT NULL DEFAULT '{}', actor_id text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(position_id,version)
);
-- statement-break
CREATE TABLE IF NOT EXISTS investment_term_agreements (
 id uuid PRIMARY KEY, position_id uuid NOT NULL REFERENCES investment_positions(id), filename text NOT NULL,
 content bytea NOT NULL, sha256 text NOT NULL, actor_id text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
-- statement-break
CREATE TABLE IF NOT EXISTS investment_reviewed_transactions (
 id uuid PRIMARY KEY, position_id uuid NOT NULL REFERENCES investment_positions(id), payload jsonb NOT NULL,
 actor_id text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
-- statement-break
CREATE UNIQUE INDEX IF NOT EXISTS reviewed_event_once ON investment_reviewed_transactions ((payload->>'sourceEventId')) WHERE payload->>'sourceEventId' IS NOT NULL;
-- statement-break
ALTER TABLE investment_term_revisions ENABLE ROW LEVEL SECURITY;
-- statement-break
ALTER TABLE investment_term_agreements ENABLE ROW LEVEL SECURITY;
-- statement-break
ALTER TABLE investment_reviewed_transactions ENABLE ROW LEVEL SECURITY;
-- statement-break
REVOKE ALL ON investment_term_revisions,investment_term_agreements,investment_reviewed_transactions FROM PUBLIC;
-- statement-break
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['investment_term_revisions','investment_term_agreements','investment_reviewed_transactions'] LOOP
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN EXECUTE format('REVOKE ALL ON %I FROM anon',t); END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN EXECUTE format('REVOKE ALL ON %I FROM authenticated',t); END IF;
 END LOOP;
END $$;
-- statement-break
CREATE OR REPLACE FUNCTION protect_reviewed_terms() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Reviewed investment history is append-only'; END $$;
-- statement-break
DROP TRIGGER IF EXISTS immutable_terms ON investment_term_revisions;
-- statement-break
CREATE TRIGGER immutable_terms BEFORE UPDATE OR DELETE OR TRUNCATE ON investment_term_revisions FOR EACH STATEMENT EXECUTE FUNCTION protect_reviewed_terms();
-- statement-break
DROP TRIGGER IF EXISTS immutable_agreements ON investment_term_agreements;
-- statement-break
CREATE TRIGGER immutable_agreements BEFORE UPDATE OR DELETE OR TRUNCATE ON investment_term_agreements FOR EACH STATEMENT EXECUTE FUNCTION protect_reviewed_terms();
-- statement-break
DROP TRIGGER IF EXISTS immutable_reviewed_transactions ON investment_reviewed_transactions;
-- statement-break
CREATE TRIGGER immutable_reviewed_transactions BEFORE UPDATE OR DELETE OR TRUNCATE ON investment_reviewed_transactions FOR EACH STATEMENT EXECUTE FUNCTION protect_reviewed_terms();

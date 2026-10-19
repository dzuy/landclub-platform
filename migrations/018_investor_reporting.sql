-- Reviewed separately from member_investments: tags never grant financial access.
-- No source balances, people, grants, or production data are seeded here.
-- statement-break
CREATE TABLE IF NOT EXISTS investor_source_snapshots (
 id uuid PRIMARY KEY, source_key text NOT NULL, sha256 text NOT NULL CHECK(sha256 ~ '^[0-9a-f]{64}$'),
 source_filename text NOT NULL, captured_at timestamptz NOT NULL DEFAULT now(),
 payload jsonb NOT NULL, UNIQUE(source_key,sha256)
);
-- statement-break
CREATE OR REPLACE FUNCTION reject_investor_snapshot_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Investor source snapshots are immutable; append a new version'; END $$;
-- statement-break
DROP TRIGGER IF EXISTS immutable_investor_snapshot ON investor_source_snapshots;
-- statement-break
CREATE TRIGGER immutable_investor_snapshot BEFORE UPDATE OR DELETE ON investor_source_snapshots
 FOR EACH ROW EXECUTE FUNCTION reject_investor_snapshot_mutation();
-- statement-break
CREATE TABLE IF NOT EXISTS investment_entities (
 id uuid PRIMARY KEY, source_id text UNIQUE, name text NOT NULL
);
-- statement-break
CREATE TABLE IF NOT EXISTS report_people (
 id uuid PRIMARY KEY, source_id text UNIQUE, auth_user_id uuid UNIQUE,
 disabled_at timestamptz
);
-- statement-break
CREATE TABLE IF NOT EXISTS investment_holders (
 id uuid PRIMARY KEY, source_id text UNIQUE, name text NOT NULL
);
-- statement-break
CREATE TABLE IF NOT EXISTS investor_access (
 person_id uuid NOT NULL REFERENCES report_people(id),
 holder_id uuid NOT NULL REFERENCES investment_holders(id),
 granted_by text NOT NULL, granted_at timestamptz NOT NULL DEFAULT now(),
 revoked_at timestamptz, PRIMARY KEY(person_id,holder_id)
);
-- statement-break
CREATE TABLE IF NOT EXISTS investment_positions (
 id uuid PRIMARY KEY, source_id text UNIQUE,
 holder_id uuid NOT NULL REFERENCES investment_holders(id),
 entity_id uuid REFERENCES investment_entities(id),
 property_id uuid REFERENCES properties(id),
 project_name text NOT NULL, name text NOT NULL,
 kind text NOT NULL CHECK(kind IN ('equity','loan','reserve','manager','vendor','vendor_debt','sweat_equity')),
 currency text NOT NULL DEFAULT 'USD' CHECK(currency ~ '^[A-Z]{3}$')
);
-- Terms preserve source semantics; entitlement is never substituted for principal.
-- statement-break
CREATE TABLE IF NOT EXISTS investment_position_terms (
 position_id uuid PRIMARY KEY REFERENCES investment_positions(id),
 snapshot_id uuid NOT NULL REFERENCES investor_source_snapshots(id),
 commitment_amount numeric(20,2), original_principal numeric(20,2), entitlement numeric(20,2),
 pref_rate numeric(12,8), ownership_percent numeric(12,8), profits_interest_percent numeric(12,8),
 payment_basis text, papered boolean, investment_type text,
 reserve_amount numeric(20,2), reserve_rate numeric(12,8), start_date date,
 election_state text NOT NULL DEFAULT 'pending' CHECK(election_state IN ('pending','confirmed')),
 source_fields jsonb NOT NULL DEFAULT '{}'
);
-- statement-break
CREATE TABLE IF NOT EXISTS investment_loans (
 id uuid PRIMARY KEY, source_id text UNIQUE, position_id uuid NOT NULL REFERENCES investment_positions(id),
 snapshot_id uuid NOT NULL REFERENCES investor_source_snapshots(id),
 original_principal numeric(20,2), source_terms jsonb NOT NULL DEFAULT '{}'
);
-- statement-break
CREATE TABLE IF NOT EXISTS investment_events (
 id uuid PRIMARY KEY, source_id text UNIQUE, position_id uuid NOT NULL REFERENCES investment_positions(id),
 snapshot_id uuid NOT NULL REFERENCES investor_source_snapshots(id),
 event_date date, amount numeric(20,2),
 classification text NOT NULL CHECK(classification IN ('actual','scheduled','held','assumed','non_cash','internal_transfer')),
 -- Shared keys identify equivalent economic events or paired transfer legs for review.
 economic_event_key text NOT NULL, transfer_group text, evidence_reference text,
 source_fields jsonb NOT NULL DEFAULT '{}'
);
-- statement-break
CREATE TABLE IF NOT EXISTS investor_reports (
 id uuid PRIMARY KEY, position_id uuid NOT NULL REFERENCES investment_positions(id),
 source_id text UNIQUE, title text NOT NULL, as_of date,
 snapshot_id uuid REFERENCES investor_source_snapshots(id),
 review_state text NOT NULL DEFAULT 'draft' CHECK(review_state IN ('draft','reviewed')),
 -- Release is independent of review; explicit release is required even for a draft.
 released_at timestamptz, released_by text,
 narrative text, source_reference text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK((released_at IS NULL) = (released_by IS NULL))
);
-- statement-break
CREATE TABLE IF NOT EXISTS investor_report_lines (
 id uuid PRIMARY KEY, report_id uuid NOT NULL REFERENCES investor_reports(id),
 section text NOT NULL CHECK(section IN ('summary','spending','position','transactions')),
 label text NOT NULL, amount numeric(20,2),
 basis text NOT NULL CHECK(basis IN ('actual','projection','missing','reported','internal_transfer','non_cash','assumed','held')),
 source_reference text NOT NULL, effective_date date, ordinal integer NOT NULL DEFAULT 0,
 CHECK((basis='missing' AND amount IS NULL) OR (basis<>'missing' AND amount IS NOT NULL))
);
-- Final statement editions are append-only, distinct from editable draft reports.
-- statement-break
CREATE TABLE IF NOT EXISTS investor_statement_snapshots (
 id uuid PRIMARY KEY, report_id uuid NOT NULL REFERENCES investor_reports(id),
 edition integer NOT NULL CHECK(edition>0), source_snapshot_id uuid NOT NULL REFERENCES investor_source_snapshots(id),
 payload jsonb NOT NULL, captured_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(report_id,edition)
);
-- statement-break
DROP TRIGGER IF EXISTS immutable_investor_statement ON investor_statement_snapshots;
-- statement-break
CREATE TRIGGER immutable_investor_statement BEFORE UPDATE OR DELETE ON investor_statement_snapshots
 FOR EACH ROW EXECUTE FUNCTION reject_investor_snapshot_mutation();
-- statement-break
CREATE TABLE IF NOT EXISTS investor_report_schedules (
 id uuid PRIMARY KEY, report_id uuid NOT NULL REFERENCES investor_reports(id),
 source_reference text NOT NULL, label text NOT NULL, scheduled_date date,
 confirmation text NOT NULL DEFAULT 'pending' CHECK(confirmation IN ('pending','confirmed')),
 note text NOT NULL
);
-- Separate document ACL: never reuse everyone/property-role document sharing.
-- statement-break
CREATE TABLE IF NOT EXISTS investor_report_documents (
 id uuid PRIMARY KEY, report_id uuid NOT NULL REFERENCES investor_reports(id),
 filename text NOT NULL, content bytea NOT NULL,
 CHECK(octet_length(content)>0 AND octet_length(content)<=20971520)
);
-- statement-break
CREATE TABLE IF NOT EXISTS investor_report_findings (
 id uuid PRIMARY KEY, report_id uuid NOT NULL REFERENCES investor_reports(id),
 source_reference text NOT NULL, description text NOT NULL,
 source_value text, comparison_value text,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','resolved')),
 resolution text,
 CHECK(status <> 'resolved' OR length(trim(resolution)) > 0 AND resolution IS NOT NULL)
);
-- statement-break
CREATE INDEX IF NOT EXISTS investor_positions_holder ON investment_positions(holder_id);
-- statement-break
CREATE INDEX IF NOT EXISTS investor_reports_position ON investor_reports(position_id);
-- statement-break
CREATE INDEX IF NOT EXISTS investor_lines_report ON investor_report_lines(report_id);
-- statement-break
CREATE INDEX IF NOT EXISTS investor_schedules_report ON investor_report_schedules(report_id);
-- statement-break
CREATE INDEX IF NOT EXISTS investor_documents_report ON investor_report_documents(report_id);
-- statement-break
ALTER TABLE report_people ENABLE ROW LEVEL SECURITY;
-- statement-break
ALTER TABLE investor_source_snapshots ENABLE ROW LEVEL SECURITY;
-- statement-break
ALTER TABLE investor_statement_snapshots ENABLE ROW LEVEL SECURITY;
-- statement-break
ALTER TABLE investment_entities ENABLE ROW LEVEL SECURITY;
-- statement-break
ALTER TABLE investment_position_terms ENABLE ROW LEVEL SECURITY;
-- statement-break
ALTER TABLE investment_loans ENABLE ROW LEVEL SECURITY;
-- statement-break
ALTER TABLE investment_events ENABLE ROW LEVEL SECURITY;
-- statement-break
REVOKE ALL ON investor_source_snapshots,investment_entities,investment_position_terms,investment_loans,investment_events FROM PUBLIC;
-- statement-break
REVOKE ALL ON investor_statement_snapshots FROM PUBLIC;
-- statement-break
ALTER TABLE investment_holders ENABLE ROW LEVEL SECURITY;
-- statement-break
ALTER TABLE investor_access ENABLE ROW LEVEL SECURITY;
-- statement-break
ALTER TABLE investment_positions ENABLE ROW LEVEL SECURITY;
-- statement-break
ALTER TABLE investor_reports ENABLE ROW LEVEL SECURITY;
-- statement-break
ALTER TABLE investor_report_lines ENABLE ROW LEVEL SECURITY;
-- statement-break
ALTER TABLE investor_report_schedules ENABLE ROW LEVEL SECURITY;
-- statement-break
ALTER TABLE investor_report_documents ENABLE ROW LEVEL SECURITY;
-- statement-break
ALTER TABLE investor_report_findings ENABLE ROW LEVEL SECURITY;
-- statement-break
REVOKE ALL ON investor_report_findings FROM PUBLIC;
-- statement-break
REVOKE ALL ON report_people,investment_holders,investor_access,investment_positions,investor_reports,investor_report_lines,investor_report_schedules,investor_report_documents FROM PUBLIC;
-- Match existing private-table boundary: authenticated browser roles get no policies.
-- statement-break
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
  REVOKE ALL ON investor_statement_snapshots FROM anon;
  REVOKE ALL ON investor_source_snapshots,investment_entities,investment_position_terms,investment_loans,investment_events FROM anon;
  REVOKE ALL ON report_people,investment_holders,investor_access,investment_positions,investor_reports,investor_report_lines,investor_report_schedules,investor_report_documents,investor_report_findings FROM anon;
 END IF;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
  REVOKE ALL ON investor_statement_snapshots FROM authenticated;
  REVOKE ALL ON investor_source_snapshots,investment_entities,investment_position_terms,investment_loans,investment_events FROM authenticated;
  REVOKE ALL ON report_people,investment_holders,investor_access,investment_positions,investor_reports,investor_report_lines,investor_report_schedules,investor_report_documents,investor_report_findings FROM authenticated;
 END IF;
END $$;

# Investor reporting implementation and review notes

## Reports index correction and signed-in browser verification

The Codex browser became available and showed the actual `/dashboard/reports` error: `relation "investor_reports" does not exist`. The configured database has not received migration 018, as intended. Added a read-only schema-readiness check so the reports index displays a pending-setup state rather than querying absent tables. It preserves the local source-review link and performs no migration. PGlite regression checks confirm readiness is false before migration and true afterward; existing report authorization tests and TypeScript pass.

Reloaded the reports index in the user's existing signed-in Codex browser session: the error disappeared. Followed “Review actual source workbooks and draft positions” and verified `/dashboard/reports/source-review` by screenshot and accessibility contents: Private source review, 22 positions, the draft banner, Scott's Norden loan figures, separate loan/Reserve profile values, pending schedules, and all four workbook selectors rendered. This supersedes the earlier browser-verification blockers below.

## Preview access correction

The local server was still running on loopback port 3000, and the private fixture was present. The original source-review gate incorrectly required `actor.local`, which only identifies the optional development login bypass. This Mac has `LAND_CLUB_LOCAL_STAFF=0`; a normally authenticated administrator has `local:false` and was therefore rejected. The page and server-only loader now require a verified admin identity, development mode and an exact `localhost:3000` or `127.0.0.1:3000` request host. Normal admin sessions are accepted without enabling the bypass, provisioning roles, or changing environment/auth settings. The report-list source-review link uses the same gate. Production, remote hosts, anonymous users and non-admins remain denied. Regression tests exercise all these cases and the actual fixture; report authorization/RLS tests and TypeScript also pass. Anonymous HTTP access still returns 307 to `/signin` and contains no checked financial values. Browser-session verification remains unavailable because CUA exposes no browser surfaces; the route was queued in Codex. A sign-in session must belong to the same origin used to open the preview.

## Follow-up: actual source review delivered

The earlier placeholder-only limitation below is superseded. Gmail read tools retrieved the four attachments from messages `1a147a1ad6bc2d15` and `1a147fb688e4807b`. All four originals and complete extractions (40 tabs) are now in the git-ignored `.data/investor-review` folder on this Mac. `scripts/extract-investor-review.py` builds `workbooks.json` and a SHA-256 manifest from those local files; it makes no network, database or authorization changes. The normalized JSON and manifest have owner-only file permissions. No handoff from the cloud filesystem was needed.

Review actual data at **http://127.0.0.1:3000/dashboard/reports/source-review**. Use `?position=POS-006` for Scott's Norden loan, `POS-101` for Sutter, `POS-102` for Reserve, or select any of the 22 source positions. Every workbook tab is available in the source-row viewer. The Scott profile snapshot is displayed separately and its definitive next-payment claim is withheld pending reconciliation. Individual/source values are preserved; internal-transfer and non-cash transactions are distinguished, original principal is separate from entitlement, and manager/vendor/sweat-equity position kinds are retained. No financial totals or accruals are recomputed. Source snapshots are estimates; reported transactions are not relabeled as verified cash.

`src/lib/investor-source-store.ts` is server-only and requires development mode plus the existing local-admin identity before reading the private fixture. Nonlocal admins, ordinary members, anonymous users and production mode cannot use the fixture route. The loader reads the ignored runtime file rather than importing sensitive data into JavaScript. `next.config.ts` excludes `.data/investor-review/**/*` from all production file traces; this was added after detecting that Next.js's broad server file tracing copied the folder into standalone artifacts. No fixture is published in `public` or client modules. The only additional pre-existing config change is that tracing exclusion.

Test distinction: the original authorization test uses actual PGlite tables and SQL, executes the migration twice, inserts records and document bytes, calls the repository/HTTP response helpers, updates grants/person status/release state, and runs SELECTs after SET ROLE to test RLS. It is not a SQL-string assertion. Other tests cover pure import validation, date conversion and precision. Two follow-up tests cover the local-only gate and all actual source fixtures, including balances, kinds, conflict dates and transfer classification. These are not hosted Supabase auth/cookie integration tests; PostgreSQL integration remains skipped without TEST_DATABASE_URL. The real-source test intentionally skips on machines lacking the ignored private fixture.

Full suite after the fixture work: **126 tests, 125 passed, one PostgreSQL integration test skipped, zero failures**. Production build passed with the source-review route and again after the tracing exclusion. Final artifact inspection found zero private-fixture references in output traces, zero private-fixture files in standalone output, and zero tested source-data markers in client bundles. Codex browser inventory remained empty on retry; UI screenshots/interaction checks remain blocked. Opening the actual source-review URL in Codex was queued. No Chrome use, production import, live migration, login creation or access grant occurred. Actual documents and unresolved contractual/account mapping questions still block investor-facing release, but do not block this local review.

Local work, October 17, 2026. No live migration, import, access grant, push or deployment was performed. Existing public-page and member/document changes were preserved. The only pre-existing source file edited by this task is `src/components/dashboard-nav.tsx`, to add the report link.

## Delivered

- Migration `018_investor_reporting.sql`: distinct project entities, people, legal holders, revocable holder access, positions, terms, loans, classified economic events, source snapshots, statement editions, reports, financial lines, schedules, reconciliation findings and private document bytes.
- Server-rendered `/dashboard/reports` and `/dashboard/reports/[id]`; every report query authorizes on the server. Explicit release is independent of draft/reviewed status. Both states remain labeled unaudited. Unreleased drafts are admin-only.
- `/api/investor-reports/[id]` and `?download=csv`, plus `/api/investor-report-documents/[id]`, use the same authorization predicates and private/no-store response headers. Denied IDs return generic errors. Documents are attachments, with no public or signed storage URLs.
- `/dashboard/reports/import-preview` and its admin-only POST endpoint validate a normalized JSON bundle without saving anything. They reject missing references/duplicate IDs and flag absent identity mappings, source role requests, equivalent economic events and non-cash classifications. This is not an XLSX importer.
- A development-only, local-admin layout preview for Norden Cross, Sutter Creek and a separate Reserve position. It uses missing-value placeholders, not workbook balances.

The financial component follows the high-fidelity Figma financials frame `1250:2542` in the supplied design. The canvas `1250:1890` could be screenshotted and inspected as metadata but could not return code directly; its child frame succeeded. Financials contains no static image assets. This implementation covers the financial report, not all photo-rich narrative update variants. The draft banner, white summary cards, tables and cream palette are scoped in a CSS module so public styles are preserved. Existing dashboard shell and typography are reused. CSV download is implemented; a designed PDF export is not implemented.

## Security findings

Existing `member_investments.entities` are administrative selection tags, not position ownership or authorization. `member_properties` includes guests/prospects/managers and cannot authorize investor reports. Existing member-document ownership and group-document audiences are unsuitable for shared-holder financial documents; report files therefore have a separate report-bound ACL.

The existing database is server-only PostgreSQL/PGlite. Private tables enable RLS with no browser policies, while the trusted server connection can bypass RLS. The migration follows that boundary: RLS on every new table, explicit PUBLIC revocation and conditional revocation from Supabase anon/authenticated roles. It does **not** add per-person SQL policies to the trusted connection. Application SQL predicates are therefore mandatory, and tests cover them. Browser-role SELECT grants were deliberately added in an isolated test; default-deny RLS still returned zero rows from all 15 new tables.

People must be explicitly mapped to authenticated UUIDs. There is no email/name matching, role import, auto-invitation or property-based fallback. Active person-to-holder access authorizes that holder's positions only. Revoked links, disabled people, missing identity mappings and unreleased reports deny member reads, exports and document downloads. Each report child query repeats the predicate; the parent is checked again after loading. An already delivered download cannot be revoked retroactively.

Source snapshots and statement editions reject UPDATE/DELETE through database triggers. Raw snapshot payloads are not exposed through report APIs. Draft report rows remain editable by trusted database maintenance; this phase supplies no mutation/release/import endpoint. The report API displays draft report rows rather than issuing a certified immutable statement. Final statement issuance remains out of scope until source review is complete. Report-specific download audit logging is not yet implemented; the existing member/group document audit workflow was left intact.

## Source mapping contract

| Source | Canonical mapping / constraint |
| --- | --- |
| People / investor_access | `report_people.source_id` → explicit auth UUID; access links people to `investment_holders`, never directly to a global investor role |
| ENT-NC / INV-006 | Separate `investment_entities` and `investment_holders` records; project Land Club Norden Cross LLC must never be merged with lender Norden Cross LLC by name |
| Positions | Source position ID links holder and entity; equity, loan and reserve remain distinct |
| Norden terms | position_type → position kind; commitment_amount, pref_rate, ownership_percent and profits_interest_percent remain separate |
| Sutter terms | role/other source terms retained; payment_basis, entitlement, papered explicit; POS-101 entitlement is scheduled payoff, not original principal |
| Reserve | ENT-LCR / POS-102; investment_type, amount, rate, start_date separate from loans |
| Scott | PER-007 → INV-005 spans POS-006, POS-101 and POS-102; no login/grant is inferred from those identifiers |
| Loan/event references | Join omitted holder/entity through position ID; unique external IDs preserve provenance |
| Event classifications | actual, scheduled, held, assumed, non_cash, internal_transfer; no computed cash-paid total in this implementation |
| Equivalent events | DST-001–004 and SCH-101–104 represent the same economic payments; supply shared economic_event_key and review rather than double count |
| Internal transfers | TXN-1003 / TXN-1004 share transfer_group; direction text alone does not establish external cash receipt |
| Derived outputs | Summary tables/wave totals are snapshots, not independent transactions |

Money uses decimal strings / SQL numeric(20,2), and missing amounts are null. Zero is preserved as zero. Percent/rate fields use decimal precision but require an agreed unit convention before import. Excel conversion requires explicit 1900 date system and whole-day serials, rejects Excel's fictitious leap day, and uses UTC arithmetic to return date-only strings. A 1904 workbook must be converted explicitly before submitting the normalized bundle. The preview digest covers normalized JSON, not the original XLSX bytes; source snapshot SHA-256 should cover the original captured artifact. Schema terms preserve raw source fields for reconciliation without evaluating formulas.

## Pending source decisions and validation

The parent workbook review reports 40 tabs, clean source-key joins and these counts: 17 holders, 13 people, 14 access links, 3 entities, 22 positions, 5 loans, 20 transactions, 52 distributions and 4 Scott schedule rows. These findings were received as review evidence; no original workbook or complete normalized row bundle was imported in this task.

- Twelve of 13 people lack email; verified auth identity mapping remains required even when an email exists. Vendors with gets_login=no must not acquire access through name similarity.
- Norden lender's six/seven beneficial owners and full-loan versus per-person visibility remain unresolved. Do not activate the placeholder Nathan access as a broad loan grant.
- Deal distribution dates November 30 / February 28 / May 29 differ from Scott schedule December 4 / March 4 / June 4. Preserve both with pending confirmation. Scott and 5272 Norden next dates are blank; only the lender's November 19 date is reported confirmed.
- SCH-103 uses 91 rather than 90 days: source 2,869.45 versus review comparison 2,837.92. SCH-104 uses 91 rather than 92 days: source 1,436.63 versus comparison 1,452.42. Final schedule zero differs by one cent. Tests preserve source and comparison separately and never calculate replacement payable balances.
- Sutter uses a locked 1,186,248 denominator; fixed schedules do not flex pro rata. Do not substitute current entitlement totals. Zengel's alternative terms remain unelected.
- Norden ownership and profits-interest allocations differ. Preferred returns are not unconditional payment promises. Original whole-dollar interest / segment-rounded pref and Scott cent-level schedules need an explicit rounding policy.
- The balance sheet's net income is a balancing plug; its Balanced flag is not independent accounting validation. Closing cash does not fully bridge to wave one.
- Reserve payment evidence and terms, actual investor documents, and source balances remain draft. No Reserve transactions or accrual engine were activated.
- Decide who may release draft reports and when, the exact rate/percentage units, lender scope, disputed schedules, term elections, and final statement/PDF format before production rollout.

## Migration review

Migration 018 has only been executed in isolated in-memory PGlite tests. It adds tables and indexes; it neither backfills nor alters existing investment/property/document grants. The local store initializes the new empty tables only when NODE_ENV=development and DATABASE_URL is absent. With DATABASE_URL present, migrations must be applied separately by an authorized operator; this task did not do so.

The local store splits explicit statement-break comments, preserving PL/pgSQL bodies. Replay was tested twice through the same query path. Production PostgreSQL role ownership, grants and deployment migration order still require staging review. Migration 018 requires the existing properties table. Earlier uncommitted migrations 015–017 were preserved. No auth.users FK is assumed, matching the existing external-auth boundary. Nullable entity/property references allow unresolved staging; the import preview requires explicit entity links. Before production imports, require complete source mapping and validate snapshot precision. Do not edit this migration after it has been applied in a durable environment.

## Validation and preview

- `node --import tsx --test tests/investor-reports.test.ts tests/investor-import-preview.test.ts`: 4 passing tests, exercising anonymous/unrelated/shared-holder/admin access, missing identity, revocation, disabled person, release withdrawal, JSON/CSV/file downloads, 15-table RLS, snapshot immutability, discrepancy preservation, null/zero/precision, Excel dates, duplicate events and read-only import previews.
- Existing member investment/document/group-document/security tests: 9 passing tests.
- `npm run typecheck`: passed.
- No production build or live PostgreSQL integration run was performed.

Local preview: `http://127.0.0.1:3000/dashboard/reports/preview`, with `?project=sutter` and `?project=reserve` variants. Requires the existing explicit local staff mode and a development server. Preview opening was queued through Codex. UI verification is blocked: the CUA tool returned `Browser is not available: iab`, and browser inventory was empty. Chrome was not opened or used. Desktop/mobile screenshots and interaction verification remain to be done in Codex's in-app browser.

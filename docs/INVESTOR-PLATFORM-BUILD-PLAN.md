# Investor platform — build plan

> Current storage (October 19, 2026): investor records and original source spreadsheets have been transferred to the configured hosted Supabase database. The app uses hosted storage whenever DATABASE_URL is set. Earlier local-only notes below describe the initial implementation and are superseded by section 16.


Updated: October 19, 2026

Current admin navigation: investor management is consolidated into **Members → member profile → Investments**, in both the drawer and full profile. Explicit investor/member identity links scope the displayed reports, holder access, draft review, publishing, attachments, and statement editions. The existing company/property investment checkboxes remain above the reports; View as is available in the admin Profile menu, not in member profiles. Shared source imports and audit history are under **Members → Advanced investment tools → Source files and imports** (`/dashboard/investor-data`). The old `/dashboard/investors` page redirects to Members and is no longer a navigation item. Existing financial data and publication rules are unchanged; the deferred new-spreadsheet upload workflow is not part of this consolidation.

Status: Planning baseline. This document records the requested direction and proposed implementation; it does not claim implementation, deployment, source verification, or investor release.

## 1. Outcome and scope

Build real investor journeys for Ian Kenny and Scott Jeeves, with an administrator able to view the platform as either person before invitations are sent. Use the existing Figma designs and mocks for visual and aesthetic reference only. Financial values, holdings, access, and document availability must come from records, not mock components.

The first milestone is a read-only, real-data experience: an administrator can switch between Ian and Scott, see their actual imported positions and dated source balances, inspect supporting activity, and verify isolation. It does not require daily accrual calculations, completed legal documents, or sending invitations.

This plan covers the investor platform increment discussed October 19. It does not expand the public website, bookings, events, payment execution, or other earlier PRD features. Nathan's October 16 agenda identifies October 30 as a desired live website/platform date; that is a target, not a delivery promise for every phase below.

### Confirmed direction versus proposed choices

- Confirmed: mocks are visual reference; build from real records; start with Ian and Scott; administrators need a “View as” experience; document the work before implementation.
- Proposed baseline: read-only admin preview, identity records before invitations, source-dated balances before live calculations, explicit review/release, and the phased sequence below.
- Open: financial interpretations, verified login addresses, release authority, and deployment/import rollout. Do not infer these from mock screens or workbook role labels.

## 2. Evidence and existing work

Source emails:

- [Norden Cross data for the investor platform — October 16](https://mail.google.com/mail/u/?authuser=dzuylinh%40gmail.com#all/1a147a1ad6bc2d15).
- [Scott Jeeves profile and Sutter Creek Farm deal data (draft) — October 16](https://mail.google.com/mail/u/?authuser=dzuylinh%40gmail.com#all/1a147fb688e4807b).
- [Meeting agenda and requested user journeys — October 16](https://mail.google.com/mail/u/?authuser=dzuylinh%40gmail.com#all/1a145d2ca5a9272a).
- [Platform Architecture in Figma](https://www.figma.com/design/jmYtIprQpCZxq5PmrDvx3g/Land-Club-Platform-Design?node-id=1256-2).

Four draft workbooks, dated October 16, are retained privately in `.data/investor-review/`, with original files, text extractions, normalized review JSON, and a hash manifest. Never commit those private files or put them in public assets or client bundles.

| Source | Purpose |
| --- | --- |
| Norden Cross investor data | People, legal holders, access links, equity/loan positions, transactions, terms, snapshots, and gaps. |
| Norden Cross balance sheet v2 | Company financials, cash roll-forward, spending, and supporting interest/pref examples. |
| Sutter Creek Farm deal | Company sale, buyer receipts, distribution waves, investors and other payees, fixed and pro-rata schedules. |
| Scott Jeeves profile | Additional Sutter loan details and Reserve; combined portfolio example using existing source IDs. |

Required dependency order: Norden → Sutter → Scott. Treat the balance sheet as company-level support, not another set of investor transactions.

| Current implementation | Reuse / change |
| --- | --- |
| Supabase Auth, invitations, member/admin identity | Reuse authentication; add explicit person-to-holder mapping and preview context. |
| `/dashboard/portfolio` and child mock pages | Reuse presentation patterns; replace fixed Ian values and placeholder files with authorized data and empty states. |
| `/dashboard/reports/source-review` | Preserve local admin source inspection; it is not an investor publication mechanism. |
| `/dashboard/reports` and report APIs | Reuse and extend server authorization, report rendering, JSON/CSV downloads, and release checks. |
| Migration 018 | Reuse people, holders, access, entities, positions, terms, loans, events, reports, snapshots, and report documents. Audit coverage before extending. |
| Member investment selections | Administrative associations only; never infer financial ownership or access from them. |
| Member/group document management | Reuse suitable validation and auditing patterns; preserve separate financial-document access rules. |

See [Investor reporting implementation notes](INVESTOR-REPORTING.md) and [Document security](DOCUMENT-SECURITY.md). The older [PRD](PRD.md) and [Backlog](BACKLOG.md) cover broader scope and contain historical statuses; they are not proof of current completion.

## 3. Canonical relationships

An authenticated person has explicitly granted access to one or more legal investment holders. A holder has positions in entities. Each position has its own terms, events, balances, schedules, and applicable documents. Company-level reports belong to an entity and require a defined eligible audience.

Distinguish:

- Person: the human using an account.
- Authentication account: verified login identity, linked explicitly to a person; may be absent during internal preparation.
- Holder: trust, IRA, LLC, or individual that holds the investment.
- Entity: the project company or Reserve arrangement.
- Position: a particular equity stake, loan, Reserve balance, or other economic relationship.
- Role: platform capabilities, separate from investment type and financial access.

One person can access multiple holders; one holder can have multiple authorized people. Equity, loan, and Reserve describe positions, not mutually exclusive kinds of users. Do not merge the lender “Norden Cross LLC” with the project company “Land Club Norden Cross LLC.”

Extend the existing schema only after mapping all required source fields. Preserve legal names, source IDs, terms, dates, units, provenance, and unresolved values. Distinguish original principal from payoff entitlement, ownership percentage from profits interest, accrued from paid, and reported from verified.

## 4. User journeys

### Ian

1. Admin creates or matches Ian's person record and the trust holder, without fabricating an email.
2. Map Ian to the trust's Norden equity position; support a separate Khobi login with access to the same holder.
3. Admin selects “View as Ian.”
4. Portfolio shows actual imported contribution/return activity and the October 16 source snapshot, with the date and draft/review status visible.
5. Position details show recorded terms without inferring profits interest from capital share.
6. Ian can navigate to applicable company reports, investor statements, and documents when released; otherwise see an informative empty state.
7. Later, send an invitation to a verified address and test the same experience under Ian's own authenticated identity.

### Scott

1. Reuse Scott's person/holder records across all imports.
2. Show separate Norden loan, Sutter loan, and Reserve positions.
3. Show source-dated principal/balance, interest status, and activity appropriate to each position.
4. Present pending schedule dates as unresolved; do not promote one conflicting date to a confirmed “next payment.”
5. Represent the Sutter-to-Reserve movement as one linked internal transfer: reduce the loan balance and credit Reserve without counting external cash paid twice.
6. Keep loan totals and Reserve totals distinct. Any combined total must specify its date, included positions, and whether values are reported or calculated.
7. Grant only Scott's holder access, then later verify invitation and actual login separately.

### Administrator

Review source → validate import → inspect changes and exceptions → commit approved records → assign financial access → preview investor → review/release eligible information → invite → maintain subsequent activity.

No email is sent merely by preparing a person or selecting “View as.”

## 5. Admin “View as”

### Behavior

- Provide a “View as” action on the member/person detail screen and an admin-only person selector that includes prepared people without login accounts.
- Display a persistent banner: “Viewing as Scott Jeeves — Exit preview.”
- Keep the administrator authenticated as themselves. Never obtain another user's password, mint their login session, or reuse their credentials.
- Preview is read-only initially. Disable and server-reject profile changes, invitations, access changes, transaction entry, agreement acceptance, and other mutations in preview context.
- Exiting clears preview and restores the admin experience. Sign-out and session expiry clear it too.
- Preserve the real administrator and effective person separately in request context and audit events.

### Authorization

- Every request must verify the real actor is still an administrator before accepting preview context. Never trust a client-supplied person ID alone.
- Resolve grants from the effective person's active holder links. Do not pass the administrator's broad-access flag into investor queries.
- Normal investor queries derive the person from the authenticated UUID. Preview resolves a prepared person by server-validated ID so no fake auth UUID is needed.
- Default preview must obey investor release rules. Unreleased information belongs in a separate, clearly labeled admin review view; preview must not suggest investors can see it.
- Before release, use an admin-only test environment or explicitly labeled draft review to inspect imported content. Keep this distinct from proving actual investor visibility.
- Apply context consistently to pages, JSON/CSV exports, documents, and any other resource endpoints. A direct URL must not bypass restrictions.
- Recheck admin status, target status, grants, and release state on requests. Revoke/disable changes must take effect without a new login.
- Use private/no-store responses for sensitive content and prevent cache mixing across admin, preview targets, and normal users.
- Proposed transport: server-controlled, expiring preview context protected against tampering and cross-site changes. Final implementation must define expiry and multi-tab behavior; avoid silently switching unrelated tabs.
- Audit preview entry/exit, target switches, and sensitive downloads with the real admin and effective person; avoid storing document contents or financial payloads in logs.

### Acceptance

- An ordinary member cannot enter preview or forge its context.
- Ian and Scott see different, correctly scoped data; unrelated document/report URLs deny access.
- Preview does not reveal unreleased records merely because the real actor is an admin.
- Disabled people, revoked grants, withdrawn releases, lost admin rights, and expired preview sessions fail closed.
- Prepared-person preview works before invitation; real login later produces equivalent authorized content.

## 6. Import and reconciliation

Build a reusable adapter from the supplied workbook formats to canonical records. Existing normalized JSON validation is a starting point, not a completed importer.

1. Capture original source hash, filename, version, and as-of date.
2. Parse and validate identities, references, amounts, percentages, dates, and classifications.
3. Show a dry run: new/changed/unchanged records, unresolved links, conflicts, duplicates, and rejected rows.
4. Retain source evidence and unresolved fields. Never silently convert missing amounts to zero or assumed payments to verified payments.
5. Commit an accepted batch transactionally, with an import record and audit trail. Repeating the same source is idempotent.
6. Reconcile updated workbooks by stable IDs and source versions. Do not silently overwrite manual decisions, issued statements, or previously reviewed facts.
7. Separate source capture, canonical updates, identity grants, and investor publication. Importing an `admin` label or `gets_login` flag never grants platform privileges or sends email.
8. Provide a correction/superseding-version workflow; preserve history and avoid destructive deletion of financial evidence.

Specific mapping requirements:

- Scott's distribution rows and loan schedule rows can describe the same payment; link them using source equivalence, not duplicate transactions.
- Pair both legs of internal transfers and retain external cash distinctions.
- Keep actual, reported, assumed, scheduled, held, non-cash, and internal-transfer meanings distinct.
- Keep company spending and financial statements separate from investor contribution/distribution events.
- Model Sutter's buyer receipts and outgoing distributions as different flows.
- Retain vendors and other parties needed for reconciliation without granting logins.
- Preserve source snapshots as evidence; do not treat every summary row as another ledger event.

## 7. Real portfolio and reporting

- Replace mock-backed routes with a shared authorized portfolio service and position-specific presentation.
- Provide portfolio overview, position detail, activity, schedules, entity reports, quarterly updates, and statements/documents navigation.
- Show as-of date, source/review status, and missing-data states consistently. Initial balances are reported October 16 snapshots, never labeled “today.”
- Display only meaningful aggregates with compatible dates and currencies. Do not sum ownership percentages across unrelated entities.
- Reuse styling from mocks while removing fixed names, values, legal assertions, fictional narratives, and fabricated document content from real journeys.
- Keep any design-only mocks behind a clearly labeled internal reference route; retain isolated test fixtures.
- Define company-report audiences explicitly. A company report may be shared across eligible positions; personal capital statements remain holder/position specific.
- Preserve existing JSON/CSV download authorization; add portfolio endpoints only where required by the UI.
- Quarterly updates need real authored content, a reporting period, attachments, review state, and explicit release. No placeholder narrative is published as an actual update.

## 8. Calculations and statements

Phase one displays supplied snapshots. Phase two adds deterministic, tested calculations from dated events and confirmed terms.

| Position type | Required logic |
| --- | --- |
| Norden equity | Simple cumulative preferred return over capital-change periods; separate accrued, paid, unpaid, and remaining capital. |
| Norden loan | Principal, earned interest, cash payments, and prepaid versus unpaid interest; do not treat prepaid interest as another amount owed. |
| Sutter loan | Multiple advances, fees/points where confirmed, declining balances, scheduled versus actual payments, and date/rounding conventions. |
| Reserve | Deposits, withdrawals/transfers, confirmed rate and start dates; separate from loan balances and principal originally invested. |
| Sutter distributions | Fixed schedules versus pro-rata entitlements using the specified locked denominator; preserve held/unconfirmed outcomes. |

Use precise decimal arithmetic and date-only conventions. Agree rate units, accrual boundaries, timezone/as-of cutoff, segment versus final rounding, and treatment of corrections. Do not silently substitute recalculated balances for source values: expose comparison differences for review.

Live accrual should calculate for a requested date; it should not require storing a row each day. Issued statements should use immutable editions with cutoff date, source versions, calculation version, review/issuance metadata, and correction by a new edition. Historical statements must not change when today's date or later events change.

Production statement/PDF generation is distinct from the existing mock PDF generator. Define approved statement contents and formatting before implementation. Do not generate tax forms or legal agreements from placeholders.

## 9. Documents and ongoing admin work

- Receive and validate actual agreements, statements, and other files; associate each with an explicit holder/position/entity audience and document type/period.
- Reuse private authenticated downloads and suitable existing format/size validation. Do not introduce public file URLs.
- Every download rechecks current authorization and release status; audit financial-document access as well as preview access.
- Show unavailable/pending documents honestly. Importing source data does not manufacture a signed agreement or K-1.
- Provide admin review tools for identity mapping, grants/revocations, import exceptions, terms, events, schedules, reports, and documents.
- Maintain separate review and release states: draft may be reviewed internally without being visible to investors. Record who released or withdrew information and when.
- Record new wires/payments with supporting references and explicit classification; publishing a new balance requires the applicable review rules.
- Protect concurrent edits and retain correction history. Define release authority before enabling investor publication.

## 10. Decisions and source gaps

| Decision / gap | Needed from | Blocks |
| --- | --- | --- |
| Verified login addresses and account matching | Nathan / Che / account holders | Invitations and real account mapping, not prepared-person preview. |
| Ian profits interest: workbook 50% versus mock 42% | Nathan and governing documents/counsel | Approved financial wording and profit allocation calculations. |
| Preferred return versus capital payout order | Nathan and governing documents/counsel | Approved waterfall; mock says capital first, workbook says pref first. |
| Contribution dates and treatment of prior capital return | Nathan / supporting records | Verified historical equity accrual. |
| Loan rates, maturity, payment dates | Executed notes / Nathan | Confirmed loan calculations and next-payment labels. |
| Scott note dates versus Sutter wave dates; schedule arithmetic/rounding | Executed note / Nathan | Confirmed Sutter payment schedule and live balance engine. |
| Reserve rate/security/withdrawal terms and future payment destination | Nathan / Scott / counsel | Verified Reserve rules and future movement workflow. |
| Norden lender LLC beneficial owners and whole-loan versus individual visibility | Nathan | Grants for those individuals; do not grant via placeholder ownership. |
| Sutter assumed-paid activity, held election, settlements, and bank variance | Nathan / bank records / relevant parties | Verified distributions and affected releases. |
| Draft company accounts, balancing figure, omitted accruals | Nathan / accounting reviewer | Verified company statements. |
| Actual documents and intended audiences | Nathan / document owners | Real document availability. |
| Who may release, withdraw, or correct reports; statement format | Product/operations owner | Production publishing workflow. |

These gaps should block only affected claims/actions. Continue importing and internally reviewing clearly labeled source data. The data_gaps tabs and reconciliation findings remain visible until explicitly resolved.

## 11. Delivery sequence and acceptance gates

| Phase | Deliverables | Exit condition |
| --- | --- | --- |
| 0 — Baseline | This plan; field mapping; environment/schema inventory; reconcile design/source discrepancies. | Implementation scope and unresolved decisions are explicit; existing data is preserved. |
| 1 — Prepared identities and preview | Ian/Scott person and holder mapping, read-only View as, banner/exit, audited server context. | No invitations required; preview authorization and mutation-denial tests pass. |
| 2 — Real dated portfolios | Versioned dry-run/import, relevant entity/position/event/snapshot records, shared portfolio service, Ian/Scott screens, missing-document states. | Admin can inspect both real journeys; source dates/status are clear; no hardcoded mock financial values. |
| 3 — Operational review and delivery | Review/release controls, real document attachment, updates, correction workflows, verified invitations. | A released subset works under actual test logins and matches preview scope; unreleased/private records stay hidden. |
| 4 — Live balances and issued statements | Confirmed calculation rules, reconciliation tests, historical editions, approved exports. | Agreed source examples reconcile or differences are explicitly resolved; issued statements remain stable. |

Dependencies: phase 1 can use isolated test records before phase 2. Phase 2 needs the real import and authorization mapping. Investor publication in phase 3 requires approved data and identity mappings, even if phase 4 is deferred. Production deployment/import is a separate rollout step, not implied by completion in local code.

### First milestone demonstration

1. Sign in as admin and open Ian's prepared person record.
2. Select View as; confirm banner, trust position, dated balances, activity, and appropriate report/document availability.
3. Exit and repeat for Scott; confirm three distinct positions and linked Reserve transfer.
4. Verify direct requests for the other person's records are denied.
5. Revoke a grant and withdraw a report release; verify access changes immediately.
6. Confirm no invite was sent, no mock document was presented as real, and no preview action altered investor records.

## 12. Verification and rollout

- Import tests: reference integrity, idempotency, changed versions, duplicates, equivalent payments, internal transfers, null/zero, precision, date systems, and atomic failure.
- Access tests: anonymous, ordinary member, admin, preview, shared holder, multiple holders, unrelated holder, prepared person, disabled person, revoked grant, release withdrawal, forged context, and stale sessions.
- Browser checks: Ian/Scott switching, persistent banner, exit, navigation, empty states, responsive layout, downloads, and no cache leakage between identities.
- Calculation tests: supplied check figures, contribution/return boundaries, multiple advances, prepaid interest, transfers, rounding, and fixed historical statements.
- Invitation checks: verified address, acceptance, expiry/revocation, session behavior, and equivalent content between actual login and preview.
- Before durable migration/import: inspect applied migrations, back up affected data, test in isolation/staging, and review the dry run. Extend applied migrations rather than editing their historical contents.
- Confirm hosted authentication, database permissions, document access, migration order, and deployment behavior separately; local tests do not establish production readiness.
- Maintain an implementation checklist here as work progresses. Mark completion only with linked evidence; distinguish code complete, locally verified, deployed, imported, and investor-released.

## 13. Explicitly deferred

- Brokerage/custodian integration (including the Charles Schwab idea Nathan explicitly said not to build yet).
- Moving money, initiating wires, automated payouts, or investing from Reserve.
- E-signature, agreement acceptance on another person's behalf, tax-document authoring, or legal-document generation.
- Admin impersonation that grants write authority as the investor.
- Automatic role grants from spreadsheets, inferred ownership from names/email similarity, and public self-registration.
- Rebuilding the architecture around direct browser-to-Supabase table APIs. Continue with Next.js server authorization and PostgreSQL unless a separate decision changes that boundary.

## 14. Implementation checklist

Checked items refer to the local implementation and validation described in section 15, not hosted rollout. Revocation/release tests use isolated synthetic records; actual source findings remain pending.

- [x] Audit current schema/environment and map source fields.
- [x] Reconcile mock/source wording and retain unresolved decisions.
- [x] Build prepared-person identity and holder mapping.
- [x] Build secure, audited read-only View as.
- [x] Implement versioned import dry run and commit.
- [x] Import Ian/Scott source records into the selected review environment.
- [x] Replace mock portfolios with authorized dated records.
- [x] Verify isolation, revocation, releases, and preview exit end to end.
- [ ] Build staff maintenance, review, and release workflow.
- [ ] Attach actual documents with correct audiences and auditing.
- [ ] Verify invited-person login parity with preview.
- [ ] Confirm calculation conventions and implement tested engines.
- [ ] Build immutable statement issuance and approved exports.
- [ ] Validate staging/production rollout and release an approved investor subset.

## 15. Local implementation — October 19, 2026

The first working slice across the five requested steps is implemented. This is a local review environment, not a production release.

| Step | Implemented | Remaining |
| --- | --- | --- |
| 1. View as | Prepared Ian/Scott people, explicit holder links, administrator-bound hashed preview sessions, 30-minute expiry, persistent banner, exit, audited access. Investor mode obeys release rules; separate admin draft review includes unreleased reports. | Full-site impersonation is deliberately out of scope: the investor area is scoped while surrounding navigation and other tabs retain the administrator identity. |
| 2. Real records | Four private workbooks imported into isolated local PostgreSQL-compatible storage: 2 people, 2 holders, 3 entities, 4 positions, source snapshots, dated events, terms, loans, schedules, findings. Digest-based dry run/import is idempotent. Changed sources produce new draft report versions. | Canonical entities/events are inserted once, not overwritten by subsequent imports. Field-level reconciliation and approval of changed canonical terms/events need a dedicated maintenance workflow. |
| 3. Real portfolios | Authorized dated portfolios, activity, schedules, review notes, private documents and CSV/JSON exports. Mock portfolio routes redirect to real portfolio. | Company financial views, authored quarterly updates and further visual refinement. No single combined total is inferred across different positions/dates. |
| 4. Admin operations | Evidence resolutions, review/release/withdraw, holder revoke/restore, verified existing-account linking, private document upload, download auditing, audit history. | Actual verified login emails/invitations and signed files; richer event/term/schedule correction tools and production release authority. |
| 5. Calculations/statements | Exact-cent Actual/365 calculations, capital-change segments, prepaid/unpaid interest, fixed-denominator allocation helper, source-based scenario screen, immutable issued JSON statement editions. | Confirmed financial conventions, full Sutter reconstruction and waterfall rules, live published calculation results, approved PDF statement layout. No disputed assumptions were confirmed. |

### Try it locally

1. Run `npm run dev` and sign in with the existing administrator account.
2. Open `/dashboard/investors` (Investors in Admin tools).
3. The current four-workbook source version has already been imported locally. “Import / check” is safe to repeat and reports no new import for the same digest.
4. Choose **Review unreleased drafts** for Ian or Scott to see the actual imported portfolios. **View as** shows precisely the released investor subset, currently empty because actual source findings remain unresolved.
5. Exit returns to the workspace. Review calculations using the dedicated link; changing its date does not update investor balances.
6. Resolve actual findings only with supporting evidence, then review and release. Documents attach only to unreleased reports; attachments reset review to draft. Issuing a data statement requires a reviewed released report and creates a frozen edition.

### Environment and rollout

`src/lib/investor-platform-db.ts` uses `.data/investor-platform` in development, even when a hosted `DATABASE_URL` exists. Other existing application features keep their existing storage. Neither this private database nor `.data/investor-review` is tracked or included in production file tracing. Do not run multiple dev processes against the same local data directory.

Outside development, the investor repository uses the configured application database. Apply migrations 018 then 019 through the normal migration workflow after staging validation and backup. Production does not automatically migrate or read/import local workbooks. A controlled durable import path and release process remain rollout work. No hosted investor data or auth accounts were changed by this local build.

Tests use synthetic isolated SQL fixtures to exercise import/versioning, cross-holder denial, expired/exited sessions, account mapping parity, revocation, release withdrawal, immutable statements and audit protection. Actual local workbook validation is optional when the private fixture is present. Financial check figures exercise Ian preferred return, Reserve accrual, Scott prepaid interest and fixed-denominator allocation. These checks establish implementation behavior, not approval of underlying source terms.

Validation result: full suite 128 passed / 1 optional test skipped; final focused investor suite 5 passed; TypeScript and production build passed. Browser checks verified Ian investor empty state, Ian draft trust position, Scott three draft positions, and preview exit. Private source/database paths were absent from production trace manifests.

### Portfolio presentation correction

Keep the existing Figma Portfolio aesthetic and layout as the investor-facing product. `RealInvestorPortfolio` now reuses the original Portfolio styles, Norden photograph, headline metrics, position/activity cards and document section, with amounts taken from authorized report records. Portfolio itself offers administrator-only Ian/Scott preview buttons; these explicitly show draft data without releasing it. Import, reconciliation and publishing stay in the separate admin workspace. Unsupported mock financial terms and unpublished company updates remain pending instead of being presented as real.

### Company reports connected to source snapshots

The original company-report design now reads the Norden Balance Sheet and Spending tabs from the imported immutable source snapshot associated with the authorized position report. Cash is $65,671.67, assets $864,404.67, liabilities $767,550.00, equity $96,854.67 and April 1–October 16 cash spending $148,181.33. Five display categories group the source spending lines without changing the total; percentages are derived and rounded. The mock monthly average is replaced with period spending rather than introducing an unsupported average.

The page keeps draft/unaudited status and source caveats: computed cash awaits bank confirmation, net income is a balancing figure, omitted accruals remain omitted, and the $800 purpose is unconfirmed. It exposes company aggregates, not other investors’ capital-account or lender-level rows. Existing report authorization, preview binding, grant revocation and release rules apply on every load. Sutter and Reserve do not inherit Norden financials. Quarterly narrative/progress stays pending. Seven focused tests and production build passed; browser verification covered all three financial sections.

## 16. Hosted storage transfer — completed October 19, 2026

Applied migrations 019 and 020 to the existing hosted Supabase `land_club` schema (018 was already applied). The affected hosted tables were empty. Copied the existing local data without regenerating identities, report IDs, findings or audit history: 1 source snapshot, 3 entities, 2 people, 2 holders, 2 access links, 4 positions/terms, 2 loans, 9 events, 4 reports, 52 report lines, 10 schedule rows, 17 findings and 1 import batch. All 13 existing audit entries were preserved and a transfer audit entry added. No issued statements or uploaded investor documents existed to transfer. All four reports remain unreleased, and both prepared people remain unlinked to login accounts.

Archived four original XLSX files in private `investor_source_files`, protected by RLS, browser-role revocations and an immutability trigger. Admin-only authenticated downloads are available under Original source spreadsheets. Checksums verified byte-for-byte. Active preview tokens were intentionally not transferred.

The developer app now uses `DATABASE_URL` for investor data, just like the rest of the app. Offline PGlite is used only when no database URL is configured in development. Import review and calculation tools now load evidence from hosted source snapshots; they no longer require local spreadsheet files when connected. Mutations made locally through these screens now change the shared hosted records.

Backups: `.data/backups/investor-transfer-2026-10-19T23-03-02-525Z/` contains a stopped-database physical copy, a portable local record export and the hosted pre-transfer state. Private backups stay ignored by Git and excluded from deployment. `scripts/transfer-investor-data.mjs` defaults to dry run, refuses nonempty target tables, applies migrations through the normal runner, transfers records in one transaction, and verifies every copied row plus evidence hashes before committing. Run `node --env-file=.env.local scripts/transfer-investor-data.mjs --verify` for hosted counts; do not repeat `--apply` against the populated target.

Validation: focused SQL/source tests (7 passed), production build, hosted record-count/row/hash verification and browser verification of the hosted workspace. This transfer does not deploy the pending UI/code changes to the public website or release investor reports.

### Dashboard-wide “View as” (October 19)

Admins can choose Ian or Scott from the Profile menu. The switch creates an audited,
30-minute server session bound to the authenticated admin, with an HttpOnly cookie.
The normal dashboard routes now use the selected member's identity: home, property
associations, Portfolio and company reports, personal/group documents and downloads,
and read-only profile details. Navigation uses the same identity, hides admin tools,
and displays a persistent exit banner. Switching refreshes the layout and resets
member client state. An expired or invalid session fails closed until exited.

Migration `021_dashboard_preview.sql` adds an explicit source-person → prepared-member
link. `node --env-file=.env.local scripts/link-preview-members.mjs` validates the two
reviewed links (dry run by default; `--apply` saves an audit entry). No names or emails
are used to infer access at request time, and no property/document grants or login
accounts are created. Scott currently has Norden Cross, Sutter Creek and Todos Santos
associations. Ian is explicitly linked to Norden Cross with the investor property
role at the user’s request. This association is stored in the hosted database and
audited; his financial report access remains independently scoped in Portfolio.

The Profile menu defaults to draft-inclusive reporting so administrators can inspect
the current unreleased source data; the banner and report cards label that difference
from the eventual investor-visible version. Existing Admin workspace controls still
allow released-only previews. Account changes and admin mutations are denied while
viewing another person; this does not create an authenticated session for that person.
Profile photo endpoints cannot expose or edit the admin's photo during preview.

Bookings remain a browser-only prototype outside preview. “View as” displays an
explicit unavailable/empty state instead of sample stays; real booking persistence,
availability and booking actions still need to be implemented. Following is also
not yet backed by member records. Club events remain shared member content.

Validation: production build; SQL tests for explicit identity links, conflicting
accounts, removal of admin authority, report isolation/revocation; existing preview,
member-document and group-document access tests; browser checks switching Scott → Ian
→ admin, scoped documents, read-only profile/bookings, and denial of Ian's report
while viewing Scott.

### Automatic investment properties

My Properties, its sidebar links and the Home property card now merge manual
associations with properties derived from active investor-access grants and equity,
loan or sweat-equity positions. These derived associations are evaluated on each
request, deduplicated, and labeled Investor; they do not create manual membership
rows. Disabled people and revoked grants stop contributing derived properties.
Existing manual associations remain independent. This applies to both linked login
accounts and prepared-member View as sessions, without relying on report publication.

Migration `022_investment_property_links.sql` adds a project-level property mapping.
Norden Cross and Sutter Creek have been mapped in the hosted database. New investors
in those projects need no per-person property association. A new project must be
mapped to its property once (or its position must have `property_id`); unmapped
projects and the cash reserve are not fabricated into property listings. Property-shared documents also use these investment-derived property links, as
described below.


### Automatic investor document access

The Documents list and direct group-document downloads now resolve investment-derived
properties with the same helper as My Properties. A document shared with a matching
property and the Investor audience is visible even without a manual member-property
association or a separately assigned global Investor role. Property-wide documents
(no role restriction) also apply. Investment-derived access does not grant owner,
team, or other role-only audiences, nor access to unrelated properties. Existing
manual and everyone audiences continue to work as before; personal document and
financial report permissions remain separate.

No document audiences are changed or files automatically published. Admins share a
file once with its property and Investor audience. Current and future investors with
active access then receive it automatically. Listing and downloading independently
resolve current access; disabled identities and revoked investment grants no longer
contribute derived access. SQL tests cover prepared previews, linked login accounts,
listing/download parity, unrelated properties/roles, revocation and disabled people.

### Private investor workbook extracts (October 19)

Created and saved two static XLSX extracts in hosted `member_documents`, scoped to
Ian's and Scott's explicitly linked member identities. Ian has Norden Cross equity;
Scott has Norden Cross loan, Sutter Creek loan and reserve tabs. Every sheet labels
October 16, 2026 figures as draft/unaudited and retains row-level source references.
Scott's conflicting Sutter Creek dates are shown side by side as alternatives to
one payment, with confirmation pending. Other investors' records, contact details,
company-wide capital accounts and internal findings are excluded.

These are user-authorized private document releases, not report approval or a
change to financial report publication status. Existing full source files remain
admin-only. XLSX files were generated and verified locally, then stored through a
one-time audited database write; general file uploads still accept only the existing
validated formats. Downloads use the existing private attachment endpoint. Ownership
checks against the hosted repository verified own-file access and cross-member
listing/download denial. Local deliverables are git-ignored under
`outputs/investor-private-20261019/`; extraction/build/publication manifests remain
in ignored `.data/investor-documents/`. These dated extracts do not update live.

### Automatic private workbook refresh

The two private extracts are now enrolled in `automatic_investor_documents` (migration
023). Opening Documents or downloading an enrolled file resolves current person/holder
access, loads the newest imported report for each accessible position, and hashes the
scoped payload plus generator version. Changed content regenerates the values-only
XLSX using the deployed ExcelJS dependency. Unchanged content is reused. The document
ID and private download URL remain stable; the filename uses CURRENT_DRAFT, and each
sheet retains its own source as-of date. Already-downloaded copies remain snapshots.

This is request-time regeneration, not background polling or live interest accrual.
It follows normalized report lines and schedules used by Portfolio. Raw source changes
must first be imported into platform reports. It includes draft source reports by the
user's explicit authorization for these private extracts; it does not release reports
or statements. Full source workbooks, company-wide capital accounts, findings and
contact lists are never copied into generated files. Schedule source rows may include
alternative representations of one payment and are explicitly marked not to sum.

Before an update, the previous file is preserved in `investor_document_versions` with
its document version. Updates are serialized per document, source/access are rechecked
after generation, and refreshes are audited. Revoked/disabled source identities return
no generated document rather than serving stale bytes. Owner authorization occurs
before regeneration and again before download. Existing manually uploaded files are
unchanged. This policy is attached only to the explicitly enrolled Ian/Scott files.

Deployment: run migrations, then
`node --env-file=.env.local scripts/enable-automatic-investor-documents.mjs --apply`.
Without `--apply`, enrollment is validated and rolled back. The script checks existing
ownership and refuses conflicting mappings. Tests cover same-link refresh, unchanged
cache reuse, source edits, latest-import selection, original version preservation,
immutable history, linked login access, revoked/disabled access and cross-member denial.

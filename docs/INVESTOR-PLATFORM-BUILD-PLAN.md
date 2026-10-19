# Investor platform — build plan

Updated: October 19, 2026

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

- [ ] Audit current schema/environment and map source fields.
- [ ] Reconcile mock/source wording and retain unresolved decisions.
- [ ] Build prepared-person identity and holder mapping.
- [ ] Build secure, audited read-only View as.
- [ ] Implement versioned import dry run and commit.
- [ ] Import Ian/Scott source records into the selected review environment.
- [ ] Replace mock portfolios with authorized dated records.
- [ ] Verify isolation, revocation, releases, and preview exit end to end.
- [ ] Build staff maintenance, review, and release workflow.
- [ ] Attach actual documents with correct audiences and auditing.
- [ ] Verify invited-person login parity with preview.
- [ ] Confirm calculation conventions and implement tested engines.
- [ ] Build immutable statement issuance and approved exports.
- [ ] Validate staging/production rollout and release an approved investor subset.

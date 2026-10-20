# Reviewed investment terms and automatic accrual

Implemented in an isolated clone at `/Users/dzuy/Documents/Codex/2026-10-20/task-2/landclub`, branch `feat/investment-terms`, baseline `ed86c29`. The main checkout's admin changes were neither copied nor modified. Port 3001 and launchd were untouched. No production migration, financial record, invitation, access grant, push or deployment occurred.

## Workflow

Members → person → Investments → Investment terms → selected position → Terms.

The links target actual `investment_positions` reached through explicit person/holder relationships. The existing investment tags are not financial positions and do not grant access. New position creation is outside this change.

1. Attach a private PDF (up to 1 MiB), or reference other reviewed evidence.
2. Enter known terms and page/section references. Missing fields remain null; incomplete drafts can be saved without invented values. Equity does not require loan-only fields.
3. Reconcile opening funded principal and record later contributions, principal repayments, and interest payments in Transactions. Do not enter opening funding twice. Optional imported event UUID links evidence without mutating the imported event. An imported event can be reviewed only once.
4. Choose an explicit calculation date, inspect the inputs and calculation, then confirm. Saving a draft does not activate it. Confirmation rechecks a digest of all terms/history/transactions under a position lock, rejects stale previews, and records the calculation receipt with actor and timestamp.
5. Later terms are append-only effective-dated amendments. Draft amendments leave the last confirmed terms effective. Rate amendments must use a later effective date. Original start/principal/currency changes, historical corrections, and transaction reversals require reconciliation; no in-place history deletion or correction UI is provided.

Investor calculations require both confirmed supported terms and an existing reviewed, released report, plus the unchanged explicit investor access grant. Access is checked again after loading data. Report withdrawal, access revocation, and disabled users deny access. Agreements are admin-only downloads; adding an agreement does not automatically release it to an investor.

## Calculation contract

Supported: simple loan interest, Actual/365, integer basis-point rates (0–10000). The existing `simpleAccrual` helper supplies exact BigInt cents and actual UTC calendar-day intervals. Accrual includes the start date and excludes the as-of date. Transactions dated on as-of change principal/payment totals without accruing an extra day. Future events are excluded.

Each effective-dated revision is rounded half away from zero to cents at its boundary; within a revision, the engine rounds only the final aggregate. Interest remains separate from principal. Paid, accrued-unpaid, and prepaid amounts are shown separately; none is a contractual payable amount. The output includes the algorithm version, rounding policy and daily segments.

Unsupported equity/waterfall, compound, other day-count conventions, special conditions, unresolved terms, and post-maturity accrual show unavailable/pending. Terms can still record these instruments; no generic loan formula is applied to equity. Extensions can begin at maturity. A gap after maturity requires review. Dates are ISO calendar dates, and invalid dates are rejected.

Portfolio uses an explicit `asOf` query/input (initially today's UTC date). Calculated values are a separate card; imported balances, report dates, source snapshots and provenance are unchanged. The old scenario screen is not used by this production path. No terms were invented or activated for Ian Kenny or Scott Jeeves.

## Extraction integration blocker

No approved working document extraction provider or ingestion integration was found in the repository. This change does **not** perform OCR or AI extraction, configure credentials, or send agreement bytes to a provider. The editor clearly states “Extraction not configured” and supports upload/manual entry/review.

To add extraction later: select an approved provider and data-handling policy; authorize its use for investor agreements; supply credentials via the existing deployment secret process; implement server-side document parsing into unconfirmed field proposals with per-field page/section provenance and ambiguity flags; test exclusively with synthetic agreements first. Never treat document contents as instructions or auto-confirm extracted terms.

## Migration and integration

`migrations/026_investment_reviewed_terms.sql` adds three RLS-protected, append-only tables: term revisions (including confirmation receipts), private agreements, and reviewed transactions. It references existing positions and preserves imported terms/events separately. Existing migrations through 020 are required; normal project migration order should be used in an approved test environment. The isolated development investor database initializes this migration automatically. Production migration has **not** been run.

The number 026 deliberately leaves room for the separate admin task's 024/025 migrations. Reconcile numbering against the final branches before integration. The main integration touchpoints are `member-investor-detail.ts`, `member-investor-details.tsx`, `portfolio/page.tsx`, `real-investor-portfolio.tsx`, and the local investor DB initializer. No self-service sharing implementation is included.

## Isolated verification

From this clone:

```sh
node scripts/preview-investment-terms.mjs
```

Open **http://127.0.0.1:3012/terms-preview**. The script refuses dotenv files and supplies an allowlisted environment with database/auth configuration disabled. The route also rejects production mode, configured databases, and configured hosted auth. It demonstrates editing, validation and calculation only; upload/save/confirm/transaction persistence controls are deliberately disabled. Production auth has not been weakened to enable this demonstration.

Use the sample's January 1 opening date, $10,000 principal and 8% rate, with a $1,000 April 1 repayment. As of July 2, 2026, principal is $9,000 and accrued interest is $378.74. Switch instrument to equity to verify unavailable behavior. `tests/fixtures/synthetic-investment-agreement.pdf` contains the synthetic agreement and receipt evidence.

Persistence, confirmation, attachments and access denial are verified with PGlite SQL tests; browser verification is limited to the isolated synthetic editor. No authenticated end-to-end browser claim is made.

Commands:

```sh
npm test
npm run typecheck
npm run build -- --webpack
```

Build with local dependencies (not an external node_modules symlink), and stop the preview before building to avoid sharing the `.next` output between dev and build. Existing package scripts remain unchanged.

## Verified results (2026-10-20)

- Full suite: 140 tests, 137 passed, 3 skipped, 0 failed.
- TypeScript: passed independently and during the final production build.
- `npm run build -- --webpack`: passed, including standalone packaging.
- IAB: synthetic loan preview produced USD 9,000.00 principal and USD 378.74 accrued for July 2, 2026; selecting equity invalidated the previous result and showed calculation unavailable. Missing instrument selection displayed “Missing kind.”
- Browser persistence/upload confirmation was not exercised: the disconnected demonstration disables writes. SQL tests cover attachment storage, confirmation, stale preview rejection, append-only history, owner access, unrelated-user denial, release gating and revocation.

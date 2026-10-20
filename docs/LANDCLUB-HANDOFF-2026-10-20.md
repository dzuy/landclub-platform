# Land Club handoff — October 20, 2026

Land Club is paused while the user shifts to Substrate. The authoritative next-work list is the [pause section in BACKLOG.md](BACKLOG.md#pause--handoff--october-20-2026).

## Delivered

The actual app combines admin property/document fixes, per-investment reviewed terms and read-only sharing. Existing user edits, hosted auth and audited admin View As are preserved. Terms opens in the member drawer; sharing uses the dashboard right-hand column at the bottom of Portfolio navigation. No synthetic login adapter or preview-only route is included in the release.

Sharing is automatically available only for a person's own investments, identified through explicit `owner` source relationships and active access. A generic Investor role, property membership or delegated invitation cannot establish ownership. Mixed owned/delegated invite scopes are rejected. Admins may invite/revoke on behalf of the selected investor with server-validated sessions and separate actor/target audit records; acceptance remains a recipient action.

Migrations 026/027 are already applied and verified in Supabase project `sfrdfzxxbhcmvjgxbshp`, schema `land_club`; 001–025 were already present. Migration files must retain their recorded checksums. The new terms/sharing tables were empty with RLS enabled, no browser-role access and append-only protections verified. No extra migration is part of this push.

Code provenance: original main `ed86c293` (short prefix), terms worker `abd1fc141acbbe849027ab1ef8abd664cb176f10`, sharing worker `afa97f6d342f114246f659e1ec27c122be5738ab`, plus integrated admin/auth/UI/email fixes and preserved user document edits. Worker standalone previews and local runtime data are not release artifacts.

## Not operationally complete

- Sharing mail is wired and mock-tested, but no transactional credential/sender is configured locally. Supabase Auth already handles onboarding/reset emails; its underlying SMTP configuration still needs inspection before deciding whether to reuse it. No live send was performed.
- Hosted sharing acceptance was 404 before this push; verify after Railway deployment. No existing/new-recipient live journey has been completed.
- Public signup is disabled. New sharing recipients need an approved invitation-only onboarding flow.
- Agreement extraction has no provider. Real agreements, terms and transactions need deliberate review; no financial terms or reports were activated/released.
- Supported automatic calculation: confirmed simple Actual/365 loans. Unsupported terms remain unavailable rather than producing invented returns.
- Ian/Scott remain prepared and unlinked. Invite owner is Nate or Jill, TBD; neither was invited by this work.
- Real authenticated visual QA remains pending. IAB was unavailable and Chrome was not used. Che Figma/public-content work remains separate.

## Verification and resumption

Local real app: `http://127.0.0.1:3000/signin`, using existing hosted auth/data. Admin → Members → person → Investments → Terms; Profile → View As → Portfolio → Investment sharing. Use existing credentials; do not seed/import data to resume.

Automated coverage includes document access/metadata/deletion, ownership vs delegated sharing, mixed scopes, session/target validation, captured invite/accept/revoke, delivery failures/idempotency, terms calculation/review and preview scope. Final local checks: 155 tests total, 154 passed, one external PostgreSQL test skipped; full typecheck, production webpack build and staged diff checks passed. All 27 migration checksums match the hosted ledger, with no pending migration. Railway status is reported with the push result. The existing GitHub deployment status identifies the public service as `app.land.club`; verify that origin as well as the configured Railway alias after deployment. Production build copies exclude local environment credentials and preserve the running dev server.

No secrets, private workbook exports, database/runtime files or private screenshots should be committed. The small PDF under `tests/fixtures` is explicitly synthetic test evidence, never loaded or seeded into the real app. Do not commit `.env*` other than `.env.example`, `.data`, `.next`, node_modules or local output folders.

Do not treat the pause or main push as approval to configure credentials, change auth/RLS, send mail, grant recipients access, release reports or activate financial terms.

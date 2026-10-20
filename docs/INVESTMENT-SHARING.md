# Self-service investment sharing

Implemented locally on `codex/investment-sharing`, based on `ed86c29`, in the isolated checkout `/Users/dzuy/Documents/Codex/2026-10-20/task-3/sharing`. The original checkout and its uncommitted work were not modified. This is an independent local clone/worktree (with its own Git metadata), not a worktree sharing the original index. No push, deployment, production migration, live invitation, credentials or real-person grants were made.

## User journeys

- `/investment-access` is the owner management screen and the recipient's separate shared-investments view. It is linked in dashboard navigation and on the regular account landing page. New recipients need only a verified regular auth account, not a member/investor/owner role. Existing role assignments and their own portfolio are untouched.
- Owners select one or more individual investment positions, see their exact scope, enter an email and send an invitation. They can inspect pending, accepted, revoked, expired and failed states and revoke pending or accepted access. Expiry applies to pending invitations; accepted grants remain until revoked or their source authority becomes invalid.
- Email opens `/investment-access/accept?token=…`. Existing users sign in there; new users create a regular Supabase account and verify their email. The verified matching email must explicitly accept. No GET accepts a grant. Opening the link while signed in as somebody else reveals no account details.
- Read-only reports live at `/investment-access/reports/[id]`. JSON/CSV and attached investment-document downloads use `/api/shared-investments/[id]`. Own portfolios/totals remain separate.

## Authorization boundaries

`investment_account_owners` is explicit, staff-reviewed sharing authority. `investor_access` alone is NOT owner authority. The migration intentionally does not backfill owners from legacy access. An owner must have both active explicit ownership and active source access, with a non-disabled report-person identity.

`investment_sharing_invitations` and `investment_sharing_scope` hold delegated read grants. Acceptance reuses or creates only a `report_people` mapping for the authenticated user; it never inserts investor_access, owner authority, user_roles, property membership or personal-document ACLs. Relationship labels are not global account roles.

Every shared report and child read checks the accepted grant, selected position, active inviter ownership/source access, non-disabled inviter and recipient, report release and reviewed state. Parent access is rechecked after child loads. Direct downloads use the same predicate. Revocation removes future server access even with previously known IDs. Like any downloaded file, bytes already saved by a recipient cannot be recalled.

Shared readers get approved/released report contents and `investor_report_documents` attached to those reports. No tag-based access is added. Existing private/group documents, automatic multi-investment workbooks, company source snapshots and historical statement exports are NOT added to sharing: these may contain unrelated holdings. Their original authorization remains unchanged. Ordinary owner/admin reports retain their existing release behavior; only the new shared scope additionally requires reviewed state.

Tokens are 256-bit random, hash-only in the database, expire after seven days, and can be accepted once. Email matching is case-normalized, without alias folding. Duplicate overlapping invitations for one owner/email are serialized on the owner's person row. Self-invites, unauthorized selections, disabled identities and malformed, expired, revoked or reused tokens fail closed. Sharing mutations are audited transactionally using the existing append-only investor audit table. Shared HTTP/page reads audit before delivery; audit failures prevent serving.

The three new tables use default-deny RLS and revoke browser-role access. Only server database access can operate them. Server actions authenticate independently and inherit Next's POST/same-origin checks. The shared API implements GET only. Preview/impersonation identities cannot create or accept sharing grants.

## Integration and deployment prerequisites (not performed)

1. Apply `027_investment_sharing.sql` after reporting/operations foundations. It has no source data or authority seeds. The number was selected after the terms task claimed 026; confirm ordering when integrating.
2. Review/provision explicit `(person_id, holder_id)` owner authority with `granted_by` through the controlled staff/data process. There is deliberately no automatic inference and no new staff ownership editor in this change. Without these assignments, real users see no shareable accounts. Existing source investor_access must also remain active.
3. Configure a transactional sender for both existing and new recipients. Existing Supabase `inviteUserByEmail` cannot safely handle existing users and would mix invitation roles with delegated scope, so sharing uses a separate server-only Resend transport and the project's canonical-site URL helper. Required settings: `INVESTMENT_SHARING_MAIL_ENABLED=true`, `RESEND_API_KEY`, `INVESTMENT_SHARING_FROM`, and `LAND_CLUB_SITE_URL`. Nothing was configured or sent. A missing/failed sender produces a failed invitation without an active grant. There is no background outbox worker or resend button; revoke a pending/failed invitation and issue a fresh one when delivery is uncertain.
4. Supabase public regular-account creation and email confirmation must be enabled, with `/investment-access/auth` allowed as an email redirect. Email confirmation must actually verify mailbox ownership; do not use an auto-confirm production configuration. Existing SUPABASE_URL/publishable-key settings and cookie handling are reused. Hosted signup/confirmation and actual mail delivery remain unverified because no live accounts/messages were authorized in this task.
5. Retain normal service-side auth account disable/delete handling. Sharing additionally respects `report_people.disabled_at` on both parties. Do not grant browser database policies for these tables.

## Concurrent integration risks

- Admin task uses original dirty main and port 3001; terms task uses branch `feat/investment-terms`, port 3012, migration 026. Neither was touched or merged.
- Likely shared-file conflicts: `src/lib/investor-platform-db.ts` (migration loader), `src/lib/investor-reports.ts` (new explicitly selected shared read scope), `src/components/dashboard-nav.tsx`, and possibly `src/app/account/page.tsx`.
- Admin's private/group/automatic-document changes were intentionally not copied. Sharing only adds report-document access, so preserve those independent guards when merging.
- Terms/accrual may change report payloads, release behavior or position identity. Preserve the shared predicate and company-source exclusion, and rerun sharing/report/document tests after integration. No mutation permission should ever be inferred from a delegated grant.

## Synthetic preview

Live preview: **http://127.0.0.1:3014** (IAB). Restart from this checkout with:

```sh
node --import tsx scripts/preview-investment-sharing.ts
```

This is a separate interactive integration harness, not the production Next authentication screen. It uses the actual sharing/report repositories with an ephemeral in-memory PGlite fixture, synthetic identities and captured mail. It never loads .env, reads DATABASE_URL, contacts Supabase/Resend or connects simulated login to real data. It listens only on 127.0.0.1 and requires same-origin POSTs. Restarting resets its state.

1. As Synthetic owner, check Synthetic Orchard and invite `existing@example.test` (or `new@example.test`).
2. Switch the explicit synthetic identity selector to the matching recipient and accept from the captured inbox.
3. Observe only the selected investment under Shared with you; the existing member's My Separate Investment remains separate. View the report.
4. Switch back to owner and revoke; switch to recipient to see access disappear and token reuse rejected.
5. Unrelated person has no shared access. A recipient has no owner sharing controls.

The fixture emails use reserved `.test` domains. This preview does not validate hosted authentication or email configuration. Production Next UI was typechecked and built separately. IAB verified the existing-recipient accept/view/revoke/token-reuse sequence; automated tests cover the new-recipient mapping as well.

## Validation

- `npm run typecheck` passed.
- `npm run build` passed (Next 16.3.6).
- Full suite before the final extra audit/concurrency case: 140 tests, 137 passed, 3 skipped, 0 failed. Skips are two unavailable private source-workbook cases and the optional PostgreSQL integration test.
- Focused sharing tests also cover role preservation, admin mutation denial, serialized duplicate acceptance, disabled identity, transactional audit failure, and exact selected scope.
- No live auth-provider, real-mail, hosted PostgreSQL or production-data verification was performed.

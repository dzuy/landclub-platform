# Real app integration — 2026-10-20

## Current entry and scope

Use **http://127.0.0.1:3000/signin** with the existing real admin account. The original local app uses its existing hosted Supabase configuration; `LAND_CLUB_LOCAL_STAFF=0`. A fresh HTTP session renders the actual password sign-in form, with no profile avatar and no synthetic identity UI. No public deployment is needed for this local workflow. Railway's configured canonical URL is `https://landclub.up.railway.app`; the hosted deployment has not been updated by this work.

The actual repository now contains the admin fixes and terms/sharing code from `abd1fc1` and `afa97f6`. The synthetic adapters and standalone preview routes/scripts were not copied into the real app. No fixture data was seeded into hosted storage. Before integration, all 32 user-modified/untracked files were backed up to `.data/real-app-integration-backup`; feature files had no dirty-file overlap. The original user's edits remain in place. No push or deployment occurred.

## Actual click paths

- Sign in → profile menu → View as **Ian Kenny** or **Scott Jeeves** → Portfolio. This remains the existing audited admin-bound View As workflow. Their prepared records are active, with no linked real investor login; no login or invitation was created.
- Return to **My admin account** in the profile menu → Members → Ian Kenny or Scott Jeeves → Investments → Investment terms → chosen position → Terms.
- Admin member detail URLs: `/dashboard/members/f1f5be53-a218-499a-8e72-d754dbec2afb` (Ian), `/dashboard/members/37a33680-f8dd-43e2-bb0b-9abb334ba0d9` (Scott).
- Normal-account sharing: dashboard navigation → Investment sharing, or regular Account → Shared investments. View As shows target-specific sharing scope. Following the subsequent explicit approval, real admins can invite/revoke on behalf of that target, with action-specific confirmation and audit. Acceptance remains a real-recipient action; no ownership is created.

## Terms View As correction

Terms calculations previously required `report_people.auth_user_id`, so prepared-only admin previews could not use them. The new `forPreview` read validates the real admin ID against the existing hashed preview token, target person, session mode, expiry, ended state, person enabled state and current investor access. Access is checked again after reading. Investor-mode preview requires a reviewed/released report; existing draft-preview mode permits admin inspection. Only confirmed supported terms produce calculations. No effective investor identity, ownership grant or normal-user access is manufactured.

Tests cover prepared-only identity, wrong admin, non-admin, expired/ended session, disabled person, unrelated report and revoked access. Existing ordinary-user release checks remain. Missing schema or unconfirmed terms explicitly show unconfigured/pending status; Ian/Scott terms were not invented, confirmed or activated.

## Database target and approved migrations

Existing configured target: Supabase project **sfrdfzxxbhcmvjgxbshp**, pooler `aws-0-ca-central-1.pooler.supabase.com:5432`, database `postgres`, schema `land_club`. The application already has credentials; no new credentials are required or created.

Read-only inspection confirmed migrations **001–025 already applied**. Following explicit approval, **026 and 027 were applied on 2026-10-20 at 15:32 UTC** in one transaction with migration checksum tracking. A fresh independent connection confirmed both records after commit.

- 024: ordinary additive display-name/notes columns; already applied.
- 025: ordinary additive soft-deletion timestamp columns; already applied.
- 026: creates empty terms revisions, private agreements and reviewed transactions, indexes and append-only protection triggers. It also enables RLS and revokes PUBLIC/anon/authenticated privileges on the new tables. No real data rewrite or terms activation.
- 027: creates empty explicit owner-authority, sharing invitation and selected-scope tables/indexes. It enables RLS and revokes PUBLIC/anon/authenticated privileges on those new tables. It does not backfill owners or create recipient grants.

Only the approved 026 and 027 were executed. Verification confirmed all six new tables are empty, RLS is enabled, no policies or direct anon/authenticated DML privileges exist, and all three append-only triggers are enabled. Before/after fingerprints of existing investor/member tables matched. No ownership grants, invitations, financial terms or additional migrations were applied. Evidence: `.data/approved-migrations-026-027-result.json`.

## Other remaining prerequisites

- Agreement extraction has no configured provider. Manual PDF attachment, evidence entry and review are implemented, with migration 026 now present. No agreement was sent to an external service.
- Real sharing mail requires the documented transactional sender settings; the existing environment has no Resend API key. No new credential was generated/configured, and no real email was sent.
- Real self-service sharing requires deliberately approved owner authority in addition to existing investor access. No owner authority was inferred or granted. Admin View As is intentionally not an owner login.
- Real investor terms, reviewed transactions, source balances, report release states and access grants were not changed.
- No authenticated browser session was commandeered. IAB was unavailable in this execution environment and Chrome was not used. The user must sign in with their real account to perform final interactive verification.

## Completed code checks

- `npm test`: 148 total, 147 passed, 1 skipped (external PostgreSQL), 0 failed. The original checkout includes the private source workbooks, so those cases ran rather than skipping as in the isolated copy.
- `npm run typecheck`: passed.
- Production webpack build: passed in a source/dependency copy without environment credentials, avoiding interference with the live local dev server.
- `git diff --check`: passed.
- Actual local `/signin`: HTTP 200, configured password form present, signed-out avatar absent, synthetic test banner absent.
- Existing hosted identity mappings were inspected read-only: Ian and Scott remain active prepared people with no linked investor auth account. No invitations or financial/access changes were made.

Status: code and approved database schema are integrated into the actual local app. The fresh-session sign-in page returns HTTP 200; portfolio, member detail, sharing and account routes redirect signed-out users to sign-in. Authenticated browser/View As checks using the real user's session have not been performed. Terms remain unconfigured until deliberately reviewed and confirmed; sending sharing invitations remains blocked by absent mail configuration and explicit owner authority. These are not included in the migration approval.


## Follow-up: drawer navigation and on-behalf sharing

The member drawer's investment Terms link now opens a nested view inside the same drawer. The prior member content remains mounted (preserving sections and edits); Back restores the prior scroll/focus. Closing still runs existing member save guards, and Terms adds unsaved-change confirmation plus pending-action blocking. Loading failures stay in the drawer with Back available. Closing/reopening resets nested navigation. The direct Terms URL still uses the same detail/editor component.

Labels now use company and investment type, e.g. **Land Club Norden Cross LLC · Equity**; `POS-001` remains a secondary source reference. No stored IDs or labels were rewritten.

Sharing in View As uses the hashed, admin-bound preview token and the target person's explicit ownership/access scope. Admin invite/revoke actions independently validate the actual verified admin, current session, expected target, and selected invitation/positions. The existing audit schema records the admin in `actor_id` and target investor in `person_id`. Prepared/unlinked targets do not acquire a login or authority. Confirmation names the investor, recipient and investment scope. Recipient acceptance remains unavailable through View As. Shared report summaries retain released/reviewed, active-owner/access and recipient scope checks; opening those shared reports/documents from this preview is not enabled.

No additional migration or permission provisioning was needed. No real mail, grants, revocations or financial changes were executed. Mail configuration and explicit owner authority remain prerequisites; the on-behalf action rejects absent mail configuration before creating an invitation.

Validation: 150 tests total, 149 passed, one external PostgreSQL test skipped; typecheck and production webpack build passed. New isolated sharing tests cover wrong/non-admin/expired/ended sessions, disabled people, target mismatch, prepared people, cross-investment rejection, release/access-scoped lists, captured invitation/accept/revoke, and separate actor/target audit records. Actual local sign-in returned 200; member, sharing and direct Terms routes redirected signed-out requests to sign-in. IAB explicitly returned `Browser is not available: iab`; no Chrome or interactive QA was used.

### Manual checks still required in the real signed-in browser

1. Open `http://127.0.0.1:3000/dashboard/members`, open Ian's drawer → Investments → **Land Club Norden Cross LLC · Equity → Terms**. Confirm the page URL/member drawer stays in place and the breadcrumb names the investment.
2. Use **Back to investments**. Confirm the same member, expanded sections, scroll and edits remain. Reopen Terms; close and reopen the member drawer; confirm it starts at member details.
3. Edit a Terms field without saving. Back, close or Escape should request discard confirmation; Cancel keeps the editor and text. A pending action blocks leaving; save errors retain edits. Do not save/confirm real financial terms merely for this check.
4. Open the investment link in a new tab to verify the direct-route fallback, which uses the same detail/editor and human label.
5. Profile → View as Ian/Scott → **Investment sharing**. Confirm the named target, actual scope and invitation state. With no explicit owner authority, show the accurate empty state rather than a sending form. Do not provision authority or send/revoke real invitations merely for testing. The functional on-behalf lifecycle was tested only against isolated fixtures with captured mail.


## Current sharing rule — ownership-derived (supersedes manual owner-grant prerequisites above)

The user's later requirement is that every investor can share their own investments across properties, but cannot reshare investments received by invitation. The source workbooks already distinguish these relationships: `investor_access.access_role = owner` links source person IDs to source holding IDs. The earlier importer preserved that evidence but flattened the live viewing grants.

Sharing now derives authority from the latest successfully imported snapshot in the position's source lineage, matching exact person/holding IDs and the position's recorded holding reference. All matching source relationship rows must say `owner`; absent/conflicting/viewer relationships fail closed. The person must remain enabled and have active source viewing access. Generic role tags, property selections, names, delegated invitations and manual `investment_account_owners` rows do not establish ownership. The legacy table is retained untouched and is no longer used for authorization. No migration, one-off Ian grant, bulk grant, RLS change or real-data rewrite was performed.

The same rule applies to owner listing, selected-position invitations, recipient acceptance and downstream shared report/document reads, including admin-on-behalf operations. Mixed owned/delegated batches are rejected in full. Admin audit and session/target validation remain intact.

A read-only check against real stored records confirmed Ian has one eligible own position (Norden Cross equity) and Scott has three (Norden Cross loan, Sutter Creek loan, Reserve). Thus View As → Investment sharing now renders their selection controls without manual grants. Refresh the page; if the 30-minute session expired, exit and start View As again. Choose an investment to enable the send button. No real invite was sent; transactional mail remains unconfigured locally and on-behalf sending rejects this before creating an invitation.

Ownership tests additionally cover mixed accounts, cross-property owners, delegated-only and generic-viewing grants, forged mixed selections, legacy manual flags not granting ownership, unimported snapshots ignored, and loss of ownership in a newer imported snapshot immediately denying new shares and downstream reads.

Final checks for the ownership-derived change: 152 tests total, 151 passed, one external PostgreSQL test skipped; full typecheck and production webpack build passed. IAB remains unavailable; authenticated visual verification is still manual.

## Sharing right-side layout correction

For signed-in club members and View As, `/investment-access` now reuses `MemberDashboardShell` (also used by `/dashboard`). The existing navigation stays on the left and sharing renders in its right-hand content column. The current target, portfolio/property navigation and preview exit control remain available. Back to dashboard exits sharing, and the sidebar can navigate to any other view. The existing mobile menu/breakpoint behavior is reused, with narrower sharing cards on mobile. The sharing banner accurately states that sharing actions require confirmation rather than calling the approved on-behalf workflow entirely read-only.

Direct sharing/report/acceptance URLs are unchanged. Signed-out users and regular recipients without club membership retain the standalone account/acceptance layout; the acceptance route does not acquire a club-login requirement. Sharing content, server actions, ownership predicates, confirmation and audit logic were not changed in this UI follow-up.

Checks: typecheck, production webpack build and diff checks passed. Local `/signin` and `/investment-access/accept` returned 200; signed-out `/investment-access` and `/dashboard` redirected to sign-in. Authenticated normal/View As forward/back and responsive visual checks remain manual because IAB is unavailable. Test at http://127.0.0.1:3000/dashboard → Investment sharing → Back to dashboard; repeat after starting View As Ian, confirming the left navigation and target banner persist.

### Sharing header cleanup

Removed the dashboard-context Back to dashboard / Investment sharing navigation strip, its margin rule, and the View As Back to portfolio link as requested. The page title, sidebar, View As banner and sharing controls remain. Standalone recipient/acceptance navigation is retained. Refresh `/investment-access` to see the cleanup. No authorization, data or mail changes.

### Portfolio navigation placement

Investment sharing is now the last nested item under Portfolio, after investment entries, rather than a top-level peer. It remains present when the portfolio list is empty and for non-admin/View As navigation. Sharing routes activate the nested link and Portfolio parent, and opening a sharing route expands the group. Desktop and mobile reuse this same menu. Right-side sharing content and direct acceptance URLs are unchanged. Server-render checks passed for Portfolio/sharing routes with both zero and one investment, confirming exactly one nested final sharing link and its active state; typecheck passed. Interactive mobile/View As checks remain manual because IAB is unavailable.

### Simplified sharing page

Both normal and View As modes now use one compact presentation: “Share investments”, one-line purpose, investment checkboxes, Email, Invite, and a simple People with access list (email, Pending/Active status, investment scope, Revoke). Repeated cards, diagnostic paragraphs and duplicate scope explanations were removed. A short read-only/re-sharing note and acting-on-behalf identity remain. Existing shared investments appear in a separate compact list only when present. Missing email delivery is shown in one line and disables Invite. Invite/revoke confirmations name the recipient, selected scope and acting-on-behalf investor where applicable. Server authorization and auditing are unchanged; investment labels use project/type rather than source IDs. Eight sharing fixture tests and typecheck passed. No real mail or data changes were made.

## Email delivery investigation and safe wiring

Read-only inspection on 2026-10-20 confirmed the local app's member invitation and password-reset flows call Supabase Auth. Local configuration contains Supabase credentials but no transactional-mail/SMTP credential or sharing sender. No Railway or Supabase CLI is installed, provider-tool discovery was unavailable, and IAB is unavailable; the hosted SMTP provider/sender and Railway environment variables could not be inspected. Do not interpret this as proof that Supabase has no configured SMTP provider.

Supabase's public auth settings report email enabled, confirmation required and public signups disabled. The configured hosted origin `https://landclub.up.railway.app/investment-access/accept` returns 404. Therefore email credentials alone would not complete sharing: the actual acceptance route must be deployed, and new-recipient account onboarding needs an approved flow compatible with disabled public signup. Existing verified recipients do not need that onboarding change.

Safe local code work completed: plain-text and escaped HTML Land Club invitation template, configurable public HTTPS acceptance origin, shared configuration preflight before invitation creation for both ordinary and on-behalf actions, fixed invitation ID used as provider idempotency key, response receipt required before sent status, and duplicate submission blocked after failed/uncertain delivery until explicit revocation. No automatic network retry occurs. Provider acceptance does not claim inbox delivery. Tokens/keys/provider response bodies are not logged. Eleven mail/sharing tests passed using a mock provider and isolated database; typecheck passed.

Pending actions: inspect the existing Supabase SMTP provider and verified sender through an authorized dashboard/management connection; reuse its approved credential if it supports application mail. If Resend is selected, obtain approval for configuring a sending-only credential restricted to the intended verified domain and the exact existing sender. No account, sender verification, DNS change, credential or paid plan was created. The exact sender and cost cannot be stated until that existing provider configuration is available. Deployment and any new-recipient auth-policy change are separate pending decisions. No live email was sent; after setup, request approval for one harmless email to the user's verified admin address with no investment data or access token.

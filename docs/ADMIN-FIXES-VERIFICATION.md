# Admin fixes verification — 2026-10-20

Implemented locally against main `ed86c29`; no push or deployment.

- Property drawers and full editors have **Save and Exit**, using the existing autosave flush. Failed saves keep the editor open.
- New properties have no default photo. Admin property rows and member property cards use the existing non-demo photo selection rule, with neutral empty states. Existing stored imagery is not rewritten.
- Personal and group documents support a display name and optional notes. Downloads retain the original filename and bytes. Metadata writes retain optimistic version checks, increment the revision, and use existing audit triggers. Member-profile edits cannot alter group audiences.
- Admin member Documents includes personal files and group/property files selected using the target member's roles and associations, not the administrator's roles. Prepared members use their saved setup; invited prepared members resolve their linked account for group eligibility.

## Verification

`npm test`: 139 tests, 138 passed, 1 skipped (external PostgreSQL; no TEST_DATABASE_URL). Includes private/group isolation, revocation, investment-derived property visibility, prepared-member invitation/acceptance/cancellation, autosave ordering/failure, metadata preservation and stale-version rejection. No further visibility/onboarding defect was demonstrated by these fixtures.

`npm run typecheck`: passed. `git diff --check`: passed.

Production build: `npm run build -- --webpack` passed in an isolated copy with the same source and dependencies, without hosted environment credentials. A first attempt with symlinked dependencies failed during standalone tracing; copying dependencies resolved it.

HTTP smoke checks on the isolated preview passed:

- Member document API returned one personal and two authorized group documents, excluding an admin-only group document.
- Property editor returned 200 and rendered Save and Exit.
- Personal and group metadata PATCH requests persisted friendly names and notes while preserving filename and incrementing version.

No IAB/browser surface was available in the computer-use inventory. No Chrome interaction or download prompts occurred. Interactive click-through verification remains for the user; automated autosave tests and HTTP rendering checks passed.

## Local preview

Running at http://127.0.0.1:3001/dashboard/properties with synthetic data only. The isolated copy is recorded in `/tmp/landclub-admin-preview-path`; its local-access port was changed from 3000 to 3001 only in that copy. Repository access policy is unchanged.

Fixture member: http://127.0.0.1:3001/dashboard/members/a0000000-0000-4000-8000-000000000001

The fixture is named **Admin Verification Fixture**. Open Documents to inspect personal and group rows and edit labels/notes. The original development server on port 3000 was not restarted.

## Migration and boundaries

Apply `024_document_metadata.sql` before using this code against a hosted database. It adds empty-default `display_name` and `notes` columns with length constraints to both document tables. It does not rewrite file content, filenames, ownership or audiences. Local embedded development initialization includes this migration.

The migration was verified only on disposable embedded databases. It has **not** been applied to the configured database. No invitations were sent; Ian Kenny and Scott Jeeves were not modified. No investor financial/access records, public designs, terms/accrual, or sharing features were changed. The pre-existing `next-env.d.ts` working-tree change was preserved.

## Follow-up: preview sign-in and signed-out avatar

The isolated preview intentionally has no Supabase authentication configuration. A `land-club-local-signed-out` cookie suppressed its development identity and left the user on a sign-in page with no configured account service. Cookies are shared between ports on a hostname, so the existing server's signed-out state could affect the preview.

The isolated copy now uses `land-club-preview-signed-out`, separate from the existing server. The application offers **Continue to local preview** only when explicit loopback development access is enabled, no DATABASE_URL is present, and account authentication is not configured. This action clears the local signed-out marker and redirects to `/dashboard/properties`. Production, remote hosts, configured databases and configured account authentication cannot use it. The repository still restricts the local shortcut to port 3000; only the isolated copy uses port 3001.

`AccountMenu` now returns no UI when `authenticated` is false. Its authenticated UI is unchanged.

Working entry: http://127.0.0.1:3001/dashboard/properties . If sent to `/signin`, click **Continue to local preview**. No email or password is needed. This is the synthetic fixture environment, not an account login to hosted Land Club.

HTTP checks passed for signed-out `/signin` and `/about` menu absence, submitting the actual server-action form (303 redirect and preview-cookie deletion), and authenticated Properties menu presence. The local-entry guard is covered by a regression test rejecting production, non-loopback hosts, disabled local access, database configuration and real authentication configuration. No Chrome interaction or real invitations were used.

## Preview lifecycle repair

After the user reported the preview stopped, port 3001 had no listener. The old log ended on successful requests with no recorded application exception. The original server had run as a foreground task-tool session; loss of that process is consistent with session cleanup, but the precise exit cause was not recorded.

Restarted the same isolated copy using macOS per-user launchd job `com.landclub.admin-preview`, independent of the task terminal. Launchd reported a running PID and loopback port 3001 was listening. Repeated HTTP checks validated sign-in, local-entry POST redirect, Properties, and signed-out avatar absence. Logs are `/tmp/landclub-preview-durable.log` and `/tmp/landclub-preview-durable-error.log`.

This is a session-scoped local verification service, not hosted deployment. It is not guaranteed across logout/reboot, Mac sleep, removal of the temporary preview directory, or manual process/job termination. Stop it when verification is complete with `launchctl remove com.landclub.admin-preview`. No production credentials or database connection were added.

## Hosted document repair — October 20, 2026

The active localhost application uses the configured hosted database. Its document requests failed because migration 024 had not been applied (`column d.display_name does not exist`). Applied `024_document_metadata.sql` through the migration runner using `.env.local`; the runner completed successfully. Admin Documents now renders its existing shared PDF. This supersedes the earlier note that migration 024 had not been applied to the configured database. File content and sharing permissions were not changed.

## Member document deletion — October 20, 2026

Member Details → Documents now has admin-only Delete controls with explicit confirmation and Cancel. Shared-file confirmation states that deletion removes access for everyone in its audience. DELETE endpoints enforce authenticated admin access, same-origin requests, confirmation, and version checks. Migration 025 adds `deleted_at` to personal and group documents and has been applied to the configured hosted database. Deleted files are excluded from lists, downloads, metadata changes, and automatic workbook refresh; original bytes and immutable editions remain retained for audit history. No restore UI is included.

Verified confirmation rendering without deleting real records. TypeScript passed; 10 focused document tests passed, including a deletion regression for authorization, stale versions, download denial, retained bytes and audit attribution. The automatic-workbook test additionally verifies deletion preserves immutable editions and prevents reappearance.

# Property following (PB-42)

The signed-in Properties page (`/dashboard/my-properties`) opens on My Properties, followed by All Properties. All Properties contains every published property regardless of offering status. Explicit follows add published properties to My Properties, its sidebar links and the home following list. Investor, Owner and Property manager relationships imply following while those authoritative relationships remain. Multiple roles are retained. Prospect, Guest and legacy Selected property entries retain their existing list/detail access without being relabeled as investors or automatically followed.

Following is a presentation preference, not an access grant. `property_follows` is separate from `member_properties`, which already authorizes property-targeted documents. No document, investment, sharing or club-role rules use explicit follows. Follow-only detail access requires a published snapshot; existing legitimate relationship access remains separate when a property is unpublished. Explicit records are retained while unpublished but hidden from follow-only lists, and can be removed idempotently. Republishing restores their visibility. Property deletion cascades follows; authenticated account deletion removes the account's follows.

Automatic inclusion is derived from manual property roles and existing explicit investor-holder grants, not account-wide role labels. No copies of automatic relationships are backfilled. Users cannot unfollow automatic inclusion. Removing an explicit follow from a Prospect, Guest or Selected property does not remove its independently established relationship.

## Local verification and migration

Development without DATABASE_URL initializes `028_property_follows.sql` against the local embedded database. The isolated review server is `http://127.0.0.1:3033/dashboard/my-properties`; its records are synthetic. The local editor can exercise Follow and Unfollow. Profile menu → View as → QA Member demonstrates automatic roles, multiple roles, a legacy selection and an unpublished Guest/Prospect relationship. View As is read-only. Exit View as before trying mutations.

## Deployment prerequisite (not performed)

Apply the existing repository migration runner through migration `028_property_follows.sql` in the intended database before starting the updated application. Do not run against production merely to review this branch. The new table has RLS enabled and no public policies. Application access uses the existing server database connection; no new client grants, credentials or security configuration are required. User IDs are stored as text to accommodate the existing local-developer identity and hosted auth UUIDs without introducing a dependency on a provider's auth schema. A property index supports future audience lookup, but this change does not send messages or subscribe users to notifications.

## Verification

- `npm test`: full regression suite, including property-follow repository, publication gating, idempotency, account isolation, automatic live relationships, retained legacy access and restricted-document isolation.
- `npm run typecheck`, `npm run build`, `git diff --check`.
- Supported in-app browser: empty My Properties; All Properties visibility; double-click follow/unfollow; list/count/sidebar synchronization; reload persistence; relationship badges; read-only View As.
- Hosted PostgreSQL integration and private source-workbook fixtures require external test prerequisites and are skipped locally. No remote migration, push or deployment is part of this work.

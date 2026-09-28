# Property schema decisions and initial import

Approved September 23, 2026.

## Decisions

- Notion currently supplies the initial property data. Store it in the application database; public pages have no runtime dependency on Notion. Staff can explicitly pull updated database fields using live sync. The property editor will ultimately replace Notion as the source of truth.
- Separate specific properties from scouting areas. Offering statuses: Scouting, Coming Soon, Available, Fully Subscribed, Past Project. Realized means Past Project. Development stage is independent.
- Available listings require the full core plus an airport and town with known travel times. Unknown required facts do not satisfy publication completeness. Other statuses can have fewer facts; all pages still need basic identity, category, image and editorial content.
- All property prices and budgets may be public for now. Revisit visibility later. Import bookkeeping and review notes are not included in public responses.
- Planned structures remain descriptive. Financial phases are repeatable entries with name, scope, budget and timeline.
- Discovery includes scouting areas, past projects and current opportunities, with an Available-only filter.

## Implementation

The versioned property JSONB contract now includes typed facts and Actual/Planned/Not yet determined states, coordinates, proximity entries, financial phases, media roles, currency and Notion provenance. Proximity and phases are nested children of each draft/published snapshot, rather than unversioned shared SQL rows. This preserves publication isolation: changing a nearby place or phase in a draft cannot change a public page until publication.

The additive source-identity index is in `migrations/004_property_source_identity.sql`. Existing snapshot bodies and revisions are retained. Legacy records are normalized when read; no live values are extracted from fictional narrative. Public rendering, the Facts editor, media controls, publication validation and discovery map use the new fields. Numeric elevation is in feet, with qualifications/ranges in its notes. Annual dues are annualized; dues frequency describes payment cadence.

## Initial import result

Imported into the local development PGlite database through the authorized staff action:

- 20 Notion records processed: 17 new drafts, 3 existing drafts updated.
- The Mayacamas template was excluded.
- Norden Cross, Shelter Cove and Sutter Creek matched existing slugs. Point Reyes & Marin and Pioneertown remain separate existing records; no unsupported source match was invented.
- Both Nicasio source records remain distinct, identified by their Notion page IDs.
- There are now 22 app records; the five pre-existing published snapshots were not republished or removed.
- A logical backup was saved under the ignored `.data/import-backups/` directory before import. Each mutation also has a normal property revision.

The reviewed source snapshot is `data/notion-properties-2026-09-23.json`. It imports the database's name, location, status, tags, acreage and existing-structure fields. Norden Cross also has a curated mapping from its page body for utilities, development, approximate coordinates, proximity and working financial phases. Shelter Cove's county/development description and source conflicts were reviewed. This is not a complete export of all 20 page bodies, linked documents or media.

Approximate acreage is retained as an unknown numeric field with the original qualification in notes. Purchase prices are not converted to share prices. Owned/Partner-Owned/Prospective do not establish offering availability; unresolved offering statuses remain unset and block publication. Inactive and Pass source records are retained as drafts with review notes. Unclassified categories remain unset for publication purposes rather than guessed.

Norden Cross's existing app content had edits, so its narrative and demo flag were retained alongside imported structured facts. This draft still contains conflicting legacy sample narrative and needs content reconciliation before publication. Missing hero images, unknown statuses and unclassified categories on new drafts are visible in the editor's publication checklist. The initial import does not declare these records launch-ready.

## Original snapshot import (superseded in the UI)

The original snapshot import is retained as a CLI migration utility. The staff button has been replaced by [live Notion sync](NOTION-SYNC.md). The CLI imports the checked-in September 23 snapshot, not a live Notion refresh. Existing Notion page IDs are skipped, so repeated imports preserve app edits. Import does not publish. A concurrent edit is protected by the existing revision check; completed records are skipped on retry.

For a stopped local development database:

```sh
node --import tsx scripts/import-notion-properties.ts --local=/absolute/path/to/.data/land-club
node --import tsx scripts/import-notion-properties.ts --local=/absolute/path/to/.data/land-club --apply
```

Do not run the snapshot CLI while the development server owns PGlite; do not open the same PGlite directory from a second process. The CLI defaults to a dry run. An explicitly selected configured PostgreSQL target uses `--database-url` and requires `DATABASE_URL`; apply production migrations through the normal deployment process first.

Refreshing the source snapshot or extending body mappings is a separate intentional import task. Do not rewrite app edits by rerunning a generalized sync.

## Verification

- Typecheck and production build passed.
- Automated suite: 15 passed; external PostgreSQL integration test skipped because no dedicated test URL was configured.
- Tests cover publication requirements, unknown/zero/false values, invalid types and coordinates, media URL rejection, Notion uncertainty, duplicate names, repeatable import, edit preservation, audit revisions, public-source metadata exclusion and proximity publication isolation.
- Browser verified import counts, saved Norden Cross facts and preview rendering, including planned phase budgets and qualified acreage.
- No deployment or new public publication performed.

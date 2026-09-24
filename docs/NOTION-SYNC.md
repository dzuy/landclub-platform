# Live Notion property sync

The staff property library now has **Sync from Notion**. It queries Notion at click time and does not rely on a checked-in source export. Existing records without a prior live-sync baseline surface incoming differences for staff review instead of overwriting app edits.

## Connect the app

1. Create a Notion internal connection with **Read content** access, following [Notion’s connection setup](https://developers.notion.com/guides/get-started/authorization).
2. Add that connection to the Land Club **Properties** database in Notion.
3. Add its secret to the project's ignored `.env.local`:

   ```dotenv
   NOTION_TOKEN=your-internal-connection-token
   NOTION_DATA_SOURCE_ID=your-properties-data-source-id
   ```

   Both values are required. Do not use a `NEXT_PUBLIC_` variable or commit the token. Configure the same server-side variables in the hosting environment when deploying.
4. Restart the development server after configuring the environment. Open **Property content → Sync from Notion**.

The app's connection is separate from the Notion connector in this chat. Without a token, clicking sync displays a setup message and changes nothing. The user elected to connect the app later; no authenticated live API call has been verified yet.

## What sync does

- Matches existing records by normalized Notion page ID, so renaming a property does not duplicate it or change its app URL.
- Creates private drafts for new source records, with source-derived unique addresses. Does not merge unrelated properties by display name.
- Compares app values and incoming Notion values against the previous imported values. Source-only changes update the draft; app-only edits are retained. Divergent edits in both systems become persistent conflicts.
- Shows conflicts under **Facts → Notion sync review**, including both values. **Keep app value** and **Use Notion value** resolve the conflict locally; **Save draft** persists the decision. Neither option changes Notion.
- Flags missing source records for review. Missing can mean removed, archived or inaccessible; it never automatically deletes or unpublishes an app record.
- Never publishes. The normal preview and publish workflow remains in place.
- Fetches and validates every page of results before writing. A failed request, incomplete pagination or changed property types causes no writes. Database writes run in one transaction and serialize concurrent syncs/app writes; errors roll back the entire sync.
- Records updates in existing revision history. Unchanged repeated syncs do not add revisions.

## Exact coverage

Current Notion database fields: **Name, Location, Acreage, Status, Tags, Existing Structures**. Derived app fields: name, region, category, source status, record type, offering status when unambiguous, state/county/country, acreage and existing structures.

The mapper preserves unknown/approximate acreage and does not infer share prices from purchase prices. New entries without sufficient category/status/media remain incomplete drafts. Archived records and records whose names begin with Template are excluded. Distinct records retain their source IDs.

**Page bodies, linked documents, images, narrative plans, proximity and phase budgets are not automatically extracted by this sync.** Existing curated details are preserved. The editor marks page content for review and stores Notion's page edit timestamp.

Source baselines, conflicts and review metadata are excluded from public property responses. All normal property prices/budgets remain public when published, per the user's decision.

## Validation

Tests use a mocked Notion HTTP transport and a real isolated PGlite database. They cover paginated fetches, authorization/setup errors, malformed partial responses, renames, repeat syncs, field conflicts/resolution, missing/reappearing records, legacy records without baselines, publication isolation, concurrent syncs and transaction rollback.

Notion API version is pinned to `2025-09-03` with `/v1/data_sources/{id}/query`. No runtime SDK or new package dependency is required. A real Notion connection must be configured before an end-to-end live verification is possible.

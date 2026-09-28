# Property schema alignment audit

Reviewed: September 23, 2026. Related backlog: APP-001.

Source: [Property Page Schema](https://app.notion.com/p/3e4d020ec9d481858cf8faf9c955676e), last edited September 23, 2026. The source explicitly remains under review; its unsettled choices are identified below.

Scope: current local working-tree implementation, including existing uncommitted UI edits, migrations, validation, property editor, public renderer, discovery map, and checked-in seed content. This is a code and fixture audit, not verification of deployed code or live database records. No application or database changes were made.

## Main finding

The application is currently an editorial property CMS. A property has identity/story fields, a photo gallery, and arbitrary sections containing text label/value pairs. The Notion document calls for structured property facts, field-level states, and related proximity records. Much of Norden Cross's sample narrative discusses the intended subjects, but this is content coverage rather than schema support.

The existing draft/publish separation, revision history, UUID identity, unique slugs, and concurrent-edit protection provide a useful foundation. Alignment does not require discarding these mechanisms or automatically replacing PostgreSQL with Notion.

## Architecture and behavior gaps

| Requirement | Current implementation | Gap / consequence |
| --- | --- | --- |
| Notion as editorial source of truth | Staff edit application data directly; PostgreSQL stores `draft` and `published` JSONB snapshots | No Notion ingestion, source page IDs, relation mapping, sync tracking, or conflict policy. Decide whether the platform consumes Notion editorial records or the source document needs an explicit app-owned editing exception. |
| Standard fields | `sections[].facts[]` stores arbitrary string labels and values | Acreage, prices, utilities and other facts cannot be reliably validated, sorted, filtered, or reused across views. JSONB itself is not the problem; the missing typed contract is. |
| Actual / Planned / Not yet determined per field | Global `isDemo`, image classifications, and prose disclosures | No field-level state or consistent state-aware rendering. Demo provenance and factual state are different dimensions and both should be retained. |
| Twelve required fields plus airport and town before publication | Publish uses the same `draftSchema` as save | Eight required fields have no dedicated slot; no proximity requirements. A new placeholder passes the validation used by publish. Drafts should remain saveable while incomplete; publishing needs a separate completeness check. |
| Proximity records with name, kind, numeric minutes/miles, property relation, notes | No proximity entity or structured equivalent | No repeatable nearby-place editor, numeric travel-time formatting, or separate logistics/anchor presentation. |
| Coordinates drive maps | Four approximate positions hardcoded by slug | Editing a slug can remove its marker; new properties cannot acquire a marker through their data. Shelter Cove is deliberately unlocated. |
| Standard page groups; omit unpopulated optional content | All configured sections render in staff-defined order; galleries/fact lists are conditionally shown | No schema-driven group ordering, optional-field rules, or explicit unknown-state presentation. Empty body/empty facts can still leave a section heading. |
| Public versus gated content | Entire saved draft is copied into `published`; configured sections/facts render publicly | No per-field visibility or separate approved public projection. Pricing gating is unresolved in Notion. Do not add private financial information to this payload without defining the boundary. |

## Field mapping

“Text only” means sample narrative may cover the topic, or staff can manually add it, but the application has no dedicated field or type. The recommended types below are implementation proposals where Notion does not specify an exact type.

| Schema group and fields | Current mapping / coverage | Required alignment |
| --- | --- | --- |
| Identity: `property_name`, `property_type`, `status`, `one_line_descriptor`, longer description, `region_label` | `name`; `category`; free-text `status`; `headline`/`summary`; `intro`; `region` | Map existing text deliberately. Normalize mountain/farm/coastal/desert and add heritage. Agree status vocabulary; stop branching on display text. Preserve slug, image alt text and other app-specific fields. |
| Location: `state`, `county`, country, `coordinates`, `elevation`, `proximity` | Composite region string; Norden elevation in a text fact; coordinates in map code | Dedicated location fields, validated latitude/longitude, agreed elevation units/range representation, related proximity rows. County and elevation are required core. |
| Land: `total_acres`, `topography`, `tree_cover`, `water_features`, `views`, `notable_natural_features`, `adjacency` | Text only; Norden includes acreage, slopes, outlook and forest context | Numeric acres, controlled topography, descriptive fields with states. Acres and topography are required core. |
| Access: `road_access`, `year_round_access`, `winter_access_notes`, `power`, `water_source`, `septic_sewer`, `connectivity`, `gated` | Text only; Norden has access and utility examples | Controlled road access, descriptive service fields, boolean/unknown representation where applicable, per-field states. Road access is required. Year-round access remains questioned in the source. |
| Development: `development_stage`, `existing_structures`, `planned_structures`, `shared_amenities`, `completion_timeline` | Current-condition and phase sections, without typed fields | Controlled stage; separate existing/planned descriptions; state-aware amenities/timeline. Stage is required. Keep planned structures as a simple field unless the open relation decision changes. |
| Ownership: `total_shares`, `shares_available`, `share_price`, `what_a_share_conveys`, `annual_dues`, `dues_frequency`, `dues_include`, `usage_allocation`, `financing_available` | Text only; Norden sample price, dues and use policy appear in prose | Integer share counts, numeric monetary values with agreed currency, frequency enum, descriptions and boolean/unknown financing. Available shares and price are required. No authoritative operational policy should be inferred from fictional examples. |
| Parcel/legal: `apn`, `zoning`, `permitted_uses`, `easements_covenants`, `ownership_entity_structure` | Review placeholders and narrative; brochure identifier explicitly is not an APN | Dedicated text fields with states. Preserve APNs as identifiers, not numbers. |
| Setting: `season_notes`, `activity_tags` | No dedicated fields; possible narrative coverage | Seasonal description and tag array; anchors belong in proximity. |
| Media: `hero`, `gallery`, `renders`, `site_plan`, `parcel_map`, `aerial`, `video_tour` | Hero and image gallery, alt/caption/type; six choices exposed by the editor | Preserve accessibility/provenance metadata. Add distinct asset roles and video support. Validation only accepts local `/images/...` paths; there is no Notion media ingestion or upload flow. Gallery maximum is 20. |
| Things To Do: recreation, nearby attraction, seasonal events | No dedicated model | Define the fields and relationship to activity tags/proximity anchors; source currently provides topic headings rather than a complete contract. |
| Financials: phases and phase budgets | Norden phase sections and budget strings | Define repeatable phases and typed monetary amounts, currency, ordering and visibility. Source structure remains incomplete. |
| Proximity: `name`, `kind`, `minutes`, `miles`, `property`, `notes` | Absent | Repeatable related records; airport/town/metro/anchor kinds, numeric travel values, stable property identity. At least one airport and town required at publication under the current wording. |

Of the twelve core fields, four have dedicated equivalents: name, category, status and hero. Category and status still need normalization. The other eight are county, total acres, elevation, topography, road access, development stage, shares available and share price. Presence in prose does not satisfy structured validation.

## Existing content and migration implications

The five checked-in seeds are all marked illustrative. This does not establish the state of current database records.

- Norden Cross has the richest content: illustrative land dimensions, access/utilities, planned buildings, phases, costs and usage rules. These must not become verified values merely through migration. Several facts combine actual-looking and proposed values in the same string.
- Shelter Cove has a completed-home narrative but unconfirmed location and inventory. Its property category alone does not capture development or ownership availability.
- Point Reyes & Marin is a regional scouting page with no selected parcel. The schema's universal publication requirement for acreage, price and shares needs an explicit rule for this case.
- Sutter Creek is a past-project narrative; Pioneertown mixes past-project context with regional scouting. Neither should be mechanically converted to an available offering.

Migrate actual database drafts and published snapshots independently, preserving UUIDs, slugs, revision history and staff changes. Do not reseed over existing content. Retain unmapped editorial sections until their content has been reviewed. A mapping should identify unverified values for review rather than silently parsing prose into authoritative facts.

## Decisions to resolve before locking implementation

1. Editorial ownership: Notion-controlled facts with app preview/publication is consistent with the source; direct editing of those same facts in both systems needs an explicit conflict policy. Keep identity, ownership, bookings and transactional financial records app-owned as required by existing platform planning.
2. Status: distinguish publication state, offering/project status, development stage, and whether a record is a parcel or a scouting area. The source's status vocabulary remains tentative.
3. Completeness: how do Scouting, Realized and Fully Subscribed records satisfy price/share/parcel requirements? Do unknown states count as complete? Preserve zero and false as valid values where appropriate.
4. Field states and units: how state applies to identity/media, blank versus explicitly unknown, elevation range and unit, monetary currency, and whether annual dues is always an annualized amount regardless of payment frequency.
5. Visibility: public share price versus request-details access, and public versus authenticated phase budgets. Current source does not settle the audience of each financial field.
6. Repeating data: confirm media representation, whether planned structures gets its own relation, and the unfinished Things To Do/Financials groups. These are source design decisions, not simply omitted implementation.

## Recommended implementation order

1. Establish the typed property contract, field states, stable IDs, proximity relation and explicit publication validation. Resolve the narrow decisions above without replacing the working publication/history system.
2. Add an additive migration and source mapping; preserve existing drafts, published versions and narrative content. Separate public data projection from any restricted fields.
3. Implement the agreed editorial workflow: Notion ingestion plus app review/publication, or a documented change to source ownership. Add grouped editing/completeness feedback only for fields owned by the app.
4. Render the standard groups with state labels and empty-field rules; drive maps and discovery categories/status from the same normalized data. Extend media handling.
5. Verify a populated Norden Cross record and a contrasting existing/scouting/past-property case through preview and publication. Check missing core fields, missing airport/town, zero/false values, planned/unknown states, numeric formatting, coordinate changes, private-field exclusion and migration preservation.

## Evidence and verification

- `src/lib/schema.ts`: current contract, enums, image restrictions and generic facts.
- `migrations/001_property_content.sql`: JSONB snapshots and revisions; no proximity table.
- `src/lib/repository.ts`: validation on create/save/publish; full-draft publication.
- `src/app/staff/properties/actions.ts`: new-property placeholders and publication action.
- `src/components/property-editor.tsx`: Overview/Content/Photos/History editor.
- `src/components/property-page.tsx`: generic public section renderer and global demo disclosure.
- `src/components/collection-map.tsx`: slug-keyed hardcoded regional coordinates.
- `src/components/discovery-home.tsx`: fixed category chapters and status-string/slug-specific presentation.
- `src/lib/seed-properties.json`: illustrative content reviewed above.
- `docs/TECH-STACK.md`: public projection requirement and platform data boundaries.
- `tests/content.test.ts`: existing isolation/concurrency/history/schema tests; no target-schema completeness coverage.

A read-only runtime check using the existing Zod schema confirmed that the same placeholder shape produced by the create action passes the schema used by publish, without the eight missing core fields or any proximity records. No property was created or published for this check. No application tests were changed or full build run for this documentation-only audit.

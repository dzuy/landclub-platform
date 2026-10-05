# Property photo storage

New uploads retain `/api/property-photos/<photo UUID>` URLs. Bytes go to local
files in development or a private Supabase bucket when hosted. Database rows
hold backend/key, MIME, byte size, SHA-256, original filename and access mode.
`property_photo_sources` retains each mapped Drive source ID, including aliases
when multiple source files have identical content within one property.

## Configuration and access

Development defaults to `.data/property-photos/<property UUID>/<sha256>.<ext>`.
Keep this directory outside `public/`; back it up along with the database.
Set `PHOTO_STORAGE_DIR` to an absolute alternative directory if needed.
Files are written atomically and read back to verify their checksum.

Hosted uploads require `PHOTO_STORAGE_BACKEND=supabase`, `SUPABASE_URL`, and the
existing server-only `SUPABASE_SECRET_KEY`. `PHOTO_STORAGE_BUCKET` defaults to
`property-photos`. Production refuses local file storage. The private bucket is
accessed by the server; clients receive no key, signed URL or public object URL.
Apply migrations 010 and 011 before running the hosted application.
Changing the configured backend only affects new objects. Existing local files
are not automatically transferred to Supabase; preserve their database and files
until a separately approved transfer has been completed.

Existing uploaded photos remain publicly readable when referenced by a
published property, as before. Manifest imports always set `staff_only=true`.
These imports are accessible only to staff, even if someone later publishes a
draft containing their URLs. Member-private delivery and releasing imported
photos to public access require a separate reviewed change. Uploading through
the existing staff UI retains its existing publish-based access behavior.

## Offline, local-first import

The importer consumes already-downloaded files and an explicit JSON manifest.
It does not fetch Drive, infer property names, create properties, replace covers,
publish, or delete anything. Keep manifests and downloaded source files under
ignored `.data/` or another private directory. Every photo must explicitly name
an existing property UUID and its actual Drive file ID:

```json
{
  "version": 1,
  "photos": [
    {
      "propertyId": "00000000-0000-4000-8000-000000000001",
      "file": "property-a/site-01.jpg",
      "source": {"system": "drive", "id": "ACTUAL_DRIVE_FILE_ID"},
      "alt": "View of the property entrance"
    }
  ]
}
```

Stop the local Next.js app before opening its PGlite directory. Back up the local
DB and photo directory before applying an import. The explicit
`--offline-confirmed` flag confirms no other process is using that database.
Dry-run is the default and runs SQL in a read-only transaction; no photo objects,
metadata, migrations, drafts, or publication changes are written. Opening PGlite
can still update its own internal database bookkeeping.

```sh
npm run photos:import -- --local=/absolute/path/.data/land-club --storage-root=/absolute/path/.data/property-photos --source-root=/absolute/path/downloaded-photos --manifest=/absolute/path/photo-manifest.json --offline-confirmed
```

Review the returned mapping and counts. A later explicitly approved import uses
the same command plus `--apply`. It preflights all files/mappings, checks magic
bytes and the 20 MiB (20,971,520 bytes) limit, deduplicates SHA-256 per property/access mode, preserves
source IDs, and appends images to draft media only. A source ID whose bytes change
is a conflict, not an overwrite. Draft validation limits still apply. Check the
source root, manifest and database paths if the command stops.

Each photo's metadata/provenance and draft update commit together. After an
interruption, rerun the same manifest: committed photos are reused, existing
media entries are skipped, and any immutable object written before a transaction
failed is reused. Objects are not automatically deleted on failure; this avoids
removing another reference or losing a successfully written copy. Source files
are checked again after preflight so changed content stops the run.

## Legacy base64 records

Migration 011 adds nullable object metadata without removing any old photo row or
its base64 `content`. Reads of unmigrated rows continue to work. The legacy copy
command is also dry-run by default:

```sh
npm run photos:import -- --local=/absolute/path/.data/land-club --storage-root=/absolute/path/.data/property-photos --migrate-legacy --offline-confirmed
```

A separately approved run with `--apply` copies and verifies bytes, then records
the object location. IDs, URLs and access remain unchanged. Original base64
content remains as a backup; there is no destructive cleanup step. Reruns skip
copied rows. Legacy duplicates retain their separate IDs and share an object.
The programmatic migration also accepts the Supabase storage adapter; this local
CLI deliberately cannot open or import into a remote database.

## Bucket setup

`npm run photos:bucket` is a read-only preflight. It requires approved server-side
credentials already supplied to the process, and verifies the documented Land
Club project ID `sfrdfzxxbhcmvjgxbshp`. A later run with `--apply` creates the
private `property-photos` bucket only if absent, with a 20 MiB (20,971,520 bytes) limit and
JPG/PNG/GIF/WebP MIME types. It adds no client/public policies. Existing buckets are never changed, including their size limits. Verification
checks privacy, the exact byte limit and the four MIME types. A mismatch exits
with a review message showing the observed byte limit; 20,000,000 bytes is not
assumed equivalent to 20 MiB. No update to an existing bucket is performed. Run this from the repository checkout, where `tsx` is installed.
Do not save a new server credential without the owner's approval.

Implementation status: the user reports creating the bucket with a “20mb” limit.
The application, importer and setup defaults now use an intended **20 MiB
(20,971,520 bytes)** limit, inclusive. The live byte limit, privacy/MIME settings
and end-to-end application integration remain unverified: the configured project
has no server key available and the browser inventory is empty. Creation was
reported by the user, not performed or independently verified by this task.
No user photos were imported, no hosted migrations applied, and no publication
or deployment run.

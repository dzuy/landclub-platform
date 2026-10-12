# Property photo thumbnails

Property tables use 160 px WebP thumbnails; property cards, the photo editor grid,
and gallery previews use 640 px thumbnails. Sizes bound the longest edge, preserve
aspect ratio, apply EXIF rotation, strip metadata, and never enlarge small images.
Canonical photo URLs remain in property records and full-size viewers.

The photo endpoint accepts `?thumbnail=160` or `?thumbnail=640`. It checks the
original photo's permissions before reading or generating the derivative. Files
are saved alongside gallery files in the same private local or Supabase storage,
with `.thumb-160-v1.webp` / `.thumb-640-v1.webp` suffixes. Responses remain private
and uncached by browsers so access changes take effect on subsequent requests.
New platform uploads and manifest imports create all three files before recording
success: a gallery WebP bounded to 2560 pixels on its longest edge and 1.5 MiB,
plus both thumbnail sizes. Gallery quality starts at 82; unusually detailed images
use lower quality and, if necessary, smaller dimensions to meet the byte limit.
No source original is saved for new photos. GIF inputs become still images using
the first frame. Input uploads remain limited to 20 MiB and decoding to 80 megapixels.

Migration `014_optimized_property_photos.sql` must run before the new pipeline
serves uploads. Railway's existing pre-deploy step runs it automatically;
manual deployments use `npm run db:migrate`. Local uploads and the local import
CLI initialize it automatically. The existing `checksum` retains the submitted
bytes' fingerprint for duplicate detection and source-conflict checks;
`storage_checksum` verifies the optimized bytes. MIME type and byte size describe
the stored gallery file. Existing records remain readable without conversion.

Missing thumbnails for older photos are generated on first use and reused
afterward. Existing photos reused by duplicate detection retain their files.

Run `npm run photos:optimize` to pre-generate both sizes for local stored photos
and the six bundled public images. This is additive, resumable, and does not open
the database, so the local app can stay running. It uses `PHOTO_STORAGE_DIR` or
`.data/property-photos`; an explicit root can be passed with
`npm run photos:optimize -- --storage-root=/absolute/path`.

The local backfill does not upload files to hosted storage. After deployment,
older hosted photos receive thumbnails when requested through the endpoint.
This backfill retains existing originals; it does not recompress or delete them.

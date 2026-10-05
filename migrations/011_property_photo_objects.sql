-- Additive upgrade: keep legacy base64 bytes until an explicit verified copy succeeds.
ALTER TABLE property_photos ALTER COLUMN content DROP NOT NULL;
ALTER TABLE property_photos ADD COLUMN IF NOT EXISTS storage_backend text;
ALTER TABLE property_photos ADD COLUMN IF NOT EXISTS storage_key text;
ALTER TABLE property_photos ADD COLUMN IF NOT EXISTS byte_size bigint;
ALTER TABLE property_photos ADD COLUMN IF NOT EXISTS checksum text;
ALTER TABLE property_photos ADD COLUMN IF NOT EXISTS original_filename text;
ALTER TABLE property_photos ADD COLUMN IF NOT EXISTS staff_only boolean NOT NULL DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS property_photos_checksum ON property_photos(property_id,checksum,staff_only) WHERE checksum IS NOT NULL;
CREATE TABLE IF NOT EXISTS property_photo_sources (
 property_id uuid NOT NULL REFERENCES properties(id),
 source_system text NOT NULL,
 source_id text NOT NULL,
 photo_id uuid NOT NULL REFERENCES property_photos(id),
 PRIMARY KEY(property_id,source_system,source_id)
);
ALTER TABLE property_photo_sources ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON property_photo_sources FROM PUBLIC;

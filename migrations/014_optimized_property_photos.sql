-- checksum continues to identify the submitted bytes for repeat imports.
-- storage_checksum verifies the optimized gallery object. NULL means legacy.
ALTER TABLE property_photos ADD COLUMN IF NOT EXISTS storage_checksum text;

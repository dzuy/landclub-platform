-- Retain bytes and immutable investor editions while removing deleted files from access.
ALTER TABLE member_documents ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE group_documents ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

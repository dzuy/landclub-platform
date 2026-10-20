-- Labels are independent of immutable original filenames and existing audiences.
ALTER TABLE member_documents ADD COLUMN IF NOT EXISTS display_name text NOT NULL DEFAULT '' CHECK (length(display_name)<=200);
ALTER TABLE member_documents ADD COLUMN IF NOT EXISTS notes text NOT NULL DEFAULT '' CHECK (length(notes)<=4000);
ALTER TABLE group_documents ADD COLUMN IF NOT EXISTS display_name text NOT NULL DEFAULT '' CHECK (length(display_name)<=200);
ALTER TABLE group_documents ADD COLUMN IF NOT EXISTS notes text NOT NULL DEFAULT '' CHECK (length(notes)<=4000);

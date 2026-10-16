-- Expand existing role constraints without changing any role assignments.
DO $$
DECLARE constraint_row record;
BEGIN
 FOR constraint_row IN
  SELECT c.conname, t.relname FROM pg_constraint c
  JOIN pg_class t ON t.oid=c.conrelid
  JOIN pg_namespace n ON n.oid=t.relnamespace
  WHERE n.nspname=current_schema() AND c.contype='c'
   AND t.relname IN ('invitations','user_roles','prepared_members','group_documents')
   AND pg_get_constraintdef(c.oid) LIKE '%prospect%'
   AND pg_get_constraintdef(c.oid) LIKE '%admin%'
 LOOP
  EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I',constraint_row.relname,constraint_row.conname);
 END LOOP;
END $$;
ALTER TABLE invitations ADD CONSTRAINT invitations_allowed_roles CHECK (roles <@ ARRAY['member','prospect','investor','owner','team','lender','admin']::text[]);
ALTER TABLE user_roles ADD CONSTRAINT user_roles_allowed_role CHECK (role IN ('member','prospect','investor','owner','team','lender','admin'));
ALTER TABLE prepared_members ADD CONSTRAINT prepared_members_allowed_roles CHECK (cardinality(roles)>0 AND roles <@ ARRAY['member','prospect','investor','owner','team','lender','admin']::text[]);
ALTER TABLE group_documents ADD CONSTRAINT group_documents_allowed_roles CHECK (array_position(roles,NULL) IS NULL AND roles <@ ARRAY['member','prospect','investor','owner','team','lender','admin']::text[]);

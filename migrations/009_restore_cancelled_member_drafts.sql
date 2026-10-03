-- Repair drafts hidden by the previous cancellation path. Only explicitly
-- cancelled invitations qualify; accepted accounts and delivery failures do not.
UPDATE member_properties AS mp
SET user_id=pm.id
FROM prepared_members AS pm
JOIN invitations AS i ON i.id=pm.invitation_id
WHERE pm.status='invited' AND i.status='failed'
  AND i.failure_reason LIKE 'Cancelled by %'
  AND pm.auth_user_id=i.auth_user_id AND pm.email=i.email
  AND mp.user_id=pm.auth_user_id
  AND NOT EXISTS (SELECT 1 FROM user_roles r WHERE r.user_id=pm.auth_user_id)
  AND NOT EXISTS (SELECT 1 FROM invitations active WHERE active.email=pm.email AND active.status IN ('pending','sending','accepted'));

UPDATE prepared_members AS pm
SET status='draft',auth_user_id=NULL,invitation_id=NULL,failure_reason=NULL,roles=i.roles
FROM invitations AS i
WHERE i.id=pm.invitation_id AND pm.status='invited' AND i.status='failed'
  AND i.failure_reason LIKE 'Cancelled by %'
  AND pm.auth_user_id=i.auth_user_id AND pm.email=i.email
  AND NOT EXISTS (SELECT 1 FROM user_roles r WHERE r.user_id=pm.auth_user_id)
  AND NOT EXISTS (SELECT 1 FROM invitations active WHERE active.email=pm.email AND active.status IN ('pending','sending','accepted'));

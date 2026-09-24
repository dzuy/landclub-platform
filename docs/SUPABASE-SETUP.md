# Land Club Supabase setup

Project: `sfrdfzxxbhcmvjgxbshp` (Land Club), Canada Central.

## Completed

- Disabled public signups; email confirmation remains enabled and anonymous sign-ins remain disabled.
- Applied migrations `001_property_content.sql` and `002_private_data.sql` through the dashboard SQL editor, recording their exact repository checksums in `land_club.schema_migrations`.
- Enabled row-level security on properties, revisions, and the migration ledger.
- Verified that both `anon` and `authenticated` roles have no schema access to `land_club`.
- Saved the project URL and publishable key in the ignored local `.env.local`. Local development still uses PGlite.

## Remaining setup

1. The owner must create their initial application user in Authentication → Users → Add user → Create new user, entering their own email and password. Copy the resulting UUID into Railway's `STAFF_USER_IDS` when configuring the deployment.
2. Set Railway's `DATABASE_URL` using the session-pooler template below, substituting the existing database password and percent-encoding special characters. Do not commit passwords or paste them into chat.
3. Set `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and the staff allowlist as described in [DEPLOYMENT.md](DEPLOYMENT.md). Set `SEED_DEMO_CONTENT=true` for the first demo import; no property content has been imported into this hosted database yet.
4. Once the Railway domain exists, set Supabase's Site URL to that HTTPS domain. The default localhost value is still in place; no recovery callback UI has been implemented.
5. Verify hosted sign-in and the complete save/preview/publish flow. Neither hosted authentication nor a direct application connection has been tested yet.

Session-pooler template (password placeholder only):

```text
postgresql://postgres.sfrdfzxxbhcmvjgxbshp:[YOUR-PASSWORD]@aws-0-ca-central-1.pooler.supabase.com:5432/postgres
```

Project URL: `https://sfrdfzxxbhcmvjgxbshp.supabase.co`.

Use the existing publishable key from the project's Connect panel. The app does not need a service-role API key or a Supabase GitHub integration.

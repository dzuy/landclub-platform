# Railway deployment

The repository is configured to build the app and deploy each push to `main` **after the one-time service connection below**. The Land Club Railway and Supabase projects now exist; see [SUPABASE-SETUP.md](SUPABASE-SETUP.md) for setup status.

## 1. Create the Supabase project

Use a staging project first. Obtain:

- The PostgreSQL connection URL from **Connect**. For Railway, use the Supabase **session pooler** connection if the direct endpoint is not reachable over IPv4. Do not use the transaction pooler: migration advisory locks and the app's session search path require session semantics. Use the database-owning server credential for this initial deployment, kept only in Railway variables. Retain TLS certificate verification; do not set `rejectUnauthorized: false`.
- The project URL, such as `https://<project>.supabase.co`.
- The publishable API key (the legacy anon key is also accepted by the SDK) for browser authentication.
- A server-only Supabase secret API key for sending invitations. Never expose this key to client code or commit it.

Under Authentication:

1. Disable public sign-ups. There is no self-registration path in this app.
2. Provision the initial staff account through Supabase's supported administrator flow. The account needs a confirmed email and password. Have the staff user set/reset their own password through a secure provider flow; do not commit or share passwords in the repo.
3. Copy the staff user's UUID. Add additional approved staff UUIDs as needed.
4. Set Supabase's production Site URL to the Railway HTTPS domain and allow both `https://<your-domain>/auth/callback` and `https://<your-domain>/auth/confirm` as redirect URLs.
5. Change the **Invite user** email template to link to `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=invite`. The `/auth/confirm` route verifies that token and the pending invitation before allowing a password to be created.
6. Keep Supabase's authentication rate limits enabled. This release has no Google sign-in or MFA enrollment UI; add those before broader member/financial operations.

Every staff page and mutation checks a server-verified Supabase user and confirmed email. Bootstrap administrators can be listed in `STAFF_USER_IDS`; accepted users with an authoritative `admin` database role also receive staff access. Roles and invitations live in the private database schema, so a user editing their Supabase metadata cannot grant themselves access.

## 2. Connect Railway to GitHub

Create a Railway project and a service from the GitHub repository `dzuy/landclub-platform`. Authorize Railway's GitHub integration to access this repository if needed.

Set the service settings **before the first deployment**:

| Setting | Value |
| --- | --- |
| Source repository | `dzuy/landclub-platform` |
| Deployment branch | `main` |
| Root Directory | Leave blank (repository root) |
| Config file path | Leave unset for new services; configure the settings below directly |
| Automatic deployments | Enabled |
| Wait for CI | Disabled initially; enable after activating the optional workflow below |

Railway now blocks new services from opting into legacy Config as Code. The dashboard reports that existing config files stop working on December 1, 2026. For this service, configure the following settings directly rather than relying on `railway.json`:

- Builder: automatically detected root Dockerfile.
- Pre-deploy command: `node scripts/predeploy.mjs`.
- Healthcheck path: `/api/health`; timeout: 120 seconds.
- Restart policy: On Failure, maximum 3 retries.
- Leave custom build/start commands unset; Docker starts `node server.js`.
- Set `PORT=8080` to match the existing public domain target port.

These changes are currently staged in Railway, awaiting the database connection variable and deployment. `railway.json` remains a reference for the equivalent legacy configuration.

## 3. Add Railway service variables

| Variable | Required value |
| --- | --- |
| `DATABASE_URL` | Supabase PostgreSQL direct/session-pooler connection URL |
| `SUPABASE_URL` | Supabase HTTPS project URL |
| `SUPABASE_PUBLISHABLE_KEY` | Supabase publishable API key |
| `SUPABASE_SECRET_KEY` | Server-only Supabase secret API key used to create invited Auth users and send invitation emails |
| `STAFF_USER_IDS` | Comma-separated verified Supabase staff user UUIDs |
| `LAND_CLUB_SITE_URL` | Required canonical HTTPS origin used in password-recovery links, such as `https://landclub.up.railway.app` |
| `SEED_DEMO_CONTENT` | Optional: `true` to import the five labeled demo properties |

**Do not set `LAND_CLUB_LOCAL_STAFF` on Railway.** Deployment validation rejects that bypass. No application secrets are required at image build time. `.env*`, `.data`, and local dependencies are excluded from the Docker context.

For the first demonstration deployment, set `SEED_DEMO_CONTENT=true`; it inserts missing demo properties and publishes their clearly labeled content. It never overwrites edits or republishes existing records. Set it to `false` after the first successful import. This imports committed demo content, not local database edits. Without the flag, the public home starts empty until staff create and publish properties.

## 4. Deploy and verify once

Generate a Railway HTTPS domain and deploy the latest `main` commit. The deployment sequence is:

1. `npm ci`, automated tests and `next build` run inside a reproducible Node 22 Docker build.
2. A non-root runtime image includes the standalone server, public images, migration scripts and SQL.
3. Railway pre-deploy validates variables, applies pending migrations, and optionally imports demos.
4. Railway requires `/api/health` to return HTTP 200 before switching traffic. The endpoint queries the content database on every request.

Verify on the actual domain:

- `/` displays the landscape home and published properties.
- `/api/health` returns `{ "status": "ok", ... }`.
- `/staff/properties` redirects an anonymous visitor to `/signin`.
- An approved staff account can sign in; an unapproved account cannot access the editor.
- A staff user can invite an email from `/staff/administration`, assign one or more roles, and the recipient can create an account only through the invitation sent to that email. Invitations default to `Member`.
- Save a draft, preview it, publish it, then verify the public page updates. Unpublish removes it from the collection and detail route.
- Sign out and confirm staff access is gone.

After this one-time setup, **push to `main` → Railway build and tests → migrations → health check → new deployment**. No Railway deployment token is needed when using Railway's native repository integration.

## Optional: activate GitHub CI

The complete workflow is provided in [deployment/github-actions.yml](../deployment/github-actions.yml) as a template. It is not active: the current GitHub push credential cannot create workflow files.

Using GitHub's web editor, create `.github/workflows/land-club.yml` at the repository root with the template contents and commit it to `main`. Alternatively, copy the template to that path locally and push with a credential authorized to write workflows. Once the **Land Club checks** workflow passes, enable Railway's **Wait for CI** setting. No secrets are required for these tests; they use a disposable PostgreSQL service.

The Docker build already runs local tests and the production build without this optional workflow. Activating CI adds real PostgreSQL integration tests and a packaged runtime smoke test before Railway starts deployment.

## Database changes and rollback

Numbered SQL lives in `migrations/`. Migrations are tracked with checksums and run transactionally under an advisory lock. Never edit an already-applied migration; add the next numbered file. A failed migration exits nonzero, so Railway does not activate that deployment.

Production tables live in the private `land_club` schema, outside Supabase's default public API schema. RLS is enabled with no client policies. Do not expose this schema through Supabase Data API or grant browser roles access. The trusted database-owner connection is server-only; a separate least-privilege runtime role can be introduced later alongside its explicit policies.

Keep migrations backward-compatible: an application rollback does not reverse database changes. Back up the Supabase database before destructive changes, verify backup/restore procedures, and use forward repair migrations. Public files are bundled in the image; future uploads require persistent object storage, not the Railway container filesystem.

## Verification boundaries

Local tests cover the repository, validation, access policy and production configuration rules. The optional GitHub Actions workflow adds a real PostgreSQL service, idempotent migration/seed checks, a Docker image build, packaged migration execution and an anonymous production HTTP smoke test. Docker and external PostgreSQL checks have not been executed locally because those services are unavailable here. A live Supabase login and actual Railway rollout still require the real project settings above; local tests do not claim to validate those external services.

References: [Railway GitHub autodeploys](https://docs.railway.com/deployments/github-autodeploys), [monorepo settings](https://docs.railway.com/deployments/monorepo), [pre-deploy commands](https://docs.railway.com/deployments/pre-deploy-command), [Supabase server-side authentication](https://supabase.com/docs/guides/auth/server-side/creating-a-client).

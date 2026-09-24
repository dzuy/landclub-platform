# Land Club application

Next.js / TypeScript property discovery and staff content management. The public home preserves the prototype's landscape chapters and reads published PostgreSQL content. Staff can create properties, edit sections and gallery metadata, save/preview drafts, publish/unpublish, and review revision history. Concurrent editor writes are protected by revision checks.

## Local development

Requires Node 22.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

- Home: http://127.0.0.1:3000/
- Staff: http://127.0.0.1:3000/staff/properties

With no `DATABASE_URL`, development uses persistent PGlite in `.data/land-club/`. Five demo properties are initially imported as drafts; publishing is explicit. The local staff shortcut requires `LAND_CLUB_LOCAL_STAFF=1`, development mode and the loopback host. It never authorizes production requests. Do not tunnel the local editor to the internet.

To back up local data, stop the dev server and copy the entire `.data/land-club/` directory. Do not delete it to troubleshoot. Local data and `.env.local` are ignored by Git and Docker.

## Deploy to Railway

Follow [deployment guide](docs/DEPLOYMENT.md) once to create Supabase, connect Railway to GitHub `main`, and set the service root/config path and variables. The repository includes:

- A non-root, multi-stage Docker build with lockfile installation, tests and standalone output.
- Railway pre-deploy validation, transactional migrations and optional non-destructive demo import.
- Database-backed readiness and restart configuration.
- Supabase email/password staff sign-in with verified identity, confirmed email, bootstrap UUID allowlisting, database-backed Admin access, secure HTTP-only cookies, session refresh and sign-out.
- Staff-managed email invitations with exact-email acceptance and multi-role assignment across Member, Prospect, Investor, Owner and Admin.
- An optional GitHub CI template with PostgreSQL and production-container smoke tests.

Automatic deployment becomes active only after Railway's native GitHub connection is configured. This repo does not create accounts or connect external projects by itself.

## Checks

```sh
npm test
npm run build
npm run typecheck
# Dedicated, disposable PostgreSQL database only:
TEST_DATABASE_URL=postgresql://... npm run test:postgres
```

`npm test` skips the external PostgreSQL test when its URL is absent. The optional CI workflow supplies it once activated. The integration test creates and changes demo records and must never target a production database.

## Current scope

Image selection uses the supplied library; uploads and private file storage remain future work. Staff can invite users and assign multiple roles; `Member` is the default. Signed-in access supports email password recovery. Google sign-in, MFA enrollment, bookings, follows, inquiries, payments, events and maintenance workflows are not implemented. Demo prices, ownership terms and booking rules are not operational policies. The original prototype remains a separate design reference.

## Product documentation

- [Product requirements](docs/PRD.md)
- [Technology decisions](docs/TECH-STACK.md)
- [Implementation and planning backlog](docs/BACKLOG.md)

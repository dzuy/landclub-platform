# Land Club — working content application

First local implementation slice: **staff property content management**. This is a separate Next.js/TypeScript application; `../land-club-prototype` remains the visual prototype. The hosted prototype has not been changed by this work.

## Run

Requires Node 20.9+ (tested with Node 22).

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Open http://127.0.0.1:3000/staff/properties. The server binds to loopback only. Five labeled demo properties are imported into an empty local database as drafts. Nothing is automatically published. The first interactive QA run published Norden Cross locally to demonstrate the working flow.

## What works

- Create properties and edit name, URL slug, location, landscape, status and editorial introduction.
- Add, reorder and remove content sections and structured specification rows.
- Select supplied images; edit accessible descriptions, captions and image classifications.
- Save drafts to a persistent embedded PostgreSQL database (PGlite).
- Preview saved drafts behind the staff gate.
- Publish a separate content snapshot, or unpublish without deleting the draft/history.
- Serve real server-rendered public routes using only the published snapshot.
- Record create/save/publish/unpublish operations with revision numbers and snapshots.
- Reject stale writes and stale publication attempts from competing editor windows.
- Enforce unique draft and published URL slugs; validate inputs server-side.

## Local data and access

The local database is stored in `.data/land-club/`, ignored by Git. Edits survive page reloads and server restarts. Do not delete that directory to troubleshoot. For a filesystem backup, stop the dev server and copy the complete `.data/land-club/` directory, then restart it. Database files are local to this computer; there is no synchronization or managed backup yet.

`LAND_CLUB_LOCAL_STAFF=1` enables a **development-only local editor**, not real authentication. Every staff read and mutation checks this flag, `NODE_ENV=development`, and a loopback Host on port 3000. Next.js Server Actions enforce same-origin mutation requests. There is no role switcher or browser-controlled staff role. Production staff access always fails closed until actual authentication is implemented. Never tunnel or reverse-proxy the local editor to the internet.

The app can use PostgreSQL via `DATABASE_URL`, but hosted deployment is intentionally not enabled. Production requires a database URL and cannot fall back to local PGlite. Schema initialization is currently a local foundation; versioned deployment migrations, least-privilege database roles, RLS and identity-based authorization must be completed before connecting production data.

## Validation

```sh
npm test
npm run build
npm run typecheck
```

Tests exercise actual embedded PostgreSQL transactions: draft/public isolation, publication, unpublication, audit history, stale revision rejection, URL uniqueness, input validation and the local access gate. Build verifies TypeScript and Next.js route compilation. Browser QA covers a persisted draft change, local publication, the public page, and the editor.

## Deliberately not implemented yet

- Supabase invitations, staff sign-in, MFA, roles, Railway deployment and hosted backups.
- Image uploads / private file storage (the editor uses the supplied image library).
- Multi-user staff attribution, audit restoration UI, scheduled publishing, approval roles.
- Member accounts, follows, inquiries, bookings, payments, email, events and maintenance workflows.
- Full migration of every prototype page or its map interactions.

The next slice is invitation-only staff identity and authorization against Supabase, then staging on Railway, following `../TECH-STACK.md` and `../PRD.md`. Keep demo property data visibly labeled until verified replacement content is supplied. No ownership or booking rules in the brochure are authoritative operational policies.

## Home-page parity

The root `/` is the public “Find your kind of somewhere” discovery home, preserving the prototype's landscape chapters, photography and regional map. `/properties` shows the same collection. Staff management remains at `/staff/properties`. The collection reads only published database snapshots. During this update, the four untouched demo seed drafts were explicitly published locally to restore the complete five-property collection; edited drafts were not published. Future unpublishing removes a property from the home page as well as its detail route. Following and land-introduction actions remain deferred until their real workflows exist.

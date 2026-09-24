# Land Club Platform — Recommended Technology Stack

**Status:** Proposed  
**Last updated:** September 21, 2026  
**Scope:** The Land Club app at `app.land.club`, including public-capable property detail pages and authenticated account features. This document does not prescribe the separate marketing website stack.

**Product requirements:** See [PRD.md](PRD.md) for public property pages, the invitation-only prospect/owner account experience, and phased first-release scope. Product decisions recorded September 21 supersede earlier Google-only, entirely authenticated app, and in-platform investment-flow assumptions.

## 1. Decision summary

Build the Land Club platform as a TypeScript modular monolith hosted on Railway, with Supabase providing managed PostgreSQL, authentication through Google or email/password, and private file storage.

### Confirmed decisions

- Platform hostname: `app.land.club`
- Public surface: detailed property pages can be published for viewing without sign-in
- Application hosting: Railway
- Database: Supabase PostgreSQL
- Registration: invitation-only for prospects, owners, and staff
- Authentication: Google sign-in and email/password, with verified email
- Ownership activation: manually verified and triggered by authorized Land Club staff
- Initial architecture: modular monolith
- Marketing website: separate application and technology decision

### Recommended decisions

- Web framework: Next.js with TypeScript
- Authentication service: Supabase Auth with Google OAuth/PKCE and email/password registration, verification, and recovery
- Authentication domain: `auth.land.club`, when custom-domain configuration is available
- File storage: Supabase Storage with private buckets and row-level policies
- Database access: Drizzle ORM plus explicit SQL migrations and database functions where appropriate
- Validation: Zod, used at every external boundary
- UI: Tailwind CSS with shadcn/ui primitives
- Forms: React Hook Form with shared Zod schemas and server-side validation
- Background processing: Postgres-backed durable queue consumed by a Railway worker
- Transactional email: Postmark or Resend, selected through a short vendor comparison
- Monitoring: Sentry plus an independent uptime monitor
- Product analytics: PostHog, subject to consent and privacy requirements
- Testing: Vitest, Testing Library, and Playwright
- CI/CD: GitHub Actions and Railway deployments

## 2. Product boundary

Land Club has two adjacent products:

1. **Marketing website** — public brand, editorial property discovery, events, SEO, and conversion. It may be implemented with Squarespace, Lovable, or another website tool.
2. **Land Club platform** — detailed property pages with public viewing support, plus invitation-only accounts for prospects and owners, profiles, ownership/access records, home-property bookings, private documents, upcoming properties, announcements, stay guidance, maintenance requests, and events. Broader governance and exchange are later capabilities.

The marketing website must remain independently replaceable. It hands visitors into detailed app property pages through explicit URLs and property/campaign identifiers. Public app pages do not require a session; account workflows do. The marketing site must never receive privileged platform credentials or direct access to sensitive platform data. Marketing/app separation is distinct from the public/authenticated access boundary.

Marketing email capture creates a contact, not a platform account. Buy In is a separate partner-led experience. Staff manually confirm completed ownership and assign platform rights; release one does not require automated financial-partner synchronization or an in-platform investment transaction workflow.

## 3. High-level architecture

```text
Marketing website
  └── Links/referrals to app.land.club
                         │
                         ▼
              Railway web application
                 Next.js + TypeScript
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
 Supabase Postgres  Supabase Auth  Supabase Storage
          │                             │
          └──────────► Railway worker ◄─┘
                         │
           Email, payments, e-signature,
           KYC/AML and other integrations
```

### Initial Railway services

- `web` — the Next.js platform application
- `worker` — asynchronous jobs, added when the first durable background workflow is implemented
- Scheduled job services only where a database scheduler is not appropriate
- External uptime monitoring, because Railway deployment healthchecks are not continuous production monitoring

Deploy from a checked-in Dockerfile so the production runtime is reproducible and portable.

## 4. Application structure

Use one repository and one deployable application initially. Organize the code around business domains rather than technical layers.

```text
src/modules/
  identity/
  organizations/
  properties/
  engagement/
  offerings/
  investments/
  ownership/
  bookings/
  maintenance/
  financial-updates/
  documents/
  notifications/
  audit/
```

Each module owns its application services, validation, authorization rules, persistence code, and tests. Modules may interact only through explicit interfaces. Extract a service only when independent scale, reliability, compliance, or team ownership creates a demonstrated need.

Do not begin with microservices, Kubernetes, GraphQL, or event sourcing.

## 5. Backend and database

Supabase PostgreSQL is the canonical transactional database. The Railway application is the trusted business-logic layer.

### Access model

- Sensitive writes go through authenticated Railway server code.
- The server performs explicit authorization before mutations.
- PostgreSQL transactions enforce multi-step consistency.
- Row-level security provides defense in depth.
- Browser access is limited to deliberately exposed operations protected by restrictive grants and RLS.
- Supabase secret/service credentials exist only in trusted Railway services and CI environments.

### Proposed database domains

- `public` — carefully exposed records protected by RLS
- `core` — platform and operational records
- `finance` — transaction, investment, ownership, and statement metadata
- `audit` — append-only audit records
- `private` — sensitive user and verification metadata

Exact PostgreSQL schema boundaries will be validated during domain modeling.

### Core entities

- Users and profiles
- Organizations and legal entities
- Organization memberships
- Properties and property memberships
- Prospects and property interests
- Offerings and offering documents
- Investment applications and external transaction references
- Ownership interests and effective dates
- Usage entitlements
- Reservations and stays
- Maintenance requests, work orders, and vendors
- Financial updates and private documents
- Events, notifications, and audit events

Marketing concepts must remain distinct from legally authoritative transaction and ownership records.

## 6. Authentication and authorization

### Authentication requirements

- Require a valid invitation before granting protected account access, regardless of authentication method. Publicly published property pages require neither an account nor an invitation.
- Support Google sign-in and email/password registration and sign-in.
- Use Supabase Auth's authorization-code flow with PKCE for Google OAuth.
- Request only OpenID, email, and basic profile scopes during Google sign-in.
- Do not request Gmail, Drive, or Calendar permissions as part of authentication.
- Require a verified email address.
- Use secure, HTTP-only session cookies in the web application.
- Configure a branded authentication domain when practical.
- Add MFA before sensitive investor, owner, finance, or administrative operations.
- Support email verification, password reset, and account recovery, including loss of access to a Google account.
- Use expiring, single-use invitations with staff resend/revocation and audited acceptance.
- Require proof of account control for credential linking; a matching email string alone must not transfer access.
- Reconcile invitation, sign-in, and purchase-email differences through an authorized process.

### Authorization requirements

Authentication establishes control of an identity; it does not establish ownership, investor eligibility, property access, or authority to represent a legal entity. Staff-confirmed application records establish access.

Platform permissions are derived from current application records, including:

- Organization memberships
- Property memberships
- Staff roles
- Ownership interests
- Offering participation
- Vendor assignments

Do not treat email-domain membership or Google claims as authorization. Do not place the entire permission model in JWT claims because those claims can become stale.

## 7. Private files and documents

Use Supabase Storage for private uploads and downloads with RLS-backed access controls.

Separate buckets or paths should distinguish:

- Public property media
- Prospective-investor documents
- Executed ownership documents
- Owner financial statements
- Maintenance attachments
- Internal operational files

Important documents require application metadata, versioning, access history, retention rules, and an external backup strategy. Supabase database backups do not include Storage objects.

## 8. Booking and usage allocation

PostgreSQL must be the authority for reservation conflicts and usage consumption.

Release one supports eligible owners booking home properties with immediate confirmation when the approved policy permits. Booking policies are unresolved; historical numerical examples are not defaults. Live booking requires an approved property-specific policy. Cross-property exchange is deferred.

A booking operation should:

1. Confirm the user's property access.
2. Confirm an active usage entitlement.
3. Evaluate booking window, peak period, rotation, and cancellation policies.
4. Create the reservation inside a database transaction.
5. Enforce non-overlap with database constraints or transactional locking.
6. Record entitlement consumption and an audit event atomically.
7. Enqueue notifications only after the transaction succeeds.

Usage policy belongs in versioned configuration records, not scattered application conditionals. This permits different properties and ownership products to apply different rules over time.

## 9. Background processing

Use a durable Postgres-backed queue and a separately deployed Railway worker for:

- Transactional emails and reminders
- External webhook processing
- Investment-status synchronization
- Document generation
- Financial-statement distribution
- Booking reminders and waitlists
- Maintenance escalation
- CRM or content synchronization

Every job must be idempotent, retryable, traceable, and safe to process more than once. Repeated failures enter a dead-letter state and create an operational alert.

Use cron only for approximate housekeeping and reconciliation. Time-critical business actions should use durable queued jobs and explicit due timestamps.

## 10. Financial and regulated integrations

Buy In takes place in a separate partner-led experience. Release one supports handoff links and manually verified access activation, not financial transaction processing. Any later integration should synchronize only the workflow state and references needed to operate the platform.

Specialized vendors should handle applicable functions such as:

- Investor accreditation
- KYC, AML, and sanctions screening
- Subscription agreements and e-signatures
- Escrow
- ACH and wire processing
- Cap table or authoritative ownership ledger
- Tax-document production

Land Club stores external identifiers, workflow state, timestamps, acknowledgements, and audit records necessary to operate the product. It should avoid storing bank credentials, identity documents, or other sensitive information when a qualified provider can retain them.

Ordinary commerce payments—events, service fees, or potentially refundable reservations—must remain logically and financially separate from investment transactions.

## 11. Security baseline

- Separate local, preview, staging, and production environments.
- Use different Supabase projects for production and non-production.
- Store secrets only in approved secret stores.
- Never expose Supabase secret/service keys to the browser.
- Public property rendering must use an explicitly approved publication projection. Exclude restricted fields and files from anonymous responses, metadata, previews, and public caches; authorize member-specific data separately.
- Enable RLS on every browser-reachable table, view, and storage path.
- Review every privileged database function.
- Require authorization tests for property isolation and staff privileges.
- Record sensitive reads and all consequential mutations in an audit trail.
- Encrypt traffic and provider-managed storage.
- Redact PII and secrets from logs and monitoring.
- Rate-limit authentication, invitations, forms, uploads, and transactional endpoints.
- Scan dependencies and container images in CI.
- Establish database and file restoration drills.

## 12. Delivery and operations

### Environments

- Local development with Supabase local tooling where practical
- Railway preview environment for pull requests or feature review
- Railway staging connected to a non-production Supabase project
- Railway production connected only to production Supabase

### CI quality gates

- Formatting
- Linting
- Type checking
- Unit tests
- Database migration validation
- Authorization and integration tests
- Accessibility checks
- End-to-end tests for critical journeys
- Dependency and secret scanning
- Production build verification

### Observability

- Structured server and worker logs
- Error and performance monitoring through Sentry
- Independent uptime monitoring
- Web-vitals monitoring
- Failed-job and webhook alerts
- Authentication and authorization anomaly alerts
- Correlation IDs spanning requests, jobs, and webhooks

## 13. Testing strategy

- **Unit tests:** business policies, allocation calculations, permission decisions, validation
- **Database tests:** constraints, transactions, RLS policies, migrations
- **Integration tests:** Google and email/password sessions, invitation enforcement, verification/recovery, server actions/API routes, Storage access, and vendor webhooks when implemented
- **End-to-end tests:** invited prospect/owner onboarding, manual owner activation, document access, booking, cancellation, maintenance requests, event registration, and staff administration
- **Security tests:** cross-property isolation, privilege escalation, replayed webhooks, signed-file expiry

Money movement, ownership changes, booking allocation, and financial-document access require stronger automated coverage than ordinary content views.

## 14. Initial implementation sequence

### Foundation

1. Scaffold the Next.js/TypeScript modular monolith.
2. Create Railway staging and production projects.
3. Create separate Supabase development/staging and production projects.
4. Implement invitation-only Google and email/password authentication, verification/recovery, and server-side session handling.
5. Establish migrations, database typing, RLS conventions, and audit infrastructure.
6. Add CI, healthchecks, error monitoring, and uptime monitoring.

### Phased first release

1. Invitations, accounts, profiles, memberships, manual owner activation, staff administration, and audit infrastructure.
2. Detailed public-capable property pages and publication controls, member dashboards, private documents/financial statements, upcoming properties, interest/follows, announcements, and transactional email. Public property-page work may proceed alongside the account foundation.
3. Home-property bookings, policy/entitlement enforcement, cancellations, operational date blocks, and stay instructions. Live reservations require approved booking rules.
4. Maintenance intake and resolution, event registration, reminders, and staff work queues.
5. Security/accessibility validation, operational readiness, restoration checks, and pilot fixes.

See PRD.md for proposed phase exit criteria. Automated financial-provider synchronization, cross-property exchange, formal governance, and dedicated investor reporting are subsequent capabilities, not first-release requirements.

## 15. Deferred decisions

- Transaction, KYC/AML, accreditation, escrow, and e-signature vendors
- Exact email provider
- Exact analytics provider and consent model
- Whether a dedicated CRM is needed at launch
- Booking policies and allocation rules
- Financial accounting/reporting source system
- Governance and voting requirements
- Mobile application strategy
- Realtime features beyond targeted notifications
- Dedicated search infrastructure

## 16. Architecture decision

Proceed with:

> A Next.js and TypeScript modular monolith hosted on Railway, backed by Supabase PostgreSQL, invitation-only accounts through Supabase Auth with Google or email/password, and Supabase Storage. Sensitive operations execute through server-controlled workflows; PostgreSQL RLS provides defense in depth; asynchronous work runs through a durable queue and Railway worker.

Reconsider this architecture only when measured scale, regulatory requirements, reliability isolation, or organizational ownership creates a concrete need.

## References

- [Railway build and deployment](https://docs.railway.com/build-deploy)
- [Railway healthchecks](https://docs.railway.com/deployments/healthchecks)
- [Railway workers, cron jobs, and queues](https://docs.railway.com/guides/cron-workers-queues)
- [Supabase database](https://supabase.com/docs/guides/database/overview)
- [Supabase Google authentication](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Supabase data security](https://supabase.com/docs/guides/database/secure-data)
- [Supabase Storage access control](https://supabase.com/docs/guides/storage/security/access-control)
- [Supabase Queues](https://supabase.com/docs/guides/queues/quickstart)

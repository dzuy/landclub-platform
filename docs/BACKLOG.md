# Land Club Platform — Backlog

Last updated: 2026-09-23

## Current implementation backlog

These are the next requested product tasks, in the order listed. Statuses are recorded per item; recording an item does not start implementation. The technical planning backlog below is retained as background and has not been re-audited against the current build.

### APP-001 — Match the property page schema to Notion

**Status:** Implemented locally; source-content reconciliation remains before publication

[Approved decisions and initial import results](PROPERTY-SCHEMA-DECISIONS.md). The local database now holds the initial Notion import; existing public snapshots remain unchanged.

**Related planning:** STACK-021 — Define the canonical property schema

Compare the current property model, staff editor, and public property page with the schema in Notion. Start with the [Property Discovery Interface — Build Prompt](https://app.notion.com/p/3ded020ec9d481c7ade2cba16e9b867f) and its referenced property schema; confirm the authoritative schema before implementation.

**Acceptance criteria**

- [x] Document the field mapping, missing fields, types, required values, and public versus private visibility.
- [x] Align storage, validation, the staff editor, and property page rendering with the agreed schema.
- [ ] Migrate existing property content without losing edits and verify a complete property through editing and publication.

### APP-002 — Build invitation-based account creation

**Status:** To do

Let authorized staff invite a person to create a Land Club account. Keep public self-registration disabled, as requested on September 23, 2026.

**Acceptance criteria**

- [ ] Staff can send invitations and see pending, accepted, expired, and revoked states, with resend and revoke actions.
- [ ] Recipients can securely accept an invitation, establish credentials, and sign in; expired, revoked, and reused invitations are handled clearly.
- [ ] Ordinary invitations do not grant staff privileges or property access; any access assignment requires explicit authorization.
- [ ] Verify invitation delivery, acceptance, sign-in/sign-out, and access boundaries end to end.

### APP-003 — Remove demo content

**Status:** To do

**Dependency:** Verified replacement content or designed empty states

Remove invented properties, buyer details, sample member identities, ownership, stays, documents, events, and operational records from the live product. Until this task is implemented, retain the current demo labels.

**Acceptance criteria**

- [ ] Inventory seeded database content and hard-coded dashboard samples; distinguish them from real staff edits and account records.
- [ ] Replace samples with verified content or useful empty states, and remove preview-only actions and obsolete demo labels.
- [ ] Disable production demo seeding so later deployments cannot restore removed samples; retain isolated test fixtures where needed.
- [ ] Back up and review affected records before removing demo database content; preserve real content and verify public and authenticated pages after cleanup.

---

## Earlier technical planning

## Purpose

Plan and document the technology stack for the Land Club platform before committing to implementation choices that would constrain later product layers.

## Two-product boundary

Land Club should be treated as two adjacent products with different delivery needs:

### 1. Marketing website

The public brand and acquisition surface. It may be built in Lovable, remain on Squarespace, or move between comparable site-building tools. Its responsibilities are editorial storytelling, public property discovery, events, SEO, and conversion into a lead or platform action.

The marketing website is **not the primary scope of this backlog**. Its implementation stack should remain independently replaceable.

### 2. Land Club platform

The durable application and system of record for authenticated workflows. Its responsibilities grow from engagement and account creation into investor/owner transactions, ownership records, bookings, maintenance, financial updates, governance, and property operations.

This backlog is primarily for the **platform**. Marketing-site work appears only where a shared contract, integration, identity handoff, or data boundary must be decided.

The platform is expected to support four progressively deeper user journeys:

1. **Discover** — public property discovery, editorial property pages, maps, galleries, events, and lead capture.
2. **Engage** — accounts, property following, event registration, requests for access, and expressions of interest or deposits.
3. **Buy In** — investor qualification, disclosures, documents, payments, ownership allocation, closing, and onboarding.
4. **Manage** — owner access, property booking, maintenance requests, operational updates, financial reporting, governance, and communications.

The marketing website primarily serves **Discover**. The platform begins at the point where a visitor becomes a known user and proceeds through **Engage**, **Buy In**, and **Manage**. Some discovery content may also appear inside the platform, but that does not make the marketing site and platform one application.

## Product references

- [Website Redesign](https://app.notion.com/p/3c7d020ec9d480af8f20c3250ec959a8)
- [Property Discovery Interface — Build Prompt](https://app.notion.com/p/3ded020ec9d481c7ade2cba16e9b867f)
- [Land Club Overview](https://app.notion.com/p/3a6d020ec9d480c8b04ed3fb247a4fe2)
- [Projects database](https://app.notion.com/p/3a5d020ec9d4805a83daef950ed51495)

## Working principles

- Treat Norden Cross as the first property, not as a one-off data model.
- Keep the marketing website deployable and replaceable independently from the platform.
- Integrate the two products through explicit APIs, links, events, and identity handoffs rather than shared implementation assumptions.
- Keep public content, transactional records, and owner-operational records logically separate.
- Do not use Notion as the system of record for money, identity, ownership, legal acknowledgements, bookings, or financial reporting.
- Prefer managed services until scale, compliance, or economics justify custom infrastructure.
- Make important choices through short written architecture decision records (ADRs).
- Keep legal and compliance rules configurable; do not hard-code unsettled ownership structures.
- Minimize sensitive data collection in v1.

## Priority definitions

- **P0** — required before selecting or scaffolding the core stack.
- **P1** — required for the Discover/Engage v1 foundation.
- **P2** — design now; implement when Buy In or Manage enters scope.
- **P3** — later optimization or expansion.

## Definition of done for a stack decision

A technology decision is complete when:

- [ ] Requirements and constraints are written down.
- [ ] At least two credible options are compared.
- [ ] Security, privacy, compliance, operating cost, and vendor-lock-in implications are considered.
- [ ] The choice is tested with a small proof of concept when uncertainty is material.
- [ ] The decision and rationale are captured in an ADR.
- [ ] The decision identifies a migration or exit path.
- [ ] The decision is mapped to the product layers it supports.

---

## Epic 0 — Clarify product and platform boundaries

### STACK-001 — Define v1 system boundaries

**Priority:** P0  
**Status:** Ready

Document exactly which capabilities belong to the marketing website, which belong to the first platform release, and which are only future architectural considerations.

**Acceptance criteria**

- [ ] Marketing-site capabilities are listed separately from platform capabilities.
- [ ] The exact event that moves a visitor from the marketing site into the platform is defined.
- [ ] Discover capabilities retained inside the platform are explicitly identified.
- [ ] Engage capabilities are listed as in scope or out of scope for the first platform release.
- [ ] Buy In and Manage are explicitly deferred unless individually approved.
- [ ] The marketing site's primary conversion action and platform destination are selected.
- [ ] Public, authenticated, and staff-only surfaces are identified.

### STACK-005 — Define the marketing-site/platform contract

**Priority:** P0  
**Status:** Ready

Define the stable boundary that lets Squarespace, Lovable, or another marketing implementation connect to the platform without controlling its architecture.

**Acceptance criteria**

- [ ] Canonical domains and subdomains are proposed.
- [ ] Cross-product navigation and return paths are defined.
- [ ] Lead, event, property-interest, and account-creation handoffs are documented.
- [ ] Shared identifiers for properties, campaigns, and referral sources are defined.
- [ ] Authentication and session behavior across domains is decided.
- [ ] Analytics attribution survives the handoff with appropriate consent.
- [ ] Failure behavior is defined when either product is unavailable.
- [ ] No platform secrets or privileged APIs are exposed to the marketing builder.

### STACK-002 — Map user roles and trust boundaries

**Priority:** P0  
**Status:** Ready

Define anticipated roles before choosing authentication and authorization technology.

Candidate roles include anonymous visitor, lead, prospective investor, verified investor, owner, property guest, property manager, maintenance vendor, finance user, content editor, and platform administrator.

**Acceptance criteria**

- [ ] Each role has a concise capability list.
- [ ] Cross-property versus property-specific access is defined.
- [ ] Staff impersonation and support-access requirements are decided.
- [ ] Sensitive actions requiring step-up authentication are identified.
- [ ] A first-pass permissions matrix exists.

### STACK-003 — Classify platform data

**Priority:** P0  
**Status:** Ready

Create a data classification covering public marketing content, leads, identity, investment records, ownership records, payment metadata, bookings, maintenance, financial documents, messages, and audit logs.

**Acceptance criteria**

- [ ] Every major domain is assigned a sensitivity level.
- [ ] Retention and deletion expectations are documented.
- [ ] Systems of record are identified or marked TBD.
- [ ] Data that must never live in Notion is identified.
- [ ] Regulatory and contractual review needs are flagged.

### STACK-004 — Confirm compliance assumptions

**Priority:** P0  
**Status:** Blocked by legal/business input

Clarify the legal shape of investment and ownership flows before evaluating vendors.

**Questions**

- Is the first offering governed by Rule 506(c), another exemption, or a non-security structure?
- Which party performs accreditation, KYC, AML, sanctions screening, escrow, custody, and tax reporting?
- Will Land Club process investments directly or hand users to a regulated platform?
- What records must be immutable and retained?
- Which jurisdictions must v1 and the first transaction support?

**Acceptance criteria**

- [ ] Counsel or the responsible business owner answers the questions above.
- [ ] Compliance functions assigned to external vendors are identified.
- [ ] Technical requirements derived from the answers are documented.

---

## Epic 1 — Choose the application architecture

### STACK-010 — Decide repository and application topology

**Priority:** P0  
**Status:** Ready

Compare a single full-stack platform application, a modular monolith, and separately deployed platform web/API services. The marketing website is assumed to be a separate deployment and is not part of this topology decision.

**Evaluation criteria**

- Speed to deliver the first authenticated platform workflow
- Ability to add authenticated owner and staff applications
- Shared types and design system
- Deployment and operational complexity
- Team size and expected contributors
- Testability and domain isolation

**Expected output:** ADR selecting repository structure and application boundaries.

### STACK-011 — Select the frontend framework

**Priority:** P0  
**Status:** Blocked by STACK-010

Evaluate at least two production-ready application frameworks for the authenticated platform against:

- Account, dashboard, form, table, document, and calendar workflows
- Accessibility and responsive application behavior
- Secure server rendering where useful
- Authenticated application areas
- Form handling and validation
- Hosting portability
- Component ecosystem
- Team familiarity

**Acceptance criteria**

- [ ] An authenticated property dashboard proof of concept renders server-side.
- [ ] A representative data-heavy owner workflow is demonstrated.
- [ ] Routing for public, authenticated, and administrative areas is demonstrated.
- [ ] The choice is recorded in an ADR.

### STACK-012 — Choose backend architecture and API style

**Priority:** P0  
**Status:** Blocked by STACK-010

Compare framework-native server functions, a dedicated API, and a backend-as-a-service approach. Decide whether internal contracts use REST, typed RPC, GraphQL, or a hybrid.

**Acceptance criteria**

- [ ] Domain boundaries are proposed for identity, properties, engagement, transactions, ownership, bookings, maintenance, and reporting.
- [ ] Authorization is enforced server-side in the proposed model.
- [ ] Background work and webhook handling are supported.
- [ ] API versioning and external-integration needs are addressed.
- [ ] The choice is recorded in an ADR.

### STACK-013 — Decide monolith-to-services thresholds

**Priority:** P1  
**Status:** Blocked by STACK-012

Define measurable conditions that would justify extracting services later, such as independent scaling, stricter compliance boundaries, reliability isolation, or separate vendor ownership.

---

## Epic 2 — Shared property data and marketing integration

### STACK-020 — Decide the content-management model

**Priority:** P0  
**Status:** Ready

Determine what property information is mastered by the platform versus the marketing editorial system. Then compare:

1. Notion or the marketing-site CMS as an editorial source synchronized into the platform
2. A shared headless CMS consumed by both products
3. A platform-owned property catalog exposed selectively to the marketing site
4. A staged hybrid approach

**Acceptance criteria**

- [ ] Editorial workflow and responsible editors are identified.
- [ ] Draft, review, preview, publish, and rollback behavior is defined.
- [ ] Property content can be validated against a reusable schema.
- [ ] Neither product requires live Notion availability to serve production traffic.
- [ ] The marketing website cannot mutate ownership, transaction, booking, or operations data.
- [ ] Assets, image rights, and transformations are addressed.
- [ ] A migration path exists if Notion is used initially.

### STACK-021 — Define the canonical property schema

**Priority:** P0  
**Status:** Ready

Model reusable property content including identity, location, region, status, hero media, gallery, specifications, ownership summary, shares, pricing display, Now, Next, development phases, inspiration, amenities, flora/fauna hooks, events, and calls to action.

**Acceptance criteria**

- [ ] Norden Cross fits without property-specific fields.
- [ ] Blank-canvas and mostly-built properties both fit.
- [ ] Vertical phased development and regional/open-ended growth both fit.
- [ ] Current facts, plans, and inspiration are distinguishable.
- [ ] Publish-time validation catches incomplete or contradictory content.

### STACK-022 — Define media ownership and delivery boundaries

**Priority:** P1  
**Status:** Blocked by STACK-020

Determine whether marketing owns public editorial media while the platform owns private operational files, then evaluate object storage, image transformation, CDN, video hosting, metadata, and rights/attribution needs for the platform side.

**Acceptance criteria**

- [ ] Responsive images and modern formats are generated automatically.
- [ ] Original assets are retained separately from delivery variants.
- [ ] Private owner documents cannot leak through the public asset path.
- [ ] Upload and editorial workflows are demonstrated.

### STACK-023 — Select platform mapping and geospatial services

**Priority:** P1  
**Status:** Ready

Evaluate providers for platform workflows such as exact owner-visible locations, nearby services, access instructions, maintenance context, and future portfolio operations. Public storytelling maps may remain a marketing-site concern.

**Acceptance criteria**

- [ ] Pins, approximate regions, and intentionally obscured locations are supported.
- [ ] Accessibility and mobile behavior are tested.
- [ ] Usage pricing is modeled for expected traffic.
- [ ] Geographic data ownership and export are understood.

### STACK-024 — Define property catalog and search integration

**Priority:** P2  
**Status:** Ready

Decide which property catalog fields the marketing site can read, which authenticated discovery capabilities belong in the platform, and what usage threshold would justify a dedicated search service, recommendations, saved searches, or geospatial queries.

---

## Epic 3 — Data platform

### STACK-030 — Select the primary transactional database

**Priority:** P0  
**Status:** Blocked by STACK-003 and STACK-012

Evaluate managed relational database options, with particular attention to transactional integrity, row-level authorization, geographic support, backups, point-in-time recovery, regional availability, and portability.

**Acceptance criteria**

- [ ] Core domains and representative relations are modeled.
- [ ] Multi-property access rules can be enforced.
- [ ] Booking-conflict prevention is proven transactionally.
- [ ] Backup, recovery, encryption, and export capabilities are verified.
- [ ] The choice is recorded in an ADR.

### STACK-031 — Draft the platform domain model

**Priority:** P0  
**Status:** Blocked by STACK-002 and STACK-003

Include users, organizations, households, properties, legal entities, offerings, interests, investments, ownership interests, stays, booking entitlements, reservations, maintenance requests, vendors, documents, financial updates, events, notifications, and audit events.

**Acceptance criteria**

- [ ] Marketing concepts are separated from legal/financial records.
- [ ] A user can have different roles across properties.
- [ ] Ownership is time-aware and auditable.
- [ ] Booking entitlement is separate from a booking.
- [ ] Personally identifiable information is minimized.
- [ ] Unsettled business rules remain configurable.

### STACK-032 — Define audit and event history strategy

**Priority:** P1  
**Status:** Blocked by STACK-031

Determine which actions require immutable audit history and whether an append-only event log, database audit tables, or a managed audit product is appropriate.

### STACK-033 — Define cache and session strategy

**Priority:** P1  
**Status:** Blocked by STACK-011 and STACK-012

Decide what can be cached publicly, what must be user-specific, and whether a separate cache/session service is needed in v1.

---

## Epic 4 — Identity, authorization, and security

### STACK-040 — Select identity provider

**Priority:** P1  
**Status:** Blocked by STACK-002

Evaluate managed authentication providers for passwordless login, social login if desired, MFA, organization membership, invitations, account recovery, audit events, and future identity verification handoff.

**Acceptance criteria**

- [ ] Visitor-to-lead-to-owner account progression is supported.
- [ ] MFA can be required for sensitive roles and actions.
- [ ] Accounts can belong to multiple properties and legal entities.
- [ ] Identity data can be exported or migrated.
- [ ] Authorization remains controlled by Land Club application data.

### STACK-041 — Design authorization model

**Priority:** P1  
**Status:** Blocked by STACK-002, STACK-030, and STACK-040

Choose RBAC, relationship-based access control, or a hybrid. Prototype at least property-scoped owner, manager, vendor, finance, editor, and admin permissions.

### STACK-042 — Establish security baseline

**Priority:** P1  
**Status:** Ready

Define secrets management, encryption, dependency scanning, branch protection, vulnerability response, environment isolation, logging redaction, secure headers, rate limiting, abuse prevention, and backup testing.

### STACK-043 — Complete threat modeling

**Priority:** P1  
**Status:** Blocked by initial architecture proposal

Threat-model public forms, authentication, document access, payments, booking manipulation, maintenance uploads, staff access, and webhook processing.

### STACK-044 — Define privacy and consent implementation

**Priority:** P1  
**Status:** Blocked by STACK-003

Specify cookie usage, analytics consent, marketing consent, privacy requests, retention, deletion, and user-data export.

---

## Epic 5 — Engagement and communications

### STACK-050 — Select lead capture and CRM integration

**Priority:** P1  
**Status:** Ready

Decide where inquiries, property follows, early-access requests, event interest, and “got land” submissions are stored and how they synchronize with a CRM.

### STACK-051 — Select transactional email and notification services

**Priority:** P1  
**Status:** Ready

Plan email delivery, templates, preference management, suppression, deliverability monitoring, and future SMS/push needs.

### STACK-052 — Define notification architecture

**Priority:** P2  
**Status:** Blocked by STACK-031

Model event-driven notifications for property updates, investment milestones, booking changes, maintenance updates, financial reports, and governance actions.

---

## Epic 6 — Investment and ownership stack

### STACK-060 — Decide build-versus-integrate strategy for investments

**Priority:** P2  
**Status:** Blocked by STACK-004

Compare regulated investment-platform integration with building individual capabilities from specialized vendors.

Consider accreditation, KYC/AML, sanctions screening, e-signatures, subscriptions, escrow, ACH/wires, cap table or ownership ledger, tax documents, and investor reporting.

**Acceptance criteria**

- [ ] Regulated responsibilities are assigned explicitly.
- [ ] Land Club never handles sensitive financial data unnecessarily.
- [ ] Vendor APIs, webhooks, sandbox environments, and data export are evaluated.
- [ ] Manual operational fallback is documented.
- [ ] Legal approval is recorded before implementation.

### STACK-061 — Select general payments architecture

**Priority:** P2  
**Status:** Blocked by STACK-004 and STACK-060

Separate ordinary commerce payments—events, deposits, fees—from securities or ownership transactions. Decide whether they require different providers and ledgers.

### STACK-062 — Define document and e-signature architecture

**Priority:** P2  
**Status:** Blocked by STACK-003 and STACK-004

Cover document generation, versioning, acknowledgement, signatures, access control, retention, and tamper-evident audit history.

### STACK-063 — Define ownership ledger boundaries

**Priority:** P2  
**Status:** Blocked by STACK-004 and STACK-031

Identify the authoritative record for ownership, transfers, effective dates, entities, beneficial owners, usage entitlements, and reporting.

---

## Epic 7 — Owner and property operations stack

### STACK-070 — Model booking and usage allocation

**Priority:** P2  
**Status:** Blocked by ownership-policy decisions

Document booking windows, allocation methods, peak periods, rotation, holds, cancellations, guests, waitlists, conflicts, staff overrides, and cross-property privileges.

**Acceptance criteria**

- [ ] Policy is represented as configurable rules rather than application constants.
- [ ] Concurrent booking requests cannot create conflicts.
- [ ] Every override is auditable.
- [ ] Calendar export and timezone behavior are specified.

### STACK-071 — Decide calendar and booking integrations

**Priority:** P2  
**Status:** Blocked by STACK-070

Evaluate building the booking engine versus integrating property-management or scheduling software. Include iCalendar interoperability and staff workflows.

### STACK-072 — Design maintenance request workflow

**Priority:** P2  
**Status:** Blocked by STACK-031 and STACK-041

Model request intake, severity, attachments, property access, assignment, vendor communication, estimates, approvals, status changes, completion evidence, and owner visibility.

### STACK-073 — Define financial update delivery

**Priority:** P2  
**Status:** Blocked by finance requirements

Decide whether v1 management reporting distributes immutable statements and updates or integrates with an accounting/investor-reporting system. Avoid recreating accounting software.

### STACK-074 — Define owner communications and governance

**Priority:** P2  
**Status:** Blocked by governance-policy decisions

Plan announcements, discussions, polls, formal votes, consent thresholds, meeting materials, and durable decision records.

### STACK-075 — Evaluate property-operations integrations

**Priority:** P3  
**Status:** Backlog

Explore smart locks, access codes, cleaning schedules, vendor systems, property-management systems, utility monitoring, and incident management only after operating workflows are established.

---

## Epic 8 — Infrastructure, delivery, and operations

### STACK-080 — Select hosting and deployment platform

**Priority:** P0  
**Status:** Blocked by STACK-010 through STACK-012

Evaluate preview deployments, environments, regions, CDN, server/runtime constraints, background jobs, logs, rollback, cost, and portability.

### STACK-081 — Design environment and configuration strategy

**Priority:** P1  
**Status:** Blocked by STACK-080

Define local, preview, staging, and production environments; secret separation; seeded test data; migration promotion; and access controls.

### STACK-082 — Establish CI/CD and quality gates

**Priority:** P1  
**Status:** Blocked by initial repository scaffolding

Include formatting, linting, type checking, unit tests, integration tests, accessibility checks, dependency checks, database migration validation, preview deployments, and controlled production promotion.

### STACK-083 — Select observability stack

**Priority:** P1  
**Status:** Ready

Cover application errors, structured logs, traces, web vitals, uptime, background jobs, webhook failures, security events, alerts, and sensitive-data redaction.

### STACK-084 — Define backup and disaster-recovery targets

**Priority:** P1  
**Status:** Blocked by data and hosting choices

Set recovery point and recovery time objectives per domain, then prove restoration in a non-production environment.

### STACK-085 — Model platform costs

**Priority:** P1  
**Status:** Blocked by candidate stack shortlist

Estimate monthly costs at prototype, first-property launch, ten properties, and an agreed growth scenario. Include base fees, traffic, storage, media delivery, maps, email, auth, database, logs, and support tiers.

---

## Epic 9 — Analytics, experimentation, and reporting

### STACK-090 — Define product analytics requirements

**Priority:** P1  
**Status:** Ready

Define the cross-product funnel: marketing referral, platform entry, account creation, qualification, property follow, request for access, transaction start, transaction completion, owner activation, booking, and ongoing owner engagement.

### STACK-091 — Select analytics tooling

**Priority:** P1  
**Status:** Blocked by STACK-044 and STACK-090

Evaluate privacy, consent, session replay, warehouse export, event governance, cost, and staff usability.

### STACK-092 — Define operational and financial reporting architecture

**Priority:** P2  
**Status:** Blocked by source-system choices

Identify metrics that come from transactional systems versus analytics pipelines. Do not use analytics data as the legal or financial system of record.

---

## Epic 10 — Developer experience and governance

### STACK-100 — Establish ADR process

**Priority:** P0  
**Status:** Ready

Create a lightweight ADR template with context, options, decision, rationale, consequences, security/compliance considerations, and reconsideration triggers.

### STACK-101 — Define coding and architecture standards

**Priority:** P1  
**Status:** Blocked by language/framework choice

Cover project structure, domain boundaries, API conventions, validation, error handling, migrations, testing, observability, accessibility, and documentation.

### STACK-102 — Define testing strategy by product layer

**Priority:** P1  
**Status:** Ready

Set proportionate expectations for public content, authentication, permissions, money movement, ownership, bookings, maintenance, and financial-document access.

### STACK-103 — Define dependency and vendor review cadence

**Priority:** P1  
**Status:** Ready

Track vendor ownership, data held, permissions, costs, service-level commitments, security posture, renewal dates, and exit plans.

---

## Recommended first planning sprint

Complete these in order before scaffolding the production application:

1. STACK-001 — Define v1 system boundaries
2. STACK-002 — Map user roles and trust boundaries
3. STACK-003 — Classify platform data
4. STACK-004 — Confirm compliance assumptions
5. STACK-005 — Define the marketing-site/platform contract
6. STACK-021 — Define the canonical property schema
7. STACK-010 — Decide repository and application topology
8. STACK-011 — Select the platform frontend framework
9. STACK-012 — Choose backend architecture and API style
10. STACK-030 — Select the primary transactional database
11. STACK-040 — Select the identity provider
12. STACK-080 — Select hosting and deployment platform

## Planning sprint exit criteria

- [ ] Twelve items above are decided or explicitly blocked with an owner.
- [ ] Architecture diagram separates the marketing website from the platform and covers Engage, Buy In, and Manage.
- [ ] The marketing site can be replaced without migrating the platform.
- [ ] Canonical property schema supports Norden Cross and at least one contrasting property type.
- [ ] A thin vertical prototype proves content delivery, property rendering, authentication boundaries, database access, and deployment.
- [ ] Security and compliance risks have named owners.
- [ ] Estimated operating costs exist for at least three scale scenarios.
- [ ] The implementation backlog can be created without reopening foundational stack decisions.

## Open decisions inherited from the product specification

- What marketing action hands a visitor into the platform: follow, request information, request access, reserve, or account creation?
- Which ownership and investment information is public versus gated?
- Is Notion an editorial source, an internal reference, or both?
- Which properties have enough verified material for v1?
- What terms describe owned, affiliated, scouting, and future properties?
- Which financial statements or updates will owners receive, and from which authoritative system?
- How are owner usage rights allocated and changed over time?
- Which transaction and identity-verification responsibilities belong to regulated vendors?

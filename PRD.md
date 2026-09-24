# Land Club Platform — Product Requirements

**Status:** Discussion draft v0.2  
**Updated:** September 21, 2026  
**Product:** Public property pages and authenticated platform at `app.land.club`  
**Audience:** Product, design, engineering, and the Land Club operations team

## 1. Purpose

Give visitors detailed, well-designed property pages within the app and give invited prospects and owners a clear place to manage their relationship with Land Club. The app supports viewing publicly published property pages without an account. Signed-in prospects can explore opportunities and read permitted materials. Owners can understand their property access, book stays, find documents, receive updates, and get support. A small Land Club team administers the experience.

This PRD defines product behavior. `TECH-STACK.md` defines the implementation architecture. Requirements labeled **confirmed** come from the product discussion. Detailed flows, navigation, acceptance criteria, and phase boundaries below are **proposed** until reviewed. Unresolved business rules are explicitly marked as decisions rather than assigned invented defaults.

## 2. Confirmed decisions

| Decision | Requirement |
|---|---|
| Separate marketing website | Brand storytelling, acquisition, and marketing remain separate. Detailed property pages belong in the app; some Discover activity therefore occurs in the app. |
| Property pages | Provide detailed, polished listing-style information within the app. Support viewing published public pages without signing in; exact public content and publication policy remain to be finalized. |
| Marketing email capture | Creates a marketing contact only. It does not create a platform account or grant access. |
| Registration | Invitation required for prospects, owners, and staff. No public self-registration at launch. |
| Authentication | Support Google sign-in and email/password registration and sign-in. |
| Platform users | Include invited prospects and confirmed owners, with different permissions. |
| Buy In | Separate partner-led experience for investment and ownership transactions. |
| Ownership activation | Land Club staff manually verify and activate property access. No automatic financial-partner integration required for release one. |
| Initial booking scope | Owners book their home property or properties. Eligible bookings receive immediate confirmation. Cross-property exchange is deferred. |
| Booking policies | Unsettled. Determine them during product development; do not adopt historical Notion values as approved requirements. |
| First release | Detailed property pages with public access support, profiles, bookings, documents, upcoming properties, announcements, stay instructions, maintenance requests, and event registration. Deliver in phases. |
| Administration | A small internal Land Club team operates the platform. |

The first-release scope above interprets “build it all, but in phases” as the features discussed in this product session. It does not automatically include every future concept in the technical backlog, such as exchange, formal governance, or investment processing.

## 3. Product boundaries

| Stage | Primary experience | Relationship to this platform |
|---|---|---|
| Discover | Marketing website and app property pages | Marketing introduces the brand and properties, then links to detailed app property pages. Publicly published app pages do not require sign-in. |
| Engage | Marketing communications | Email capture and nurture remain separate. Staff may invite a prospect to the platform. |
| Buy In | Financial partner | Qualification, signing, funding, and closing occur outside this application. The platform may provide an appropriate handoff link. |
| Manage | This platform | Full account creation, profile management, property access, bookings, documents, updates, support, and events. |

The marketing/app boundary is not the same as the public/authenticated boundary. The app has a public property-information surface and a protected account surface. Invitation-only registration applies to the account surface, not to viewing public property pages. Invited prospects can use account features before purchasing.

Staff confirmation, rather than a user claim or redirect from a partner site, activates ownership-related access. The platform stores the references and access records needed to operate the experience; it does not become the authoritative legal ownership ledger merely by recording them.

## 4. Users and permissions

**Anonymous visitor:** Can read publicly published app property pages and their approved public media. Cannot access saved follows, private documents, owner availability, bookings, stay instructions, maintenance, account event registration, or administration. A public page does not confer membership. The signed-in permissions below apply in addition to public viewing.

| Capability | Prospect | Owner | Authorized staff |
|---|---|---|---|
| Manage own profile and preferences | Yes | Yes | Yes |
| View published upcoming properties | Yes, within assigned audience | Yes, within assigned audience | Manage publication |
| Follow properties / express interest | Yes | Yes | View and respond |
| Read prospectuses / offering materials | Explicitly granted access | Explicitly granted access | Publish and grant access |
| View ownership information | No | Own records | Manage within assigned authority |
| Book a property | No | Own active entitlements only | Operate assigned properties |
| See live owner availability | No by default | Eligible home properties | Assigned properties |
| Read financial statements | No by default | Intended recipient/entity only | Separate finance permission |
| View stay instructions | No | According to property/stay access | Maintain instructions |
| Submit maintenance requests | No by default | Accessible properties | Triage and resolve |
| Register for events | Events open to prospects | Events open to owners | Publish and administer |
| Invite users / change permissions | No | No | Separate administrator permission |

Permissions are property- and document-specific. A person can be an owner at one property and a prospect at another. No role gives access to another person’s private records. Staff membership does not automatically include access to every financial document or permission to grant administrative rights.

Guests, household members, external vendors, and dedicated early-investor dashboards are not separate self-service roles in release one. Staff may coordinate those needs manually. Confirm this boundary during review.

## 5. Proposed navigation and landing experience

**Public entry:** A direct property link opens the app's detailed listing page without redirecting to sign-in. It provides a return path to the marketing site and an appropriate sign-in or inquiry action. A public property index/search experience is an open scope decision, not implied by public detail pages.

**Member navigation:** Home, My Properties, Bookings, Documents, Upcoming Properties, Events, Profile & Settings. Public listing information and private owner information share the same property identity, but owner updates, stay guidance, and issue reporting require authorized access. Staff get an additional Administration area.

- **Prospect home:** Relevant opportunities, recently available documents, upcoming eligible events, and a contact path. Explain how to learn more without implying ownership or booking privileges.
- **Owner home:** Upcoming stay, eligible properties, usage summary once policy exists, new documents, important announcements, and unresolved support requests.
- **No property assigned:** Explain the current access status and how to contact Land Club. Do not show a broken dashboard or invented allocation.
- **Mixed roles:** Combine relevant information without requiring separate accounts. Make each property’s access state clear.

Navigation may hide unavailable features, but direct links must independently enforce access. Empty, loading, error, and revoked-access states are part of every feature.

## 6. Functional requirements

### ACCT — Invitations, registration, and recovery

**User outcome:** An invited person can securely create an account and understand their access.

1. Authorized staff select an email, initial role, property/document scope, and send an invitation. Prospect invitations need not have an ownership record.
2. The recipient opens a single-use, expiring invitation and chooses Google or email/password.
3. Email/password users verify their email. Google users must have a verified identity. Neither authentication method bypasses invitation validation.
4. The user completes required profile information and accepts versioned platform terms/privacy disclosures as applicable. Marketing consent is a separate choice.
5. The application activates only the permissions assigned to the valid invitation and routes the user to the appropriate home screen.

**Additional requirements:** Password reset, sign-out, session expiry, recovery after loss of a Google account, and MFA for sensitive staff/financial/permission operations. Determine precise MFA triggers during security design.

**Acceptance criteria:**

- Uninvited users cannot gain protected account access through the UI or direct authentication endpoints. Public property viewing remains available without an invitation.
- Expired, revoked, already-used, and malformed invitations produce distinct recovery guidance without revealing private account information.
- Reissuing an invitation invalidates its previous token. Staff can see pending, accepted, expired, and revoked states.
- A different sign-in email cannot silently claim an invitation. An authorized staff correction or verified recovery process is required.
- An existing member can accept an additional property invitation without a duplicate account.
- Linking Google and password credentials requires proof of account control; matching an email string alone cannot transfer access.
- Repeated requests do not create duplicate memberships. Invitation and permission changes are audited.

### PROF — Profile and preferences

**User outcome:** Members maintain accurate personal information and control optional communications.

Proposed initial fields: preferred/display name, verified account email, optional phone, and notification preferences. Collect address, emergency contact, accessibility needs, or other stay-related information only when a defined operational need exists. Do not require sensitive financial information in a general profile.

**Acceptance criteria:** Users edit only their own profile; account-email changes require verification and preserve ownership links; optional marketing preferences remain separate from essential account and booking messages; members can request account/privacy support. Final retention and deletion behavior must account for records Land Club must retain.

### OWN — Property access and manual owner activation

**User outcome:** The account shows the properties and rights Land Club has verified.

Staff confirm completion using the external transaction record, identify the person or legal entity, record the reference and effective date, and assign property access. An existing prospect account becomes an owner without re-registration. New owners receive an invitation.

**Acceptance criteria:**

- Staff record who authorized activation, when, and the supporting external reference.
- A completed financial investment does not grant booking rights unless the confirmed product includes usage.
- Ownership information, application membership, and booking entitlement are separate records.
- Account-email and purchase-email differences require staff reconciliation.
- Access changes are auditable. Revocation affects subsequent requests, including document access.
- Existing future bookings are flagged for staff resolution when ownership or entitlement changes; they are not silently discarded.
- Staff can suspend access and correct an erroneous assignment without deleting its history.

### DOC — Documents and financial information

**User outcome:** Members find the current documents relevant to them and their properties.

Provide a searchable/filterable document library with property, category, date, and version. Categories include prospectuses/offering materials, executed ownership documents, financial statements, property guidance, and other approved records. Financial information initially consists of published statements and explanatory updates, not a new accounting system.

Staff upload, classify, set audience, preview, publish, supersede, and withdraw documents. Support individual, entity, and property-level audiences as appropriate. Offerings and statements are not visible to all users simply because they share a property.

**Acceptance criteria:** Unauthorized users cannot discover documents through search, previews, direct links, or downloads; access is rechecked when a download is requested; financial statements remain attached to the correct recipient and period; version history preserves previously issued records; sensitive access is logged; publication notifications honor audience permissions. Acknowledgement tracking is added only where a document’s process requires it; document access is not e-signing.

### PAGE — Detailed property pages inside the app

**User outcome:** A visitor can understand a specific property in depth through a polished listing-style page, whether arriving from the marketing site or a shared link. Sign-in is not required for a page explicitly published as public.

**Proposed page content:**

- Property name, concise overview, hero imagery, and an accessible gallery.
- Property facts appropriate to the property type: land area, existing buildings, accommodation details, amenities, and setting. Do not force land-only projects into a completed-home template.
- Location/map at an approved precision, regional context, and nearby activities.
- Current property relationship and availability status, using approved terminology.
- Clearly separated Now, Next, and Inspiration sections, with photos and renderings labeled accurately.
- Approved ownership summary and usage explanation. Public pricing, share availability, detailed costs, and downloadable offering materials require explicit content decisions; this draft does not assume they are public.
- A next action appropriate to the visitor and property's status. Public inquiry/request-invitation behavior remains to be selected; no action silently creates an account or grants access.

**Acceptance criteria:**

- Publicly published pages load directly without a session or invitation, including on mobile and through shared links.
- Draft, withdrawn, and restricted pages are not exposed through direct URLs, search metadata, previews, or public APIs.
- Staff preview and explicitly publish the public field/media set. Publishing a listing does not publish associated private documents or owner records.
- Private financial information, member identities, live owner availability, and entry instructions never appear in anonymous page responses or public caches.
- A signed-in owner's additional data is authorized separately and cannot leak through shared cached pages.
- Public media remain distinct from restricted files. Changes to visibility invalidate public delivery as applicable; staff understand that already viewed public information cannot be made secret retroactively.
- Current facts, proposed development, and aspirational references remain visually distinguishable.
- Sign-in links preserve the intended property destination. Invitation-only registration remains enforced.
- Page title, share preview, and search indexing use only approved public content. Indexability is an explicit publication decision.

### PROP — Upcoming properties and interest

**User outcome:** Prospects and owners see future opportunities and tell Land Club what interests them.

Staff publish a property preview with approved imagery, location detail, current status, current facts, future plans, and an appropriate next action, linked to the app property page where available. Publication audience determines whether a property is public or limited to invited members; not every upcoming property must be public. Signed-in users follow/unfollow and express interest. Staff see and respond to interest. A vetted link may hand off to the separate purchase process when available.

**Acceptance criteria:** Current conditions, plans, and inspiration have distinct labels; unapproved details and drafts remain private; interest submissions receive confirmation and do not reserve a share or create rights; repeated follow actions do not create duplicate subscriptions; scouting/partner-owned properties are not represented as Land Club-owned or bookable.

### BOOK — Home-property reservations

**User outcome:** Owners understand when they may stay, reserve eligible dates, and manage upcoming stays.

Show eligible home properties and, once defined, their reservable units, availability, applicable rules, and the user’s usage position. The user selects dates, reviews the allocation impact and applicable terms, and confirms. Valid requests receive immediate confirmation. The booking appears under upcoming stays and triggers an email.

Support cancellation under the active policy. Staff can block dates for operational reasons, view reservations, and make authorized corrections with a reason. A change to a booking must revalidate availability and entitlement; it cannot temporarily release the original reservation and leave the user stranded if the replacement fails.

**Acceptance criteria independent of the eventual policy:**

- Prospect accounts cannot reserve property time.
- Eligibility, operational blocks, and current policy are checked on the server at confirmation.
- Two concurrent requests cannot reserve the same resource for overlapping dates.
- Reservation creation, usage accounting, and audit recording succeed atomically.
- Failed or repeated submissions never consume usage twice or create duplicate stays.
- A conflict explains that availability changed and allows the user to select other dates.
- Confirmation clearly identifies property/unit, dates, property timezone, status, and the policy applied.
- Cancellation shows its effect before confirmation and preserves an audit record.
- Notifications occur after a successful transaction. Delivery failure does not undo a valid booking.
- Policy changes have versions/effective dates; existing reservations are not silently repriced or invalidated.
- Availability can be shown without revealing other owners’ names or stay details.

**Policy gate:** No live booking for a property until Land Club approves its reservable resource, entitlement model, allocation, booking windows, stay lengths, seasons, cancellation behavior, guest rules, and override authority. Historical examples such as 36 nights, three-night minimums, or particular exchange caps are not approved defaults. Use explicitly labeled fixtures for development and previews.

Cross-property exchange, public rentals, waitlists, and automated holiday drafting are deferred unless separately selected. This does not prevent modeling the interfaces needed to support future allocation policies.

### STAY — Stay preparation and instructions

**User outcome:** Owners know how to prepare for and use their reservation.

Show reservation details, arrival/departure guidance, directions, property rules, amenities, accessibility information where available, local contacts, and checkout instructions. Separate general property guidance from sensitive access instructions. The release needs a deliberate process for releasing and expiring access details; smart-lock integration is not required.

**Acceptance criteria:** Users see only instructions they are permitted to see; sensitive entry details never appear in public property previews; material instruction changes can notify affected guests/owners; property timezone is consistent; the interface explains where to seek urgent assistance.

### COMM — Announcements and notifications

**User outcome:** Members receive timely updates relevant to their relationship with Land Club.

Support property development updates, operational announcements, newly published documents, invitation/account messages, booking confirmations and changes, maintenance responses, and event reminders. Staff choose audience and publication state. Provide email plus an in-platform list of relevant updates; real-time chat, SMS, and push are not required.

**Acceptance criteria:** Preview recipient scope before publishing; never expose owner-only updates to prospects; distinguish required operational messages from optional marketing; track failed email delivery for staff follow-up; retries do not duplicate business actions. Communications use a durable delivery mechanism.

### MAINT — Maintenance and support

**User outcome:** Owners report property problems and see that someone is handling them.

Owners choose an accessible property, describe the issue, optionally attach photos, and submit. A proposed lifecycle is New, Acknowledged, In Progress, Resolved, and Closed. Staff triage urgency, assign an internal responsible person, coordinate vendors outside the application, and provide member-visible updates. Internal staff notes remain separate.

**Acceptance criteria:** Requests appear in the owner’s history; attachments follow property access controls; each status change is attributable; submission failure preserves the draft where practical; urgent issues show the approved emergency contact path and do not imply continuous monitoring. External vendor login, estimates, purchasing, and vendor payment are deferred.

### EVENT — Event registration

**User outcome:** Invited members discover eligible gatherings and register with clear expectations.

Staff publish an event’s audience, property/location, date/timezone, capacity, details, and cancellation instructions. Members register, view registration status, cancel where allowed, and receive confirmations/reminders. Staff maintain the attendee list and communicate changes. Public event marketing remains on the marketing site.

**Acceptance criteria:** Audience restrictions hold for direct links; repeated submission cannot duplicate registration; concurrent registrations respect capacity; cancelled or changed events notify registrants; “interested” and “registered” are distinguishable if both are used. Guest counts and waitlists remain decisions. If an event is paid, use a separately defined commerce process; do not introduce investment payment handling here.

### ADMIN — Small-team operations

Provide staff tools for invitations, members, access assignments, properties, entitlements/policies, booking blocks and corrections, document publication, upcoming-property interest, announcements, maintenance, and events.

**Acceptance criteria:** Administrative routes and actions enforce role checks; finance access and permission administration are separately grantable; sensitive changes capture actor/time/reason; destructive changes explain their consequences; failed notifications and pending manual work are visible. Staff impersonation is not required for release one.

## 7. Delivery phases within release one

These are proposed build increments, not deadlines or removal of features from the agreed scope. Earlier phases may support a controlled pilot. Release one is complete only after all five increments and applicable release gates are satisfied.

| Phase | Deliverables | Exit criteria |
|---|---|---|
| 1 — Accounts and access | Invitations, both authentication methods, profile, recovery, staff administration, manual prospect/owner assignment, audit foundation | Invited prospect and owner can register; uninvited and cross-property access tests fail safely; staff can operate the onboarding flow. |
| 2 — Property pages and member information | Public-capable detailed property pages, publication controls, role-aware home, My Properties, Documents, Upcoming Properties, follows/interest, announcements and email delivery | Anonymous visitors can view public listings; restricted data stays private; staff can publish to intended audiences; prospects and owners get distinct account experiences. |
| 3 — Bookings and stays | Policy configuration, home-property availability, entitlement checks, confirmation, cancellation/change handling, staff date blocks, stay instructions | A property has an approved policy; concurrent booking and usage tests pass; staff and owners complete a booking lifecycle. |
| 4 — Support and community | Maintenance intake/status/attachments, event publishing/registration/cancellation, reminders, staff work queues | Staff can run issue resolution and event registration end to end, including capacity conflicts and notifications. |
| 5 — Release readiness | Accessibility/responsive QA, security review, monitoring, restore drill, operating guidance, owner/prospect pilot, issue fixes | All agreed capabilities are usable, operations are staffed, and no unresolved access or reservation integrity defects remain. |

Booking policy work runs alongside phases 1–2. Phase 3 interface and technical work can proceed with test fixtures, while live reservations remain disabled until a real policy is approved. Maintenance and event work can proceed independently of that policy.

Public property-page design and implementation can also proceed alongside phase 1. Public browsing must not depend on account onboarding being complete.

## 8. Quality and operational requirements

- Responsive web experience for mobile and desktop. No native app required.
- Proposed accessibility target: WCAG 2.2 AA, with keyboard-accessible forms, calendars, document lists, and status messages.
- Server authorization and database protections isolate users, properties, and documents. Test access revocation as well as initial grants.
- Validate and rate-limit account, invitation, upload, booking, and registration boundaries. Keep secrets and sensitive personal data out of logs.
- Structured logs, error monitoring, independent uptime monitoring, email/job failure alerts, and traceable support references.
- Separate nonproduction and production data. Seed test users and booking policies must never appear as real ownership records.
- Back up both database records and private files and demonstrate restoration. Recovery targets and support hours remain to be assigned.
- Confirm expected user/booking volumes before setting measurable performance targets. Do not invent service-level promises.

## 9. Success measures

Track these measures with an agreed definition and baseline during the pilot; numeric targets are not yet set:

- Invitation acceptance and completed onboarding, separately for prospects and owners.
- Time from staff-confirmed ownership to usable owner access.
- Booking completion rate, conflict rate, and support requests per booking.
- Document findability through task-based pilot testing.
- Upcoming-property follows and meaningful interest submissions.
- Maintenance acknowledgement and resolution times.
- Event registration completion and cancellation handling.
- Staff time spent completing common administrative tasks.
- Unauthorized disclosures, conflicting confirmed reservations, and incorrect entitlement deductions: zero known defects at launch.

## 10. Open decisions and gates

| Decision | Needed before | Proposed accountable role |
|---|---|---|
| Public property fields, pricing/share visibility, map precision, downloadable materials, and search indexability | First public property publication | LC product/business |
| Anonymous page CTA: inquiry, request invitation, or another handoff; whether a public property index is needed | Property-page interaction design | LC product |
| Entire property vs. individual cabin/suite reservation | Booking data model and final interaction design | LC product/operations |
| Allocation units, budgets, seasons, windows, minimum/maximum stays, peak/holiday rules | Live booking activation | LC business/operations with appropriate review |
| Cancellations, modifications, no-shows, guest limits, staff overrides, ownership changes | Booking acceptance | LC operations |
| Prospect access to individual properties and offering documents | Initial document publication | LC product/business |
| Ownership verification evidence and staff authority | Manual owner activation | LC operations/business |
| MFA triggers, recovery, credential linking, invitation expiry | Account launch | Product/engineering |
| Sensitive stay instructions and emergency/support contacts | First live stay | LC property operations |
| Event guests, capacity behavior, paid-event handling, cancellations | First event registration | LC events/operations |
| Required profile fields, consent, retention, privacy requests | Production account collection | LC product/business |
| Financial statement source and publication process | First statement publication | LC finance |
| Pilot properties, launch timing, expected volumes, support hours and recovery targets | Release plan | LC team, including Dzuy |

Named decision owners will be assigned during planning. Questions in this table do not prevent drafting or building independent functionality. They are explicit gates for the capabilities that depend on them.

## 11. Deferred beyond release one

Financial transaction processing; automated partner synchronization; early-investor portfolio/return dashboards; cross-property exchange; public booking/rentals; formal voting/governance; owner-to-owner chat; household/guest/vendor accounts; smart locks; accounting software; native mobile apps; automated secondary-market ownership transfers. External specialist systems remain responsible for investment qualification, funding, signing, escrow, and authoritative transaction records.

## 12. Sources and precedence

1. **Product decisions in this conversation, September 21, 2026.** These govern platform boundaries, invitation/account requirements, audiences, manual activation, phased first-release scope, and the unsettled status of booking policy.
2. [TECH-STACK.md](TECH-STACK.md) — architecture and security requirements, updated to align with this PRD.
3. [BACKLOG.md](BACKLOG.md) — historical technical planning inventory. Priority labels are technical planning priorities, not this release’s feature priorities.
4. [Property Discovery Interface — Build Prompt](https://app.notion.com/p/3ded020ec9d481c7ade2cba16e9b867f) — property-detail content, journey stages, and Manage capabilities. Current direction places detailed property pages within the app, with public viewing support. Suggested deposits and numerical usage examples are not adopted.
5. [Land Club Overview](https://app.notion.com/p/3a6d020ec9d480c8b04ed3fb247a4fe2) — ownership experience, property operations, communications, and community.
6. [How Ownership Works — Canonical (Launch v1)](https://app.notion.com/p/3d8d020ec9d481fbbfa9fb7a20cd470c) — distinct owner/investor roles and candidate usage mechanics. Current user direction supersedes its apparent booking-policy commitments for this PRD; exchange is deferred.
7. [Website Redesign](https://app.notion.com/p/3c7d020ec9d480af8f20c3250ec959a8) and its page briefs — public website scope. Its October target is not assumed to be the platform deadline.
8. [Land Club Gatherings](https://app.notion.com/p/3abd020ec9d4800bbb5cce6fc8753508) — community events and registration context.

The Website Redesign and Ownership Product hub fetches exposed incomplete embedded blocks. This draft relies on their readable content and the separately retrieved specifications, not an assertion that every linked attachment or historical project record was reviewed.

# Public website implementation — October 17, 2026

Local review: http://127.0.0.1:3000. Start with `npm run dev` if the preview process has stopped. Nothing has been pushed or deployed. The inspected starting HEAD was `37d8718ed8812fd5f60ff48d643910fdd7be3a9c`.

## Implemented

- `/`: Home Working B, Figma 506:649.
- `/how-it-works`: Concept 1, 506:834.
- `/about`: Team J, 506:965; recruiting dialog 507:232.
- `/events`: Two-column A, 506:1129.
- `/events/festa-italiana`: 506:1215, adapted to a past event.
- `/events/cocktails-and-trails-ii`: 506:1400, with a keyboard-accessible photo viewer.
- Responsive shared public navigation and footer; existing published property collection and property detail URLs remain in place.
- Public home remains visible to signed-in users. An authenticated club member visiting the root on `app.land.club` is directed to the existing dashboard.

Source: https://www.figma.com/design/HNNE9Z3nS5DcXBAW3HVqWJ/Land-Club-Website-Design?node-id=506-648
Shared typography checked against https://www.figma.com/design/Q4D5t9j7foxLjPJL9iFPCx/Land-Club-Design-Library?node-id=16-201

## Content and integration decisions

- Festa Italiana was August 1, 2026. The event has a past-event label, closed reservations, and retrospective copy. Future-tense RSVP, special hotel rates and time-sensitive travel logistics were removed.
- Upcoming event cards in the design are explicit placeholders. The implementation shows an honest empty upcoming section rather than announcing those dates.
- Ownership, regional fund and Land Club fund remain future offerings. Direct property investment retains the design's current status. No terms, share prices, documents or investor reporting data were added.
- No public signup, contact or recruiting submission endpoint exists in this repository. Fields are designed, but submission buttons are disabled and explained. No data is submitted or persisted, no account is created, and no success is claimed.
- The received-state content for 507:266 is implemented as `TeamSubmissionReceived`, intentionally unmounted until a future endpoint confirms a real submission.
- The placeholder team-together photo and unresolved contact details were omitted. The source roster reuses several portraits for different people. Those exact supplied mappings remain for local design review; replace/confirm before launch. No verified alternate funny portraits, biographies or LinkedIn destinations were supplied, so no invented rollover/bio/link content is presented.
- FAQ has no supplied page or approved content, so no broken FAQ destination was added.
- Explicit post-launch sections 507:277, 507:285 and 507:355 were excluded.
- Existing global `noindex` metadata remains unchanged; production SEO/indexing should be decided at launch.

## Changed files

Public route files: `src/app/page.tsx`, `src/app/about/page.tsx`, `src/app/how-it-works/page.tsx`, `src/app/properties/page.tsx`, and three new `src/app/events/**/page.tsx` files.

Shared layout: `src/app/layout.tsx` wraps the existing authenticated header/footer with a route-aware public chrome component, retaining the existing identity and account controls for platform routes.

New presentation code: `src/components/website/{chrome.tsx,interactions.tsx,pages.tsx,website.module.css,design-data.json,team.json}`.

New assets: `public/images/website/`, downloaded from the Figma responses, locally encoded as WebP with transparent portraits preserved. SVG icons are local originals. No expiring Figma URLs are used at runtime.

Existing uncommitted changes to member management, documents, authentication support, property editing, package files and global CSS were not edited by this implementation. No migrations or access-control changes were made.

## Verification

- `npm test`: 119 passed, 1 skipped, 0 failed. The skipped PostgreSQL integration test requires its separate test environment.
- `npm run typecheck`: passed.
- `npm run build`: passed. A first attempt collided with generated route declarations while the dev server was active; stopping dev and regenerating those declarations resolved it.
- Codex in-app browser only; Google Chrome was not used.
- All six new pages checked at 1440px desktop and 390px mobile widths: one H1 per page, no horizontal document overflow, all rendered images loaded with nonzero geometry.
- Mobile navigation, recruiting modal opening/closing, gallery next/previous and Escape dismissal checked.
- `/properties`, `/properties/norden-cross`, `/properties/shelter-cove`, and existing signed-in sign-in/dashboard behavior checked in the browser. Existing property pages retain their own heading structure.
- Screenshots and image geometry audit: `output/website-review/`.

Remaining launch work is approval/replacement of placeholder team content, final approved public copy, real form delivery integrations, and an explicit deployment decision.

A repository-wide whitespace check reports an existing trailing blank in `tests/member-documents.test.ts`; it was left untouched. The public website diff passes its scoped whitespace check.

## Final focused regression

- All six routes loaded directly and through public navigation, including both event cards.
- All six routes passed at 375px: document width exactly 375px, one public page heading, no horizontal overflow. Evidence: `output/website-review/375px-regression.json`.
- Mobile menu now moves focus to its first link when opened by keyboard, supports Escape, returns focus to the menu button, and exposes `aria-controls` and expanded state.
- Recruiting dialog tested with keyboard activation, reverse tab inside the modal, Escape dismissal, and focus restoration to “Send your details”.
- Existing authenticated browser loaded `/dashboard` successfully (HTTP 200), then `/` rendered the public homepage. The production `app.land.club` root redirect was checked in source, not exercised against production.
- Public presentation components import only static design data, styles and interactions; no member investment reporting, share-price cards or private documents were introduced. Existing property routes continue using their existing public content filtering.
- All 81 design asset references resolve to local files. No temporary Figma URLs, localhost content links or visible TODO/placeholder copy remains in the presentation code. Reused team portraits remain a documented source-content decision.
- Public signup/contact/team forms have disabled submission buttons and explicit unavailable messages. Receipt UI remains unmounted. No submission wiring or access controls changed.
- Production build and typecheck rerun after keyboard fixes: passed. Existing test result remains 119 passed, 1 environment-dependent skip, 0 failed.
- Latest desktop screenshot: `output/website-review/home-desktop.jpg`; narrow mobile: `output/website-review/home-375px.jpg`. Preview restarted and left running at http://127.0.0.1:3000.

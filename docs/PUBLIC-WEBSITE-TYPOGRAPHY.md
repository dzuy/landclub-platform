# Public website typography audit

Compared against the high-fidelity Figma layout responses captured for Home 506:649, How It Works 506:834, About 506:965, Events 506:1129, Festa 506:1215, Cocktails recap 506:1400, and team overlays 507:232 / 507:266 in file HNNE9Z3nS5DcXBAW3HVqWJ.

## Desktop type roles

| Role | Family / weight | Size / line height | Tracking |
| --- | --- | --- | --- |
| Main page hero | Plus Jakarta Sans 700 | 56px / 1.06 | -1.4px |
| Event-detail hero, Norden feature, closing hero | Plus Jakarta Sans 700 | 72px / 1.04 | -1.8px |
| Large section heading | Plus Jakarta Sans 700 | 48px / 1.08 | -0.96px |
| Standard section heading, form heading | Plus Jakarta Sans 700 | 36px / 1.12 | -0.36px |
| Process/investment cards, investment steps, event story titles | Plus Jakarta Sans 600 | 24px / 1.18 | -0.36px |
| Team names, recruiting traits, event-list titles | Plus Jakarta Sans 700 | 22px / 1.3 | -0.11px |
| Statement | Figtree 400 | 32px / 1.26 | -0.48px |
| Lead paragraph | Figtree 400 | 22px / 1.3 | 0 |
| Large body | Figtree 400 | 20px / 1.5 | 0 |
| Body, form fields | Figtree 400 | 18px / 1.4 | 0 |
| Text links, partners, step numbers | Figtree 500 | 18px / 1.2 | 0 |
| Navigation | Figtree 500 | 15px / 1.2 | 0 |
| Button | Figtree 600 | 16px / 1.2 | 0 |
| Status | Figtree 600 | 12px / 16px | 0 |
| Footer label | Figtree 600 | 14px / 1.5 | 0 |
| Copyright | Figtree 400 | 14px / 1.5 | 0 |
| Home quote | Plus Jakarta Sans 300 | 52px / 1.46 | -1.3px |

Corrected the generic bold h3 rule by assigning semibold defaults and explicit bold roles for team names, recruiting traits and event-list titles. Corrected event-detail heading scale, About statements and body sizes, all team-row desktop sizes, recap lead paragraphs, and role-specific line heights/tracking. Body and form families/weights are explicit. Existing loaded font weights already cover all roles; no font dependency changes needed.

Mobile sizes remain responsive adaptations because the supplied six layouts are desktop frames. Font families and weights remain consistent with the source roles.

## Verification

- Browser computed-style audit on all six routes at 1440px, saved in `output/website-review/typography-desktop-audit.json`.
- All six routes at 375px: no document or text-element horizontal overflow (`typography-mobile-audit.json`).
- Team dialog checked at 375px: 700 Jakarta heading, regular Figtree body/inputs, no overflow.
- Visual checks of investment cards and event typography on desktop and mobile; screenshots in `output/website-review/typography-*.jpg`.
- `npm run typecheck` passed; scoped whitespace check passed.

Implementation files: `src/components/website/pages.tsx`, `src/components/website/website.module.css`. Existing public copy decisions and authenticated platform remain unchanged.

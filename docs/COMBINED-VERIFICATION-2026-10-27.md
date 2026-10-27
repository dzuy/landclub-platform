# Combined local verification — October 27, 2026

Work here: `/Users/dzuy/Documents/Codex/2026-10-27/task/land-club-combined`.
Branch: `codex/combined-verification-2026-10-27`.
Preview: http://127.0.0.1:3030/dashboard/manage-events (local editor, isolated PGlite).

## Included sources

- Main `81379c4343d3de443e745045b168237039f0d9f1` is an ancestor. All committed main work is present.
- Ticket branch `2592462348b5d851f95eeb3441cf9cc9455edf2e` is an ancestor. Its seven commits retain last night's fixes, including the public Events layout for authenticated members and the Portfolio empty state.
- Original main's two uncommitted event-picker files were captured in `../evidence/original-main.patch`. Their intent (separate date/hour/minute controls) is already covered by PB-30's accessible calendar, which also preserves all minute values and validates local time. The obsolete native-popup implementation and unused CSS were not overlaid on the newer fix. Original files remain untouched.
- Port 3020 runs `/Users/dzuy/Library/Application Support/LandClubIntegration`, a non-Git runtime copy. Every non-generated source file exactly matches the clean hidden source checkout `/Users/dzuy/Documents/ChatGPT/Land Club/.data/integrated-app`, commit `4efa47b` on `integration/admin-terms-sharing`. There are no newer runtime edits. Its terms/sharing/admin product work was incorporated into main by `e8b17a3` and later fixes (see existing October 20 handoff). Old synthetic identity/mail adapters and standalone preview scripts are not imported into the current application. A complete source snapshot and hashes remain in `../evidence/integration-source` and `integration-hashes.json`; the commit is retained locally as `source/oct20-integration`.
- Ports 3001 and 3012 point at older temporary admin/terms previews. No existing preview was stopped or changed.

## This integration change

An optional `LAND_CLUB_LOCAL_PORT` config lets the existing development-only loopback local editor run on 3030 instead of busy port 3000. Default behavior remains 3000. Production, non-loopback hosts, invalid ports, and the existing local-sign-in credential guards remain denied; regression coverage verifies these boundaries.

Runtime uses an allowlisted environment with no hosted database, auth, email or storage credentials. No source `.env` or `.data` was copied. New preview data lives in this checkout's ignored `.data` directory. It is synthetic local verification, not live account verification. Preserve this data when restarting. Run the launcher only if port 3030 is free:

```sh
cd /Users/dzuy/Documents/Codex/2026-10-27/task
python3 evidence/start-preview.py
```

The launcher records its PID in `../evidence/preview.pid` and logs in `../evidence/preview.log`. Do not start another copy against the same PGlite directory. The preview is a local process and is not guaranteed across logout/reboot.

## Scope and limits

PB-2, 4, 5, 6, 8, 9, 11, 13, 14, 17, 19, 25, 27, 29, 30 remain In Review; PB-5 needed no change. PB-18 implementation is included, but ticket stays Ready until its original live failure is confirmed resolved. PB-16 remains unresolved; PB-31 and PB-34 remain skipped. No new work on those tickets.

Standalone Safari/physical-device QA and live authentication/storage/proxy verification remain outstanding. Final check results and browser observations are in `../evidence/handoff.txt`; test/build/typecheck logs are alongside it. No push, remote merge, deployment or production writes occurred.

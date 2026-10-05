# 06: Manual Redirects

**What to build:** An Editor creates a Redirect in DatoCMS, and Visitors requesting the old Path are sent to the target.

A Redirect has:
- a source Path
- a target, either a record (its current Path) or an external URL
- a type, permanent or temporary

See `spec.md` (Routing, Schema).

**Blocked by:** 02 (Page tree routing and locales)

**Status:** ready-for-agent

- [ ] A migration adds the Redirect model.
- [ ] Redirects are checked before any other resolution step.
- [ ] Permanent → 308, temporary → 307 (Next.js page redirects can't send 301 or 302; see `spec.md`, Routing). A record target uses the Path builder, so the redirect follows the record if it moves.
- [ ] Vitest covers both types and both target kinds. Playwright covers one Redirect on the test project.

# 14: Consent adapter

**What to build:** Third-party scripts and embeds load only after the Visitor accepts their cookie category. Each Site plugs in its own consent tool behind the consent adapter.

See `spec.md` (Consent, Labels, logging, performance).

**Blocked by:** 01 (Walking skeleton)

**Status:** ready-for-agent

- [ ] The consent adapter interface exposes the accepted categories and notifies when they change.
- [ ] The Core offers a way to declare a third-party script with its category. The script loads only once that category is accepted, and is deferred.
- [ ] An in-memory or fake adapter exists for tests and for Sites with no tool yet. One shared contract suite covers it.
- [ ] No concrete tool (Iubenda, ministry banner) is in the Core.
- [ ] Playwright verifies that a declared script is absent before consent and present after.
- [ ] `docs/new-site.md` covers every setup step this ticket adds (tokens, secrets, environment variables, webhooks, external services, DatoCMS settings), or this ticket adds none.

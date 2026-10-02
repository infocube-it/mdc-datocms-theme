# 27: Performance budgets and field data

**What to build:** Performance regressions are caught before merging. Lighthouse CI runs on each PR's Netlify deploy preview against sample templates (home, Page, record, Listing).

Seed default budgets, which Sites can tune:
- LCP < 2.5 s
- CLS < 0.1
- TBT < 200 ms
- a client JavaScript size cap

Real-user Core Web Vitals are collected without cookies or personal data. The Core's design rules are enforced:
- local fonts via `next/font`
- a priority hero image with declared sizes
- deferred third-party scripts

See `spec.md` (Consent, Labels, logging, performance).

**Blocked by:** 11 (Image Block and alt text), 22 (Listing Block and pagination)

**Status:** ready-for-agent

- [ ] Lighthouse CI runs in GitHub Actions against the deploy preview of each PR and fails on budget breaches.
- [ ] Budgets are set in Site config, with Seed defaults.
- [ ] `web-vitals` sends metrics to a Site endpoint, through the logging adapter by default, without cookies or personal data.
- [ ] Fonts load via `next/font`. The first image-using Block can be marked as priority, with declared sizes.
- [ ] Current templates pass the budgets.

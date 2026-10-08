# 28: New Site manual, verified end to end

**What to build:** A developer or a coding agent can start a new Site from the Seed by following `docs/new-site.md` alone, and end with a Site that builds, passes its tests and deploys.

The manual has grown with every ticket since 03. This ticket proves it works: someone follows it from a clean start and fixes whatever is missing, wrong or out of order.

**Blocked by:** 01–27, 29 (every other ticket of this version)

**Status:** ready-for-agent

- [ ] A new Site is created by following only `docs/new-site.md`. It uses a new GitHub repository, a new empty DatoCMS project and a new Netlify project, and no knowledge from outside the manual.
- [ ] Every **[human]** step says exactly what to do and where. An agent following the manual stops at each one and asks.
- [ ] Every step ends with a check that passes on the new Site. Gaps found along the way are fixed in the manual, or in the Seed when the gap is in the Seed.
- [ ] The new Site passes typecheck, Vitest and Playwright with axe, locally and against its Netlify deploy.
- [ ] A Seed change merged into the new Site with `git fetch seed && git merge seed/develop` replays cleanly, including any new migrations.
- [ ] We decide whether to add a `new-site` agent skill or an interactive wizard for the human steps, and record the decision.

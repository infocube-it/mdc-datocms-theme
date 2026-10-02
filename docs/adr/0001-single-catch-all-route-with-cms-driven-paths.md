# Single catch-all route with CMS-driven, localized Paths

Every Site is multilingual with translated URLs (`/it/servizi/consulenza` and `/en/services/consulting` are the same record), so no URL segment can come from a Next.js folder name. We route everything through one `[locale]/[[...slug]]` route whose resolver asks DatoCMS which record owns the requested Path and renders that record's template by `__typename`. Every segment of every Path is therefore editable in DatoCMS, and Editors can translate or move a section without a code change.

## Considered Options

- **One route folder per model** (`/blog/[slug]`, `/product/[slug]`), the pattern used by every official DatoCMS Next.js starter. Rejected: folder names can't be translated.
- **Per-model folders plus rewrites of translated prefixes** (`/it/servizi` → `/[locale]/services`). Rejected: the prefix map lives in code, so translating or renaming a section needs a deploy.

## Consequences

- The resolver is Seed-specific code with no official reference implementation, and needs its own tests.
- DatoCMS enforces slug uniqueness only within a model, so two records of different models can claim the same Path. The resolver serves the first match in a fixed model order.
- Links, sitemap, hreflang, preview links and llms.txt must all build Paths through the same code the resolver uses, so they never disagree.

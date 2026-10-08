# Start a new Site from the Seed

Follow these steps in order to turn a copy of the Seed into a new Site that builds, deploys and serves its Home page. This manual is for developers and for coding agents.

- Steps marked **[human]** need a person: they use accounts, dashboards or secrets an agent can't reach. An agent stops at each one, asks the person to do it, and waits.
- Steps marked **[agent]** are plain commands; a person can run them too.
- Each step ends with a **Check**. Don't move on until it passes.

Commands run from the repository root. Node, npm and Playwright run only in containers (see `AGENTS.md`); never run them on the host. The commands below use Docker Compose; in the Dev Container drop the `docker compose run --rm app` prefix, and run `npm run test:e2e:deploy` directly in step 8.

> This manual grows with the Seed: every ticket that adds a setup step (a token, a secret, a webhook, an external service) updates it. Last updated for ticket 08.

## Before you start

You need:

- Git and Docker with Docker Compose, on a host where your user has UID 1000. The containers write files as UID 1000.
- Optional, to work in the Dev Container (where a coding agent runs without permission prompts): VS Code with the Dev Containers extension, and a Claude Code token saved as `.devcontainer/README.md` explains **[human]**.
- A DatoCMS account that can create projects.
- A GitHub account or organization for the Site's repository.
- A Netlify account linked to GitHub.

Choose and write down:

- `<site>`: the Site's short name, e.g. `capodimonte`.
- `<repo-url>`: the Site's new, empty GitHub repository.
- The Site's locales, in order. **The first is the default locale.**

## 1. Copy the Seed into the Site's repository [agent]

Keep the Seed as a second remote called `seed`, so later Seed updates can be merged in.

```sh
git clone <seed-repo-url> <site>
cd <site>
git remote rename origin seed
git remote add origin <repo-url>
git push -u origin main
git push origin develop   # if the Seed has a develop branch; it is the working branch
```

**Check:** `git remote -v` lists `origin` (the Site) and `seed` (the Seed), and the Site's repository shows the code on GitHub.

## 2. Create the DatoCMS project [human]

1. Create a new, **empty** DatoCMS project. Don't start from a template or demo: the Seed's migrations create every model, and an existing `page` model makes them fail.
2. In **Project settings → Locales**, add the Site's locales in order. Do this before step 4: the migrations write sample content in every locale. The Seed's sample content is in Italian and English; other locales get the English text.
3. In **Project settings → API tokens**, create two tokens:
   - a **Content Delivery API** token with read-only access to published content. This is `DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN`.
   - a **Content Management API** token whose role can edit the schema (Admin). This is `DATOCMS_CMA_TOKEN`. It is used only on developer machines, for migrations; never put it in Netlify or GitHub.
4. If you work in the Dev Container, or let a coding agent run migrations, create a **sandbox-only** role and a Content Management API token with it. Use this token as `DATOCMS_CMA_TOKEN` in the Dev Container, instead of the Admin one: it can't touch primary. In **Project settings → Roles**, create a role with:
   - **Environments**: sandbox environments only.
   - **Can edit schema** and **Can manage environments** (create and fork sandboxes): on.
   - **Can promote environments**: off. A person promotes a sandbox from the dashboard.
   - **Can manage access tokens**: off. With it, the token can read every token in the project, the Admin one included.
   - **Records**: one rule per sandbox, with that sandbox as environment, all models and all actions. DatoCMS scopes each record rule to a single environment: a rule on `main` doesn't reach the sandboxes, and a new sandbox needs its own rule before migrations can read or write its records. Without it, `migrations:run` sees no applied migrations and starts again from the first.

**Check:** the project has the locales in the right order, and the tokens exist.

## 3. Configure local secrets [human]

```sh
cp .env.local.example .env.local
```

Paste the two tokens from step 2 into `.env.local`. Also set `DRAFT_MODE_SECRET` and `CACHE_WEBHOOK_SECRET` to long random strings, e.g. the output of `openssl rand -hex 24`: the first protects draft mode and the preview links, the second the cache invalidation endpoints (step 10). Leave `DATOCMS_ENVIRONMENT` empty: the Site then reads primary. The file is ignored by git: never commit it, and never paste tokens into chats, issues or logs.

**Check:** `.env.local` has a value for every variable in `.env.local.example`, except `DATOCMS_ENVIRONMENT`.

## 4. Install and set up the DatoCMS schema [agent]

```sh
docker compose run --rm app npm install
docker compose run --rm app npm run migrations:run -- --source=main --in-place --allow-primary
docker compose run --rm app npm run generate-schema
```

The migrations run straight on the primary environment because the project is new and empty. On a project with real content, run them in a sandbox first: `--destination=<new-sandbox>`.

They create:

- the Page model, a tree with localized slugs;
- the Site settings singleton;
- sample Pages: a Home page, a small tree under "Servizi / Services", and a Page with an unpublished draft, used to test draft mode;
- the Routing rule model, which gives the records of each Routable model other than Page their Paths;
- a sample Routable model, Article, with its Routing rule (prefix `articolo` / `article`, Main page "Articoli / Articles") and two sample articles.

The Home page is required: Site settings must point to one. The other sample Pages are used by the Playwright tests (see step 8); delete them only once the Site has its own tests.

`generate-schema` rewrites `schema.graphql` and the gql.tada types from the new project. Commit them.

**Check:** a second `migrations:run` prints "No new migration scripts", and `git status` shows `schema.graphql` changed.

## 5. Make the Site its own [agent]

- `package.json`: set `name` to the Site's name.
- `README.md`: replace the title and first paragraph with the Site's.
- `src/site/config.ts`: the Site config. Leave it as it is until the Site needs to change something.
- Routable models: the Seed ships one sample, Article (`src/site/models/article.tsx`). To add one, write a migration that creates the model (with a localized slug and an SEO field) and adds its API key to the `model` options of the Routing rule; declare it with `defineRoutableModel` and list it in `routableModels` in `src/site/config.ts`; then create its Routing rule in DatoCMS.
- `src/site/labels/<locale>.ts`: one Labels file per locale. Add a file for each Site locale the Seed doesn't cover (it covers `it` and `en`), and list it in `labels` in `src/site/config.ts`. Without one, that locale shows default-locale Labels and logs a warning.

**Check:** run the checks:

```sh
docker compose run --rm app npm run typecheck
docker compose run --rm app npm test
```

Both pass. Then commit and push.

## 6. Run the Site locally [agent]

```sh
docker compose up app
```

**Check:**

- http://localhost:3000/ redirects to the default locale.
- http://localhost:3000/<default-locale> shows the Home page title.

## 7. Set up GitHub Actions [human]

In the Site's repository, go to **Settings → Secrets and variables → Actions** and add two secrets: `DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN` (the token from step 2) and `DRAFT_MODE_SECRET` (the value in `.env.local`). CI reads primary and never calls the cache endpoints.

The workflow `.github/workflows/ci.yml` runs on every PR and on pushes to `main` and `develop`. It runs typecheck and Vitest, then builds the Site and runs Playwright with axe against the build.

**Check:** the latest push to `develop` has a green "CI" run in the **Actions** tab.

## 8. Deploy on Netlify [human]

1. In Netlify, **Add new project → Import an existing project**, and pick the Site's repository. Netlify reads the build settings from `netlify.toml`: don't override them.
2. In **Project configuration → Environment variables**, add `DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN`, `DRAFT_MODE_SECRET` and `CACHE_WEBHOOK_SECRET` (the values in `.env.local`).
3. Choose the production branch, `main` or `develop`.
4. Trigger a deploy.

`netlify.toml` maps each deploy context to a DatoCMS environment: production reads primary, deploy previews and branch deploys read a sandbox called `sandbox`, and the `develop` branch deploy (staging) reads a sandbox called `develop` (step 11). Create the `sandbox` environment before opening a pull request, or previews fail: in DatoCMS, **Project settings → Environments → Fork primary**. A preview never reads or caches production content.

**Check:**

- The deploy URL's `/` redirects to the default locale.
- `/<default-locale>` shows the Home page.

Then set `DEPLOY_URL` in `.env.local` to the Site's Netlify URL, without a path (e.g. `https://my-site.netlify.app`), and run the end-to-end tests against the deploy [agent]:

```sh
docker compose run --rm playwright npm run test:e2e:deploy
```

If the Netlify project is password-protected, make it public first, or Playwright gets 401s.

## 9. Connect the DatoCMS Web Previews plugin [human]

Editors open the Site in draft mode from DatoCMS with the Web Previews plugin.

1. In DatoCMS, **Settings → Plugins → Add**, install **Web Previews**.
2. In the plugin's settings, set **Frontends** with a name (e.g. `Production`) and the **Preview links generator URL**: `https://<deploy-url>/api/preview-links?secret=<DRAFT_MODE_SECRET>`. Use the Site's real domain once it has one.
3. Save.

**Check:** open a Page record in DatoCMS: the sidebar shows "Draft (<locale>)" links, one per translated locale. Following one opens the Site on that Page with a link to exit draft mode, showing the latest draft. Following the exit link goes back to published content.

## 10. Connect cache invalidation [human]

Pages are cached until DatoCMS tells the Site that content changed. After a publish the first Visitor still gets the previous version while the page regenerates; the next one gets the new version.

1. **DatoCMS webhook.** In **Project settings → Webhooks → Add**:
   - URL: `https://<deploy-url>/api/cache/datocms`
   - **HTTP basic auth**: off. **Custom headers**: `Authorization` = `Bearer <CACHE_WEBHOOK_SECRET>`.
   - **Events**: entity **Cache tags**, event **Invalidate**. Leave auto-retry on.
2. **Netlify deploy notifications.** After a code deploy, or when someone rolls back to an older deploy (which brings back that deploy's old cache), the whole cache must be revalidated. In **Project configuration → Notifications → Deploy notifications → Add notification → Outgoing webhook**, add one for each of the events **Deploy succeeded** and **Deploy restored**, with:
   - URL: `https://<deploy-url>/api/cache/flush`
   - **JWS secret token**: `<CACHE_WEBHOOK_SECRET>`.

**Check:** publish a change to the Home page in DatoCMS. Reload `/<default-locale>` twice: the second load shows the change. In DatoCMS, the webhook's activity log shows a `200`. A request without the secret gets `401`:

```sh
curl -i -X POST https://<deploy-url>/api/cache/datocms
```

## 11. Set up staging (the `develop` sandbox) [human]

Staging is the Netlify deploy of the `develop` branch. It reads a long-lived sandbox called `develop`, so new code and schema can be shown to the client without touching production. Content written in the sandbox never goes back to primary (promoting a sandbox replaces primary whole): use staging for new code and schema, not for preparing content.

1. **Create the sandbox.** In DatoCMS, **Project settings → Environments → Fork primary**, name it `develop`.
2. **Give the tokens access.** In **Project settings → Roles**, make the role of the Content Delivery API token (`DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN`) able to read the `develop` and `sandbox` environments (a role's environment access is per environment). Without it, staging and previews get 401s. For the sandbox-only role of step 2, add a **Records** rule for each of them as well.
3. **Netlify.** In **Project configuration → Build & deploy → Branches and deploy contexts**, enable **branch deploys** for `develop`. Add the DatoCMS webhook and the Netlify notification of step 10 for the staging URL too, or staging shows stale pages: staging has its own cache.
4. **Migrations run on the sandbox first.** Run the new migration on `develop` and check staging:

   ```sh
   docker compose run --rm app npm run migrations:run -- --source=develop --in-place
   ```

5. **Release to primary.** Once the client approves, run the same migrations on a fresh fork of primary, and promote it from the dashboard (**Environments → Promote**), or run them on primary directly with `--source=main --in-place --allow-primary`. Then merge `develop` into `main`, and deploy.
6. **Refresh the sandbox.** To start again from the content of production, delete the `develop` sandbox and fork primary again with the same name. Run the migrations that are not on primary yet.

**Check:** the `develop` branch deploy shows the content of the `develop` sandbox. Change a Page title there: staging shows it, production doesn't.

## Ready

The Site:

- builds, tests and deploys from its own repository;
- reads its own DatoCMS project;
- can merge future Seed updates with `git fetch seed && git merge seed/develop`.

Start building on `develop`.

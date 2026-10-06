# Start a new Site from the Seed

Follow these steps in order to turn a copy of the Seed into a new Site that builds, deploys and serves its Home page. This manual is for developers and for coding agents.

- Steps marked **[human]** need a person: they use accounts, dashboards or secrets an agent can't reach. An agent stops at each one, asks the person to do it, and waits.
- Steps marked **[agent]** are plain commands; a person can run them too.
- Each step ends with a **Check**. Don't move on until it passes.

Commands run from the repository root. Node, npm and Playwright run only in Docker (see `AGENTS.md`); never run them on the host.

> This manual grows with the Seed: every ticket that adds a setup step (a token, a secret, a webhook, an external service) updates it. Last updated for ticket 04.

## Before you start

You need:

- Git and Docker with Docker Compose, on a host where your user has UID 1000. The containers write files as UID 1000.
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

**Check:** the project has the locales in the right order, and both tokens exist.

## 3. Configure local secrets [human]

```sh
cp .env.local.example .env.local
```

Paste the two tokens from step 2 into `.env.local`. Also set `DRAFT_MODE_SECRET` to a long random string, e.g. the output of `openssl rand -hex 24`: it protects draft mode and the preview links. The file is ignored by git: never commit it, and never paste tokens into chats, issues or logs.

**Check:** `.env.local` has a value for every variable in `.env.local.example`.

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
- sample Pages: a Home page, a small tree under "Servizi / Services", and a Page with an unpublished draft, used to test draft mode.

The Home page is required: Site settings must point to one. The other sample Pages are used by the Playwright tests (see step 8); delete them only once the Site has its own tests.

`generate-schema` rewrites `schema.graphql` and the gql.tada types from the new project. Commit them.

**Check:** a second `migrations:run` prints "No new migration scripts", and `git status` shows `schema.graphql` changed.

## 5. Make the Site its own [agent]

- `package.json`: set `name` to the Site's name.
- `README.md`: replace the title and first paragraph with the Site's.
- `src/site/config.ts`: the Site config. Leave it as it is until the Site needs to change something.
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

In the Site's repository, go to **Settings → Secrets and variables → Actions** and add two secrets: `DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN` (the token from step 2) and `DRAFT_MODE_SECRET` (the value in `.env.local`).

The workflow `.github/workflows/ci.yml` runs on every PR and on pushes to `main` and `develop`. It runs typecheck and Vitest, then builds the Site and runs Playwright with axe against the build.

**Check:** the latest push to `develop` has a green "CI" run in the **Actions** tab.

## 8. Deploy on Netlify [human]

1. In Netlify, **Add new project → Import an existing project**, and pick the Site's repository. Netlify reads the build settings from `netlify.toml`: don't override them.
2. In **Project configuration → Environment variables**, add `DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN` and `DRAFT_MODE_SECRET` (the value in `.env.local`).
3. Choose the production branch, `main` or `develop`.
4. Trigger a deploy.

With no environment header, the deploy reads the DatoCMS primary environment.

**Check:**

- The deploy URL's `/` redirects to the default locale.
- `/<default-locale>` shows the Home page.

Then run the end-to-end tests against the deploy [agent]:

```sh
docker compose run --rm -e BASE_URL=https://<deploy-url> playwright
```

If the Netlify project is password-protected, make it public first, or Playwright gets 401s.

## 9. Connect the DatoCMS Web Previews plugin [human]

Editors open the Site in draft mode from DatoCMS with the Web Previews plugin.

1. In DatoCMS, **Settings → Plugins → Add**, install **Web Previews**.
2. In the plugin's settings, set **Frontends** with a name (e.g. `Production`) and the **Preview links generator URL**: `https://<deploy-url>/api/preview-links?secret=<DRAFT_MODE_SECRET>`. Use the Site's real domain once it has one.
3. Save.

**Check:** open a Page record in DatoCMS: the sidebar shows "Draft (<locale>)" links, one per translated locale. Following one opens the Site on that Page with a link to exit draft mode, showing the latest draft. Following the exit link goes back to published content.

## Ready

The Site:

- builds, tests and deploys from its own repository;
- reads its own DatoCMS project;
- can merge future Seed updates with `git fetch seed && git merge seed/develop`.

Start building on `develop`.

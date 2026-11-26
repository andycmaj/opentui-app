# opentui-apps — the website

Astro site for `@andycmaj/opentui-app` and the apps built on it, served from
GitHub Pages at <https://andycmaj.github.io/opentui-app/>. The build plan and
its settled decisions are in [`docs/plans/site.md`](../../docs/plans/site.md).

## Develop

```sh
bun run dev:site      # from the repo root; http://localhost:4321/opentui-app/
bun run build:site    # astro build + Pagefind index into apps/site/dist
bun run --cwd apps/site preview   # serve dist (search works only on a build)
```

`dev`, `build` and `typecheck` regenerate the theme tokens (from core's
themes) and the API reference (TypeDoc, gitignored) first. The changelog
reads this repo's GitHub releases at build time; set `GITHUB_TOKEN` to avoid
the anonymous rate limit.

## Demos and keybinding tables

`demos.json` lists every recorded demo. Casts live in `public/casts/`, keymap
tables in `src/data/keymaps/`, and both are committed: CI regenerates them on
every deploy, and keeps the committed copy for any demo that fails.

Each app needs a fixture mode (an env var, set in `demos.json`) and a key
script (`demo/demo.keys`) in its own repo. To re-record locally, with the apps
checked out next to this repo (or pointed at with `--path`):

```sh
cd apps/site
bun run record                                   # all demos
bun run record --only kube-tui --path kube-tui=../../../kube-tui.site-demo
bun run keymaps                                  # keymap tables
```

`scripts/checkout-apps.ts` clones every app at its latest release next to this
repo, which is what CI does on a fresh runner.

## Deploy

`.github/workflows/site.yml` builds and deploys. It runs on:

- every push to `main`;
- `repository_dispatch` of type `app-released`, sent by each app's release
  workflow;
- `workflow_dispatch`, which this repo's `release.yml` fires after publishing,
  and which you can run by hand;
- nightly at 06:17 UTC.

Each run: checks out this repo, clones the apps at their latest release,
re-records casts and re-extracts keymaps (failures are warnings), builds,
and deploys with `actions/deploy-pages`.

### First deploy

1. Merge the site branch to `main`.
2. Repo **Settings → Pages → Build and deployment → Source: GitHub Actions**
   (or `gh api -X POST repos/andycmaj/opentui-app/pages -f build_type=workflow`).
3. Run the workflow: `gh workflow run site.yml --ref main`, then watch it with
   `gh run watch`. The `github-pages` environment is created on first deploy;
   if it was created earlier with branch protection, allow `main`.
4. Open <https://andycmaj.github.io/opentui-app/>.

### App release notifications

An app release rebuilds the site right away (instead of at the nightly run)
by sending `repository_dispatch` `app-released` with `{app, version}` from
the last steps of its release workflow (`riker-release.yml`,
`ghdash-release.yml`, `kube-tui-release.yml`, `tilt-tui-release.yml`). They
authenticate as a GitHub App, not a PAT: `actions/create-github-app-token`
mints an installation token that lasts an hour and reaches only this repo,
and nothing needs renewing. (A PAT with Contents write here could also push
code, and copied into four repos it would be four ways to leak.)

This repo's own `release.yml` needs none of this: it starts `site.yml` with
its `GITHUB_TOKEN` (`gh workflow run`).

One-time setup, which only the owner can do. The wizard walks through it,
pipes the key from the downloaded file into `gh secret set` (never shown or
pasted), and checks the result by minting and revoking a token:

```sh
apps/site/scripts/setup-dispatch-app.sh
```

What it sets up, if you'd rather do it by hand:

1. **Create the App** at <https://github.com/settings/apps/new>:
   name `opentui-site-dispatch`, homepage
   `https://andycmaj.github.io/opentui-app/`, **Webhook: Active unchecked**,
   **Repository permissions: Contents = Read and write** (Metadata read-only
   comes with it; nothing else), **Only on this account**.
2. **Generate a private key** (App page → Private keys). The browser
   downloads a `.pem`.
3. **Install** it (App page → Install App) on `andycmaj` with **Only select
   repositories → `opentui-app`**.
4. **On each app repo** (`riker`, `ghdash`, `kube-tui`, `tilt-tui`), set the
   App's **Client ID** (`Iv…`, on the App page; not the numeric App ID) and
   key:
   ```sh
   for app in riker ghdash kube-tui tilt-tui; do
     gh variable set SITE_APP_CLIENT_ID -R andycmaj/$app --body "Iv…"
     gh secret set SITE_APP_KEY -R andycmaj/$app < ~/Downloads/opentui-site-dispatch.*.private-key.pem
   done
   ```
5. Delete the `.pem`, any leftover `SITE_DISPATCH_TOKEN` secrets, and the PAT
   if one was made.

Until both `SITE_APP_CLIENT_ID` and `SITE_APP_KEY` are set, the release logs a
"Website not notified" notice and skips the dispatch; the nightly run picks
the release up.

CI records each app at its **latest release**, so an app's demo is only
re-recorded once a release contains its fixture mode and `demo/demo.keys`.
Until then the committed cast is used and the run shows a warning.

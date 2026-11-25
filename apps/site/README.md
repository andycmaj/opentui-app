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

For an app release to rebuild the site right away (instead of at the nightly
run), each app repo needs a `SITE_DISPATCH_TOKEN` secret: a fine-grained PAT
whose only access is **Contents: read and write** on `andycmaj/opentui-app`
(that is what the dispatches API requires). One token can serve all three
apps:

```sh
for app in tilt-tui ghdash kube-tui; do
  gh secret set SITE_DISPATCH_TOKEN -R andycmaj/$app   # paste the token
done
```

The step is skipped while the secret is unset.

CI records each app at its **latest release**, so an app's demo is only
re-recorded once a release contains its fixture mode and `demo/demo.keys`.
Until then the committed cast is used and the run shows a warning.

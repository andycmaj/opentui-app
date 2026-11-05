# Plan: "panes" website

Home for the TUI apps built on `@andycmaj/opentui-app`, with the framework as
one of them. Decisions settled in the 2026-10-23 grilling session; this file is
the build plan.

## Settled decisions

- **Name / URL:** "panes", GitHub Pages default URL (`andycmaj.github.io/opentui-app`).
- **Code:** `apps/site` in this monorepo. Astro, custom layout (no Starlight
  theme), small Solid islands.
- **Apps at launch:** `tilt-tui`, `ghdash` (repo and binary name; the roster called it ghdash-tui), `kube-tui` (beta). `dotsync`
  deferred until public with releases.
- **Home:** hero pane cycling app recordings (`←/→`, app name in title bar);
  gallery below, framework as first card.
- **App page:** recording → pitch → status badge → install
  (`mise use -g github:andycmaj/<app>`) → features → keybindings (generated from
  the app's `keymap`) → config → repo link.
- **Demos:** asciinema recordings of the real app in `--demo` mode (fixture data
  via `DataSource<T>`), `default` theme only, one recording per app. Driven by
  tmux `send-keys` from a key-sequence file in each app repo. Played with
  asciinema-player.
- **Framework docs at launch:** overview, Quick Start, keymaps guide (backed by
  a new keymaps example program + recording), TypeDoc API reference, changelog.
  Latest version only.
- **Look:** readable docs layout; header, nav, code blocks and demos drawn as TUI
  panes in the OpenCode palette. Mono font for chrome/headings/code,
  proportional for prose.
- **Themes:** toggle over `default`, `tokyo-night`, `terminal` (follows OS
  light/dark; site light mode), `mono`. Affects site chrome only — recordings
  stay `default`, framed as terminal windows.
- **Keys:** `ctrl+k`/`ctrl+p` palette, `/` search (Pagefind), `t` cycle theme,
  `?` help, `j`/`k` lists. Keybind footer on desktop, hidden on mobile.
- **Build triggers:** push to this repo, `repository_dispatch` from app release
  workflows, nightly cron.
- **No analytics.** No theme-override env var in the framework.

## Phase 1 — Site skeleton + theme tokens

1. Scaffold `apps/site` (Astro, `@astrojs/solid-js`, `@astrojs/mdx`). Add to
   workspaces; add `dev:site` / `build:site` root scripts; extend `typecheck`.
2. `src/theme/tokens.ts`: import `defaultTheme`, `tokyoNightTheme`, etc. from
   `packages/core/src/theme/theme.ts` (relative import, no runtime deps beyond
   `color.ts`) and emit CSS custom properties (`--bg`, `--pane`, `--text`,
   `--muted`, `--border`, `--border-active`, `--primary`, …) per
   `[data-theme=…]`. `terminal` gets a `prefers-color-scheme` light/dark pair;
   `mono` grayscale. Single source of truth: site colors cannot drift from core.
3. Layout primitives as Astro components: `Pane` (box border, title in top
   edge, focus ring = `--border-active`), `PaneHeader`, `StatusBadge`,
   `KeyHint`, `Footer`. Fonts: self-hosted mono (e.g. JetBrains Mono) +
   proportional body.
4. Base layout: header pane (logo "panes", nav: Apps / Framework / Changelog,
   theme indicator), main content, keybind footer.

Verify: `bun run build:site` succeeds; every theme renders header/footer/panes
with correct tokens; 400px width has no horizontal scroll.

## Phase 2 — Keyboard islands + search

1. Solid island `KeyController`: global key handling (`t`, `?`, `/`, `j`/`k`,
   `ctrl+k`/`ctrl+p`), ignored while typing in inputs. Theme persisted in
   `localStorage` (try/catch), applied pre-paint via inline script to avoid flash.
2. `CommandPalette` island styled like core's `CommandPalette`: pages + actions
   (switch theme, copy install command), fuzzy filter.
3. `?` help modal listing site keys (mirrors `KeyboardHelp`).
4. Pagefind: run after `astro build`; `/` opens search inside palette-style modal.

Verify: all keys work on home + a docs page; palette navigates; search finds
Quick Start text.

## Phase 3 — Content model + framework docs

1. Astro content collections: `apps` (one MDX per app: name, pitch, status,
   repo, install, features, config) and `docs` (guides).
2. Pages: `/`, `/apps/[slug]`, `/framework`, `/framework/quick-start`,
   `/framework/guides/keymaps`, `/framework/api/…`, `/changelog`.
3. Draft app copy from each app's README for user editing.
4. Overview + Quick Start adapted from the root `README.md`.
5. TypeDoc + `typedoc-plugin-markdown` on `packages/core/src/index.ts` →
   generated markdown into `apps/site/src/content/api` (gitignored), rendered in
   site layout. Fall back to a custom extractor only if output fights the design.
6. Changelog page from GitHub releases of this repo (fetched at build via
   `gh api` / REST, token from CI).

Verify: every exported symbol in core has an API page; no broken internal links
(`astro check` + a link checker).

## Phase 4 — Keymaps example program

1. Restructure `apps/example` into multiple entry points: `src/examples/keymaps/`
   (focused demo of scopes, `baseAppBindings`, `navBindings`, footer/help
   derivation). Keep the current two-pane demo as `src/examples/basic/`.
2. Keymaps guide embeds the example source directly from the file (Astro
   `?raw` import), so the guide shows type-checked code.

Verify: `bun run typecheck`; example runs via `bun run dev:example keymaps`.

## Phase 5 — Demo mode + recordings

1. Core: `createFixtureSource<T>(frames: T[] | T, opts?)` in `src/data` —
   a `DataSource<T>` that serves fixture data (optionally stepping through
   frames on `refresh` / timer). Tests in `data-source.test.ts`. Release core.
2. Each app repo (`tilt-tui`, `ghdash`, `kube-tui`): `--demo` flag swaps real
   sources for fixture sources; fixtures in `src/demo/`; key-sequence file
   `demo/demo.keys` (one step per line: keys + delay). Separate PRs per repo.
3. Recorder script `apps/site/scripts/record.ts`: for an app checkout, start
   tmux session at fixed size (e.g. 120×36), run
   `asciinema rec -c "<app> --demo" out.cast`, replay `demo.keys` via
   `tmux send-keys`, quit, write `public/casts/<app>.cast`. Same script records
   the keymaps example.
4. `Recording` island wrapping asciinema-player (loaded from
   `cdn.jsdelivr.net/npm/asciinema-player` or bundled), inside a `Pane`
   titled with the app name; poster frame for no-JS.

Verify: each cast plays in the site; replay is deterministic across two runs.

## Phase 6 — Generated keybindings

1. Script `apps/site/scripts/extract-keymap.ts`: run per app checkout with
   `bun --conditions=browser --preload @opentui/solid/preload`, import
   `src/keymap.ts`, serialize `KeymapTable` → `{scope: [{key, desc, help}]}`
   JSON into `src/data/keymaps/<app>.json`.
2. `KeybindingsTable` component groups by scope, renders keys with `KeyHint`.

Verify: tables match each app's `?` help screen.

## Phase 7 — Home page

1. Hero: large `Pane` cycling the three app casts; title bar shows app name;
   `←/→` and on-screen arrows switch; auto-advance on cast end.
2. Gallery: framework card first ("the engine all of these are built on"),
   then app cards with status badge, pitch, mini poster.

## Phase 8 — CI / deploy

1. `.github/workflows/site.yml`: triggers `push` (main), `repository_dispatch`
   (`type: app-released`), `schedule` (nightly), `workflow_dispatch`.
   Steps: checkout this repo + app repos (public) → install Bun, tmux, asciinema
   → build apps' demo binaries / run from source → record casts → extract
   keymaps → TypeDoc → `astro build` → Pagefind → deploy via
   `actions/deploy-pages`.
2. Each app's release workflow: add a step sending `repository_dispatch` to
   `andycmaj/opentui-app` (needs a fine-grained PAT secret).
3. Enable Pages (source: GitHub Actions).

Verify: manual `workflow_dispatch` deploys; site live at Pages URL.

## Open follow-ups (not at launch)

- Remaining guides: focus/panes, theming, data sources, log view, modals/palette.
- Per-theme recordings (color remap at build) if single-theme casts look off.
- `dotsync` page once public with releases.
- Custom domain; live server-backed demos (ghostty-web + PTY).

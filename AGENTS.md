# Agent notes for @andycmaj/opentui-app

A Bun workspace monorepo: `packages/core` (the `@andycmaj/opentui-app` library) and
`apps/example` (a demo consuming it). The library was extracted from three
sibling TUIs (`~/dev/tilt-tui-root`, `~/dev/dotsync`, `ghdash-tui`, now [its own repo](https://github.com/andycmaj/ghdash-tui)
consuming the published package); those
remain the reference for conventions.

## Runtime & tooling

- **Bun, not Node.** Use `Bun.file`, `Bun.$`, `bun test`, `bun build`. Node-only
  types (no DOM/browser types in app logic).
- `bun run dev:example` runs the demo. Dev scripts must pass
  `--conditions=browser --preload @opentui/solid/preload`; this is what enables
  the Solid JSX transform and reactivity resolution.
- **No global preload in `bunfig.toml`** — it crashes plain utility scripts.
  Only the paths that need the transform opt in themselves.
- `tsconfig.base.json` holds the shared incantation: `jsx: "preserve"`,
  `jsxImportSource: "@opentui/solid"`, `moduleResolution: "bundler"`,
  `customConditions: ["browser"]`, strict.

## Conventions

- Files kebab-case (`use-key-handler.ts`); components PascalCase; hooks `useX`.
- Enums as `const X = {...} as const; type X = (typeof X)[keyof typeof X]` —
  never TS `enum`.
- No `any`. Explicit return types on public APIs.
- Comments explain **why**, not what. No JSDoc noise.
- Read Solid props lazily (`props.x`, no destructuring) to preserve reactivity.
- **Inside `packages/core`, use relative imports, never the `@/` alias** — a
  consumer's bundler resolves the library's imports against the library, so `@/`
  would break for downstream apps. Apps may use `@/` for their own `src`.

## Verify

```sh
bun run typecheck        # tsc --noEmit on both packages
bun test                 # pure-logic tests (color, keymap, data)
bun run dev:example      # drive the TUI; test via `tmux capture-pane`
```

## Adding a new app

1. Create `apps/<name>` with a `package.json` depending on
   `"@andycmaj/opentui-app": "workspace:*"` plus the `@opentui/*` + `solid-js` peers,
   a `tsconfig.json` extending `../../tsconfig.base.json` (add its own `@/*`
   path), and a `bunfig.toml` with no global preload.
2. `src/index.tsx`: `await runApp(() => <App />)`.
3. `src/app.tsx`: the provider stack
   `ThemeProvider → FocusProvider → ToastProvider → KeymapProvider`, then your
   shell + `<Toast />`.
4. Define `commands.ts` (`{ ...BaseCommands, ... }`), write `keymap.ts` as a
   `KeymapTable` keyed by scope (`app: baseAppBindings`, one entry per pane from
   `navBindings()` + your bindings), give each pane `<Pane name>` / `usePane`
   and register its handlers with `useScope`, and implement a
   `DataSource<T>` for your domain. Keep domain/data logic free of opentui/solid
   imports so it stays unit-testable, mirroring the reference apps.

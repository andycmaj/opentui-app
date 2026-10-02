# @andycmaj/opentui-app

An app framework + design library for [`@opentui/solid`](https://github.com/sst/opentui)
terminal UIs, extracted from three production TUIs (`tilt-tui`, `dotsync`,
`ghdash-tui`) that had independently converged on the same skeleton.

New apps `bun add @andycmaj/opentui-app` and supply only their domain (a data source,
commands, and screens); the framework provides everything else.

## Layout

```
packages/core     @andycmaj/opentui-app — the framework + design library
apps/example       a minimal two-pane demo consuming the library
```

## What the library gives you

| Area           | Exports                                                                                                                                                      |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Boot**       | `runApp` (render + ErrorBoundary + process handlers), `emergencyExit`                                                                                        |
| **Keyboard**   | `BaseCommands`, `baseAppBindings`, `navBindings`, `modalNavBindings`, `useScope`, `KeymapProvider` (on `@opentui/keymap`), help/footer derivations           |
| **Theme**      | `ThemeProvider`, `useTheme`, four terminal-adaptive themes, `getModalTheme`, color math, `focusBorder`                                                       |
| **Context**    | `FocusProvider` + `usePane` (real-focus panes/sidebar/modal), `ToastProvider`, `createRequiredContext`                                                       |
| **Data**       | `DataSource<T>` seam, `createAsyncState`, `makeGuard` (unopinionated — bring your own fetching)                                                              |
| **Components** | `Modal`/`ModalHeader`/`ModalFilterInput`, `CommandPalette`, `KeyboardHelp`, `StatusIndicator`, `Footer`, `PaneHeader`, `Card`, `Toast`, `Marker`, `Markdown` |
| **Hooks**      | `useListNavigation` (filterable), `useListCursor` (in-place cursor)                                                                                          |
| **Utils**      | `openUrl`, `copyToClipboard` (cross-platform incl. WSL), `createConfigStore`, `truncate`                                                                     |

## Quick start

```tsx
import {
  runApp,
  ThemeProvider,
  FocusProvider,
  ToastProvider,
  KeymapProvider,
} from "@andycmaj/opentui-app";

await runApp(() => (
  <ThemeProvider name="default">
    <FocusProvider panes={["list", "detail"]}>
      <ToastProvider>
        <KeymapProvider keymap={keymap}>
          <AppContent />
        </KeymapProvider>
      </ToastProvider>
    </FocusProvider>
  </ThemeProvider>
));
```

Keybindings are one declarative table, keyed by scope. `app` applies anywhere
in the pane layout; a pane's scope applies while focus is within that pane:

```ts
import {
  baseAppBindings,
  navBindings,
  type KeymapTable,
} from "@andycmaj/opentui-app";

export const keymap: KeymapTable = {
  app: baseAppBindings,
  list: [
    ...navBindings(),
    { key: "return", cmd: "item.open", desc: "open", help: "open" },
  ],
  detail: navBindings(),
};
```

Dispatch runs on [`@opentui/keymap`](https://opentui.com/docs/keymap/overview/).
Panes are real OpenTUI focus targets (`<Pane name="list">`, or `usePane` for a
custom box), and each registers its scope's handlers as a focus-within layer:

```tsx
let pane: Renderable | undefined;
useScope(
  "list",
  { [BaseCommands.NAV_DOWN]: () => cursor.move(1) },
  { target: () => pane },
);
return (
  <Pane name="list" ref={(r) => (pane = r)}>
    …
  </Pane>
);
```

A key reaches exactly one handler: the innermost focused scope, then the app
scope. `Modal` takes focus into its own high-priority layer, so pane and app
keys are unreachable while it's open, and typing in its filter input never
triggers them. Closing it returns focus to the previous pane.

The `Footer` and `CommandPalette` read the bindings reachable from the active
pane, and `KeyboardHelp` reads the table, so a binding is described exactly
once.

## The data seam

The framework takes no position on _how_ you fetch. Implement `DataSource<T>`
however you like — Effection, `createResource`, plain promises — and use
`createAsyncState` for the loading/error/data store and `makeGuard` to turn a
failed mutation into an error toast:

```ts
const store = createAsyncState<Item[]>([]);
const guard = makeGuard(showToast, () => refresh());
await guard("Save", () => api.save(item)); // toasts "Save failed: ..." on throw
```

See `apps/example/src/data.ts` for a fully in-memory implementation.

## Develop

```sh
bun install
bun run dev:example     # run the demo TUI
bun run typecheck       # both packages
bun test                # pure-logic unit tests
bun run lint            # oxlint (type-aware)
bun run format          # oxfmt
```

The demo exercises every primitive: two panes, cursor nav (`j`/`k`/`g`/`G`),
`Tab` pane cycling, `Ctrl-E` sidebar toggle, `:` command palette, `?` help, `r`
refresh toast, and `t` to cycle all four themes.

## Consuming from another repo

Apps outside this workspace (e.g. [`ghdash-tui`](https://github.com/andycmaj/ghdash-tui))
install the published package, plus its peers:

```sh
bun add @andycmaj/opentui-app @opentui/core @opentui/solid solid-js
```

The `@opentui/*` and `solid-js` peers must resolve to a **single copy** shared
with the framework — Solid contexts (including opentui's `RendererContext`) are
identity-based, so two copies means `useRenderer()` in app code can't see the
provider the framework's `render()` installed ("No renderer found"). Installing
from the registry gets this for free; a `file:` symlink to `packages/core` does
**not**, because the symlink's peers resolve from _this_ repo's `node_modules`.
To test unreleased framework changes in a consumer, install a packed tarball:

```sh
cd packages/core && bun pm pack --destination /path/to/app/.vendor
# in the consuming app:
#   "@andycmaj/opentui-app": "file:.vendor/andycmaj-opentui-app-<version>.tgz"
bun install
```

## Releasing

Run the **Release** workflow (Actions → Release → Run workflow) on `main`,
choosing a `patch`/`minor`/`major` bump or an explicit version. It typechecks
and tests, bumps `packages/core/package.json`, tags `vX.Y.Z`, `bun publish`es
to npm, and publishes a GitHub release. Requires an `NPM_TOKEN` repo secret
with publish rights to the `@andycmaj` scope.

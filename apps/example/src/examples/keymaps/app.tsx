// The keymaps example: an app scope and two pane scopes, with a dispatch log
// that shows which scope handled every key.

import { createMemo, Show } from "solid-js";
import type { Renderable } from "@opentui/core";
import { useRenderer } from "@opentui/solid";
import {
  CommandPalette,
  FocusProvider,
  Footer,
  KeyboardHelp,
  KeymapProvider,
  ThemeProvider,
  Toast,
  ToastProvider,
  useFocus,
  useScope,
  useTheme,
  useToast,
  type PaletteAction,
} from "@andycmaj/opentui-app";
import { Commands } from "./commands";
import { createDispatchLog } from "./dispatch-log";
import { keymap, PANES } from "./keymap";
import { ColorsPane } from "./colors-pane";
import { LogPane } from "./log-pane";

export function App() {
  return (
    <ThemeProvider name="default">
      <FocusProvider panes={PANES}>
        <ToastProvider>
          <KeymapProvider keymap={keymap}>
            <Shell />
            <Toast />
          </KeymapProvider>
        </ToastProvider>
      </FocusProvider>
    </ThemeProvider>
  );
}

function Shell() {
  const renderer = useRenderer();
  const theme = useTheme();
  const { showToast } = useToast();
  const { cyclePane, toggleSidebar, activeModal, openModal, closeModal } =
    useFocus();
  const log = createDispatchLog();

  function quit(): void {
    renderer.destroy();
    process.exit(0);
  }

  // The app scope is active anywhere in the pane layout, but not while a modal
  // holds focus: the modal's own layer shadows it.
  let layout: Renderable | undefined;
  const track = (cmd: string, run: () => unknown) => log.track("app", cmd, run);
  useScope(
    "app",
    {
      [Commands.APP_QUIT]: quit,
      [Commands.PALETTE_OPEN]: track(Commands.PALETTE_OPEN, () =>
        openModal("palette"),
      ),
      [Commands.HELP_OPEN]: track(Commands.HELP_OPEN, () => openModal("help")),
      [Commands.FOCUS_NEXT]: track(Commands.FOCUS_NEXT, cyclePane),
      [Commands.SIDEBAR_TOGGLE]: track(Commands.SIDEBAR_TOGGLE, toggleSidebar),
      [Commands.SAVE]: track(Commands.SAVE, () => showToast("Saved")),
      [Commands.LOG_CLEAR]: log.clear,
    },
    { target: () => layout },
  );

  const actions = createMemo<PaletteAction[]>(() => [
    { id: "save", label: "Save", hint: "s", run: () => showToast("Saved") },
    { id: "clear", label: "Clear the dispatch log", hint: "x", run: log.clear },
    {
      id: "help",
      label: "Keyboard help",
      hint: "?",
      run: () => openModal("help"),
    },
  ]);

  return (
    <box
      flexDirection="column"
      width="100%"
      height="100%"
      backgroundColor={theme.background}
    >
      <box
        ref={(r: Renderable) => (layout = r)}
        flexDirection="row"
        flexGrow={1}
      >
        <ColorsPane log={log} />
        <LogPane log={log} />
      </box>
      {/* The colors pane is 30 wide plus its frame margin. */}
      <Footer sidebarWidth={32} />

      <Show when={activeModal() === "palette"}>
        <CommandPalette actions={actions()} onClose={closeModal} />
      </Show>
      <Show when={activeModal() === "help"}>
        <KeyboardHelp
          onClose={closeModal}
          scopeLabels={{
            app: "Anywhere",
            colors: "Colors pane",
            log: "Dispatch log",
          }}
          scopeOrder={["app", "colors", "log"]}
        />
      </Show>
    </box>
  );
}

// App shell: the provider stack and the two-pane layout with modals.

import { createMemo, createSignal, onMount, Show } from "solid-js";
import type { Renderable } from "@opentui/core";
import { useRenderer } from "@opentui/solid";
import {
  CommandPalette,
  Footer,
  StatusIndicator,
  KeyboardHelp,
  KeymapProvider,
  ThemeProvider,
  Toast,
  ToastProvider,
  FocusProvider,
  THEME_NAMES,
  useFocus,
  useScope,
  useTheme,
  useToast,
  type PaletteAction,
  type ThemeName,
} from "@andycmaj/opentui-app";
import { Commands } from "./commands";
import { keymap, PANES } from "./keymap";
import { createTaskDataSource } from "./data";
import { List } from "./components/list";
import { Detail } from "./components/detail";

export function App() {
  const [themeName, setThemeName] = createSignal<ThemeName>("default");

  function cycleTheme(): ThemeName {
    const idx = THEME_NAMES.indexOf(themeName());
    const next = THEME_NAMES[(idx + 1) % THEME_NAMES.length];
    setThemeName(next);
    return next;
  }

  return (
    <ThemeProvider name={themeName()}>
      <FocusProvider panes={PANES}>
        <ToastProvider>
          <KeymapProvider keymap={keymap}>
            <AppContent cycleTheme={cycleTheme} themeName={themeName} />
            <Toast />
          </KeymapProvider>
        </ToastProvider>
      </FocusProvider>
    </ThemeProvider>
  );
}

interface AppContentProps {
  cycleTheme: () => ThemeName;
  themeName: () => ThemeName;
}

function AppContent(props: AppContentProps) {
  const renderer = useRenderer();
  const theme = useTheme();
  const { showToast } = useToast();
  const {
    cyclePane,
    toggleSidebar,
    sidebarVisible,
    setActivePane,
    activeModal,
    openModal,
    closeModal,
  } = useFocus();

  const data = createTaskDataSource();
  const tasks = () => data.state.data ?? [];
  const [selected, setSelected] = createSignal(0);
  const selectedTask = () => tasks()[selected()];

  onMount(() => void data.refresh());

  function quit() {
    renderer.destroy();
    process.exit(0);
  }

  function refresh() {
    void data.refresh();
    showToast("Refreshed");
  }

  function doCycleTheme() {
    const next = props.cycleTheme();
    showToast(`Theme: ${next}`);
  }

  function openTask(index: number) {
    setSelected(index);
    setActivePane("detail");
  }

  // App-wide bindings, active while focus is anywhere in the pane layout (so
  // not while a modal holds focus).
  let layout: Renderable | undefined;
  useScope(
    "app",
    {
      [Commands.APP_QUIT]: quit,
      [Commands.PALETTE_OPEN]: () => openModal("palette"),
      [Commands.HELP_OPEN]: () => openModal("help"),
      [Commands.FOCUS_NEXT]: cyclePane,
      [Commands.SIDEBAR_TOGGLE]: toggleSidebar,
      [Commands.REFRESH]: refresh,
      [Commands.THEME_CYCLE]: doCycleTheme,
    },
    { target: () => layout },
  );

  const paletteActions = createMemo<PaletteAction[]>(() => [
    { id: "refresh", label: "Refresh data", hint: "r", run: refresh },
    {
      id: "theme",
      label: `Cycle theme (current: ${props.themeName()})`,
      hint: "t",
      run: doCycleTheme,
    },
    {
      id: "help",
      label: "Keyboard help",
      hint: "?",
      run: () => openModal("help"),
    },
    ...tasks().map<PaletteAction>((task, index) => ({
      id: `task-${task.id}`,
      label: `Open: ${task.title}`,
      group: "Tasks",
      run: () => openTask(index),
    })),
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
        <Show when={sidebarVisible()}>
          <List
            tasks={tasks}
            onSelect={setSelected}
            onOpen={() => openTask(selected())}
          />
        </Show>
        <Detail task={selectedTask} />
      </box>

      <Show when={!sidebarVisible()}>
        <StatusIndicator
          status={`opentui-app demo · ${props.themeName()}`}
          right={`${data.refreshCount()} loads`}
        />
      </Show>

      <Footer />

      <Show when={activeModal() === "palette"}>
        <CommandPalette actions={paletteActions()} onClose={closeModal} />
      </Show>
      <Show when={activeModal() === "help"}>
        <KeyboardHelp
          onClose={closeModal}
          scopeLabels={{ app: "Global", list: "Task List", detail: "Detail" }}
          scopeOrder={["app", "list", "detail"]}
          footer="@andycmaj/opentui-app demo"
        />
      </Show>
    </box>
  );
}

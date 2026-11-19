// A generic, filterable command palette. Apps supply the actions; the palette
// handles filtering, navigation, and running the selected action. Built on the
// modal kit so it inherits the opaque adaptive surface and escape-to-close.
//
// Optional modes: once any action says whether it applies in the app's current
// context (inContext), the palette opens on just those and a footer toggles to
// all of them. The app owns the mode so it can reopen where the user left off.

import { createMemo, createSignal, For, Show } from "solid-js";
import type { ScrollBoxRenderable } from "@opentui/core";
import { TextAttributes } from "@opentui/core";
import { useTerminalDimensions } from "@opentui/solid";
import { useTheme } from "../theme";
import { contrastingForeground } from "../theme/color";
import { useListNavigation } from "../hooks/use-list-navigation";
import { truncate } from "../utils/truncate";
import { ModalCommands } from "../keyboard/commands";
import { modalNavBindings } from "../keyboard/keymap";
import { Modal, ModalHeader, ModalFilterInput, modalListRows } from "./modal";

export interface PaletteAction {
  id: string;
  label: string;
  hint?: string;
  // Actions sharing a group render together under a header, groups in order
  // of first appearance. Ungrouped actions form a header-less section.
  group?: string;
  // Whether the action applies to what the user is on. Setting it on any
  // action (true or false) turns the palette's modes on.
  inContext?: boolean;
  run: () => void;
}

export const PaletteMode = {
  CONTEXT: "context",
  ALL: "all",
} as const;
export type PaletteMode = (typeof PaletteMode)[keyof typeof PaletteMode];

interface CommandPaletteProps {
  actions: PaletteAction[];
  title?: string;
  placeholder?: string;
  // The mode to show, when actions carry inContext. Left out, the palette
  // opens in context mode and keeps the mode itself.
  mode?: PaletteMode;
  onModeChange?: (mode: PaletteMode) => void;
  onClose: () => void;
}

interface PaletteSection {
  group?: string;
  actions: PaletteAction[];
}

const HINT_MAX = 24;
// The list's height on a tall terminal; a short one gets fewer rows.
const LIST_ROWS = 14;
// The header (a blank row and the title) and the filter (input between blank
// rows) above the list.
const ABOVE_LIST_ROWS = 5;
// The mode footer: a blank row, then the toggle. It replaces the list's bottom
// padding, which would otherwise scroll away from it.
const FOOTER_ROWS = 2;
const TOGGLE = "palette.mode.toggle";
const MODE_LABELS: Record<PaletteMode, string> = {
  context: "Context",
  all: "All",
};

function matches(action: PaletteAction, q: string): boolean {
  return [action.label, action.group, action.hint].some(
    (field) => field?.toLowerCase().includes(q) ?? false,
  );
}

export function CommandPalette(props: CommandPaletteProps) {
  const theme = useTheme();
  const dimensions = useTerminalDimensions();
  let scrollRef: ScrollBoxRenderable | undefined;

  const hasModes = createMemo(() =>
    props.actions.some((a) => a.inContext !== undefined),
  );
  const [ownMode, setOwnMode] = createSignal<PaletteMode>(
    props.mode ?? PaletteMode.CONTEXT,
  );
  const mode = (): PaletteMode =>
    hasModes() ? (props.mode ?? ownMode()) : PaletteMode.ALL;

  function toggleMode(): boolean | undefined {
    // Without modes tab isn't the palette's, so let it fall through.
    if (!hasModes()) return false;
    const next =
      mode() === PaletteMode.CONTEXT ? PaletteMode.ALL : PaletteMode.CONTEXT;
    setOwnMode(next);
    props.onModeChange?.(next);
    nav.setSelected(0);
    scrollRef?.scrollTo(0);
    return undefined;
  }

  // The footer takes its rows from the list, so on a short terminal the list
  // shrinks and the footer stays on screen.
  const listRows = createMemo(() =>
    modalListRows(
      LIST_ROWS,
      ABOVE_LIST_ROWS + (hasModes() ? FOOTER_ROWS : 0),
      dimensions().height,
    ),
  );

  // Header rows (and the gap above every header but the first) shift item
  // rows, so scroll sync works in rows rather than item indexes.
  const nav = useListNavigation({
    itemCount: () => flat().length,
    scrollRef: () => scrollRef,
    // The scrollbox's padding scrolls with its content, so every one of its
    // rows can hold an item.
    visibleItems: listRows,
    rowOf: (index) => {
      let row = 0;
      let seen = 0;
      for (const [i, section] of sections().entries()) {
        if (section.group !== undefined) row += i > 0 ? 2 : 1;
        if (index < seen + section.actions.length) return row + index - seen;
        row += section.actions.length;
        seen += section.actions.length;
      }
      return row;
    },
  });

  const query = (): string => nav.filter().toLowerCase();
  const inMode = (action: PaletteAction): boolean =>
    mode() === PaletteMode.ALL || action.inContext === true;
  // Matches in All, for pointing at them from an empty context list.
  const allMatches = createMemo(
    () => props.actions.filter((a) => !query() || matches(a, query())).length,
  );

  const sections = createMemo<PaletteSection[]>(() => {
    const q = query();
    const byGroup = new Map<string | undefined, PaletteAction[]>();
    for (const action of props.actions) {
      if (!inMode(action)) continue;
      if (q && !matches(action, q)) continue;
      const list = byGroup.get(action.group);
      if (list) list.push(action);
      else byGroup.set(action.group, [action]);
    }
    return [...byGroup].map(([group, actions]) => ({ group, actions }));
  });

  // Selection indexes the flattened sections, so it follows display order.
  const flat = createMemo(() => sections().flatMap((s) => s.actions));
  const hasHeaders = createMemo(() =>
    sections().some((s) => s.group !== undefined),
  );

  const emptyText = (): string => {
    if (mode() === PaletteMode.CONTEXT) {
      if (!query()) {
        return `Nothing to do on this row. tab shows all ${props.actions.length}.`;
      }
      if (allMatches() > 0)
        return `No match here. ${allMatches()} in All (tab).`;
    }
    return "No matching commands";
  };

  function runSelected() {
    const action = flat()[nav.selected()];
    if (action) {
      props.onClose();
      action.run();
    }
  }

  return (
    <Modal
      size="lg"
      onClose={props.onClose}
      bindings={[
        ...modalNavBindings,
        { key: "tab", cmd: TOGGLE, desc: "switch" },
        { key: "shift+tab", cmd: TOGGLE, desc: "switch" },
      ]}
      commands={{
        [ModalCommands.MODAL_DOWN]: () => nav.move(1),
        [ModalCommands.MODAL_UP]: () => nav.move(-1),
        [ModalCommands.MODAL_SELECT]: runSelected,
        [TOGGLE]: toggleMode,
      }}
    >
      <ModalHeader title={props.title ?? "Commands"} hint="↵ run · esc" />
      <ModalFilterInput
        onInput={nav.setFilter}
        placeholder={props.placeholder ?? "Type to filter commands..."}
      />
      <scrollbox
        ref={(r: ScrollBoxRenderable) => (scrollRef = r)}
        maxHeight={listRows()}
        paddingLeft={2}
        paddingRight={2}
        paddingBottom={hasModes() ? 0 : 1}
      >
        <Show
          when={flat().length > 0}
          fallback={<text fg={theme.textMuted}>{emptyText()}</text>}
        >
          <For each={sections()}>
            {(section, sectionIndex) => (
              <>
                <Show when={section.group}>
                  <box paddingTop={sectionIndex() > 0 ? 1 : 0}>
                    <text fg={theme.accent} attributes={TextAttributes.BOLD}>
                      {section.group}
                    </text>
                  </box>
                </Show>
                <For each={section.actions}>
                  {(action) => {
                    const selected = () => flat()[nav.selected()] === action;
                    return (
                      <box
                        flexDirection="row"
                        justifyContent="space-between"
                        backgroundColor={selected() ? theme.primary : undefined}
                        paddingLeft={hasHeaders() ? 2 : 1}
                        paddingRight={1}
                      >
                        <text
                          fg={
                            selected()
                              ? contrastingForeground(theme.primary)
                              : theme.text
                          }
                          attributes={selected() ? TextAttributes.BOLD : 0}
                        >
                          {action.label}
                        </text>
                        <Show when={action.hint}>
                          {(hint) => (
                            <text
                              fg={
                                selected()
                                  ? contrastingForeground(theme.primary)
                                  : theme.textMuted
                              }
                            >
                              {truncate(hint(), HINT_MAX)}
                            </text>
                          )}
                        </Show>
                      </box>
                    );
                  }}
                </For>
              </>
            )}
          </For>
        </Show>
      </scrollbox>
      <Show when={hasModes()}>
        <ModeFooter mode={mode()} />
      </Show>
    </Modal>
  );
}

// A segmented chip, the active mode on the accent, then the key that switches.
function ModeFooter(props: { mode: PaletteMode }) {
  const theme = useTheme();
  const segment = (m: PaletteMode) => {
    const active = (): boolean => props.mode === m;
    return (
      <box flexDirection="row">
        <text fg={theme.accent}>{active() ? "▌" : " "}</text>
        <text
          fg={active() ? contrastingForeground(theme.accent) : theme.textMuted}
          bg={active() ? theme.accent : undefined}
          attributes={active() ? TextAttributes.BOLD : 0}
        >
          {` ${MODE_LABELS[m]} `}
        </text>
        <text fg={theme.accent}>{active() ? "▐" : " "}</text>
      </box>
    );
  };
  return (
    <box
      flexDirection="row"
      justifyContent="space-between"
      paddingTop={1}
      paddingLeft={2}
      paddingRight={2}
    >
      <box flexDirection="row">
        {segment(PaletteMode.CONTEXT)}
        {segment(PaletteMode.ALL)}
      </box>
      <box flexDirection="row">
        <text fg={theme.text}>tab</text>
        <text fg={theme.textMuted}>{"  switch"}</text>
      </box>
    </box>
  );
}

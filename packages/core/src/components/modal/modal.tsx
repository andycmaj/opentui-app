// Shared modal shell - consistent positioning, opaque surface, escape-to-close.
// The modal's box takes focus on mount and owns a high-priority keymap layer,
// so while it's open the pane and app bindings are out of reach. A border and a
// backdrop set it apart from the screen behind (see chrome.ts).

import {
  createEffect,
  createMemo,
  onCleanup,
  onMount,
  type JSX,
} from "solid-js";
import type { BoxRenderable, OptimizedBuffer } from "@opentui/core";
import { useRenderer, useTerminalDimensions } from "@opentui/solid";
import { ModalCommands } from "../../keyboard/commands";
import type { BindingSpec } from "../../keyboard/keymap";
import {
  MODAL_PRIORITY,
  useScope,
  type CommandHandlers,
} from "../../keyboard/use-scope";
import {
  ThemeContext,
  useTheme,
  useThemeName,
  useTerminalSurface,
} from "../../theme/context";
import { getModalTheme } from "../../theme/theme";
import {
  BORDER_CELLS,
  backdropColor,
  drawFrame,
  frameGlyphs,
  modalBorderColor,
} from "./chrome";
import { pushModalLayer } from "./modal-stack";
import { resolvePadding, type Padding } from "./padding";

export type ModalSize = "sm" | "md" | "lg";

// Preferred width per size; the actual width is clamped to the terminal so the
// modal never overflows a narrow pane (e.g. a half-width tmux split).
export const SIZE_CONFIG: Record<ModalSize, { width: number }> = {
  sm: { width: 50 },
  md: { width: 60 },
  lg: { width: 100 },
};

// Leave a couple of columns of breathing room on each side of the modal.
const MODAL_MARGIN = 4;

// The width a modal actually gets: the preferred width, narrowed to fit the
// terminal but never below a usable minimum.
export function modalWidth(preferred: number, terminalWidth: number): number {
  const available = Math.max(20, terminalWidth - MODAL_MARGIN);
  return Math.min(preferred, available);
}

// Rows from the top of the screen to the modal's card.
export const MODAL_TOP = 2;

// A list never shrinks below this, however short the terminal.
const MIN_LIST_ROWS = 4;

// The rows a modal's scrolling list gets: its preferred height, cut so the
// card ends a row above the terminal's bottom edge and its frame stays whole.
// otherRows is everything else in the card: header, filter, padding, footer.
export function modalListRows(
  preferred: number,
  otherRows: number,
  terminalHeight: number,
): number {
  const room = terminalHeight - MODAL_TOP - BORDER_CELLS - 1 - otherRows;
  return Math.max(MIN_LIST_ROWS, Math.min(preferred, room));
}

export interface ModalProps {
  size?: ModalSize;
  // An exact preferred width in cells, for when no size fits; wins over size.
  // Still clamped to the terminal like the sizes are.
  width?: number;
  // Space between the modal's edge and its content. None by default.
  padding?: Padding;
  // A thin accent frame, added outside the width so content keeps its room.
  // On by default; false for the old borderless card.
  border?: boolean;
  // Fade the screen behind toward the app background. On by default; has no
  // effect under transparent themes.
  backdrop?: boolean;
  onClose: () => void;
  children: JSX.Element;
  // Keys beyond escape (e.g. modalNavBindings) and their handlers. Keep keys
  // non-printing in modals with a text field, so typing still reaches it.
  bindings?: BindingSpec[];
  commands?: CommandHandlers;
}

const CLOSE_BINDING: BindingSpec = {
  key: "escape",
  cmd: ModalCommands.MODAL_CLOSE,
  desc: "close",
};

export function Modal(props: ModalProps) {
  // Modals are overlays, so they need an opaque surface even when the active
  // theme is transparent; getModalTheme is a no-op for opaque themes. The
  // surface adapts to the detected terminal colors once available.
  const appTheme = useTheme();
  const themeName = useThemeName();
  const terminal = useTerminalSurface();
  const dimensions = useTerminalDimensions();
  const renderer = useRenderer();
  const modalTheme = createMemo(() => getModalTheme(themeName(), terminal()));
  const layer = pushModalLayer();
  onCleanup(layer.release);

  const bordered = (): boolean => props.border !== false;
  const width = createMemo(() =>
    modalWidth(
      (props.width ?? SIZE_CONFIG[props.size ?? "md"].width) +
        (bordered() ? BORDER_CELLS : 0),
      dimensions().width,
    ),
  );
  // The frame is drawn over a one-cell ring of padding, outside the caller's.
  const padding = createMemo(() => {
    const p = resolvePadding(props.padding);
    const ring = bordered() ? 1 : 0;
    return {
      top: p.top + ring,
      right: p.right + ring,
      bottom: p.bottom + ring,
      left: p.left + ring,
    };
  });
  const frameColor = createMemo(() =>
    modalBorderColor(modalTheme(), layer.isTop()),
  );
  const marginLeft = createMemo(() => -Math.floor(width() / 2));

  let box: BoxRenderable | undefined;

  useScope(
    "modal",
    { [ModalCommands.MODAL_CLOSE]: () => props.onClose(), ...props.commands },
    {
      target: () => box,
      priority: MODAL_PRIORITY,
      bindings: [CLOSE_BINDING, ...(props.bindings ?? [])],
    },
  );

  // Take focus synchronously: a filter input inside only focuses after a
  // short defer, and keys in between must not reach the pane behind.
  onMount(() => box?.focus());

  // The frame is drawn imperatively, so a color change (a popup opening over
  // this modal, a theme switch) has to ask for a repaint itself.
  createEffect(() => {
    frameColor();
    box?.requestRender();
  });

  function renderFrame(this: BoxRenderable, buffer: OptimizedBuffer): void {
    if (!bordered()) return;
    // Read per draw: the terminal's XTVERSION answer arrives after startup.
    const glyphs = frameGlyphs(
      process.env,
      renderer.capabilities?.terminal.name,
    );
    drawFrame(buffer, this, glyphs, frameColor(), modalTheme().contentPane);
  }

  // The backdrop box covers the modal's parent (the app root, in practice),
  // the same area the card centers itself in.
  return (
    <ThemeContext.Provider value={modalTheme()}>
      <box
        position="absolute"
        top={0}
        left={0}
        width="100%"
        height="100%"
        backgroundColor={
          props.backdrop === false ? "transparent" : backdropColor(appTheme)
        }
      >
        <box
          ref={(r: BoxRenderable) => (box = r)}
          focusable
          position="absolute"
          top={MODAL_TOP}
          left="50%"
          marginLeft={marginLeft()}
          width={width()}
          paddingTop={padding().top}
          paddingRight={padding().right}
          paddingBottom={padding().bottom}
          paddingLeft={padding().left}
          backgroundColor={modalTheme().contentPane}
          border={false}
          flexDirection="column"
          renderAfter={renderFrame}
        >
          {props.children}
        </box>
      </box>
    </ThemeContext.Provider>
  );
}

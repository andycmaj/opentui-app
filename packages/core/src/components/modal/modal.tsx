// Shared modal shell - consistent positioning, opaque surface, escape-to-close.
// The modal's box takes focus on mount and owns a high-priority keymap layer,
// so while it's open the pane and app bindings are out of reach.

import { createMemo, onMount, type JSX } from "solid-js";
import type { BoxRenderable } from "@opentui/core";
import { useTerminalDimensions } from "@opentui/solid";
import { ModalCommands } from "../../keyboard/commands";
import type { BindingSpec } from "../../keyboard/keymap";
import {
  MODAL_PRIORITY,
  useScope,
  type CommandHandlers,
} from "../../keyboard/use-scope";
import {
  ThemeContext,
  useThemeName,
  useTerminalSurface,
} from "../../theme/context";
import { getModalTheme } from "../../theme/theme";

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

interface ModalProps {
  size?: ModalSize;
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
  const themeName = useThemeName();
  const terminal = useTerminalSurface();
  const dimensions = useTerminalDimensions();
  const modalTheme = createMemo(() => getModalTheme(themeName(), terminal()));

  const width = createMemo(() => {
    const preferred = SIZE_CONFIG[props.size ?? "md"].width;
    const available = Math.max(20, dimensions().width - MODAL_MARGIN);
    return Math.min(preferred, available);
  });
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

  return (
    <ThemeContext.Provider value={modalTheme()}>
      <box
        ref={(r: BoxRenderable) => (box = r)}
        focusable
        position="absolute"
        top={2}
        left="50%"
        marginLeft={marginLeft()}
        width={width()}
        backgroundColor={modalTheme().contentPane}
        border={false}
        flexDirection="column"
      >
        {props.children}
      </box>
    </ThemeContext.Provider>
  );
}

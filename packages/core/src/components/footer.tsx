// Context-aware keybinding hints, generated from the keymap for the active
// pane. Collapses to just the "help" hint when the content area is narrow.

import { createMemo, For } from "solid-js";
import { useTerminalDimensions } from "@opentui/solid";
import { useTheme } from "../theme";
import { useFocus } from "../context/focus";
import { useHelpItems } from "../keyboard/use-help-items";

interface FooterProps {
  // Width reserved by the sidebar when visible (default 44 = width 42 + margins).
  sidebarWidth?: number;
  // Below this content width, only the "help" hint is shown (default 80).
  narrowThreshold?: number;
}

export function Footer(props: FooterProps) {
  const { sidebarVisible } = useFocus();
  const theme = useTheme();
  const dimensions = useTerminalDimensions();

  const contentWidth = createMemo(() => {
    const terminalWidth = dimensions().width;
    return sidebarVisible()
      ? terminalWidth - (props.sidebarWidth ?? 44)
      : terminalWidth;
  });

  const allHelpItems = useHelpItems();

  const helpItems = createMemo(() => {
    const items = allHelpItems();
    if (contentWidth() < (props.narrowThreshold ?? 80)) {
      return items.filter((item) => item.text === "help");
    }
    return items;
  });

  return (
    <box
      padding={1}
      paddingBottom={0}
      paddingLeft={2}
      paddingRight={2}
      flexShrink={0}
      flexDirection="row"
      justifyContent="space-between"
    >
      <box flexDirection="row" flexShrink={1}>
        <For each={helpItems()}>
          {(item, index) => (
            <>
              {index() > 0 && <text fg={theme.textMuted}> · </text>}
              <text fg={theme.primary}>{item.keys}</text>
              <text fg={theme.textMuted}> {item.text}</text>
            </>
          )}
        </For>
      </box>
    </box>
  );
}

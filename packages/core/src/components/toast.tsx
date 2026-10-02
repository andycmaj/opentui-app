// Transient toast banner, top-center. Error toasts get a wider, distinctly
// colored surface so they read as a problem rather than a confirmation.

import { Show } from "solid-js";
import { useTheme } from "../theme";
import { contrastingForeground } from "../theme/color";
import { useToast } from "../context/toast";

export function Toast() {
  const theme = useTheme();
  const { toast } = useToast();

  return (
    <Show when={toast()}>
      {(current) => {
        const isError = () => current().variant === "error";
        const bg = () =>
          isError()
            ? (theme.error ?? theme.primary ?? "#e06c75")
            : (theme.primary ?? "#fab283");
        const width = () => (isError() ? 50 : 30);

        return (
          <box
            position="absolute"
            top={1}
            left="50%"
            marginLeft={-Math.floor(width() / 2)}
            width={width()}
            backgroundColor={bg()}
            justifyContent="center"
            padding={1}
          >
            <text fg={contrastingForeground(bg())} wrapMode="word">
              {current().message}
            </text>
          </box>
        );
      }}
    </Show>
  );
}

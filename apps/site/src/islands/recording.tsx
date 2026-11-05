// A recorded terminal session (asciinema cast) played in the page, framed by
// the surrounding Pane. Loads the player only when it scrolls into view.

import { onCleanup, onMount, type JSX } from "solid-js";
import type { Player } from "asciinema-player";
import "asciinema-player/dist/bundle/asciinema-player.css";

interface RecordingProps {
  src: string | undefined;
  // Seconds into the cast to show before playback starts.
  posterAt?: number;
  autoPlay?: boolean;
  loop?: boolean;
}

export default function Recording(props: RecordingProps): JSX.Element {
  let container: HTMLDivElement | undefined;
  let player: Player | undefined;

  onMount(async () => {
    if (!container || !props.src) return;
    const { create } = await import("asciinema-player");
    player = create(props.src, container, {
      theme: "panes",
      fit: "width",
      autoPlay: props.autoPlay ?? false,
      loop: props.loop ?? true,
      idleTimeLimit: 1.5,
      poster: `npt:${props.posterAt ?? 3}`,
      terminalFontFamily: '"JetBrains Mono", ui-monospace, Menlo, monospace',
      controls: "auto",
    });
  });

  onCleanup(() => player?.dispose());

  return <div class="recording" ref={container} />;
}

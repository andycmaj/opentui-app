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
  // A still frame for a thumbnail: no controls, no pointer or keyboard focus,
  // so it never competes with the link it sits in.
  still?: boolean;
  onEnded?: () => void;
}

export default function Recording(props: RecordingProps): JSX.Element {
  let container: HTMLDivElement | undefined;
  let player: Player | undefined;
  let disposed = false;

  onMount(async () => {
    if (!container || !props.src) return;
    const { create } = await import("asciinema-player");
    // Unmounted while the player module loaded (the hero switched app).
    if (disposed) return;
    player = create(props.src, container, {
      theme: "opentui-apps",
      fit: "width",
      autoPlay: props.still ? false : (props.autoPlay ?? false),
      loop: props.still ? false : (props.loop ?? true),
      idleTimeLimit: 1.5,
      poster: `npt:${props.posterAt ?? 3}`,
      terminalFontFamily: '"JetBrains Mono", ui-monospace, Menlo, monospace',
      controls: props.still ? false : "auto",
    });
    const onEnded = props.onEnded;
    if (onEnded) player.addEventListener("ended", () => onEnded());
  });

  onCleanup(() => {
    disposed = true;
    player?.dispose();
  });

  return (
    <div
      class={props.still ? "recording recording--still" : "recording"}
      ref={container}
      aria-hidden={props.still ? "true" : undefined}
    />
  );
}

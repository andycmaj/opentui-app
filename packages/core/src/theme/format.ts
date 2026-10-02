// Presentation helpers that map generic app state to theme colors, borders, and
// human-readable strings. Kept app-agnostic — anything tied to a specific
// domain (PR status, check status, ...) belongs in the app, not here.

import type { BorderStyle, BorderSides, RGBA } from "@opentui/core";
import type { Theme, ThemeColor } from "./theme";

// Border props for focused panes - returns a props object to spread onto a box.
export type FocusBorderProps = {
  borderStyle?: BorderStyle;
  border?: boolean | BorderSides[];
  borderColor?: string | RGBA;
  // Panes are real focus targets; keep the focused box's border on the theme.
  focusedBorderColor?: string | RGBA;
};

export function focusBorder(
  theme: Theme,
  isFocused: boolean,
): FocusBorderProps {
  if (!isFocused) {
    return { border: false };
  }
  return {
    border: ["left"],
    borderColor: theme.secondary,
    focusedBorderColor: theme.secondary,
    borderStyle: "heavy",
  };
}

// A generic connection/liveness status many data-backed apps surface.
export type ConnectionStatus = "connected" | "connecting" | "disconnected";

export function connectionStatusIcon(status: ConnectionStatus): string {
  switch (status) {
    case "connected":
      return "●";
    case "connecting":
      return "◐";
    case "disconnected":
      return "○";
  }
}

export function connectionStatusColor(
  theme: Theme,
  status: ConnectionStatus,
): ThemeColor {
  switch (status) {
    case "connected":
      return theme.success;
    case "connecting":
      return theme.warning;
    case "disconnected":
      return theme.error;
  }
}

export function connectionStatusText(status: ConnectionStatus): string {
  switch (status) {
    case "connected":
      return "Connected";
    case "connecting":
      return "Connecting";
    case "disconnected":
      return "Disconnected";
  }
}

// Time formatting

export function formatRelativeTime(timestamp: string): string {
  if (!timestamp) return "";

  const t = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - t.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "just now";
  if (minutes === 1) return "1m ago";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours === 1) return "1h ago";
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "1d ago";
  if (days < 7) return `${days}d ago`;

  return t.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatDuration(durationMs: number): string {
  if (durationMs < 0) return "";

  if (durationMs < 1000) return `${durationMs}ms`;
  if (durationMs < 60000) return `${(durationMs / 1000).toFixed(1)}s`;

  const mins = Math.floor(durationMs / 60000);
  const secs = Math.floor((durationMs % 60000) / 1000);
  if (durationMs < 3600000) return `${mins}m${secs}s`;

  const hours = Math.floor(durationMs / 3600000);
  const remainingMins = Math.floor((durationMs % 3600000) / 60000);
  return `${hours}h${remainingMins}m`;
}

export function formatBuildDuration(
  startTime?: string,
  finishTime?: string,
): string {
  if (!startTime || !finishTime) return "";

  const start = new Date(startTime);
  const finish = new Date(finishTime);
  return formatDuration(finish.getTime() - start.getTime());
}

// Theme selection context - provides the active color scheme to the UI. The
// active theme is a reactive store so that foreground colors detected from the
// terminal (asynchronously, just after first render) flow into every consumer.

import {
  createContext,
  createEffect,
  createSignal,
  on,
  onMount,
  useContext,
  type Accessor,
  type ParentProps,
} from "solid-js";
import { createStore } from "solid-js/store";
import { useRenderer } from "@opentui/solid";
import {
  defaultTheme,
  getTheme,
  resolveForeground,
  type TerminalSurface,
  type Theme,
  type ThemeName,
} from "./theme";

export const ThemeContext = createContext<Theme>(defaultTheme);
const ThemeNameContext = createContext<Accessor<ThemeName>>(
  () => "default" as ThemeName,
);
const TerminalSurfaceContext = createContext<Accessor<TerminalSurface>>(
  () => null,
);

export function ThemeProvider(props: ParentProps<{ name?: ThemeName }>) {
  const name = () => props.name ?? "default";
  const renderer = useRenderer();
  const [terminal, setTerminal] = createSignal<TerminalSurface>(null);
  // The detected terminal foreground, once known, used to fill undefined
  // foreground fields for the transparent themes.
  const [detectedFg, setDetectedFg] = createSignal<string | undefined>(
    undefined,
  );
  // Copy the singleton: createStore takes ownership of its backing object, and
  // setTheme must not mutate the shared theme returned by getTheme.
  const [theme, setTheme] = createStore<Theme>({ ...getTheme(name()) });

  onMount(async () => {
    try {
      const colors = await renderer.getPalette();
      if (colors?.defaultBackground) {
        setTerminal({
          background: colors.defaultBackground,
          foreground: colors.defaultForeground ?? colors.defaultBackground,
        });
      }
      // Resolve the terminal's own text color into the theme's undefined
      // foregrounds so `terminal`/`mono` read correctly on light terminals.
      // Fall back to a dark foreground when we only know it's a light terminal.
      setDetectedFg(
        colors?.defaultForeground ??
          (renderer.themeMode === "light" ? "#1a1a1a" : undefined),
      );
    } catch (error) {
      // Terminals that don't answer OSC palette queries keep the static theme.
      console.error("Failed to detect terminal palette:", error);
    }
  });

  // Rebuild the theme store whenever the selected name or the detected terminal
  // foreground changes, so runtime theme switching works and late palette
  // detection flows in.
  createEffect(
    on([name, detectedFg], ([n, fg]) => {
      setTheme(resolveForeground(getTheme(n), fg));
    }),
  );

  return (
    <ThemeNameContext.Provider value={name}>
      <TerminalSurfaceContext.Provider value={terminal}>
        <ThemeContext.Provider value={theme}>
          {props.children}
        </ThemeContext.Provider>
      </TerminalSurfaceContext.Provider>
    </ThemeNameContext.Provider>
  );
}

/**
 * Returns the active theme. Falls back to `defaultTheme` when used outside a
 * ThemeProvider (e.g. unit tests, or the crash-screen error fallback).
 */
export function useTheme(): Theme {
  return useContext(ThemeContext);
}

/** Accessor for the active theme name (used to pick the modal surface). */
export function useThemeName(): Accessor<ThemeName> {
  return useContext(ThemeNameContext);
}

/** Accessor for the detected terminal colors, or null until/unless detected. */
export function useTerminalSurface(): Accessor<TerminalSurface> {
  return useContext(TerminalSurfaceContext);
}

import { describe, test, expect } from "bun:test";
import {
  defaultTheme,
  getTheme,
  getModalTheme,
  resolveForeground,
  type ThemeName,
} from "./theme";
import { relativeLuminance } from "./color";

const ALL_THEMES: ThemeName[] = ["default", "terminal", "mono", "tokyo-night"];
const TRANSPARENT_THEMES: ThemeName[] = ["terminal", "mono"];

describe("defaultTheme", () => {
  // The default theme is the built-in fallback, so unlike terminal/mono it must
  // never leave a color undefined - there's no terminal color to fall back to.
  test("every color field is defined", () => {
    for (const [field, value] of Object.entries(defaultTheme)) {
      expect(value, `defaultTheme.${field} should be defined`).toBeDefined();
    }
  });
});

describe("getModalTheme", () => {
  test("every theme yields an opaque modal surface", () => {
    for (const name of ALL_THEMES) {
      const modalTheme = getModalTheme(name);
      expect(modalTheme.background).not.toBe("transparent");
      expect(modalTheme.contentPane).not.toBe("transparent");
    }
  });

  test("modal text is always defined so it stays readable", () => {
    for (const name of ALL_THEMES) {
      const modalTheme = getModalTheme(name);
      expect(modalTheme.text).toBeDefined();
    }
  });

  test("opaque themes are returned unchanged, with or without terminal colors", () => {
    for (const name of ["default", "tokyo-night"] as ThemeName[]) {
      const theme = getTheme(name);
      expect(getModalTheme(name)).toBe(theme);
      expect(
        getModalTheme(name, { background: "#fafafa", foreground: "#000000" }),
      ).toBe(theme);
    }
  });

  test("adapts the surface toward the terminal background on a light terminal", () => {
    const light = { background: "#fafafa", foreground: "#1a1a1a" };
    for (const name of TRANSPARENT_THEMES) {
      const modalTheme = getModalTheme(name, light);
      expect(modalTheme.contentPane).not.toBe("transparent");
      // A card sitting a shade off a light background is darker than it.
      expect(relativeLuminance(modalTheme.contentPane)).toBeLessThan(
        relativeLuminance(light.background),
      );
      // Text uses the terminal foreground so it stays readable.
      expect(modalTheme.text).toBe(light.foreground);
    }
  });

  test("adapts the surface toward the terminal background on a dark terminal", () => {
    const dark = { background: "#1a1b26", foreground: "#c0caf5" };
    for (const name of TRANSPARENT_THEMES) {
      const modalTheme = getModalTheme(name, dark);
      expect(relativeLuminance(modalTheme.contentPane)).toBeGreaterThan(
        relativeLuminance(dark.background),
      );
    }
  });
});

describe("resolveForeground", () => {
  test("fills undefined foreground fields with the given color", () => {
    // mono's text is undefined by default.
    expect(getTheme("mono").text).toBeUndefined();
    const resolved = resolveForeground(getTheme("mono"), "#1a1a1a");
    expect(resolved.text).toBe("#1a1a1a");
    expect(resolved.primary).toBe("#1a1a1a");
  });

  test("leaves concrete fields and transparent backgrounds untouched", () => {
    const resolved = resolveForeground(getTheme("terminal"), "#1a1a1a");
    // terminal keeps its concrete accent + muted colors.
    expect(resolved.textMuted).toBe(getTheme("terminal").textMuted);
    expect(resolved.primary).toBe(getTheme("terminal").primary);
    // backgrounds stay transparent.
    expect(resolved.background).toBe("transparent");
    expect(resolved.contentPane).toBe("transparent");
    // the one undefined foreground (text) gets resolved.
    expect(resolved.text).toBe("#1a1a1a");
  });

  test("is a no-op when no foreground is provided", () => {
    const theme = getTheme("mono");
    expect(resolveForeground(theme, undefined)).toBe(theme);
  });

  test("opaque themes are unaffected by resolution", () => {
    const resolved = resolveForeground(getTheme("default"), "#1a1a1a");
    expect(resolved.text).toBe(getTheme("default").text);
  });
});

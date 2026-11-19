import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type { JSX } from "solid-js";
import { RGBA } from "@opentui/core";
import { testRender } from "@opentui/solid";
import { defaultTheme } from "../theme/theme";
import { ThemeProvider } from "../theme";
import { FocusProvider } from "../context/focus";
import { KeymapProvider } from "../keyboard/keymap-context";
import { baseAppBindings, type KeymapTable } from "../keyboard/keymap";
import {
  CommandPalette,
  PaletteMode,
  type PaletteAction,
} from "./command-palette";
import { FRAME } from "./modal/chrome";
import { MODAL_TOP } from "./modal/modal";

const table: KeymapTable = { app: baseAppBindings };

// Zero-padded so no label is a substring of another.
const label = (n: number): string => `Action ${String(n).padStart(2, "0")}`;
const actions: PaletteAction[] = Array.from({ length: 30 }, (_, i) => ({
  id: `a${i + 1}`,
  label: label(i + 1),
  run: () => {},
}));

// Pin the frame to the plain corners, so the bottom edge is one glyph.
const TERMINAL_ENV = [
  "GHOSTTY_RESOURCES_DIR",
  "KITTY_WINDOW_ID",
  "WEZTERM_PANE",
  "TERM_PROGRAM",
  "TERM",
];
let savedEnv: Record<string, string | undefined> = {};
beforeEach(() => {
  savedEnv = Object.fromEntries(TERMINAL_ENV.map((k) => [k, process.env[k]]));
  for (const key of TERMINAL_ENV) delete process.env[key];
});

let destroy: (() => void) | undefined;
afterEach(() => {
  destroy?.();
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

interface Palette {
  lines: () => string[];
  // The background of the cell at (x, y).
  bg: (x: number, y: number) => number[];
  down: (times: number) => Promise<void>;
  type: (text: string) => Promise<void>;
  tab: (shift?: boolean) => Promise<void>;
}

interface OpenOptions {
  actions?: PaletteAction[];
  mode?: PaletteMode;
  onModeChange?: (mode: PaletteMode) => void;
}

async function open(height: number, opts: OpenOptions = {}): Promise<Palette> {
  const Root = (): JSX.Element => (
    <ThemeProvider>
      <FocusProvider panes={[]}>
        <KeymapProvider keymap={table}>
          <CommandPalette
            actions={opts.actions ?? actions}
            mode={opts.mode}
            onModeChange={opts.onModeChange}
            onClose={() => {}}
          />
        </KeymapProvider>
      </FocusProvider>
    </ThemeProvider>
  );
  const t = await testRender(Root, { width: 60, height });
  destroy = () => t.renderer.destroy();
  const settle = async (): Promise<void> => {
    await new Promise((r) => setTimeout(r, 20));
    await t.renderOnce();
  };
  await settle();
  return {
    lines: () => t.captureCharFrame().split("\n"),
    bg: (x, y) => {
      let at = 0;
      for (const span of t.captureSpans().lines[y].spans) {
        if (x < at + span.width) return span.bg.toInts();
        at += span.width;
      }
      throw new Error(`no cell at ${x},${y}`);
    },
    down: async (times) => {
      for (let i = 0; i < times; i++) {
        t.mockInput.pressKey("ARROW_DOWN");
        await settle();
      }
    },
    type: async (text) => {
      await t.mockInput.typeText(text);
      await settle();
    },
    tab: async (shift = false) => {
      t.mockInput.pressTab({ shift });
      await settle();
    },
  };
}

const shown = (lines: string[]): string[] =>
  actions.map((a) => a.label).filter((l) => lines.some((x) => x.includes(l)));
const bottomEdge = (lines: string[]): number =>
  lines.findIndex((l) => l.includes(FRAME.bottom.repeat(10)));

describe("CommandPalette height", () => {
  test("a short terminal shrinks the list so the frame stays on screen", async () => {
    const palette = await open(20);
    const lines = palette.lines();
    // The frame's bottom edge sits a row above the terminal's last row.
    expect(bottomEdge(lines)).toBe(18);
    // Ten list rows, all items: the bottom padding scrolls with them.
    expect(shown(lines)).toEqual(actions.slice(0, 10).map((a) => a.label));
  });

  test("on a short terminal the list scrolls only once the cursor leaves it", async () => {
    const palette = await open(20);
    // The tenth item is the last row shown: no scroll yet.
    await palette.down(9);
    expect(shown(palette.lines())[0]).toBe(label(1));
    // The eleventh scrolls the list by one, keeping the cursor on the last row.
    await palette.down(1);
    const lines = palette.lines();
    expect(shown(lines)).toEqual(actions.slice(1, 11).map((a) => a.label));
    expect(bottomEdge(lines)).toBe(18);
  });

  test("a tall terminal keeps the full-height list", async () => {
    const palette = await open(40);
    const lines = palette.lines();
    expect(shown(lines)).toHaveLength(14);
    // Top offset 2, frame, header 2, filter 3, list 14, frame.
    expect(bottomEdge(lines)).toBe(2 + 1 + 2 + 3 + 14);
  });
});

// Actions 01, 02 and 12 apply in context; the rest only in All.
const CONTEXT_IDS = new Set(["a1", "a2", "a12"]);
const moded: PaletteAction[] = actions.map((a) => ({
  ...a,
  inContext: CONTEXT_IDS.has(a.id),
}));
const listed = (lines: string[]): string[] =>
  moded.map((a) => a.label).filter((l) => lines.some((x) => x.includes(l)));
const CONTEXT_CHIP = "▌ Context ▐  All";
const ALL_CHIP = "Context  ▌ All ▐";
const footerRow = (lines: string[]): number =>
  lines.findIndex((l) => l.includes("tab  switch"));

describe("CommandPalette modes", () => {
  test("without inContext there is no footer and tab does nothing", async () => {
    const palette = await open(40);
    expect(footerRow(palette.lines())).toBe(-1);
    await palette.tab();
    expect(shown(palette.lines())).toHaveLength(14);
  });

  test("opens in context mode on the inContext actions", async () => {
    const palette = await open(40, { actions: moded });
    const lines = palette.lines();
    expect(listed(lines)).toEqual([label(1), label(2), label(12)]);
    const footer = footerRow(lines);
    expect(lines[footer]).toContain(CONTEXT_CHIP);
    // The active mode sits on the accent; the other doesn't.
    const accent = RGBA.fromHex(defaultTheme.accent!).toInts();
    expect(palette.bg(lines[footer].indexOf("Context"), footer)).toEqual(
      accent,
    );
    expect(palette.bg(lines[footer].indexOf("All"), footer)).not.toEqual(
      accent,
    );
    // The footer is the card's last row.
    expect(bottomEdge(lines)).toBe(footer + 1);
  });

  test("tab and shift+tab toggle the mode and report it", async () => {
    const changes: PaletteMode[] = [];
    const palette = await open(40, {
      actions: moded,
      onModeChange: (m) => changes.push(m),
    });
    await palette.tab();
    let lines = palette.lines();
    expect(lines[footerRow(lines)]).toContain(ALL_CHIP);
    expect(listed(lines)).toEqual(moded.slice(0, 14).map((a) => a.label));
    await palette.tab(true);
    lines = palette.lines();
    expect(lines[footerRow(lines)]).toContain(CONTEXT_CHIP);
    expect(listed(lines)).toEqual([label(1), label(2), label(12)]);
    expect(changes).toEqual([PaletteMode.ALL, PaletteMode.CONTEXT]);
  });

  test("the mode prop picks the mode the palette opens in", async () => {
    const palette = await open(40, { actions: moded, mode: PaletteMode.ALL });
    const lines = palette.lines();
    expect(lines[footerRow(lines)]).toContain(ALL_CHIP);
    expect(listed(lines)).toHaveLength(14);
  });

  test("toggling keeps the typed query and re-filters", async () => {
    const palette = await open(40, { actions: moded });
    await palette.type("Action 1");
    expect(listed(palette.lines())).toEqual([label(12)]);
    await palette.tab();
    const lines = palette.lines();
    // The filter input, under the frame, the header and a blank row.
    expect(lines[MODAL_TOP + 4]).toContain("Action 1");
    expect(listed(lines)).toEqual(
      Array.from({ length: 10 }, (_, i) => label(10 + i)),
    );
    await palette.tab();
    expect(listed(palette.lines())).toEqual([label(12)]);
  });

  describe("empty states", () => {
    const none = actions.map((a) => ({ ...a, inContext: false }));
    const text = (lines: string[]): string => lines.join("\n");

    test("context, no query, nothing applies", async () => {
      const palette = await open(40, { actions: none });
      expect(text(palette.lines())).toContain(
        "Nothing to do on this row. tab shows all 30.",
      );
    });

    test("context, a query that only All matches", async () => {
      const palette = await open(40, { actions: moded });
      await palette.type("Action 0");
      // 01 and 02 are in context; 03 isn't.
      expect(listed(palette.lines())).toEqual([label(1), label(2)]);
      await palette.type("3");
      expect(text(palette.lines())).toContain("No match here. 1 in All (tab).");
    });

    test("a query nothing matches", async () => {
      const palette = await open(40, { actions: moded });
      await palette.type("zzz");
      expect(text(palette.lines())).toContain("No matching commands");
      await palette.tab();
      expect(text(palette.lines())).toContain("No matching commands");
    });
  });

  test("a short terminal shrinks the list, not the footer", async () => {
    const palette = await open(20, { actions: moded, mode: PaletteMode.ALL });
    const lines = palette.lines();
    expect(bottomEdge(lines)).toBe(18);
    expect(footerRow(lines)).toBe(17);
    // Header and filter (5), then the list, a blank row and the footer.
    expect(listed(lines)).toEqual(moded.slice(0, 8).map((a) => a.label));
  });

  test("the footer stays put while a long list scrolls", async () => {
    const palette = await open(20, { actions: moded, mode: PaletteMode.ALL });
    await palette.down(20);
    const lines = palette.lines();
    expect(listed(lines)).toEqual(moded.slice(13, 21).map((a) => a.label));
    expect(footerRow(lines)).toBe(17);
    expect(bottomEdge(lines)).toBe(18);
  });
});

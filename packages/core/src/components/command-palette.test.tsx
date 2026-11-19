import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type { JSX } from "solid-js";
import { testRender } from "@opentui/solid";
import { ThemeProvider } from "../theme";
import { FocusProvider } from "../context/focus";
import { KeymapProvider } from "../keyboard/keymap-context";
import { baseAppBindings, type KeymapTable } from "../keyboard/keymap";
import { CommandPalette, type PaletteAction } from "./command-palette";
import { FRAME } from "./modal/chrome";

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
  down: (times: number) => Promise<void>;
}

async function open(height: number): Promise<Palette> {
  const Root = (): JSX.Element => (
    <ThemeProvider>
      <FocusProvider panes={[]}>
        <KeymapProvider keymap={table}>
          <CommandPalette actions={actions} onClose={() => {}} />
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
    down: async (times) => {
      for (let i = 0; i < times; i++) {
        t.mockInput.pressKey("ARROW_DOWN");
        await settle();
      }
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

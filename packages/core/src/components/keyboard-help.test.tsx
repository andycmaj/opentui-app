import { afterEach, describe, expect, test } from "bun:test";
import type { JSX } from "solid-js";
import { testRender } from "@opentui/solid";
import { ThemeProvider } from "../theme";
import { FocusProvider } from "../context/focus";
import { KeymapProvider } from "../keyboard/keymap-context";
import {
  baseAppBindings,
  navBindings,
  type KeymapTable,
} from "../keyboard/keymap";
import { KeyboardHelp, type KeyboardHelpProps } from "./keyboard-help";

const table: KeymapTable = { app: baseAppBindings, list: navBindings() };

let destroy: (() => void) | undefined;
afterEach(() => destroy?.());

async function frame(
  props: Omit<KeyboardHelpProps, "onClose">,
): Promise<string[]> {
  const Root = (): JSX.Element => (
    <ThemeProvider>
      <FocusProvider panes={["list"]}>
        <KeymapProvider keymap={table}>
          <KeyboardHelp onClose={() => {}} {...props} />
        </KeymapProvider>
      </FocusProvider>
    </ThemeProvider>
  );
  const t = await testRender(Root, { width: 100, height: 40 });
  destroy = () => t.renderer.destroy();
  await t.renderOnce();
  return t.captureCharFrame().split("\n");
}

const row = (lines: string[], text: string): number =>
  lines.findIndex((l) => l.includes(text));
const col = (lines: string[], text: string): number =>
  lines[row(lines, text)].indexOf(text);

// The modal is centered: its left edge sits at 50% minus half its width. The
// border adds a cell each side outside the requested width, so content starts
// one cell in from the edge and one row down.
const left = (width: number): number => 50 - Math.floor((width + 2) / 2);
const B = 1;

describe("KeyboardHelp layout", () => {
  test("defaults: md width, sections two cells in", async () => {
    const lines = await frame({ footer: "the footer" });
    const edge = left(60);
    expect(row(lines, "Keyboard Shortcuts")).toBe(3 + B);
    expect(col(lines, "Keyboard Shortcuts")).toBe(edge + B + 2);
    expect(col(lines, "Global")).toBe(edge + B + 2);
    expect(col(lines, "the footer")).toBe(edge + B + 2);
    // The hint ends two cells in from the right edge.
    const hint = "esc/q/?";
    expect(col(lines, hint) + hint.length).toBe(edge + B + 60 - 2);
    // The list starts right under the header.
    expect(row(lines, "Global")).toBe(4 + B);
  });

  test("width, modal padding and section padding move the content", async () => {
    const lines = await frame({
      footer: "the footer",
      width: 66,
      padding: { y: 1 },
      sectionPadding: { x: 4, y: 1 },
    });
    const edge = left(66);
    // Box padding top (1) plus the header's own top row.
    expect(row(lines, "Keyboard Shortcuts")).toBe(4 + B);
    expect(col(lines, "Keyboard Shortcuts")).toBe(edge + B + 4);
    expect(col(lines, "Global")).toBe(edge + B + 4);
    expect(col(lines, "the footer")).toBe(edge + B + 4);
    const hint = "esc/q/?";
    expect(col(lines, hint) + hint.length).toBe(edge + B + 66 - 4);
    // Section top padding leaves a blank row under the header.
    expect(row(lines, "Global")).toBe(6 + B);
  });
});

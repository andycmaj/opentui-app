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
import { FRAME } from "./modal/chrome";

const table: KeymapTable = { app: baseAppBindings, list: navBindings() };

let destroy: (() => void) | undefined;
afterEach(() => destroy?.());

async function frame(
  props: Omit<KeyboardHelpProps, "onClose">,
  height = 40,
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
  const t = await testRender(Root, { width: 100, height });
  destroy = () => t.renderer.destroy();
  await t.renderOnce();
  // The footer's height is measured at layout, so the list resizes a frame on.
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

describe("KeyboardHelp height", () => {
  // Plain corners (no known terminal in the env) put the bottom edge's glyph
  // across the whole row.
  const bottomEdge = (lines: string[]): number =>
    lines.findIndex((l) => l.includes(FRAME.bottom.repeat(10)));

  test("a short terminal shrinks the list so frame and footer stay on screen", async () => {
    const lines = await frame({ footer: "the footer" }, 20);
    expect(bottomEdge(lines)).toBe(18);
    // The footer's section padding leaves a blank row under it.
    expect(row(lines, "the footer")).toBe(16);
  });

  test("an element footer's measured rows come out of the list", async () => {
    // A getter, so the element is made inside the render.
    const lines = await frame(
      {
        get footer(): JSX.Element {
          return (
            <box flexDirection="column">
              <text>footer one</text>
              <text>footer two</text>
              <text>footer three</text>
            </box>
          );
        },
      },
      20,
    );
    expect(bottomEdge(lines)).toBe(18);
    expect(row(lines, "footer one")).toBe(14);
    expect(row(lines, "footer three")).toBe(16);
  });
});

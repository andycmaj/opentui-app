import { describe, expect, test } from "bun:test";
import { filterSections, flatten, moveSelection } from "./palette";

const items = [
  { id: "home", label: "home", group: "pages" },
  { id: "keymaps", label: "keymaps guide", group: "pages", hint: "framework" },
  { id: "theme-mono", label: "theme: mono", group: "actions" },
  { id: "help", label: "keyboard help" },
];

describe("filterSections", () => {
  test("empty query keeps every item, grouped by first appearance", () => {
    const sections = filterSections(items, "");
    expect(sections.map((s) => s.group)).toEqual([
      "pages",
      "actions",
      undefined,
    ]);
    expect(flatten(sections).map((i) => i.id)).toEqual([
      "home",
      "keymaps",
      "theme-mono",
      "help",
    ]);
  });

  test("matches label, group, and hint case-insensitively", () => {
    expect(flatten(filterSections(items, "KEY")).map((i) => i.id)).toEqual([
      "keymaps",
      "help",
    ]);
    expect(flatten(filterSections(items, "actions")).map((i) => i.id)).toEqual([
      "theme-mono",
    ]);
    expect(
      flatten(filterSections(items, "framework")).map((i) => i.id),
    ).toEqual(["keymaps"]);
  });

  test("drops groups with no matches", () => {
    expect(filterSections(items, "mono").map((s) => s.group)).toEqual([
      "actions",
    ]);
  });
});

describe("moveSelection", () => {
  test("clamps at both ends", () => {
    expect(moveSelection(0, -1, 3)).toBe(0);
    expect(moveSelection(2, 1, 3)).toBe(2);
    expect(moveSelection(1, 1, 3)).toBe(2);
  });

  test("empty list stays at zero", () => {
    expect(moveSelection(4, 1, 0)).toBe(0);
  });
});

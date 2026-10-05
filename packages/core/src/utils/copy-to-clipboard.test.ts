import { describe, expect, test } from "bun:test";
import { clipboardCommandsFor } from "./copy-to-clipboard";

const CLIP = "/mnt/c/Windows/System32/clip.exe";
const has = (paths: string[]) => (p: string) => paths.includes(p);
const none = () => false;

describe("clipboardCommandsFor", () => {
  test("WSL prefers the absolute clip.exe path, independent of $PATH", () => {
    expect(clipboardCommandsFor("linux", true, has([CLIP]))[0]).toEqual([CLIP]);
  });

  test("WSL without clip.exe on disk falls back to wl-copy, then bare clip.exe", () => {
    expect(clipboardCommandsFor("linux", true, none)).toEqual([
      ["wl-copy"],
      ["clip.exe"],
    ]);
  });

  test("plain Linux tries Wayland then X11 tools", () => {
    expect(clipboardCommandsFor("linux", false, none).map((c) => c[0])).toEqual(
      ["wl-copy", "xclip", "xsel"],
    );
  });

  test("macOS uses pbcopy", () => {
    expect(clipboardCommandsFor("darwin", false)).toEqual([["pbcopy"]]);
  });
});

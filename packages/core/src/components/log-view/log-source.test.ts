import { describe, expect, test } from "bun:test";
import {
  LogUpdateAction,
  createMemoryLogSource,
  type LogUpdateEvent,
} from "./log-source";

describe("createMemoryLogSource", () => {
  test("joins streamed chunks across partial lines", () => {
    const source = createMemoryLogSource();
    source.append("pod", "first li");
    expect(source.patchSet("pod", 0).lines).toEqual([]);
    source.append("pod", "ne\nsecond\nthi");
    expect(source.patchSet("pod", 0).lines.map((l) => l.text)).toEqual([
      "first line",
      "second",
    ]);
  });

  test("patchSet returns only lines after the checkpoint", () => {
    const source = createMemoryLogSource();
    source.append("pod", "a\nb\n");
    const first = source.patchSet("pod", 0);
    source.append("pod", "c\n", { level: "WARN" });
    const next = source.patchSet("pod", first.checkpoint);
    expect(next.lines).toEqual([{ text: "c", level: "WARN" }]);
    expect(next.checkpoint).toBe(3);
  });

  test("set replaces content and signals truncate", () => {
    const source = createMemoryLogSource();
    const events: LogUpdateEvent[] = [];
    source.addUpdateListener((e) => events.push(e));
    source.append("doc", "old\n");
    source.set("doc", "kind: Pod\nmetadata:\n");
    expect(source.patchSet("doc", 0).lines.map((l) => l.text)).toEqual([
      "kind: Pod",
      "metadata:",
    ]);
    expect(events.map((e) => e.action)).toEqual([
      LogUpdateAction.APPEND,
      LogUpdateAction.TRUNCATE,
    ]);
  });

  test("keys are independent", () => {
    const source = createMemoryLogSource();
    source.set("a", "1");
    source.set("b", "2\n3");
    expect(source.patchSet("a", 0).checkpoint).toBe(1);
    expect(source.patchSet("b", 0).checkpoint).toBe(2);
    source.clear("a");
    expect(source.patchSet("a", 0).lines).toEqual([]);
    expect(source.patchSet("b", 0).lines).toHaveLength(2);
  });
});

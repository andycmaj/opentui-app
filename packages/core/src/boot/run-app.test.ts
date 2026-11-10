import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { destroyExitCode } from "./exit-on-destroy";

describe("destroyExitCode", () => {
  test("a signal exits 128 + its number", () => {
    expect(destroyExitCode("SIGHUP", undefined)).toBe(129);
    expect(destroyExitCode("SIGTERM", 0)).toBe(143);
  });

  test("without a signal, honours process.exitCode", () => {
    expect(destroyExitCode(null, 1)).toBe(1);
    expect(destroyExitCode(null, "2")).toBe(2);
  });

  test("defaults to 0 for a plain quit", () => {
    expect(destroyExitCode(null, undefined)).toBe(0);
    expect(destroyExitCode(null, null)).toBe(0);
    expect(destroyExitCode(null, "nope")).toBe(0);
  });
});

const fixture = path.join(import.meta.dir, "../../test/run-app-fixture.tsx");

// Boot the fixture app in a PTY (opentui needs a terminal), wait for it to
// render, optionally signal it, and report how it ended.
async function runFixture(
  flags: string[],
  signal?: NodeJS.Signals,
): Promise<{ exit: number | "still running"; log: string }> {
  const logFile = path.join(
    mkdtempSync(path.join(tmpdir(), "run-app-")),
    "log",
  );
  await Bun.write(logFile, "");
  const read = (): string => readFileSync(logFile, "utf8");
  const proc = Bun.spawn(
    [
      process.execPath,
      "--conditions=browser",
      "--preload",
      "@opentui/solid/preload",
      fixture,
      logFile,
      ...flags,
    ],
    { cwd: path.join(import.meta.dir, "../.."), terminal: { data() {} } },
  );
  try {
    for (let i = 0; i < 100 && !read().includes("ready"); i++) {
      await Bun.sleep(50);
    }
    expect(read()).toContain("ready");
    if (signal) proc.kill(signal);
    const exit = await Promise.race([
      proc.exited,
      Bun.sleep(2000).then(() => "still running" as const),
    ]);
    return { exit, log: read() };
  } finally {
    proc.kill("SIGKILL");
  }
}

describe("runApp exit on destroy", () => {
  test("a signal destroys the renderer and exits 128 + signal", async () => {
    const { exit, log } = await runFixture([], "SIGHUP");
    expect(log).toContain("destroyed");
    expect(exit).toBe(129);
  });

  test("a quit (renderer.destroy) exits 0 despite live timers", async () => {
    expect((await runFixture(["quit"])).exit).toBe(0);
  });

  test("onDestroy can choose the exit code via process.exitCode", async () => {
    expect((await runFixture(["quit", "exit-code"])).exit).toBe(3);
  });

  test("exitOnDestroy: false leaves exiting to the app", async () => {
    const { exit, log } = await runFixture(["no-exit"], "SIGTERM");
    expect(log).toContain("destroyed");
    expect(exit).toBe("still running");
  });
});

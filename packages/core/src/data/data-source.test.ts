import { describe, expect, test } from "bun:test";
import { createAsyncState, makeGuard, errorMessage } from "./data-source";

describe("createAsyncState", () => {
  test("setData clears loading and error", () => {
    const store = createAsyncState<number>();
    store.setLoading(true);
    store.setError("boom");
    store.setData(42);
    expect(store.state.data).toBe(42);
    expect(store.state.loading).toBe(false);
    expect(store.state.error).toBeNull();
  });

  test("setError preserves last-known data", () => {
    const store = createAsyncState<string>("hello");
    store.setError("nope");
    expect(store.state.data).toBe("hello");
    expect(store.state.error).toBe("nope");
    expect(store.state.loading).toBe(false);
  });

  test("reset restores the initial value", () => {
    const store = createAsyncState<number>(0);
    store.setData(7);
    store.reset();
    expect(store.state.data).toBe(0);
    expect(store.state.error).toBeNull();
  });
});

describe("makeGuard", () => {
  test("runs the mutation and reports success", async () => {
    const toasts: string[] = [];
    let refreshed = 0;
    const guard = makeGuard(
      (m) => toasts.push(m),
      () => {
        refreshed++;
      },
    );
    const ok = await guard("Save", async () => {});
    expect(ok).toBe(true);
    expect(toasts).toHaveLength(0);
    expect(refreshed).toBe(1);
  });

  test("toasts on failure and still refreshes", async () => {
    const toasts: string[] = [];
    let refreshed = 0;
    const guard = makeGuard(
      (m) => toasts.push(m),
      () => {
        refreshed++;
      },
    );
    const ok = await guard("Save", async () => {
      throw new Error("disk full");
    });
    expect(ok).toBe(false);
    expect(toasts[0]).toBe("Save failed: disk full");
    expect(refreshed).toBe(1);
  });
});

describe("errorMessage", () => {
  test("unwraps Error and stringifies others", () => {
    expect(errorMessage(new Error("x"))).toBe("x");
    expect(errorMessage("plain")).toBe("plain");
  });
});

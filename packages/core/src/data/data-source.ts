// An unopinionated async-data seam. The framework standardizes the
// loading/error/data store shape and the "guard a mutation, toast on failure,
// then refresh" pattern, but takes no position on *how* data is fetched — apps
// wire Effection, createResource, plain promises, etc. behind DataSource.

import { createStore, produce } from "solid-js/store";

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export interface DataSource<T> {
  // Read reactively (it's a Solid store).
  state: AsyncState<T>;
  // Trigger a (re)load. May be sync or async.
  refresh: () => void | Promise<void>;
}

export interface AsyncStateStore<T> {
  state: AsyncState<T>;
  setLoading: (loading: boolean) => void;
  setData: (data: T) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

/**
 * A reactive loading/error/data store. Setting data clears the error and
 * loading; setting an error clears loading but preserves the last-known data.
 */
export function createAsyncState<T>(
  initial: T | null = null,
): AsyncStateStore<T> {
  const [state, setState] = createStore<AsyncState<T>>({
    data: initial,
    loading: false,
    error: null,
  });

  return {
    state,
    setLoading(loading: boolean) {
      setState("loading", loading);
    },
    setData(data: T) {
      setState(
        produce((s) => {
          s.data = data;
          s.loading = false;
          s.error = null;
        }),
      );
    },
    setError(error: string | null) {
      setState(
        produce((s) => {
          s.error = error;
          s.loading = false;
        }),
      );
    },
    reset() {
      setState(
        produce((s) => {
          s.data = initial;
          s.loading = false;
          s.error = null;
        }),
      );
    },
  };
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * Build a guard that runs a mutation, and on failure surfaces
 * `"<label> failed: <message>"` as an error toast. Optionally refreshes after
 * either outcome. Returns whether the mutation succeeded.
 *
 *   const guard = makeGuard(showToast, refresh);
 *   await guard("Accept change", () => actions.accept(entry));
 */
export function makeGuard(
  showToast: (
    message: string,
    duration?: number,
    variant?: "info" | "error",
  ) => void,
  afterEach?: () => void | Promise<void>,
) {
  return async function guard(
    label: string,
    fn: () => void | Promise<void>,
  ): Promise<boolean> {
    try {
      await fn();
      return true;
    } catch (err) {
      showToast(`${label} failed: ${errorMessage(err)}`, 4000, "error");
      return false;
    } finally {
      await afterEach?.();
    }
  };
}

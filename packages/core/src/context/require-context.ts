// Standardizes the "provider + hook that throws if used outside it" pattern
// every context in the framework follows.

import { createContext, useContext, type Context } from "solid-js";

/**
 * Create a context plus an accessor hook that throws a clear error when used
 * outside its provider. Returns `[Context, useContext]`; wrap the raw Context
 * in your Provider component.
 */
export function createRequiredContext<T>(
  name: string,
): [Context<T | undefined>, () => T] {
  const ctx = createContext<T | undefined>();

  function use(): T {
    const value = useContext(ctx);
    if (value === undefined) {
      throw new Error(`use${name} must be used within a ${name}Provider`);
    }
    return value;
  }

  return [ctx, use];
}

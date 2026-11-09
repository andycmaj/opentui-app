// Padding for modal boxes and their sections. A number pads every side; an
// object can name an axis (x, y) or a side, and a side wins over its axis.
// Sides left unnamed keep the component's default, so `{ x: 4 }` widens the
// margins without touching the vertical spacing.

export type Padding =
  | number
  | {
      x?: number;
      y?: number;
      top?: number;
      right?: number;
      bottom?: number;
      left?: number;
    };

export interface PaddingSides {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export const NO_PADDING: PaddingSides = {
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
};

export function resolvePadding(
  padding: Padding | undefined,
  fallback: PaddingSides = NO_PADDING,
): PaddingSides {
  if (padding === undefined) return fallback;
  if (typeof padding === "number") {
    return { top: padding, right: padding, bottom: padding, left: padding };
  }
  return {
    top: padding.top ?? padding.y ?? fallback.top,
    right: padding.right ?? padding.x ?? fallback.right,
    bottom: padding.bottom ?? padding.y ?? fallback.bottom,
    left: padding.left ?? padding.x ?? fallback.left,
  };
}

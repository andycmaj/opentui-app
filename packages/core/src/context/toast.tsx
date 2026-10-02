// Single-slot transient toast notifications.

import { createSignal, type ParentProps, type Accessor } from "solid-js";
import { createRequiredContext } from "./require-context";

export type ToastVariant = "info" | "error";

export interface ToastMessage {
  id: number;
  message: string;
  duration: number;
  variant: ToastVariant;
}

export interface ToastContextValue {
  toast: Accessor<ToastMessage | null>;
  showToast: (
    message: string,
    duration?: number,
    variant?: ToastVariant,
  ) => void;
  clearToast: () => void;
}

const [ToastContext, useToast] =
  createRequiredContext<ToastContextValue>("Toast");

export { useToast };

let toastIdCounter = 0;

export function ToastProvider(props: ParentProps) {
  const [toast, setToast] = createSignal<ToastMessage | null>(null);
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  function showToast(
    message: string,
    duration = 2000,
    variant: ToastVariant = "info",
  ) {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }

    const id = ++toastIdCounter;
    setToast({ id, message, duration, variant });

    // Guard the clear on the id so a stale timer can't clobber a newer toast.
    timeoutId = setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
      timeoutId = null;
    }, duration);
  }

  function clearToast() {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    setToast(null);
  }

  const value: ToastContextValue = { toast, showToast, clearToast };

  return (
    <ToastContext.Provider value={value}>
      {props.children}
    </ToastContext.Provider>
  );
}

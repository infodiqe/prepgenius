"use client";

import * as React from "react";

/**
 * Global toast store — Sprint 1 · T01.
 *
 * A module-level store (no React context) so `toast(...)` can be called from
 * anywhere: components, event handlers, and feature service callbacks (auth,
 * onboarding, profile, mock submission). `useToast()` subscribes the `Toaster`
 * to the store. Adapted from the shadcn/ui use-toast pattern.
 *
 * Localization is the caller's responsibility — pass already-translated
 * `title`/`description` (via `useTranslations`). The store stores strings only.
 */

export type ToastVariant = "info" | "success" | "error" | "warning";

export interface ToastInput {
  title?: React.ReactNode;
  description?: React.ReactNode;
  variant?: ToastVariant;
  /** Auto-dismiss after N ms (passed to Radix). Default 5000. */
  duration?: number;
}

export interface ToastRecord extends Required<Pick<ToastInput, "variant">> {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  duration?: number;
  open: boolean;
}

const TOAST_LIMIT = 3;
const TOAST_REMOVE_DELAY = 400; // exit-animation window before removal

type Action =
  | { type: "ADD_TOAST"; toast: ToastRecord }
  | { type: "DISMISS_TOAST"; toastId: string }
  | { type: "REMOVE_TOAST"; toastId: string };

interface State {
  toasts: ToastRecord[];
}

let memoryState: State = { toasts: [] };
const listeners: Array<(state: State) => void> = [];
const removeTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

let count = 0;
function genId(): string {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return count.toString();
}

function scheduleRemoval(toastId: string) {
  if (removeTimeouts.has(toastId)) return;
  const timeout = setTimeout(() => {
    removeTimeouts.delete(toastId);
    dispatch({ type: "REMOVE_TOAST", toastId });
  }, TOAST_REMOVE_DELAY);
  removeTimeouts.set(toastId, timeout);
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "ADD_TOAST":
      return { toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT) };
    case "DISMISS_TOAST":
      scheduleRemoval(action.toastId);
      return {
        toasts: state.toasts.map((t) =>
          t.id === action.toastId ? { ...t, open: false } : t,
        ),
      };
    case "REMOVE_TOAST":
      return { toasts: state.toasts.filter((t) => t.id !== action.toastId) };
    default:
      return state;
  }
}

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((listener) => listener(memoryState));
}

export function toast(input: ToastInput): { id: string; dismiss: () => void } {
  const id = genId();
  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id });
  dispatch({
    type: "ADD_TOAST",
    toast: {
      id,
      open: true,
      variant: input.variant ?? "info",
      title: input.title,
      description: input.description,
      duration: input.duration,
    },
  });
  return { id, dismiss };
}

export function useToast() {
  const [state, setState] = React.useState<State>(memoryState);

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) listeners.splice(index, 1);
    };
  }, []);

  return {
    toasts: state.toasts,
    toast,
    dismiss: (toastId: string) =>
      dispatch({ type: "DISMISS_TOAST", toastId }),
  };
}

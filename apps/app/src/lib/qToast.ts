/**
 * qToast — the prototype-aligned toast API for new code.
 *
 * This is a THIN wrapper over sonner's native methods (the same `<Toaster>`
 * mounted once in App.tsx, reconfigured in components/ui/sonner.tsx). It does
 * NOT render its own toasts — it calls `toast.success/info/warning/error/
 * loading(...)`, so a qToast and a bare `toast.success(...)` from an existing
 * call site render through the exact same styling and aria-live region. There
 * is no second toast system.
 *
 * Why a wrapper at all: the prototype's `qToast({ severity, title, msg, action,
 * duration })` shape + the loading→resolved handle (`update`/`dismiss`) is the
 * ergonomic surface new code should target. sonner's per-severity methods give
 * us that for free; we just normalise the option names (msg→description) and
 * the loading-persists semantics.
 *
 * Strings are passed in ALREADY TRANSLATED by callers — qToast never touches
 * i18n (it can't know the caller's namespace).
 */

import { toast } from "sonner";

import type { ReactNode } from "react";

type ToastSeverity = "success" | "info" | "warning" | "error" | "loading";

interface ToastAction {
  label: ReactNode;
  /** Run on click; the toast auto-dismisses afterwards (sonner default). */
  onClick: () => void;
}

interface QToastOptions {
  severity?: ToastSeverity;
  title: ReactNode;
  msg?: ReactNode;
  /** ms; default 4200. Ignored for `loading` (persists until update/dismiss). */
  duration?: number;
  action?: ToastAction;
}

/** Patch shape for {@link ToastHandle.update} — every field is optional. */
type QToastPatch = Partial<QToastOptions>;

interface ToastHandle {
  /** sonner's toast id — stable across `update`. */
  id: string | number;
  /**
   * Merge a patch onto the SAME toast. For a non-loading result the
   * auto-dismiss timer (re)starts from this update. Used for loading→resolved.
   */
  update: (patch: QToastPatch) => void;
  /** Dismiss the toast now. */
  dismiss: () => void;
}

const DEFAULT_DURATION = 4200;
const DEFAULT_SEVERITY: ToastSeverity = "info";

/**
 * Map a qToast option set to a sonner call. `id` is threaded so `update`
 * targets the same toast; `loading` gets `Infinity` so it persists.
 */
function emit(
  severity: ToastSeverity,
  title: ReactNode,
  opts: {
    id?: string | number;
    msg?: ReactNode;
    duration?: number;
    action?: ToastAction;
  }
): string | number {
  const { id, msg, duration, action } = opts;
  return toast[severity](title, {
    id,
    description: msg,
    duration:
      severity === "loading" ? Infinity : (duration ?? DEFAULT_DURATION),
    action: action
      ? { label: action.label, onClick: () => action.onClick() }
      : undefined,
  });
}

/**
 * Show a transient toast. Accepts a full options object or a bare title
 * string (`qToast("Saved")` ⇒ info severity, default duration).
 */
export function qToast(input: QToastOptions | string): ToastHandle {
  const opts: QToastOptions =
    typeof input === "string" ? { title: input } : input;
  const severity = opts.severity ?? DEFAULT_SEVERITY;

  const id = emit(severity, opts.title, {
    msg: opts.msg,
    duration: opts.duration,
    action: opts.action,
  });

  return {
    id,
    update: (patch: QToastPatch) => {
      const nextSeverity = patch.severity ?? severity;
      // sonner re-renders the same toast when the id matches; a non-loading
      // severity re-arms its auto-dismiss timer from this call.
      emit(nextSeverity, patch.title ?? opts.title, {
        id,
        msg: patch.msg ?? opts.msg,
        duration: patch.duration ?? opts.duration,
        action: patch.action ?? opts.action,
      });
    },
    dismiss: () => toast.dismiss(id),
  };
}

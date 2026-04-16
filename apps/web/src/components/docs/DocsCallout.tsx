import type { ReactNode } from "react";

type CalloutType = "info" | "warning" | "danger" | "tip";

interface CalloutProps {
  type?: CalloutType;
  title?: string;
  children: ReactNode;
}

const styles: Record<CalloutType, string> = {
  info: "bg-blue-50 border-blue-200 text-blue-950 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-100",
  tip: "bg-green-50 border-green-200 text-green-950 dark:bg-green-950/30 dark:border-green-800 dark:text-green-100",
  warning:
    "bg-amber-50 border-amber-200 text-amber-950 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-100",
  danger:
    "bg-red-50 border-red-200 text-red-950 dark:bg-red-950/30 dark:border-red-800 dark:text-red-100",
};

const icons: Record<CalloutType, string> = {
  info: "ℹ",
  tip: "✓",
  warning: "⚠",
  danger: "✕",
};

const defaultTitles: Record<CalloutType, string> = {
  info: "Note",
  tip: "Tip",
  warning: "Warning",
  danger: "Important",
};

export const Callout = ({ type = "info", title, children }: CalloutProps) => (
  <div className={`my-5 rounded-lg border px-4 py-3.5 text-sm ${styles[type]}`}>
    <p className="font-semibold mb-1 flex items-center gap-1.5">
      <span aria-hidden="true">{icons[type]}</span>
      {title ?? defaultTitles[type]}
    </p>
    <div className="[&>p]:mt-0 [&>p]:mb-0">{children}</div>
  </div>
);

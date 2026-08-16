import type { ReactNode } from "react";

type CalloutType = "info" | "warning" | "danger" | "tip";

interface CalloutProps {
  type?: CalloutType;
  title?: string;
  children: ReactNode;
}

// Semantic theme tokens only (see apps/web/src/styles/index.css). The web
// design system has no blue/info status token, so "info"/note maps to the
// carrot primary — matching the prototype's carrot-wash note callout.
const styles: Record<CalloutType, string> = {
  info: "bg-primary/5 border-primary/20 text-foreground",
  tip: "bg-status-success-bg border-status-success-border text-foreground",
  warning: "bg-status-warning-bg border-status-warning-text/25 text-foreground",
  danger: "bg-status-danger-bg border-status-danger-text/25 text-foreground",
};

const iconColors: Record<CalloutType, string> = {
  info: "text-primary",
  tip: "text-status-success-text",
  warning: "text-status-warning-text",
  danger: "text-status-danger-text",
};

const Icon = ({ type }: { type: CalloutType }) => {
  if (type === "info")
    return (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={`shrink-0 ${iconColors.info}`}
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="8.5" />
        <line x1="12" y1="12" x2="12" y2="16" />
      </svg>
    );
  if (type === "tip")
    return (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={`shrink-0 ${iconColors.tip}`}
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    );
  if (type === "warning")
    return (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={`shrink-0 ${iconColors.warning}`}
      >
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    );
  // danger
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`shrink-0 ${iconColors.danger}`}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
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
      <Icon type={type} />
      {title ?? defaultTitles[type]}
    </p>
    <div className="[&>p]:mt-0 [&>p]:mb-0">{children}</div>
  </div>
);

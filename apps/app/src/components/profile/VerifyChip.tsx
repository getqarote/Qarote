import { cn } from "@/lib/utils";

/**
 * Small status pill (prototype `.verify-chip`) — mono, uppercase, bordered.
 * `verified` → success tone ("Verified" / "Connected"); otherwise warning tone
 * ("Unverified"). Tokens only so it flips correctly in dark mode.
 */
export function VerifyChip({
  verified,
  children,
}: {
  verified: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide",
        verified
          ? "border-success/40 bg-success-muted text-success"
          : "border-warning/40 bg-warning-muted text-warning"
      )}
    >
      {children}
    </span>
  );
}

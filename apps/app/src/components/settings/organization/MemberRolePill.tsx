import { cn } from "@/lib/utils";

/**
 * Static role pill (prototype): OWNER → carrot, ADMIN → info-blue, everything
 * else → neutral. Mono uppercase, matching the other status chips.
 */
export function MemberRolePill({
  role,
  label,
}: {
  role: string;
  label: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide",
        role === "OWNER"
          ? "border-primary/40 bg-accent text-primary"
          : role === "ADMIN"
            ? "border-info/40 bg-info-muted text-info"
            : "border-border text-muted-foreground"
      )}
    >
      {label}
    </span>
  );
}

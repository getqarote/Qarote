import { cn } from "@/lib/utils";

/**
 * Base skeleton block — a muted, theme-aware placeholder with a soft shimmer.
 *
 * The block tone/radius live on Tailwind classes (`bg-muted` by default); the
 * shimmer + its motion live in `styles/index.css` (`.skeleton-shimmer`) and are
 * gated behind `prefers-reduced-motion: no-preference`, so the reduced-motion
 * fallback is a static muted block with no animation. Always decorative —
 * marked `aria-hidden`; the surrounding `LoadingRegion` carries the SR text.
 *
 * Every other primitive in this module composes this one, so the shimmer
 * contract is defined in exactly one place.
 */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn("skeleton-shimmer rounded-md bg-muted", className)}
      {...props}
    />
  );
}

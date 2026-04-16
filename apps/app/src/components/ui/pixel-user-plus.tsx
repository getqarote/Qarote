import { cn } from "@/lib/utils";

interface PixelUserPlusProps {
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
}

/**
 * Pixel-art user-plus icon.
 * Left 4 columns: user silhouette (head, neck, body, base).
 * Right 3 columns: "+" symbol (vertical bar + horizontal bar).
 */
export function PixelUserPlus({ className, ...props }: PixelUserPlusProps) {
  return (
    <svg
      viewBox="0 0 371 371"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      shapeRendering="crispEdges"
      className={cn("w-auto", className)}
      {...props}
    >
      {/* Head (cols 1-2, rows 0-1) */}
      <rect x="53" y="0" width="106" height="106" fill="currentColor" />
      {/* Neck (col 2, row 2) */}
      <rect x="106" y="106" width="53" height="53" fill="currentColor" />
      {/* Body (cols 0-3, rows 3-4) */}
      <rect x="0" y="159" width="212" height="106" fill="currentColor" />
      {/* Base (cols 0-3, row 5) */}
      <rect x="0" y="265" width="212" height="53" fill="currentColor" />
      {/* Plus — vertical bar (col 5, rows 2-4) */}
      <rect x="265" y="106" width="53" height="159" fill="currentColor" />
      {/* Plus — horizontal bar (cols 4-6, row 3) */}
      <rect x="212" y="159" width="159" height="53" fill="currentColor" />
    </svg>
  );
}

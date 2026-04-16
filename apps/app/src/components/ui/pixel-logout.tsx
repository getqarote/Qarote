import { cn } from "@/lib/utils";

interface PixelLogoutProps {
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
}

/**
 * Pixel-art logout / door-with-arrow icon.
 * Left portion = door frame; right portion = arrow pointing out.
 */
export function PixelLogout({ className, ...props }: PixelLogoutProps) {
  return (
    <svg
      viewBox="0 0 371 371"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      shapeRendering="crispEdges"
      className={cn("w-auto", className)}
      {...props}
    >
      {/* Door frame top */}
      <rect x="53" y="0" width="106" height="106" fill="currentColor" />
      {/* Door frame bottom */}
      <rect x="53" y="265" width="106" height="106" fill="currentColor" />
      {/* Door frame left strip (middle rows) */}
      <rect x="53" y="106" width="53" height="159" fill="currentColor" />
      {/* Arrow pointing right — arrowhead top */}
      <rect x="159" y="106" width="106" height="53" fill="currentColor" />
      {/* Arrow shaft */}
      <rect x="106" y="159" width="212" height="53" fill="currentColor" />
      {/* Arrow pointing right — arrowhead bottom */}
      <rect x="159" y="212" width="106" height="53" fill="currentColor" />
    </svg>
  );
}

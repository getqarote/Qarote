import { cn } from "@/lib/utils";

interface PixelLoginProps {
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
}

/**
 * Pixel-art login / door-with-arrow icon.
 * Door frame on the right; arrow points left (into the door).
 * Mirror of PixelLogout.
 */
export function PixelLogin({ className, ...props }: PixelLoginProps) {
  return (
    <svg
      viewBox="0 0 371 371"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      shapeRendering="crispEdges"
      className={cn("w-auto", className)}
      {...props}
    >
      {/* Door frame top-right */}
      <rect x="212" y="0" width="106" height="106" fill="currentColor" />
      {/* Door frame bottom-right */}
      <rect x="212" y="265" width="106" height="106" fill="currentColor" />
      {/* Door frame right strip (middle rows) */}
      <rect x="265" y="106" width="53" height="159" fill="currentColor" />
      {/* Arrow pointing left — arrowhead top */}
      <rect x="106" y="106" width="106" height="53" fill="currentColor" />
      {/* Arrow shaft */}
      <rect x="0" y="159" width="212" height="53" fill="currentColor" />
      {/* Arrow pointing left — arrowhead bottom */}
      <rect x="106" y="212" width="106" height="53" fill="currentColor" />
    </svg>
  );
}

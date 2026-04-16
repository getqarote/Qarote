import { cn } from "@/lib/utils";

export function PixelSettings({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 371 371"
      fill="currentColor"
      shapeRendering="crispEdges"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("w-auto", className)}
      aria-hidden="true"
    >
      {/* Top tooth */}
      <rect x="106" y="0" width="159" height="53" />
      {/* Upper body */}
      <rect x="53" y="53" width="265" height="53" />
      {/* Row 2 — body at full width, 1-cell center hole */}
      <rect x="0" y="106" width="159" height="53" />
      <rect x="212" y="106" width="159" height="53" />
      {/* Row 3 — center band, 3-cell hole */}
      <rect x="0" y="159" width="106" height="53" />
      <rect x="265" y="159" width="106" height="53" />
      {/* Row 4 — mirror of row 2 */}
      <rect x="0" y="212" width="159" height="53" />
      <rect x="212" y="212" width="159" height="53" />
      {/* Lower body */}
      <rect x="53" y="265" width="265" height="53" />
      {/* Bottom tooth */}
      <rect x="106" y="318" width="159" height="53" />
    </svg>
  );
}

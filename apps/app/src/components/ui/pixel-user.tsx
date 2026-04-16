import { cn } from "@/lib/utils";

export function PixelUser({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 371 371"
      fill="currentColor"
      shapeRendering="crispEdges"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("w-auto", className)}
      aria-hidden="true"
    >
      {/* Head (3 wide × 2 tall, centered) */}
      <rect x="106" y="0" width="159" height="106" />
      {/* Neck */}
      <rect x="159" y="106" width="53" height="53" />
      {/* Body (5 wide × 3 tall) */}
      <rect x="53" y="159" width="265" height="159" />
      {/* Wide base */}
      <rect x="0" y="318" width="371" height="53" />
    </svg>
  );
}

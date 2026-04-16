import { cn } from "@/lib/utils";

interface PixelChevronDownProps {
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
}

/**
 * Pixel-art downward chevron. Mirror of PixelChevronRight rotated 90°.
 * ViewBox 265×159 (5 cols × 3 rows, 53px cells).
 */
export function PixelChevronDown({
  className,
  ...props
}: PixelChevronDownProps) {
  return (
    <svg
      viewBox="0 0 265 159"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      shapeRendering="crispEdges"
      className={cn("w-auto", className)}
      {...props}
    >
      <rect x="0" y="0" width="53" height="53" fill="currentColor" />
      <rect x="53" y="53" width="53" height="53" fill="currentColor" />
      <rect x="106" y="106" width="53" height="53" fill="currentColor" />
      <rect x="159" y="53" width="53" height="53" fill="currentColor" />
      <rect x="212" y="0" width="53" height="53" fill="currentColor" />
    </svg>
  );
}

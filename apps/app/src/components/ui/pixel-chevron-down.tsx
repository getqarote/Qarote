import { cn } from "@/lib/utils";

interface PixelChevronDownProps {
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
}

/**
 * Pixel-art down chevron. Square 265×265 viewBox (5×5 grid, 53px cells)
 * so it can share sizing with the other pixel chevrons.
 */
export function PixelChevronDown({
  className,
  ...props
}: PixelChevronDownProps) {
  return (
    <svg
      viewBox="0 0 265 265"
      fill="currentColor"
      shapeRendering="crispEdges"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("w-auto", className)}
      aria-hidden="true"
      {...props}
    >
      <rect x="0" y="53" width="53" height="53" />
      <rect x="53" y="106" width="53" height="53" />
      <rect x="106" y="159" width="53" height="53" />
      <rect x="159" y="106" width="53" height="53" />
      <rect x="212" y="53" width="53" height="53" />
    </svg>
  );
}

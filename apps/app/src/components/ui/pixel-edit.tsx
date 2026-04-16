import { cn } from "@/lib/utils";

interface PixelEditProps {
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
}

/**
 * Pixel-art pencil / edit icon. Diagonal line from bottom-left (nib)
 * to top-right (eraser), 2 cells wide throughout.
 */
export function PixelEdit({ className, ...props }: PixelEditProps) {
  return (
    <svg
      viewBox="0 0 371 371"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      shapeRendering="crispEdges"
      className={cn("w-auto", className)}
      {...props}
    >
      {/* Eraser end (top-right) */}
      <rect x="265" y="0" width="106" height="53" fill="currentColor" />
      {/* Pencil body diagonal */}
      <rect x="212" y="53" width="106" height="53" fill="currentColor" />
      <rect x="159" y="106" width="106" height="53" fill="currentColor" />
      <rect x="106" y="159" width="106" height="53" fill="currentColor" />
      <rect x="53" y="212" width="106" height="53" fill="currentColor" />
      {/* Nib */}
      <rect x="0" y="265" width="106" height="53" fill="currentColor" />
      {/* Tip */}
      <rect x="0" y="318" width="53" height="53" fill="currentColor" />
    </svg>
  );
}

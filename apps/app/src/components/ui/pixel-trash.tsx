import { cn } from "@/lib/utils";

interface PixelTrashProps {
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
}

export function PixelTrash({ className, ...props }: PixelTrashProps) {
  return (
    <svg
      viewBox="0 0 371 371"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      shapeRendering="crispEdges"
      className={cn("w-auto", className)}
      {...props}
    >
      {/* Handle */}
      <rect x="106" y="0" width="159" height="53" fill="currentColor" />
      {/* Lid (full width) */}
      <rect x="0" y="53" width="371" height="53" fill="currentColor" />
      {/* Body */}
      <rect x="53" y="106" width="265" height="212" fill="currentColor" />
      {/* Base */}
      <rect x="53" y="318" width="265" height="53" fill="currentColor" />
    </svg>
  );
}

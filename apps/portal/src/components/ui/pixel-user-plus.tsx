import { cn } from "@/lib/utils";

interface PixelUserPlusProps {
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
}

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
      <rect x="53" y="0" width="106" height="106" fill="currentColor" />
      <rect x="106" y="106" width="53" height="53" fill="currentColor" />
      <rect x="0" y="159" width="212" height="106" fill="currentColor" />
      <rect x="0" y="265" width="212" height="53" fill="currentColor" />
      <rect x="265" y="106" width="53" height="159" fill="currentColor" />
      <rect x="212" y="159" width="159" height="53" fill="currentColor" />
    </svg>
  );
}

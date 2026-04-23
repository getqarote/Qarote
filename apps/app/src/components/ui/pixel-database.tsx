import { cn } from "@/lib/utils";

export function PixelDatabase({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 371 371"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      shapeRendering="crispEdges"
      className={cn("w-auto", className)}
      aria-hidden="true"
    >
      {/* Top oval cap */}
      <path d="M53 0H318V53H53V0Z" fill="currentColor" />
      {/* Top body */}
      <path d="M0 53H371V106H0V53Z" fill="currentColor" />
      {/* Mid waist (narrower, suggests ellipse) */}
      <path d="M53 106H318V159H53V106Z" fill="currentColor" />
      {/* Mid body */}
      <path d="M0 159H371V212H0V159Z" fill="currentColor" />
      {/* Lower waist */}
      <path d="M53 212H318V265H53V212Z" fill="currentColor" />
      {/* Bottom body */}
      <path d="M0 265H371V318H0V265Z" fill="currentColor" />
      {/* Bottom oval cap */}
      <path d="M53 318H318V371H53V318Z" fill="currentColor" />
    </svg>
  );
}

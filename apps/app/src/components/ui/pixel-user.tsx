import { cn } from "@/lib/utils";

export function PixelUser({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 371 371"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      shapeRendering="crispEdges"
      className={cn("w-auto", className)}
      aria-hidden="true"
    >
      {/* Head */}
      <path d="M106 0H265V106H106V0Z" fill="currentColor" />
      {/* Shoulders */}
      <path d="M53 106H318V159H53V106Z" fill="currentColor" />
      {/* Body */}
      <path d="M0 159H371V265H0V159Z" fill="currentColor" />
      {/* Waist */}
      <path d="M53 265H318V318H53V265Z" fill="currentColor" />
      {/* Legs */}
      <path d="M53 318H159V371H53V318Z" fill="currentColor" />
      <path d="M212 318H318V371H212V318Z" fill="currentColor" />
    </svg>
  );
}

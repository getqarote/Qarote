import { cn } from "@/lib/utils";

export function PixelShield({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 371 371"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      shapeRendering="crispEdges"
      className={cn("w-auto", className)}
      aria-hidden="true"
    >
      {/* Top flat */}
      <path d="M53 0H318V53H53V0Z" fill="currentColor" />
      {/* Row 1 — full width */}
      <path d="M0 53H371V106H0V53Z" fill="currentColor" />
      {/* Row 2 — full width */}
      <path d="M0 106H371V159H0V106Z" fill="currentColor" />
      {/* Row 3 — full width */}
      <path d="M0 159H371V212H0V159Z" fill="currentColor" />
      {/* Row 4 — narrowing */}
      <path d="M53 212H318V265H53V212Z" fill="currentColor" />
      {/* Row 5 — narrowing */}
      <path d="M106 265H265V318H106V265Z" fill="currentColor" />
      {/* Tip */}
      <path d="M159 318H212V371H159V318Z" fill="currentColor" />
    </svg>
  );
}

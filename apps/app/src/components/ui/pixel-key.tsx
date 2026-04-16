import { cn } from "@/lib/utils";

export function PixelKey({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 371 371"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      shapeRendering="crispEdges"
      className={cn("w-auto", className)}
      aria-hidden="true"
    >
      {/* Key ring — top */}
      <path d="M106 0H265V53H106V0Z" fill="currentColor" />
      {/* Key ring — sides */}
      <path d="M53 53H106V106H53V53Z" fill="currentColor" />
      <path d="M265 53H318V106H265V53Z" fill="currentColor" />
      {/* Key ring — middle open (sides only) */}
      <path d="M53 106H106V159H53V106Z" fill="currentColor" />
      <path d="M265 106H318V159H265V106Z" fill="currentColor" />
      {/* Key ring — bottom */}
      <path d="M106 159H265V212H106V159Z" fill="currentColor" />
      {/* Shaft */}
      <path d="M212 212H265V265H212V265Z" fill="currentColor" />
      <path d="M212 212H265V265H212V212Z" fill="currentColor" />
      <path d="M212 265H318V318H212V265Z" fill="currentColor" />
      {/* Shaft end */}
      <path d="M212 318H265V371H212V318Z" fill="currentColor" />
    </svg>
  );
}

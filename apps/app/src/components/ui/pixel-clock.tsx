import { cn } from "@/lib/utils";

export function PixelClock({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 371 371"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      shapeRendering="crispEdges"
      className={cn("w-auto", className)}
      aria-hidden="true"
    >
      {/* Top arc */}
      <path d="M106 0H265V53H106V0Z" fill="currentColor" />
      {/* Row 1: sides + 12-hand */}
      <path d="M53 53H106V106H53V53Z" fill="currentColor" />
      <path d="M159 53H212V106H159V53Z" fill="currentColor" />
      <path d="M265 53H318V106H265V53Z" fill="currentColor" />
      {/* Row 2: sides + 12-hand */}
      <path d="M0 106H53V159H0V106Z" fill="currentColor" />
      <path d="M159 106H212V159H159V106Z" fill="currentColor" />
      <path d="M318 106H371V159H318V106Z" fill="currentColor" />
      {/* Row 3: sides + pivot + 3-hand */}
      <path d="M0 159H53V212H0V159Z" fill="currentColor" />
      <path d="M159 159H212V212H159V159Z" fill="currentColor" />
      <path d="M212 159H265V212H212V159Z" fill="currentColor" />
      <path d="M265 159H318V212H265V159Z" fill="currentColor" />
      <path d="M318 159H371V212H318V159Z" fill="currentColor" />
      {/* Row 4: sides */}
      <path d="M0 212H53V265H0V212Z" fill="currentColor" />
      <path d="M318 212H371V265H318V212Z" fill="currentColor" />
      {/* Row 5: sides */}
      <path d="M53 265H106V318H53V265Z" fill="currentColor" />
      <path d="M265 265H318V318H265V265Z" fill="currentColor" />
      {/* Bottom arc */}
      <path d="M106 318H265V371H106V318Z" fill="currentColor" />
    </svg>
  );
}

import { cn } from "@/lib/utils";

export function PixelPalette({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 371 371"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      shapeRendering="crispEdges"
      className={cn("w-auto", className)}
      aria-hidden="true"
    >
      {/* Sun rays — top */}
      <path d="M159 0H212V53H159V0Z" fill="currentColor" />
      {/* Sun rays — diagonal */}
      <path d="M53 53H106V106H53V53Z" fill="currentColor" />
      <path d="M265 53H318V106H265V53Z" fill="currentColor" />
      {/* Sun body */}
      <path d="M0 106H53V159H0V106Z" fill="currentColor" />
      <path d="M106 106H265V159H106V106Z" fill="currentColor" />
      <path d="M318 106H371V159H318V106Z" fill="currentColor" />
      {/* Sun body middle */}
      <path d="M0 159H53V212H0V159Z" fill="currentColor" />
      <path d="M106 159H265V212H106V159Z" fill="currentColor" />
      <path d="M318 159H371V212H318V159Z" fill="currentColor" />
      {/* Sun body bottom */}
      <path d="M0 212H53V265H0V212Z" fill="currentColor" />
      <path d="M106 212H265V265H106V212Z" fill="currentColor" />
      <path d="M318 212H371V265H318V212Z" fill="currentColor" />
      {/* Sun rays — diagonal bottom */}
      <path d="M53 265H106V318H53V265Z" fill="currentColor" />
      <path d="M265 265H318V318H265V265Z" fill="currentColor" />
      {/* Sun rays — bottom */}
      <path d="M159 318H212V371H159V318Z" fill="currentColor" />
    </svg>
  );
}

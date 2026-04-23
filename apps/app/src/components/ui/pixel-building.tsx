import { cn } from "@/lib/utils";

export function PixelBuilding({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 371 371"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      shapeRendering="crispEdges"
      className={cn("w-auto", className)}
      aria-hidden="true"
    >
      {/* Two towers */}
      <path d="M106 0H159V53H106V0Z" fill="currentColor" />
      <path d="M212 0H265V53H212V0Z" fill="currentColor" />
      {/* Tower bodies */}
      <path d="M106 53H159V106H106V53Z" fill="currentColor" />
      <path d="M212 53H265V106H212V53Z" fill="currentColor" />
      {/* Roof line */}
      <path d="M0 106H371V159H0V106Z" fill="currentColor" />
      {/* Windows row 1 */}
      <path d="M0 159H53V212H0V159Z" fill="currentColor" />
      <path d="M106 159H159V212H106V159Z" fill="currentColor" />
      <path d="M212 159H265V212H212V159Z" fill="currentColor" />
      <path d="M318 159H371V212H318V159Z" fill="currentColor" />
      {/* Windows row 2 */}
      <path d="M0 212H53V265H0V212Z" fill="currentColor" />
      <path d="M106 212H159V265H106V212Z" fill="currentColor" />
      <path d="M212 212H265V265H212V212Z" fill="currentColor" />
      <path d="M318 212H371V265H318V212Z" fill="currentColor" />
      {/* Door */}
      <path d="M0 265H53V318H0V265Z" fill="currentColor" />
      <path d="M159 265H212V318H159V265Z" fill="currentColor" />
      <path d="M318 265H371V318H318V265Z" fill="currentColor" />
      {/* Ground */}
      <path d="M0 318H371V371H0V318Z" fill="currentColor" />
    </svg>
  );
}

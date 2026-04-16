import { cn } from "@/lib/utils";

export function PixelSettings({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 371 371"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      shapeRendering="crispEdges"
      className={cn("w-auto", className)}
      aria-hidden="true"
    >
      {/* Top tooth */}
      <path d="M159 0H212V53H159V0Z" fill="currentColor" />
      {/* Row 1 */}
      <path d="M106 53H265V106H106V53Z" fill="currentColor" />
      {/* Row 2 */}
      <path d="M53 106H318V159H53V106Z" fill="currentColor" />
      {/* Row 3 — widest (left + right teeth) */}
      <path d="M0 159H371V212H0V159Z" fill="currentColor" />
      {/* Row 4 */}
      <path d="M53 212H318V265H53V212Z" fill="currentColor" />
      {/* Row 5 */}
      <path d="M106 265H265V318H106V265Z" fill="currentColor" />
      {/* Bottom tooth */}
      <path d="M159 318H212V371H159V318Z" fill="currentColor" />
    </svg>
  );
}

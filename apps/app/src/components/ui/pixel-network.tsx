import { cn } from "@/lib/utils";

export function PixelNetwork({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 371 371"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      shapeRendering="crispEdges"
      className={cn("w-auto", className)}
      aria-hidden="true"
    >
      {/* Top node */}
      <path d="M106 0H265V106H106V0Z" fill="currentColor" />
      {/* Vertical line down from top node */}
      <path d="M159 106H212V159H159V106Z" fill="currentColor" />
      {/* Left spoke */}
      <path d="M0 159H106V212H0V159Z" fill="currentColor" />
      {/* Center */}
      <path d="M106 159H265V212H106V159Z" fill="currentColor" />
      {/* Right spoke */}
      <path d="M265 159H371V212H265V159Z" fill="currentColor" />
      {/* Vertical line down-left */}
      <path d="M53 212H106V265H53V212Z" fill="currentColor" />
      {/* Vertical line down-right */}
      <path d="M265 212H318V265H265V212Z" fill="currentColor" />
      {/* Bottom-left node */}
      <path d="M0 265H159V371H0V265Z" fill="currentColor" />
      {/* Bottom-right node */}
      <path d="M212 265H371V371H212V265Z" fill="currentColor" />
    </svg>
  );
}

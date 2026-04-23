import { cn } from "@/lib/utils";

export function PixelFlag({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 318 371"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      shapeRendering="crispEdges"
      className={cn("w-auto", className)}
      aria-hidden="true"
    >
      <path d="M0 159H53V212H0V159Z" fill="currentColor" />
      <path d="M0 265H53V318H0V265Z" fill="currentColor" />
      <path d="M0 318H53V371H0V318Z" fill="currentColor" />
      <path d="M0 212H53V265H0V212Z" fill="currentColor" />
      <path d="M0 106H53V159H0V106Z" fill="currentColor" />
      <path d="M0 53H53V106H0V53Z" fill="currentColor" />
      <path d="M0 0H53V53H0V0Z" fill="currentColor" />
      <path d="M53 0H106V53H53V0Z" fill="currentColor" />
      <path d="M106 0H159V53H106V0Z" fill="currentColor" />
      <path d="M159 53H212V106H159V53Z" fill="currentColor" />
      <path d="M212 53H265V106H212V53Z" fill="currentColor" />
      <path d="M53 159H106V212H53V159Z" fill="currentColor" />
      <path d="M106 159H159V212H106V159Z" fill="currentColor" />
      <path d="M159 212H212V265H159V212Z" fill="currentColor" />
      <path d="M212 212H265V265H212V212Z" fill="currentColor" />
      <path d="M265 212H318V265H265V212Z" fill="currentColor" />
      <path d="M265 159H318V212H265V159Z" fill="currentColor" />
      <path d="M265 106H318V159H265V106Z" fill="currentColor" />
      <path d="M265 53H318V106H265V53Z" fill="currentColor" />
    </svg>
  );
}

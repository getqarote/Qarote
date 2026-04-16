import { cn } from "@/lib/utils";

export function PixelChart({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 371 369"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      shapeRendering="crispEdges"
      className={cn("w-auto", className)}
      aria-hidden="true"
    >
      <path d="M159 369V316H212V369H159Z" fill="currentColor" />
      <path d="M212 369V316H265V369H212Z" fill="currentColor" />
      <path d="M265 369V316H318V369H265Z" fill="currentColor" />
      <path d="M318 369V316H371V369H318Z" fill="currentColor" />
      <path d="M0 106H53V53H0V106Z" fill="currentColor" />
      <path d="M0 53H53V0H0V53Z" fill="currentColor" />
      <path d="M0 318H53V265H0V318Z" fill="currentColor" />
      <path d="M0 265V212H53V265H0Z" fill="currentColor" />
      <path d="M0 212V159H53V212H0Z" fill="currentColor" />
      <path d="M0 159H53V106H0V159Z" fill="currentColor" />
      <path d="M106 369V316H159V369H106Z" fill="currentColor" />
      <path d="M53 369H106V316H53V369Z" fill="currentColor" />
      <path d="M159 106H212V159H159V106Z" fill="currentColor" />
      <path d="M106 159H159V212H106V159Z" fill="currentColor" />
      <path d="M53 212H106V265H53V212Z" fill="currentColor" />
      <path d="M265 106H318V159H265V106Z" fill="currentColor" />
      <path d="M212 159H265V212H212V159Z" fill="currentColor" />
      <path d="M318 53H371V106H318V53Z" fill="currentColor" />
    </svg>
  );
}

import { cn } from "@/lib/utils";

export function PixelFolder({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 371 371"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      shapeRendering="crispEdges"
      className={cn("w-auto", className)}
      aria-hidden="true"
    >
      {/* Child folder tab */}
      <path d="M212 0H265V53H212V0Z" fill="currentColor" />
      {/* Child folder body row 1 */}
      <path d="M159 53H371V106H159V53Z" fill="currentColor" />
      {/* Parent folder tab */}
      <path d="M0 106H106V159H0V106Z" fill="currentColor" />
      {/* Child folder body row 2 */}
      <path d="M159 106H371V159H159V106Z" fill="currentColor" />
      {/* Parent folder top (full width) */}
      <path d="M0 159H371V212H0V159Z" fill="currentColor" />
      {/* Parent folder body */}
      <path d="M0 212H371V265H0V212Z" fill="currentColor" />
      <path d="M0 265H371V318H0V265Z" fill="currentColor" />
      <path d="M0 318H371V371H0V318Z" fill="currentColor" />
    </svg>
  );
}

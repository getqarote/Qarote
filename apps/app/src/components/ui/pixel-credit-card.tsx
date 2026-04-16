import { cn } from "@/lib/utils";

export function PixelCreditCard({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 477 318"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      shapeRendering="crispEdges"
      className={cn("w-auto", className)}
      aria-hidden="true"
    >
      {/* Top border */}
      <path d="M0 0H477V53H0V0Z" fill="currentColor" />
      {/* Magnetic stripe */}
      <path d="M0 53H477V106H0V53Z" fill="currentColor" />
      {/* Left + right borders, row 2 */}
      <path d="M0 106H53V159H0V106Z" fill="currentColor" />
      <path d="M424 106H477V159H424V106Z" fill="currentColor" />
      {/* Chip + borders, row 3 */}
      <path d="M0 159H53V212H0V159Z" fill="currentColor" />
      <path d="M53 159H159V212H53V159Z" fill="currentColor" />
      <path d="M424 159H477V212H424V159Z" fill="currentColor" />
      {/* Left + right borders, row 4 */}
      <path d="M0 212H53V265H0V212Z" fill="currentColor" />
      <path d="M424 212H477V265H424V212Z" fill="currentColor" />
      {/* Bottom border */}
      <path d="M0 265H477V318H0V265Z" fill="currentColor" />
    </svg>
  );
}

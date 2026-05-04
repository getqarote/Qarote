interface PixelXProps {
  className?: string;
}

export function PixelX({ className }: PixelXProps) {
  return (
    <svg
      viewBox="0 0 265 265"
      fill="currentColor"
      shapeRendering="crispEdges"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Top-left to bottom-right diagonal */}
      <rect x="0" y="0" width="53" height="53" />
      <rect x="53" y="53" width="53" height="53" />
      <rect x="106" y="106" width="53" height="53" />
      <rect x="159" y="159" width="53" height="53" />
      <rect x="212" y="212" width="53" height="53" />
      {/* Top-right to bottom-left diagonal */}
      <rect x="212" y="0" width="53" height="53" />
      <rect x="159" y="53" width="53" height="53" />
      {/* center already covered above */}
      <rect x="53" y="159" width="53" height="53" />
      <rect x="0" y="212" width="53" height="53" />
    </svg>
  );
}

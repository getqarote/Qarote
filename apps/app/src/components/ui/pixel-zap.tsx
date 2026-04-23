interface PixelZapProps {
  className?: string;
}

export function PixelZap({ className }: PixelZapProps) {
  return (
    <svg
      viewBox="0 0 265 371"
      fill="currentColor"
      shapeRendering="crispEdges"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ width: "auto" }}
      aria-hidden="true"
    >
      {/* Top section */}
      <rect x="53" y="0" width="159" height="53" />
      <rect x="53" y="53" width="106" height="53" />
      {/* Wide diagonal cross — left half */}
      <rect x="0" y="106" width="212" height="53" />
      {/* Wide diagonal cross — right half */}
      <rect x="53" y="159" width="212" height="53" />
      {/* Bottom section */}
      <rect x="106" y="212" width="106" height="53" />
      <rect x="106" y="265" width="53" height="53" />
      <rect x="106" y="318" width="53" height="53" />
    </svg>
  );
}

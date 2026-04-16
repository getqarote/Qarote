interface PixelCrownProps {
  className?: string;
}

export function PixelCrown({ className }: PixelCrownProps) {
  return (
    <svg
      viewBox="0 0 371 212"
      fill="currentColor"
      shapeRendering="crispEdges"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ width: "auto" }}
      aria-hidden="true"
    >
      {/* Four peaks */}
      <rect x="0" y="0" width="53" height="53" />
      <rect x="106" y="0" width="53" height="53" />
      <rect x="212" y="0" width="53" height="53" />
      <rect x="318" y="0" width="53" height="53" />
      {/* Crown band */}
      <rect x="0" y="53" width="371" height="53" />
      {/* Crown body (hollow) */}
      <rect x="0" y="106" width="53" height="53" />
      <rect x="318" y="106" width="53" height="53" />
      {/* Crown base */}
      <rect x="0" y="159" width="371" height="53" />
    </svg>
  );
}

interface PixelPenProps {
  className?: string;
}

export function PixelPen({ className }: PixelPenProps) {
  return (
    <svg
      viewBox="0 0 371 371"
      fill="currentColor"
      shapeRendering="crispEdges"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ width: "auto" }}
      aria-hidden="true"
    >
      {/* Nib end (top-right) */}
      <rect x="265" y="0" width="53" height="53" />
      {/* Diagonal body, 2px wide */}
      <rect x="212" y="53" width="53" height="53" />
      <rect x="265" y="53" width="53" height="53" />
      <rect x="159" y="106" width="53" height="53" />
      <rect x="212" y="106" width="53" height="53" />
      <rect x="106" y="159" width="53" height="53" />
      <rect x="159" y="159" width="53" height="53" />
      <rect x="53" y="212" width="53" height="53" />
      <rect x="106" y="212" width="53" height="53" />
      <rect x="0" y="265" width="53" height="53" />
      <rect x="53" y="265" width="53" height="53" />
      {/* Tip pixel */}
      <rect x="0" y="318" width="53" height="53" />
    </svg>
  );
}

interface PixelLayersProps {
  className?: string;
}

export function PixelLayers({ className }: PixelLayersProps) {
  return (
    <svg
      viewBox="0 0 371 265"
      fill="currentColor"
      shapeRendering="crispEdges"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ width: "auto" }}
      aria-hidden="true"
    >
      {/* Top bar */}
      <rect x="0" y="0" width="371" height="53" />
      {/* Middle bar */}
      <rect x="0" y="106" width="371" height="53" />
      {/* Bottom bar */}
      <rect x="0" y="212" width="371" height="53" />
    </svg>
  );
}

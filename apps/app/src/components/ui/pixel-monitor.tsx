interface PixelMonitorProps {
  className?: string;
}

export function PixelMonitor({ className }: PixelMonitorProps) {
  return (
    <svg
      viewBox="0 0 477 371"
      fill="currentColor"
      shapeRendering="crispEdges"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ width: "auto" }}
      aria-hidden="true"
    >
      {/* Screen top border */}
      <rect x="0" y="0" width="477" height="53" />
      {/* Screen sides */}
      <rect x="0" y="53" width="53" height="53" />
      <rect x="424" y="53" width="53" height="53" />
      <rect x="0" y="106" width="53" height="53" />
      <rect x="424" y="106" width="53" height="53" />
      <rect x="0" y="159" width="53" height="53" />
      <rect x="424" y="159" width="53" height="53" />
      {/* Screen bottom border */}
      <rect x="0" y="212" width="477" height="53" />
      {/* Stand */}
      <rect x="159" y="265" width="159" height="53" />
      {/* Base */}
      <rect x="106" y="318" width="265" height="53" />
    </svg>
  );
}

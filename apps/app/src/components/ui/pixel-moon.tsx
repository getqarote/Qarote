interface PixelMoonProps {
  className?: string;
}

export function PixelMoon({ className }: PixelMoonProps) {
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
      <rect x="159" y="0" width="159" height="53" />
      <rect x="106" y="53" width="159" height="53" />
      <rect x="53" y="106" width="159" height="53" />
      <rect x="53" y="159" width="159" height="53" />
      <rect x="53" y="212" width="159" height="53" />
      <rect x="106" y="265" width="159" height="53" />
      <rect x="159" y="318" width="159" height="53" />
    </svg>
  );
}

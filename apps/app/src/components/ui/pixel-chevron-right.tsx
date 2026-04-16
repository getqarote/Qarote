interface PixelChevronRightProps {
  className?: string;
}

export function PixelChevronRight({ className }: PixelChevronRightProps) {
  return (
    <svg
      viewBox="0 0 159 265"
      fill="currentColor"
      shapeRendering="crispEdges"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ width: "auto" }}
      aria-hidden="true"
    >
      <rect x="0" y="0" width="53" height="53" />
      <rect x="53" y="53" width="53" height="53" />
      <rect x="106" y="106" width="53" height="53" />
      <rect x="53" y="159" width="53" height="53" />
      <rect x="0" y="212" width="53" height="53" />
    </svg>
  );
}

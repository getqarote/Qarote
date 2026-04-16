interface PixelReceiptProps {
  className?: string;
}

export function PixelReceipt({ className }: PixelReceiptProps) {
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
      {/* Top border */}
      <rect x="0" y="0" width="371" height="53" />
      {/* Row 1: sides */}
      <rect x="0" y="53" width="53" height="53" />
      <rect x="318" y="53" width="53" height="53" />
      {/* Row 2: sides + text line */}
      <rect x="0" y="106" width="53" height="53" />
      <rect x="106" y="106" width="159" height="53" />
      <rect x="318" y="106" width="53" height="53" />
      {/* Row 3: sides */}
      <rect x="0" y="159" width="53" height="53" />
      <rect x="318" y="159" width="53" height="53" />
      {/* Row 4: sides + shorter text line */}
      <rect x="0" y="212" width="53" height="53" />
      <rect x="106" y="212" width="106" height="53" />
      <rect x="318" y="212" width="53" height="53" />
      {/* Row 5: sides */}
      <rect x="0" y="265" width="53" height="53" />
      <rect x="318" y="265" width="53" height="53" />
      {/* Zigzag tear at bottom */}
      <rect x="0" y="318" width="53" height="53" />
      <rect x="106" y="318" width="53" height="53" />
      <rect x="212" y="318" width="53" height="53" />
      <rect x="318" y="318" width="53" height="53" />
    </svg>
  );
}

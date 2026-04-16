interface PixelCalendarProps {
  className?: string;
}

export function PixelCalendar({ className }: PixelCalendarProps) {
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
      {/* Binding rings */}
      <rect x="53" y="0" width="53" height="53" />
      <rect x="265" y="0" width="53" height="53" />
      {/* Header border + header block */}
      <rect x="0" y="53" width="371" height="53" />
      <rect x="0" y="106" width="371" height="53" />
      {/* Grid row 1: outer border + dividers */}
      <rect x="0" y="159" width="53" height="53" />
      <rect x="106" y="159" width="53" height="53" />
      <rect x="212" y="159" width="53" height="53" />
      <rect x="318" y="159" width="53" height="53" />
      {/* Grid row 2: just sides */}
      <rect x="0" y="212" width="53" height="53" />
      <rect x="318" y="212" width="53" height="53" />
      {/* Grid row 3: outer border + dividers */}
      <rect x="0" y="265" width="53" height="53" />
      <rect x="106" y="265" width="53" height="53" />
      <rect x="212" y="265" width="53" height="53" />
      <rect x="318" y="265" width="53" height="53" />
      {/* Bottom border */}
      <rect x="0" y="318" width="371" height="53" />
    </svg>
  );
}

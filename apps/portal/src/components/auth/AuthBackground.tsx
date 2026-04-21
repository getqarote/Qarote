function MessagePacket({
  width,
  height,
  className,
}: {
  width: number;
  height: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 20 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      className={className}
      aria-hidden="true"
    >
      <rect width="20" height="16" rx="2" fill="currentColor" />
      <path
        d="M1.5 3 L10 9.5 L18.5 3"
        stroke="hsl(var(--background))"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const PACKETS: Array<{ width: number; packetClass: string }> = [
  { width: 14, packetClass: "auth-packet auth-packet-0" },
  { width: 10, packetClass: "auth-packet auth-packet-1" },
  { width: 12, packetClass: "auth-packet auth-packet-2" },
  { width: 16, packetClass: "auth-packet auth-packet-3" },
  { width: 11, packetClass: "auth-packet auth-packet-4" },
  { width: 13, packetClass: "auth-packet auth-packet-5" },
];

export function AuthBackground() {
  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      <div className="absolute inset-0 auth-bg-grid" />

      {PACKETS.map(({ width, packetClass }, i) => (
        <div key={i} className={packetClass}>
          <MessagePacket
            width={width}
            height={Math.round(width * 0.8)}
            className="text-primary/25"
          />
        </div>
      ))}
    </div>
  );
}

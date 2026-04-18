/**
 * Tiny AMQP message-envelope SVG — represents a message packet in flight.
 * Adapts to both light and dark mode: envelope fill uses `currentColor`
 * (set via Tailwind opacity modifier on the parent), envelope "V" line
 * uses `hsl(var(--background))` so it reads against the fill on either
 * theme without explicit color overrides.
 */
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

/** Position, sizing, and timing for each floating packet. */
const PACKETS: Array<{
  left: string;
  bottom: string;
  width: number;
  dur: number;
  delay: number;
}> = [
  { left: "6%", bottom: "18%", width: 14, dur: 8, delay: 0 },
  { left: "13%", bottom: "52%", width: 10, dur: 11, delay: 3.2 },
  { left: "7%", bottom: "78%", width: 12, dur: 9, delay: 1.5 },
  { left: "82%", bottom: "28%", width: 16, dur: 7, delay: 0.8 },
  { left: "90%", bottom: "55%", width: 11, dur: 10, delay: 4.0 },
  { left: "86%", bottom: "72%", width: 13, dur: 12, delay: 2.1 },
];

/**
 * Atmospheric background layer for all auth pages.
 *
 * Layers (bottom → top):
 *   1. Dot-grid texture — very low opacity brand tint over `bg-background`
 *   2. Floating message packets — AMQP packets drifting upward, staggered
 *   3. HappyRabbit mascot — bottom-left, standard bob + ear + nose animations
 *
 * The whole layer is `pointer-events-none` + `aria-hidden` — purely visual.
 * Every animation uses `motion-safe:` guards or a `prefers-reduced-motion`
 * override so users who opt out of motion get a clean static background.
 */
export function AuthBackground() {
  return (
    <>
      {/*
        Float animation for the message packets. Defined here to keep the
        background self-contained. The `prefers-reduced-motion` block
        collapses each packet to a static, faint dot so the background
        still has visual texture without any moving parts.
      */}
      <style>{`
        @keyframes auth-packet-rise {
          0%   { transform: translateY(0)     rotate(-4deg); opacity: 0;   }
          8%   { opacity: 1;                                               }
          88%  { opacity: 0.7;                                             }
          100% { transform: translateY(-80px) rotate(5deg);  opacity: 0;  }
        }
        @media (prefers-reduced-motion: reduce) {
          .auth-packet {
            animation: none !important;
            opacity: 0.2 !important;
          }
        }
      `}</style>

      <div
        className="absolute inset-0 overflow-hidden pointer-events-none"
        aria-hidden="true"
      >
        {/* 1 — Dot-grid texture */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle, hsl(var(--primary) / 0.055) 1.5px, transparent 1.5px)",
            backgroundSize: "28px 28px",
          }}
        />

        {/* 2 — Floating message packets, scattered left and right columns */}
        {PACKETS.map(({ left, bottom, width, dur, delay }, i) => (
          <div
            key={i}
            className="absolute auth-packet"
            style={{
              left,
              bottom,
              animationName: "auth-packet-rise",
              animationDuration: `${dur}s`,
              animationTimingFunction: "ease-in-out",
              animationDelay: `${delay}s`,
              animationIterationCount: "infinite",
            }}
          >
            <MessagePacket
              width={width}
              height={Math.round(width * 0.8)}
              className="text-primary/25"
            />
          </div>
        ))}
      </div>
    </>
  );
}

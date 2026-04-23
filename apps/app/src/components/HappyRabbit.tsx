export function HappyRabbit() {
  return (
    <svg
      width="120"
      height="140"
      viewBox="0 0 120 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="mx-auto motion-safe:animate-rabbit-bob"
      aria-hidden="true"
      focusable="false"
    >
      {/* Left ear */}
      <g
        className="motion-safe:animate-ear-twitch-left"
        style={{ transformOrigin: "42px 45px" }}
      >
        <rect
          x="30"
          y="8"
          width="24"
          height="50"
          rx="12"
          fill="currentColor"
          className="text-muted-foreground/20"
        />
        <rect
          x="35"
          y="16"
          width="14"
          height="34"
          rx="7"
          className="text-primary/25"
          fill="currentColor"
        />
      </g>
      {/* Right ear */}
      <g
        className="motion-safe:animate-ear-twitch-right"
        style={{ transformOrigin: "78px 45px" }}
      >
        <rect
          x="66"
          y="8"
          width="24"
          height="50"
          rx="12"
          fill="currentColor"
          className="text-muted-foreground/20"
        />
        <rect
          x="71"
          y="16"
          width="14"
          height="34"
          rx="7"
          className="text-primary/25"
          fill="currentColor"
        />
      </g>

      {/* Body */}
      <ellipse
        cx="60"
        cy="110"
        rx="28"
        ry="24"
        fill="currentColor"
        className="text-muted-foreground/15"
      />
      {/* Head */}
      <circle
        cx="60"
        cy="72"
        r="30"
        fill="currentColor"
        className="text-muted-foreground/20"
      />

      {/* Eyes (soft) */}
      <g
        className="motion-safe:animate-blink"
        style={{ transformOrigin: "48px 66px" }}
      >
        <circle
          cx="48"
          cy="66"
          r="3.5"
          fill="currentColor"
          className="text-muted-foreground"
        />
      </g>
      <g
        className="motion-safe:animate-blink-delayed"
        style={{ transformOrigin: "72px 66px" }}
      >
        <circle
          cx="72"
          cy="66"
          r="3.5"
          fill="currentColor"
          className="text-muted-foreground"
        />
      </g>

      {/* Nose */}
      <ellipse
        cx="60"
        cy="79"
        rx="4"
        ry="3"
        fill="currentColor"
        className="text-primary motion-safe:animate-nose-wiggle"
        style={{ transformOrigin: "60px 79px" }}
      />

      {/* Smile */}
      <path
        d="M50 84 Q60 92 70 84"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
        className="text-muted-foreground/60"
      />

      {/* Feet */}
      <ellipse
        cx="46"
        cy="130"
        rx="12"
        ry="6"
        fill="currentColor"
        className="text-muted-foreground/20"
      />
      <ellipse
        cx="74"
        cy="130"
        rx="12"
        ry="6"
        fill="currentColor"
        className="text-muted-foreground/20"
      />

      {/* Check badge */}
      <g
        className="motion-safe:animate-badge-pop"
        style={{ transformOrigin: "88px 52px" }}
      >
        <circle
          cx="88"
          cy="52"
          r="10.5"
          fill="currentColor"
          className="text-success/20"
        />
        <path
          d="M84.5 52.2 L87.2 55.0 L92.2 49.6"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-success"
        />
      </g>
    </svg>
  );
}

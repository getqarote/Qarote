export function ConfusedRabbit() {
  return (
    <svg
      width="120"
      height="140"
      viewBox="0 0 120 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="mx-auto motion-safe:animate-rabbit-bounce"
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
          className="text-primary/30"
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
          className="text-primary/30"
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
      {/* Left eye - X mark (confused) */}
      <g
        className="motion-safe:animate-blink"
        style={{ transformOrigin: "48px 66px" }}
      >
        <line
          x1="43"
          y1="61"
          x2="53"
          y2="71"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          className="text-muted-foreground"
        />
        <line
          x1="53"
          y1="61"
          x2="43"
          y2="71"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          className="text-muted-foreground"
        />
      </g>
      {/* Right eye - X mark (confused) */}
      <g
        className="motion-safe:animate-blink-delayed"
        style={{ transformOrigin: "72px 66px" }}
      >
        <line
          x1="67"
          y1="61"
          x2="77"
          y2="71"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          className="text-muted-foreground"
        />
        <line
          x1="77"
          y1="61"
          x2="67"
          y2="71"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
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
      {/* Mouth - wobbly */}
      <path
        d="M54 84 Q57 88 60 84 Q63 88 66 84"
        stroke="currentColor"
        strokeWidth="1.5"
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
    </svg>
  );
}

export function CleanupRabbit() {
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

      {/* Eyes (calm) */}
      <path
        d="M44 66 Q48 63 52 66"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        className="text-muted-foreground"
      />
      <path
        d="M68 66 Q72 63 76 66"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        className="text-muted-foreground"
      />

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

      {/* Small mouth */}
      <path
        d="M54 84 Q57 87 60 84 Q63 87 66 84"
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

      {/* Broom */}
      <g
        className="motion-safe:animate-broom-swish"
        style={{ transformOrigin: "84px 102px" }}
      >
        {/* handle */}
        <rect
          x="86"
          y="82"
          width="4"
          height="44"
          rx="2"
          fill="currentColor"
          className="text-muted-foreground/35"
        />
        {/* bristles */}
        <path
          d="M78 124 Q88 112 98 124 Q93 132 88 132 Q83 132 78 124 Z"
          fill="currentColor"
          className="text-warning/20"
        />
        <path
          d="M81 124 Q88 116 95 124"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          className="text-warning/50"
        />
      </g>

      {/* Little dust spark */}
      <g
        className="motion-safe:animate-dust-fade"
        style={{ transformOrigin: "70px 126px" }}
      >
        <circle
          cx="68"
          cy="126"
          r="2.2"
          fill="currentColor"
          className="text-muted-foreground/25"
        />
        <circle
          cx="74"
          cy="129"
          r="1.6"
          fill="currentColor"
          className="text-muted-foreground/20"
        />
      </g>
    </svg>
  );
}

/* ============================================================================
 * HeroAgentChat — the "proof" card in the hero (right column).
 * Ported from docs/reference/HeroAgentChat.reference.tsx.
 * ----------------------------------------------------------------------------
 * A small terminal-style chat panel over the dark hero. Shows ONE real exchange:
 * the user asks, the agent calls Qarote MCP tools and returns a grounded root
 * cause. Static (no live calls) — a screenshot-in-markup proof, role="img" with
 * an aria-label. The blinking caret uses the `blink` keyframe + `.hero-caret`
 * rule in apps/web/src/styles/index.css.
 * ==========================================================================*/

export default function HeroAgentChat() {
  const Dot = () => (
    <span className="h-[11px] w-[11px] rounded-full bg-[#2b3140]" />
  );
  return (
    <div
      role="img"
      aria-label="Example agent conversation: asked what's wrong with RabbitMQ, the agent calls Qarote MCP tools and reports orders.incoming lost its consumers"
      className="overflow-hidden rounded-xl border border-[#232936] bg-[#11151E]/80 shadow-[0_30px_70px_-30px_rgba(0,0,0,0.7)] backdrop-blur-sm"
    >
      {/* title bar */}
      <div className="flex items-center gap-2 border-b border-[#232936] bg-[#0B0E14]/60 px-[15px] py-[11px]">
        <Dot />
        <Dot />
        <Dot />
        <span className="font-mono text-[12px] text-[#9AA3B2]">
          agent · claude code
        </span>
      </div>
      {/* body */}
      <div className="flex flex-col gap-[14px] p-[18px]">
        {/* user */}
        <div className="flex flex-col gap-[6px]">
          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#9AA3B2]">
            You
          </span>
          <div className="max-w-[88%] self-start rounded-[10px] bg-white/[0.05] px-[14px] py-3 text-[14.5px] leading-[1.58] text-[#E7EAF0]">
            what&apos;s wrong with my RabbitMQ?
          </div>
        </div>
        {/* agent */}
        <div className="flex flex-col gap-[6px]">
          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-carrot">
            Agent
          </span>
          <div className="rounded-[10px] border border-carrot/25 bg-carrot/10 px-[14px] py-3 text-[14.5px] leading-[1.58] text-[#f4ddc9]">
            <span className="mb-2 flex items-center gap-[6px] font-mono text-[11.5px] text-[#9AA3B2]">
              called <code className="text-carrot">list_incidents</code> ·{" "}
              <code className="text-carrot">get_incident</code>
            </span>
            <b className="font-semibold text-white">orders.incoming</b> lost its
            3 consumers at 15:06; depth is climbing ~8k/min with zero drain —
            likely a crashed worker downstream.
            <span className="hero-caret" aria-hidden="true" />
          </div>
        </div>
      </div>
    </div>
  );
}

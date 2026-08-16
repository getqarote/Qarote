/* ============================================================================
 * DemoVideoModal — "Watch the 2-min demo" lightbox with lazy YouTube embed.
 * Ported from docs/reference/DemoVideoModal.reference.tsx.
 * ----------------------------------------------------------------------------
 * A trigger button (hero CTA row) + a full-screen modal that lazy-loads the
 * YouTube iframe only when opened (no YouTube JS on first paint). Accessible:
 * role="dialog" aria-modal, Esc to close, backdrop click, focus moves to the
 * close button, scroll locked while open. Opens from its own trigger button in
 * the hero CTA row.
 * ==========================================================================*/

import { useEffect, useRef, useState } from "react";

export default function DemoVideoModal({ videoId = "" }: { videoId?: string }) {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      {/* trigger — sits in the hero CTA row */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Watch the 2-minute demo video"
        className="group inline-flex items-center gap-[9px] border-0 bg-transparent p-1 font-sans text-[15px] font-medium text-[#E7EAF0] hover:text-white"
      >
        <span className="grid h-[34px] w-[34px] place-items-center rounded-full border border-[#232936] bg-carrot/10 text-carrot transition-colors group-hover:border-carrot group-hover:bg-carrot/20">
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
        Watch the 2-min demo
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Qarote demo video"
        >
          <button
            type="button"
            aria-label="Close video"
            onClick={() => setOpen(false)}
            className="absolute inset-0 cursor-default bg-[#0B0E14]/80 backdrop-blur-[3px]"
            tabIndex={-1}
          />
          <button
            ref={closeRef}
            onClick={() => setOpen(false)}
            aria-label="Close video"
            className="absolute right-5 top-5 z-[2] text-[#9AA3B2] hover:text-white"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
          <div className="relative z-[1] w-full max-w-[960px]">
            <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-[#232936] bg-[#11151E]">
              {videoId ? (
                <iframe
                  className="absolute inset-0 h-full w-full"
                  src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
                  title="Qarote demo"
                  allow="autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center bg-[repeating-linear-gradient(135deg,#11151E,#11151E_12px,rgba(255,255,255,0.015)_12px,rgba(255,255,255,0.015)_24px)]">
                  <span className="grid h-[56px] w-[56px] place-items-center rounded-full bg-carrot text-white">
                    <svg
                      width="26"
                      height="26"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </span>
                  <div className="text-[15px] text-[#E7EAF0]">
                    Demo video —{" "}
                    <code className="font-mono text-[13px] text-[#9AA3B2]">
                      youtube.com/embed/VIDEO_ID
                    </code>
                  </div>
                  <div className="font-mono text-[12px] text-[#9AA3B2]">
                    ⚑ placeholder · pass the real YouTube id to embed
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

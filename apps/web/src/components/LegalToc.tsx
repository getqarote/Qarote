import { useEffect, useState } from "react";

interface TocItem {
  id: string;
  label: string;
}

// Navbar + margin line, matching the prototype's spy() (140px). A section is
// "active" once its top has scrolled above this line.
const ACTIVE_OFFSET = 140;

/**
 * Sticky table of contents with scroll-spy for the long-form legal pages.
 *
 * Sticky positioning is pure CSS (lg:sticky); the active highlight is a passive,
 * rAF-throttled scroll listener that marks the last section whose top has
 * scrolled above the navbar line (matches the prototype's spy()). The active
 * link gets the carrot left-border + carrot text and carries aria-current. On
 * <lg it's a static card above the body (no sticky).
 */
export function LegalToc({
  items,
  contentsLabel,
}: {
  items: TocItem[];
  contentsLabel: string;
}) {
  const [active, setActive] = useState(items[0]?.id ?? "");
  const idsKey = items.map((i) => i.id).join("|");

  useEffect(() => {
    const els = items
      .map((i) => document.getElementById(i.id))
      .filter((el): el is HTMLElement => el !== null);
    if (els.length === 0) return;

    let raf = 0;
    const compute = () => {
      raf = 0;
      let cur = els[0].id;
      for (const el of els) {
        if (el.getBoundingClientRect().top < ACTIVE_OFFSET) cur = el.id;
      }
      setActive(cur);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(compute);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    compute();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  return (
    <nav
      aria-label={contentsLabel}
      className="self-start rounded-lg border border-border bg-card p-4 lg:sticky lg:top-[84px] lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0"
    >
      <div className="mb-3 font-mono text-xs uppercase tracking-[0.08em] text-muted-foreground">
        {contentsLabel}
      </div>
      <ol className="space-y-0.5 pl-0 text-sm">
        {items.map((item, i) => {
          const isActive = item.id === active;
          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                aria-current={isActive ? "true" : undefined}
                className={`group flex items-baseline gap-2 rounded-md border-l-2 px-2.5 py-1.5 transition-colors duration-150 ${
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                }`}
              >
                <span
                  className={`shrink-0 font-mono text-xs transition-colors duration-150 ${
                    isActive
                      ? "text-primary"
                      : "text-primary/50 group-hover:text-primary"
                  }`}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                {item.label}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

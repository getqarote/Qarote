import { useEffect, useState } from "react";

interface Heading {
  depth: number;
  slug: string;
  text: string;
}

interface DocsToCProps {
  headings: Heading[];
}

const DocsToC = ({ headings }: DocsToCProps) => {
  const [activeId, setActiveId] = useState<string | null>(null);

  const tocHeadings = headings.filter((h) => h.depth >= 2 && h.depth <= 3);

  useEffect(() => {
    if (tocHeadings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: "-56px 0px -40% 0px", threshold: 0 }
    );

    for (const heading of tocHeadings) {
      const el = document.getElementById(heading.slug);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headings]);

  if (tocHeadings.length === 0) return null;

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        On this page
      </p>
      <ul className="space-y-0.5">
        {tocHeadings.map((h) => (
          <li key={h.slug}>
            <a
              href={`#${h.slug}`}
              className={`block text-sm py-0.5 transition-colors transition-transform leading-snug ${
                h.depth === 3 ? "pl-3" : ""
              } ${
                activeId === h.slug
                  ? "text-primary font-medium motion-safe:translate-x-[3px]"
                  : "text-muted-foreground hover:text-foreground motion-safe:hover:translate-x-[2px]"
              }`}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default DocsToC;

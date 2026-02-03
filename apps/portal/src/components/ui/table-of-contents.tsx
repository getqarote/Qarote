import { useEffect, useState } from "react";

interface TOCItem {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  items: TOCItem[];
}

export function TableOfContents({ items }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: "-80px 0px -80% 0px" }
    );

    const headings = items
      .map((item) => document.getElementById(item.id))
      .filter(Boolean);
    headings.forEach((heading) => {
      if (heading) observer.observe(heading);
    });

    return () => {
      headings.forEach((heading) => {
        if (heading) observer.unobserve(heading);
      });
    };
  }, [items]);

  const scrollToHeading = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
  };

  return (
    <nav className="sticky top-20 hidden lg:block max-h-[calc(100vh-5rem)] overflow-y-auto">
      <h4 className="font-semibold text-sm mb-4 text-foreground">
        On This Page
      </h4>
      <ul className="space-y-2.5 text-sm">
        {items.map((item) => (
          <li key={item.id} className={`${item.level === 4 ? "pl-4" : ""}`}>
            <button
              onClick={() => scrollToHeading(item.id)}
              className={`text-left hover:text-foreground transition-colors w-full ${
                activeId === item.id
                  ? "text-foreground font-medium"
                  : "text-muted-foreground"
              }`}
            >
              {item.text}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

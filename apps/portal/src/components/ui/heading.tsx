import { ReactNode } from "react";

import { Link } from "lucide-react";

interface HeadingProps {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  children: ReactNode;
  id?: string;
  className?: string;
}

// Generate a URL-friendly slug from text
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export function Heading({ level, children, id, className = "" }: HeadingProps) {
  const Tag = `h${level}` as keyof JSX.IntrinsicElements;
  const text = typeof children === "string" ? children : "";
  const headingId = id || slugify(text);

  const baseClasses = {
    1: "text-3xl font-bold",
    2: "text-2xl font-bold",
    3: "text-lg font-semibold",
    4: "text-base font-medium",
    5: "text-sm font-medium",
    6: "text-sm font-medium",
  };

  return (
    <Tag
      id={headingId}
      className={`group scroll-mt-20 ${baseClasses[level]} ${className}`}
    >
      {children}
      <a
        href={`#${headingId}`}
        className="ml-2 inline-flex items-center opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label={`Link to ${text}`}
      >
        <Link className="h-4 w-4 text-muted-foreground hover:text-foreground" />
      </a>
    </Tag>
  );
}

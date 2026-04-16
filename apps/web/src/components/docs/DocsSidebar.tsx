import { useEffect, useState } from "react";

import { docsNav } from "@/lib/docs-nav";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface SidebarNavProps {
  currentSlug: string;
  onNavigate?: () => void;
}

const SidebarNav = ({ currentSlug, onNavigate }: SidebarNavProps) => (
  <nav>
    {docsNav.map((section) => (
      <div key={section.section} className="mb-6">
        <p className="px-3 mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {section.section}
        </p>
        <ul>
          {section.pages.map((page) => {
            const isActive = currentSlug === page.slug;
            return (
              <li key={page.slug}>
                <a
                  href={`/docs/${page.slug}/`}
                  onClick={onNavigate}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex items-center px-3 py-1.5 text-sm transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  {page.title}
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    ))}
  </nav>
);

interface DocsSidebarProps {
  currentSlug: string;
}

const DocsSidebar = ({ currentSlug }: DocsSidebarProps) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handler = () => setMobileOpen(true);
    document.addEventListener("open-docs-sidebar", handler);
    return () => document.removeEventListener("open-docs-sidebar", handler);
  }, []);

  return (
    <>
      {/* Desktop nav — visible because parent aside is lg:block */}
      <SidebarNav currentSlug={currentSlug} />

      {/* Mobile Sheet — portaled to body, triggered by custom event */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="px-6 pt-6 pb-2">
            <SheetTitle className="text-base font-display font-normal">
              Documentation
            </SheetTitle>
          </SheetHeader>
          <div className="overflow-y-auto px-4 pb-8 pt-2">
            <SidebarNav
              currentSlug={currentSlug}
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default DocsSidebar;

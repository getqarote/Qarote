import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Menu } from "lucide-react";

import { trackSignUpClick } from "@/lib/gtm";

import { GithubStarBadge } from "@/components/GithubStarBadge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const StickyNav = ({ currentPage }: { currentPage?: string }) => {
  const { t, i18n } = useTranslation("nav");
  const [open, setOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const locale = i18n.language || "en";
  const localePrefix = locale === "en" ? "" : `/${locale}`;

  const sections = [
    { id: "video", label: t("howItWorks") },
    { id: "pricing", label: t("pricing") },
  ];

  useEffect(() => {
    const sectionIds = sections.map((s) => s.id);
    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter(Boolean) as HTMLElement[];

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0 }
    );

    for (const el of elements) {
      observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offsetTop = element.offsetTop - 80;
      window.scrollTo({
        top: offsetTop,
        behavior: "smooth",
      });

      // If it's the video section, dispatch custom event for HeroSection island
      if (id === "video") {
        setTimeout(() => {
          document.dispatchEvent(new CustomEvent("play-video"));
        }, 500);
      }
    } else {
      // Navigate to homepage with anchor if section doesn't exist on current page
      window.location.assign(`${localePrefix}/#${id}`);
    }
  };

  const authBaseUrl = import.meta.env.VITE_APP_BASE_URL || "";

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-[1fr_auto] lg:grid-cols-[1fr_auto_1fr] items-center h-16">
          <a href="/" className="flex items-center gap-1">
            <img
              src="/images/new_icon.svg"
              alt=""
              aria-hidden="true"
              className="w-6 h-6 sm:w-8 sm:h-8"
              width={32}
              height={32}
            />
            <span className="font-normal text-[1.2rem] font-display">
              Qarote
            </span>
          </a>

          <div className="hidden lg:flex items-center justify-center gap-1 min-w-0">
            {sections.map((section) => (
              <button
                type="button"
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className={`px-4 py-2 text-base font-medium transition-colors ${activeSection === section.id ? "text-primary" : "text-foreground hover:text-primary"}`}
              >
                {section.label}
              </button>
            ))}
            <a
              href={`${localePrefix}/features/`}
              className={`px-4 py-2 text-base font-medium transition-colors ${currentPage === "features" ? "text-primary" : "text-foreground hover:text-primary"}`}
              {...(currentPage === "features"
                ? { "aria-current": "page" as const }
                : {})}
            >
              {t("features")}
            </a>
            <a
              href={`${localePrefix}/changelog/`}
              className={`px-4 py-2 text-base font-medium transition-colors ${currentPage === "changelog" ? "text-primary" : "text-foreground hover:text-primary"}`}
              {...(currentPage === "changelog"
                ? { "aria-current": "page" as const }
                : {})}
            >
              {t("whatsNew", "What's New")}
            </a>
          </div>

          <div className="flex items-center justify-end gap-1 sm:gap-2">
            <div className="hidden sm:block">
              <GithubStarBadge />
            </div>
            <a
              href={`${authBaseUrl}/auth/sign-in`}
              className="hidden lg:block text-foreground hover:text-primary px-2 sm:px-4 py-2 text-base font-medium transition-colors"
            >
              {t("login")}
            </a>
            <Button
              type="button"
              variant="cta"
              size="pillSm"
              onClick={() => {
                trackSignUpClick({
                  source: "sticky_nav",
                  location: "landing_page",
                });
                window.location.href = `${authBaseUrl}/auth/sign-up`;
              }}
              className="hidden lg:inline-flex"
            >
              <span>{t("tryForFree")}</span>
              <img
                src="/images/arrow-right.svg"
                alt=""
                aria-hidden="true"
                width={13}
                height={13}
                className="h-[0.8em] w-auto align-middle image-crisp"
              />
            </Button>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="lg:hidden p-3 -mr-1 text-foreground hover:text-primary transition-colors"
              aria-label={t("openMenu", "Open menu")}
              aria-expanded={open}
              aria-haspopup="dialog"
              aria-controls="mobile-nav"
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-72" id="mobile-nav">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-1 font-display">
              <img
                src="/images/new_icon.svg"
                alt=""
                aria-hidden="true"
                width={24}
                height={24}
                className="w-6 h-6"
              />
              Qarote
            </SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col gap-1 mt-4">
            {sections.map((section) => (
              <button
                type="button"
                key={section.id}
                onClick={() => {
                  scrollToSection(section.id);
                  setOpen(false);
                }}
                className="px-4 py-3 text-base font-medium text-foreground hover:text-primary hover:bg-muted rounded-md text-left transition-colors"
              >
                {section.label}
              </button>
            ))}
            <a
              href={`${localePrefix}/features/`}
              className={`px-4 py-3 text-base font-medium hover:bg-muted rounded-md transition-colors ${currentPage === "features" ? "text-primary" : "text-foreground hover:text-primary"}`}
              {...(currentPage === "features"
                ? { "aria-current": "page" as const }
                : {})}
            >
              {t("features")}
            </a>
            <a
              href={`${localePrefix}/changelog/`}
              className={`px-4 py-3 text-base font-medium hover:bg-muted rounded-md transition-colors ${currentPage === "changelog" ? "text-primary" : "text-foreground hover:text-primary"}`}
              {...(currentPage === "changelog"
                ? { "aria-current": "page" as const }
                : {})}
            >
              {t("whatsNew", "What's New")}
            </a>
            <div className="border-t border-border my-2" />
            <a
              href={`${authBaseUrl}/auth/sign-in`}
              className="px-4 py-3 text-base font-medium text-foreground hover:text-primary hover:bg-muted rounded-md transition-colors"
            >
              {t("login")}
            </a>
            <Button
              type="button"
              variant="cta"
              size="pillMd"
              onClick={() => {
                trackSignUpClick({
                  source: "mobile_nav",
                  location: "landing_page",
                });
                window.location.href = `${authBaseUrl}/auth/sign-up`;
              }}
              className="mx-4 mt-2"
            >
              <span>{t("tryForFree")}</span>
              <img
                src="/images/arrow-right.svg"
                alt=""
                aria-hidden="true"
                width={13}
                height={13}
                className="h-[0.8em] w-auto align-middle image-crisp"
              />
            </Button>
          </nav>
        </SheetContent>
      </Sheet>
    </nav>
  );
};

export default StickyNav;

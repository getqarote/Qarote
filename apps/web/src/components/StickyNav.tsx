import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Menu } from "lucide-react";

import { trackSignUpClick } from "@/lib/gtm";

import { GithubStarBadge } from "@/components/GithubStarBadge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface StickyNavProps {
  onVideoClick?: () => void;
}

const StickyNav = ({ onVideoClick }: StickyNavProps) => {
  const { t } = useTranslation("nav");
  const [open, setOpen] = useState(false);

  const sections = [
    { id: "video", label: t("howItWorks") },
    { id: "features", label: t("features") },
    { id: "pricing", label: t("pricing") },
  ];

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offsetTop = element.offsetTop - 80;
      window.scrollTo({
        top: offsetTop,
        behavior: "smooth",
      });

      // If it's the video section, launch the video after scrolling
      if (id === "video" && onVideoClick) {
        setTimeout(() => {
          onVideoClick();
        }, 500);
      }
    } else {
      // Navigate to homepage with anchor if section doesn't exist on current page
      window.location.assign(`/#${id}`);
    }
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-white">
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
            <span className="font-normal text-[1.2rem]">Qarote</span>
          </a>

          <div className="hidden lg:flex items-center justify-center gap-1 min-w-0">
            {sections.map((section) => (
              <button
                type="button"
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className="px-4 py-2 text-base font-medium text-foreground hover:text-primary transition-colors"
              >
                {section.label}
              </button>
            ))}
            <a
              href="/changelog/"
              className="px-4 py-2 text-base font-medium text-foreground hover:text-primary transition-colors"
            >
              {t("whatsNew", "What's New")}
            </a>
          </div>

          <div className="flex items-center justify-end gap-1 sm:gap-2">
            <div className="hidden sm:block">
              <GithubStarBadge />
            </div>
            <a
              href={`${import.meta.env.VITE_APP_BASE_URL}/auth/sign-in`}
              className="hidden lg:block text-foreground hover:text-primary px-2 sm:px-4 py-2 text-base font-medium transition-colors"
            >
              {t("login")}
            </a>
            <button
              type="button"
              onClick={() => {
                const authBaseUrl = import.meta.env.VITE_APP_BASE_URL;
                trackSignUpClick({
                  source: "sticky_nav",
                  location: "landing_page",
                });
                window.location.href = `${authBaseUrl}/auth/sign-up`;
              }}
              className="hidden lg:inline-flex bg-gradient-button hover:bg-gradient-button-hover text-white px-2 sm:px-4 py-2 text-sm sm:text-base transition-colors whitespace-nowrap rounded-full items-center justify-center gap-2"
            >
              <span>{t("tryForFree")}</span>
              <img
                src="/images/arrow-right.svg"
                alt=""
                aria-hidden="true"
                className="h-[0.8em] w-auto align-middle image-crisp"
              />
            </button>
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
            <SheetTitle className="flex items-center gap-1">
              <img
                src="/images/new_icon.svg"
                alt=""
                aria-hidden="true"
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
              href="/changelog/"
              className="px-4 py-3 text-base font-medium text-foreground hover:text-primary hover:bg-muted rounded-md transition-colors"
            >
              {t("whatsNew", "What's New")}
            </a>
            <div className="border-t border-border my-2" />
            <a
              href={`${import.meta.env.VITE_APP_BASE_URL}/auth/sign-in`}
              className="px-4 py-3 text-base font-medium text-foreground hover:text-primary hover:bg-muted rounded-md transition-colors"
            >
              {t("login")}
            </a>
            <button
              type="button"
              onClick={() => {
                const authBaseUrl = import.meta.env.VITE_APP_BASE_URL;
                trackSignUpClick({
                  source: "mobile_nav",
                  location: "landing_page",
                });
                window.location.href = `${authBaseUrl}/auth/sign-up`;
              }}
              className="mx-4 mt-2 bg-gradient-button hover:bg-gradient-button-hover text-white px-4 py-3 text-base transition-colors whitespace-nowrap rounded-full inline-flex items-center justify-center gap-2"
            >
              <span>{t("tryForFree")}</span>
              <img
                src="/images/arrow-right.svg"
                alt=""
                aria-hidden="true"
                className="h-[0.8em] w-auto align-middle image-crisp"
              />
            </button>
          </nav>
        </SheetContent>
      </Sheet>
    </nav>
  );
};

export default StickyNav;

import { useTranslation } from "react-i18next";

import { trackSignUpClick } from "@/lib/gtm";

import { GithubStarBadge } from "@/components/GithubStarBadge";

interface StickyNavProps {
  onVideoClick?: () => void;
}

const StickyNav = ({ onVideoClick }: StickyNavProps) => {
  const { t } = useTranslation("nav");

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
    }
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-[auto_1fr_auto] items-center h-16">
          <div className="flex items-center gap-1">
            <img
              src="/images/new_icon.svg"
              alt=""
              aria-hidden="true"
              className="w-6 h-6 sm:w-8 sm:h-8"
            />
            <span className="text-foreground font-normal text-[1.2rem]">
              Qarote
            </span>
          </div>

          <div className="hidden lg:flex items-center justify-center gap-1">
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
              href="/changelog"
              className="px-4 py-2 text-base font-medium text-foreground hover:text-primary transition-colors"
            >
              {t("whatsNew", "What's New")}
            </a>
          </div>

          <div className="flex items-center justify-end gap-1 sm:gap-2">
            <GithubStarBadge />
            <a
              href={`${import.meta.env.VITE_APP_BASE_URL}/auth/sign-in`}
              className="text-foreground hover:text-primary px-2 sm:px-4 py-2 text-base font-medium transition-colors"
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
              className="bg-gradient-button hover:bg-gradient-button-hover text-white px-2 sm:px-4 py-2 text-base transition-colors whitespace-nowrap rounded-full inline-flex items-center justify-center gap-2"
            >
              <span>{t("tryForFree")}</span>
              <img
                src="/images/arrow-right.svg"
                alt=""
                aria-hidden="true"
                className="h-[0.8em] w-auto align-middle image-crisp"
              />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default StickyNav;

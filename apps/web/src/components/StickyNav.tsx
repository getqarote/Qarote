import { useTranslation } from "react-i18next";

import { Github } from "lucide-react";

import { trackSignUpClick } from "@/lib/gtm";

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
    <nav className="sticky top-0 z-50 border-b border-border" style={{ backgroundColor: '#ffffff' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-1">
            <img
              src="/images/new_icon.svg"
              alt="Qarote"
              className="w-6 h-6 sm:w-8 sm:h-8"
            />
            <span className="text-foreground" style={{ fontWeight: 400, fontSize: '1.2rem' }}>
              Qarote
            </span>
          </div>

          <div className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className="px-4 py-2 text-base font-medium text-foreground hover:text-orange-500 transition-colors"
              >
                {section.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <a
              href="https://github.com/getqarote/Qarote"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View on GitHub"
              className="text-foreground hover:text-orange-500 transition-colors p-2"
            >
              <Github className="w-5 h-5" />
            </a>
            <a
              href={`${import.meta.env.VITE_APP_BASE_URL}/auth/sign-in`}
              className="text-foreground hover:text-orange-500 px-2 sm:px-4 py-2 text-base font-medium transition-colors"
            >
              {t("login")}
            </a>
            <button
              onClick={() => {
                const authBaseUrl = import.meta.env.VITE_APP_BASE_URL;
                trackSignUpClick({
                  source: "sticky_nav",
                  location: "landing_page",
                });
                window.location.href = `${authBaseUrl}/auth/sign-up`;
              }}
              className="bg-[#FF691B] text-white hover:bg-[#E55A0F] px-2 sm:px-4 py-2 text-base transition-colors whitespace-nowrap rounded-full inline-flex items-center justify-center gap-2"
            >
              <span>{t("tryForFree")}</span>
              <img
                src="/images/arrow-right.svg"
                alt="Arrow right"
                className="h-[0.8em] w-auto"
                style={{ imageRendering: "crisp-edges", verticalAlign: "middle" }}
              />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default StickyNav;

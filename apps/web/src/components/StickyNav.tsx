import { trackSignUpClick } from "@/lib/gtm";

interface StickyNavProps {
  onVideoClick?: () => void;
}

const StickyNav = ({ onVideoClick }: StickyNavProps) => {
  const sections = [
    { id: "video", label: "How it works" },
    { id: "features", label: "Features" },
    { id: "pricing", label: "Pricing" },
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
    <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <img
              src="/images/new_icon.svg"
              alt="Qarote"
              className="w-6 h-6 sm:w-8 sm:h-8"
            />
            <span className="font-bold text-foreground text-base sm:text-lg">
              Qarote
            </span>
          </div>

          <div className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className="px-4 py-2 text-sm font-medium text-foreground hover:text-orange-500 transition-colors"
              >
                {section.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <a
              href={`${import.meta.env.VITE_APP_BASE_URL}/auth/sign-in`}
              className="text-foreground hover:text-orange-500 px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors"
            >
              Login
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
              className="bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600 px-2 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap"
            >
              Try for free
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default StickyNav;

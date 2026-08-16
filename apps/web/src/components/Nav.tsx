import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Menu, X } from "lucide-react";

import { trackSignUpClick } from "@/lib/gtm";

import { GithubStarBadge } from "@/components/GithubStarBadge";
import { Button } from "@/components/ui/button";

interface NavProps {
  /** Server-provided pathname (Astro.url.pathname) for active-link state. */
  currentPath?: string;
}

/**
 * Shared marketing navbar — sticky, blurred, with a scroll-revealed bottom
 * border. Mirrors the prototype's <header class="nav">: brand · primary links ·
 * GitHub pill · Login · "Try for free" CTA, collapsing to a burger + dropdown
 * menu at ≤980px. Colours come from shadcn tokens only. The theme toggle from
 * the prototype is intentionally omitted (the marketing site is light-only for
 * now). Rendered once in BaseLayout, so every marketing page shares one nav.
 */
const Nav = ({ currentPath }: NavProps) => {
  const { t, i18n } = useTranslation("nav");
  const locale = i18n.language || "en";
  const localePrefix = locale === "en" ? "" : `/${locale}`;
  const authBaseUrl = import.meta.env.VITE_APP_BASE_URL || "";

  const [open, setOpen] = useState(false);
  const [stuck, setStuck] = useState(false);

  // Reveal the bottom border/shadow once the page has scrolled a little.
  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Active-link detection from the server pathname: strip the locale prefix and
  // the trailing slash, then match the first path segment.
  const normalized =
    (currentPath || "")
      .replace(/^\/(fr|es|zh)(?=\/|$)/, "")
      .replace(/\/+$/, "") || "/";
  const isActive = (key: string) =>
    normalized === `/${key}` || normalized.startsWith(`/${key}/`);

  const links = [
    { key: "pricing", href: `${localePrefix}/pricing/`, label: t("pricing") },
    {
      key: "features",
      href: `${localePrefix}/features/`,
      label: t("features"),
    },
    { key: "docs", href: `${localePrefix}/docs/`, label: t("docs") },
    {
      key: "changelog",
      href: `${localePrefix}/changelog/`,
      label: t("whatsNew", "Changelog"),
    },
  ];

  const goSignUp = (source: string) => {
    trackSignUpClick({ source, location: "landing_page" });
    window.location.href = `${authBaseUrl}/auth/sign-up`;
  };

  return (
    <header
      className={`sticky top-0 z-50 border-b backdrop-blur-[12px] backdrop-saturate-[1.4] transition-colors duration-200 bg-background/80 ${
        stuck ? "border-border" : "border-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center gap-7 px-4 py-[13px] sm:px-6 lg:px-8">
        {/* Brand */}
        <a
          href={`${localePrefix}/`}
          className="inline-flex shrink-0 items-center gap-2 font-display text-[19px] font-semibold tracking-[-0.01em] text-foreground"
        >
          <img
            src="/images/new_icon.svg"
            alt=""
            aria-hidden="true"
            width={16}
            height={22}
            className="h-[22px] w-auto"
          />
          Qarote
        </a>

        {/* Primary links (≥981px) */}
        <nav
          aria-label="Primary"
          className="ml-2 hidden items-center gap-[22px] min-[981px]:flex"
        >
          <a
            href={`${localePrefix}/#how`}
            className="text-[14.5px] text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("howItWorks")}
          </a>
          {links.map((l) => (
            <a
              key={l.key}
              href={l.href}
              aria-current={isActive(l.key) ? "page" : undefined}
              className={`text-[14.5px] transition-colors hover:text-foreground ${
                isActive(l.key)
                  ? "font-semibold text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              {l.label}
            </a>
          ))}
        </nav>

        {/* Right block */}
        <div className="ml-auto flex items-center gap-4">
          <div className="hidden sm:block">
            <GithubStarBadge />
          </div>
          <a
            href={`${authBaseUrl}/auth/sign-in`}
            className="hidden text-[14.5px] text-muted-foreground transition-colors hover:text-foreground min-[981px]:block"
          >
            {t("login")}
          </a>
          <Button
            type="button"
            variant="cta"
            size="pillSm"
            onClick={() => goSignUp("nav")}
            className="group"
          >
            <span>{t("tryForFree")}</span>
            <span
              aria-hidden="true"
              className="transition-transform duration-150 group-hover:translate-x-0.5"
            >
              →
            </span>
          </Button>

          {/* Burger (≤980px) */}
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="grid h-[38px] w-10 place-items-center rounded-md border border-input text-foreground transition-colors hover:border-muted-foreground min-[981px]:hidden"
            aria-label={t("openMenu", "Open menu")}
            aria-expanded={open}
            aria-controls="mobile-nav"
          >
            {open ? (
              <X className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Menu className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu (≤980px). Closed by default; only the burger
          opens it. Forced hidden ≥981px so it can never leak onto desktop. */}
      {open && (
        <nav
          id="mobile-nav"
          aria-label="Primary"
          className="absolute inset-x-0 top-full flex flex-col gap-0.5 border-b border-border bg-background px-4 pb-[18px] pt-3 shadow-soft sm:px-6 min-[981px]:hidden"
        >
          <a
            href={`${localePrefix}/#how`}
            onClick={() => setOpen(false)}
            className="border-b border-border px-2 py-[11px] text-[15px] text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("howItWorks")}
          </a>
          {links.map((l) => (
            <a
              key={l.key}
              href={l.href}
              aria-current={isActive(l.key) ? "page" : undefined}
              onClick={() => setOpen(false)}
              className={`border-b border-border px-2 py-[11px] text-[15px] transition-colors hover:text-foreground ${
                isActive(l.key)
                  ? "font-semibold text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              {l.label}
            </a>
          ))}
          <div className="mt-1 sm:hidden">
            <GithubStarBadge />
          </div>
          <a
            href={`${authBaseUrl}/auth/sign-in`}
            className="px-2 py-[11px] text-[15px] text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("login")}
          </a>
          <Button
            type="button"
            variant="cta"
            size="pillMd"
            onClick={() => goSignUp("mobile_nav")}
            className="group mt-3 justify-center"
          >
            <span>{t("tryForFree")}</span>
            <span aria-hidden="true">→</span>
          </Button>
        </nav>
      )}
    </header>
  );
};

export default Nav;

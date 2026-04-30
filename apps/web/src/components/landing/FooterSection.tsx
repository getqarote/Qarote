import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import type { SupportedLocale } from "@qarote/i18n";

import { clearConsent, readConsent } from "@/lib/consent";

import { LanguageSwitcher } from "@/components/LanguageSwitcher";

interface FooterSectionProps {
  currentLocale?: SupportedLocale;
}

const navLinkClass =
  "relative text-muted-foreground hover:text-foreground transition-colors text-sm after:absolute after:bottom-0 after:left-0 after:h-px after:w-full after:origin-left after:scale-x-0 after:bg-current after:transition-transform after:duration-200 hover:after:scale-x-100 pb-px";

const legalLinkClass = navLinkClass;

const SocialIcons = () => (
  <div className="flex items-center gap-3">
    <a
      href="https://github.com/getqarote/Qarote"
      target="_blank"
      rel="noopener noreferrer"
      className="text-muted-foreground hover:text-foreground hover:-translate-y-0.5 transition-all duration-150 inline-block"
      aria-label="GitHub"
    >
      <svg
        className="w-5 h-5"
        fill="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
          clipRule="evenodd"
        />
      </svg>
    </a>
    <a
      href="https://discord.gg/GwHRbGwyUG"
      target="_blank"
      rel="noopener noreferrer"
      className="text-muted-foreground hover:text-indigo-500 hover:-translate-y-0.5 transition-all duration-150 inline-block"
      aria-label="Discord"
    >
      <svg
        className="w-5 h-5"
        fill="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.033.055a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
      </svg>
    </a>
    <a
      href="https://www.linkedin.com/company/qarote/"
      target="_blank"
      rel="noopener noreferrer"
      className="text-muted-foreground hover:text-blue-600 hover:-translate-y-0.5 transition-all duration-150 inline-block"
      aria-label="LinkedIn"
    >
      <svg
        className="w-5 h-5"
        fill="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path d="M4.98 3.5C4.98 4.88 3.88 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1 4.98 2.12 4.98 3.5zM.22 8.25H4.78V23H.22V8.25zM8.56 8.25h4.36v2.01h.06c.61-1.16 2.1-2.38 4.32-2.38 4.62 0 5.47 3.04 5.47 6.99V23h-4.56v-7.02c0-1.67-.03-3.82-2.33-3.82-2.33 0-2.69 1.82-2.69 3.7V23H8.56V8.25z" />
      </svg>
    </a>
  </div>
);

const FooterSection = ({ currentLocale = "en" }: FooterSectionProps) => {
  const { t } = useTranslation("landing");
  const prefix = currentLocale === "en" ? "" : `/${currentLocale}`;

  const handleCookiePreferences = () => {
    const previouslyGranted = readConsent()?.granted === true;
    clearConsent();
    // Third-party scripts (PostHog, GTM, Tawk) cannot be cleanly torn down
    // once injected — reload so the page restarts in a clean no-tracker state.
    if (previouslyGranted) window.location.reload();
  };

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log(
      "%c Qarote %c built by devs, for RabbitMQ operators. We're hiring → getqarote/careers",
      "background:#c2410c;color:#fff;padding:3px 8px;border-radius:3px;font-weight:600",
      "color:#888;padding:3px 6px"
    );
  }, []);

  return (
    <footer className="text-card-foreground py-10 border-t border-border bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Mobile layout */}
        <div className="flex flex-col gap-6 md:hidden">
          <div className="flex items-center gap-1 group">
            <img
              src="/images/new_icon.svg"
              alt=""
              aria-hidden="true"
              className="w-6 h-6 transition-transform duration-200 group-hover:scale-110"
              width={24}
              height={24}
            />
            <h3 className="text-foreground font-normal text-[1.2rem]">
              Qarote
            </h3>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-3">
            <a href={`${prefix}/about/`} className={navLinkClass}>
              {t("footer.about", "About")}
            </a>
            <a href={`${prefix}/pricing/`} className={navLinkClass}>
              {t("footer.pricing", "Pricing")}
            </a>
            <a href={`${prefix}/blog/`} className={navLinkClass}>
              {t("footer.blog", "Blog")}
            </a>
            <a href={`${prefix}/features/alerting/`} className={navLinkClass}>
              {t("footer.alerting", "Alerting")}
            </a>
            <a href="/quiz/" className={navLinkClass}>
              {t("footer.quiz", "Quiz")}
            </a>
            <a href={`${prefix}/compare/datadog/`} className={navLinkClass}>
              {t("footer.vsDatadog")}
            </a>
            <a
              href={`${prefix}/compare/grafana-prometheus/`}
              className={navLinkClass}
            >
              {t("footer.vsGrafana")}
            </a>
            <a href={`${prefix}/compare/cloudamqp/`} className={navLinkClass}>
              {t("footer.vsCloudAMQP")}
            </a>
            <a href={`${prefix}/compare/new-relic/`} className={navLinkClass}>
              {t("footer.vsNewRelic")}
            </a>
            <a href={`${prefix}/security/`} className={legalLinkClass}>
              {t("footer.security", "Security")}
            </a>
            <a href={`${prefix}/privacy-policy/`} className={legalLinkClass}>
              {t("footer.privacyPolicy")}
            </a>
            <a href={`${prefix}/terms-of-service/`} className={legalLinkClass}>
              {t("footer.termsOfService")}
            </a>
            <a
              href="https://status.qarote.io"
              target="_blank"
              rel="noopener noreferrer"
              className={legalLinkClass}
            >
              {t("footer.status", "Status")}
            </a>
            <button
              type="button"
              onClick={handleCookiePreferences}
              className={legalLinkClass}
            >
              {t("footer.cookiePreferences", "Cookie preferences")}
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.Tawk_API) {
                  window.Tawk_API.maximize();
                } else {
                  window.location.href = "mailto:support@qarote.io";
                }
              }}
              className={legalLinkClass}
            >
              {t("footer.contact")}
            </button>
          </div>
          <div className="flex items-center gap-4">
            <SocialIcons />
            <LanguageSwitcher currentLocale={currentLocale} />
          </div>
        </div>

        {/* Desktop layout — two rows */}
        <div className="hidden md:block">
          {/* Row 1: logo + nav links */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2 group">
              <img
                src="/images/new_icon.svg"
                alt=""
                aria-hidden="true"
                width={32}
                height={32}
                className="w-8 h-8 transition-transform duration-200 group-hover:scale-110"
              />
              <div>
                <h3 className="text-foreground font-normal text-[1.2rem] leading-none">
                  Qarote
                </h3>
                <p className="text-xs text-muted-foreground/60 mt-0.5">
                  RabbitMQ monitoring.
                </p>
              </div>
            </div>
            <nav className="flex items-center gap-6">
              <a href={`${prefix}/about/`} className={navLinkClass}>
                {t("footer.about", "About")}
              </a>
              <a href={`${prefix}/pricing/`} className={navLinkClass}>
                {t("footer.pricing", "Pricing")}
              </a>
              <a href={`${prefix}/blog/`} className={navLinkClass}>
                {t("footer.blog", "Blog")}
              </a>
              <a href={`${prefix}/features/alerting/`} className={navLinkClass}>
                {t("footer.alerting", "Alerting")}
              </a>
              <a href="/quiz/" className={navLinkClass}>
                {t("footer.quiz", "Quiz")}
              </a>
              <a href={`${prefix}/compare/datadog/`} className={navLinkClass}>
                {t("footer.vsDatadog")}
              </a>
              <a
                href={`${prefix}/compare/grafana-prometheus/`}
                className={navLinkClass}
              >
                {t("footer.vsGrafana")}
              </a>
              <a href={`${prefix}/compare/cloudamqp/`} className={navLinkClass}>
                {t("footer.vsCloudAMQP")}
              </a>
              <a href={`${prefix}/compare/new-relic/`} className={navLinkClass}>
                {t("footer.vsNewRelic")}
              </a>
            </nav>
          </div>

          {/* Row 2: legal links + social + language */}
          <div className="flex items-center justify-between border-t border-border/50 pt-5">
            <div className="flex items-center gap-6">
              <a href={`${prefix}/security/`} className={legalLinkClass}>
                {t("footer.security", "Security")}
              </a>
              <a href={`${prefix}/privacy-policy/`} className={legalLinkClass}>
                {t("footer.privacyPolicy")}
              </a>
              <a
                href={`${prefix}/terms-of-service/`}
                className={legalLinkClass}
              >
                {t("footer.termsOfService")}
              </a>
              <a
                href="https://status.qarote.io"
                target="_blank"
                rel="noopener noreferrer"
                className={`${legalLinkClass} flex items-center gap-1.5`}
              >
                <span className="relative flex h-2 w-2" aria-hidden="true">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                {t("footer.status", "Status")}
              </a>
              <button
                type="button"
                onClick={handleCookiePreferences}
                className={legalLinkClass}
              >
                {t("footer.cookiePreferences", "Cookie preferences")}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (window.Tawk_API) {
                    window.Tawk_API.maximize();
                  } else {
                    window.location.href = "mailto:support@qarote.io";
                  }
                }}
                className={legalLinkClass}
              >
                {t("footer.contact")}
              </button>
            </div>
            <div className="flex items-center gap-4">
              <SocialIcons />
              <LanguageSwitcher currentLocale={currentLocale} />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default FooterSection;

import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { ExternalLink, HelpCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

import { LanguageSwitcher } from "./LanguageSwitcher";

interface AppFooterProps {
  className?: string;
}

export function AppFooter({ className = "" }: AppFooterProps) {
  const { t } = useTranslation("common");

  return (
    <footer
      className={`border-t bg-background/80 backdrop-blur-xs ${className}`}
    >
      <div className="max-w-5xl mx-auto px-6 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Left side - Help */}
          <div className="flex items-center gap-4">
            <Link to="/help">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground gap-2"
              >
                <HelpCircle className="w-4 h-4" />
                {t("helpAndSupport")}
              </Button>
            </Link>
          </div>

          {/* Center - Language Switcher */}
          <LanguageSwitcher />

          {/* Right side - App info and links */}
          <div className="flex flex-col sm:flex-row items-center gap-4 text-sm text-muted-foreground">
            <span>{t("rabbitMQDashboard")}</span>
            <div className="flex items-center gap-4">
              <a
                href="https://www.rabbitmq.com/documentation.html"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors flex items-center gap-1"
              >
                {t("documentation")}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router";

import { logger } from "@/lib/logger";

const NotFound = () => {
  const { t } = useTranslation("common");
  const location = useLocation();

  useEffect(() => {
    logger.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">{t("notFound.code")}</h1>
        <p className="text-xl text-muted-foreground mb-4">
          {t("notFound.message")}
        </p>
        <a href="/" className="text-info hover:text-info underline">
          {t("notFound.returnHome")}
        </a>
      </div>
    </div>
  );
};

export default NotFound;

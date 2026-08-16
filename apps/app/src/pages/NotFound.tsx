import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router";

import { logger } from "@/lib/logger";

import { ConfusedRabbit } from "@/components/ConfusedRabbit";

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
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="text-center text-primary">
        <ConfusedRabbit />
        <h1 className="mt-6 text-4xl font-bold text-foreground">
          {t("notFound.code")}
        </h1>
        <p className="mt-4 text-xl text-muted-foreground">
          {t("notFound.message")}
        </p>
        <Link
          to="/"
          className="mt-6 inline-block font-medium text-primary underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none"
        >
          {t("notFound.returnHome")}
        </Link>
      </div>
    </div>
  );
};

export default NotFound;

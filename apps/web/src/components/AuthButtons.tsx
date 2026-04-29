import { useTranslation } from "react-i18next";

import { trackSignUpClick } from "@/lib/gtm";

import { Button } from "@/components/ui/button";

interface AuthButtonsProps {
  align?: "left" | "center" | "right";
  describedById?: string;
}

const AuthButtons = ({ align = "center", describedById }: AuthButtonsProps) => {
  const { t } = useTranslation("landing");
  const authBaseUrl = import.meta.env.VITE_APP_BASE_URL || "";

  const handleSignUp = () => {
    trackSignUpClick({
      source: "auth_buttons",
      location: "landing_page",
    });
    window.posthog?.capture("sign_up_clicked", {
      source: "auth_buttons",
      location: "landing_page",
    });
    window.location.href = `${authBaseUrl}/auth/sign-up`;
  };

  const alignClass =
    align === "left"
      ? "justify-start"
      : align === "right"
        ? "justify-end"
        : "justify-center";
  const marginClass =
    align === "left" ? "ml-0" : align === "right" ? "mr-0" : "mx-auto";
  const widthClass = align === "left" ? "w-auto" : "w-full max-w-md";
  const paddingClass = align === "left" ? "pl-0" : "px-4";

  return (
    <div
      className={`flex ${alignClass} items-center gap-6 ${widthClass} ${marginClass} ${paddingClass}`}
    >
      <Button
        type="button"
        variant="cta"
        size="pill"
        onClick={handleSignUp}
        aria-describedby={describedById}
        className="w-full sm:w-auto"
      >
        <span className="whitespace-nowrap">{t("cta.getStartedForFree")}</span>
        <img
          src="/images/arrow-right.svg"
          alt=""
          aria-hidden="true"
          width={13}
          height={13}
          className="h-[0.8em] w-auto align-middle image-crisp"
        />
      </Button>
    </div>
  );
};

export default AuthButtons;

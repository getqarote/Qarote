import { useTranslation } from "react-i18next";

import { trackSignUpClick } from "@/lib/gtm";

interface AuthButtonsProps {
  align?: "left" | "center" | "right";
}

const AuthButtons = ({ align = "center" }: AuthButtonsProps) => {
  const { t } = useTranslation("landing");
  const authBaseUrl =
    typeof import.meta.env !== "undefined"
      ? import.meta.env.VITE_APP_BASE_URL ||
        import.meta.env.PUBLIC_APP_BASE_URL ||
        ""
      : "";

  const handleSignUp = () => {
    trackSignUpClick({
      source: "auth_buttons",
      location: "landing_page",
    });
    window.location.href = `${authBaseUrl}/auth/sign-up`;
  };

  const primaryButtonStyles =
    "bg-gradient-button hover:bg-gradient-button-hover text-white";

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
      <button
        type="button"
        onClick={handleSignUp}
        className={`${primaryButtonStyles} px-4 py-3 sm:px-7 sm:py-3 transition-colors duration-200 flex items-center justify-center gap-3 text-base sm:text-lg w-full sm:w-auto rounded-full`}
      >
        <span className="whitespace-nowrap">{t("cta.getStartedForFree")}</span>
        <img
          src="/images/arrow-right.svg"
          alt=""
          aria-hidden="true"
          className="h-[0.8em] w-auto align-middle image-crisp"
        />
      </button>
    </div>
  );
};

export default AuthButtons;

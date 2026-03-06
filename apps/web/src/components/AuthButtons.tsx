import * as React from "react";

import { trackSignUpClick } from "@/lib/gtm";

interface AuthButtonsProps {
  variant?: "default" | "light";
  align?: "left" | "center" | "right";
}

const AuthButtons = ({
  variant = "default",
  align = "center",
}: AuthButtonsProps) => {
  const authBaseUrl = import.meta.env.VITE_APP_BASE_URL;

  const handleSignUp = () => {
    trackSignUpClick({
      source: "auth_buttons",
      location: "landing_page",
    });
    window.location.href = `${authBaseUrl}/auth/sign-up`;
  };

  const primaryButtonStyles =
    variant === "light"
      ? "bg-[#FF691B] text-white hover:bg-[#E55A0F]"
      : "bg-[#FF691B] text-white hover:bg-[#E55A0F]";

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
        onClick={handleSignUp}
        className={`${primaryButtonStyles} px-4 py-3 sm:px-7 sm:py-3 transition-colors duration-200 flex items-center justify-center gap-3 text-base sm:text-lg w-full sm:w-auto rounded-full`}
      >
        <span className="whitespace-nowrap">{t("cta.getStartedForFree")}</span>
        <img
          src="/images/arrow-right.svg"
          alt="Arrow right"
          className="h-[0.8em] w-auto"
          style={{ imageRendering: "crisp-edges", verticalAlign: "middle" }}
        />
      </button>
    </div>
  );
};

export default AuthButtons;

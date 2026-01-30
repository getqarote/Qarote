import * as React from "react";

import type { LucideProps } from "lucide-react";
import { Play } from "lucide-react";

import { trackSignUpClick } from "@/lib/gtm";

interface AuthButtonsProps {
  variant?: "default" | "light";
  onHowItWorksClick?: () => void;
  hideHowItWorks?: boolean;
  align?: "left" | "center" | "right";
}

const AuthButtons = ({
  variant = "default",
  onHowItWorksClick,
  hideHowItWorks = false,
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

  const handleHowItWorks = () => {
    if (onHowItWorksClick) {
      onHowItWorksClick();
    } else {
      // Fallback: scroll to video section
      const videoElement = document.getElementById("video");
      if (videoElement) {
        videoElement.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  const primaryButtonStyles =
    variant === "light"
      ? "bg-white text-orange-700 hover:bg-gray-50"
      : "bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600";

  const secondaryButtonStyles =
    variant === "light"
      ? "bg-transparent border-2 border-white text-white hover:bg-white/10"
      : "bg-gray-100 text-foreground hover:bg-gray-200";

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

  // Type-safe workaround for React type conflicts between lucide-react and @types/react
  const PlayIcon = Play as unknown as React.ComponentType<LucideProps>;

  return (
    <div
      className={`flex ${alignClass} items-center gap-6 ${widthClass} ${marginClass} ${paddingClass}`}
    >
      <button
        onClick={handleSignUp}
        className={`${primaryButtonStyles} px-4 py-3 sm:px-8 sm:py-4 rounded-lg font-semibold transition-colors duration-200 flex items-center justify-center text-base sm:text-lg w-full sm:w-auto`}
      >
        <span className="whitespace-nowrap">Get started for free</span>
      </button>
      {!hideHowItWorks && (
        <button
          onClick={handleHowItWorks}
          className={`${secondaryButtonStyles} px-4 py-3 sm:px-8 sm:py-4 rounded-lg font-semibold transition-colors duration-200 flex items-center justify-center gap-2 text-base sm:text-lg`}
        >
          <PlayIcon className="h-[1em] w-[1em] fill-current" />
          <span className="whitespace-nowrap">How it works</span>
        </button>
      )}
    </div>
  );
};

export default AuthButtons;

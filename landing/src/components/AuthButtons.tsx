import { Rocket } from "lucide-react";

interface AuthButtonsProps {
  variant?: "default" | "light";
}

const AuthButtons = ({ variant = "default" }: AuthButtonsProps) => {
  const authBaseUrl = import.meta.env.VITE_APP_BASE_URL;

  const handleSignUp = () => {
    window.location.href = `${authBaseUrl}/auth/sign-up`;
  };

  const buttonStyles =
    variant === "light"
      ? "bg-white text-orange-600 hover:bg-gray-50 shadow-xl"
      : "bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600 shadow-lg";

  return (
    <div className="flex justify-center w-full max-w-md mx-auto px-4">
      <button
        onClick={handleSignUp}
        className={`${buttonStyles} px-4 py-3 sm:px-8 sm:py-4 rounded-lg font-semibold transition-colors duration-200 flex items-center justify-center gap-2 text-base sm:text-lg w-full sm:w-auto`}
      >
        <Rocket className="h-5 w-5 sm:h-6 sm:w-6" />
        <span className="whitespace-nowrap">Get started for free</span>
      </button>
    </div>
  );
};

export default AuthButtons;

import { LogIn, UserPlus } from "lucide-react";

const AuthButtons = () => {
  const authBaseUrl = import.meta.env.VITE_APP_BASE_URL;
  console.log(authBaseUrl);

  const handleSignIn = () => {
    window.location.href = `${authBaseUrl}/auth/sign-in`;
  };

  const handleSignUp = () => {
    window.location.href = `${authBaseUrl}/auth/sign-up`;
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md mx-auto">
      <button
        onClick={handleSignUp}
        className="flex-1 bg-white text-primary hover:bg-gray-50 px-6 py-3 rounded-lg font-semibold transition-colors duration-200 flex items-center justify-center gap-2 shadow-lg"
      >
        <UserPlus className="h-5 w-5" />
        Get Started Free
      </button>

      <button
        onClick={handleSignIn}
        className="flex-1 bg-transparent border-2 border-white text-white hover:bg-white/10 px-6 py-3 rounded-lg font-semibold transition-colors duration-200 flex items-center justify-center gap-2"
      >
        <LogIn className="h-5 w-5" />
        Sign In
      </button>
    </div>
  );
};

export default AuthButtons;

import { ReactNode } from "react";

interface ProtectedLayoutWrapperProps {
  children: ReactNode;
}

export const ProtectedLayoutWrapper = ({
  children,
}: ProtectedLayoutWrapperProps) => {
  return (
    <div className="min-h-screen">
      {/* Email verification banner for authenticated users */}
      {/* <EmailVerificationBanner className="mx-4 mt-4" /> */}
      {children}
    </div>
  );
};

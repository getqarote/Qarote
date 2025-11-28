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
      {children}
    </div>
  );
};

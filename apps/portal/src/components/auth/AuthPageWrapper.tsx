import { ReactNode } from "react";

import { AuthBackground } from "@/components/auth/AuthBackground";
import { Card } from "@/components/ui/card";

interface AuthPageWrapperProps {
  children: ReactNode;
}

export function AuthPageWrapper({ children }: AuthPageWrapperProps) {
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <AuthBackground />
      <Card className="relative w-full max-w-md">{children}</Card>
    </div>
  );
}

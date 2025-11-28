import React from "react";

import { AlertCircle } from "lucide-react";

import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

interface BillingLayoutProps {
  children: React.ReactNode;
  isLoading?: boolean;
  error?: boolean;
}

export const BillingLayout: React.FC<BillingLayoutProps> = ({
  children,
  isLoading = false,
  error = false,
}) => {
  if (isLoading) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-gradient-to-br from-background to-card">
          <AppSidebar />
          <main className="main-content-scrollable">
            <div className="container mx-auto px-4 py-8">
              <div className="animate-pulse space-y-6">
                <div className="h-8 bg-muted rounded w-1/4"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-32 bg-muted rounded"></div>
                  ))}
                </div>
              </div>
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  if (error) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-gradient-to-br from-background to-card">
          <AppSidebar />
          <main className="main-content-scrollable">
            <div className="container mx-auto px-4 py-8">
              <div className="text-center">
                <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">
                  Unable to load billing information
                </h2>
                <p className="text-muted-foreground">
                  Please try again later or contact support.
                </p>
              </div>
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-background to-card">
        <AppSidebar />
        <main className="main-content-scrollable">
          <div className="container mx-auto px-4 py-8 space-y-8">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

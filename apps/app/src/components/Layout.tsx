import { ReactNode } from "react";
import { Link } from "react-router";

import { ExternalLink, HelpCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

import { AppHeader } from "./AppHeader";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* App Header with workspace selector */}
      <AppHeader />

      {/* Main content */}
      <div className="flex-1">{children}</div>

      {/* Footer - positioned to account for sidebar */}
      <footer className="border-t bg-background/80 backdrop-blur-xs ml-0 md:ml-64 transition-[margin] duration-200 ease-linear">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Left side - Help */}
            <div className="flex items-center gap-4">
              <Link to="/help">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground gap-2"
                >
                  <HelpCircle className="w-4 h-4" />
                  Help & Support
                </Button>
              </Link>
            </div>

            {/* Right side - App info and links */}
            <div className="flex flex-col sm:flex-row items-center gap-4 text-sm text-muted-foreground">
              <span>RabbitMQ Dashboard</span>
              <div className="flex items-center gap-4">
                <a
                  href="https://www.rabbitmq.com/documentation.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors flex items-center gap-1"
                >
                  Documentation
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

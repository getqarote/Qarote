import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Shield, ExternalLink, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Main content */}
      <div className="flex-1">{children}</div>

      {/* Footer - positioned to account for sidebar */}
      <footer className="border-t bg-gray-50/80 backdrop-blur-sm ml-0 md:ml-64 transition-[margin] duration-200 ease-linear">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Left side - Privacy Settings and Help */}
            <div className="flex items-center gap-4">
              <Link to="/privacy-settings">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-600 hover:text-gray-900 gap-2"
                >
                  <Shield className="w-4 h-4" />
                  Privacy Settings
                </Button>
              </Link>
              <Link to="/help">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-600 hover:text-gray-900 gap-2"
                >
                  <HelpCircle className="w-4 h-4" />
                  Help & Support
                </Button>
              </Link>
            </div>

            {/* Right side - App info and links */}
            <div className="flex flex-col sm:flex-row items-center gap-4 text-sm text-gray-500">
              <span>RabbitMQ Dashboard</span>
              <div className="flex items-center gap-4">
                <Link
                  to="/privacy-settings"
                  className="hover:text-gray-700 transition-colors"
                >
                  Data Privacy
                </Link>
                <a
                  href="https://www.rabbitmq.com/documentation.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-gray-700 transition-colors flex items-center gap-1"
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

import { Link, Outlet, useLocation } from "react-router-dom";

import {
  Download,
  Github,
  LayoutDashboard,
  LogOut,
  Settings,
  ShoppingCart,
} from "lucide-react";

import { Button } from "@/components/ui/button";

import { useAuth } from "@/contexts/AuthContext";

const Layout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navigation = [
    { name: "Licenses", href: "/licenses", icon: LayoutDashboard },
    { name: "Purchase", href: "/purchase", icon: ShoppingCart },
    { name: "Downloads", href: "/downloads", icon: Download },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <nav className="border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold">Qarote Portal</h1>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                        isActive
                          ? "border-accent-orange text-foreground"
                          : "border-transparent text-muted-foreground hover:border-accent-orange/50 hover:text-foreground"
                      }`}
                    >
                      <Icon className="mr-2 h-4 w-4" />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <a
                href="https://github.com/getqarote/Qarote"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="View on GitHub"
                className="text-foreground hover:text-orange-500 transition-colors p-2"
              >
                <Github className="w-5 h-5" />
              </a>
              <span className="text-sm text-muted-foreground">
                {user?.email}
              </span>
              <Button variant="ghost" onClick={logout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>
      <main className="flex-1 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Outlet />
        </div>
      </main>
      <footer className="bg-card text-card-foreground py-8 border-t border-border mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <h3 className="text-lg font-bold">Qarote Portal</h3>
            </div>
            <div className="flex items-center gap-6">
              <a
                href="https://github.com/getqarote/Qarote"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="View on GitHub"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Github className="w-4 h-4 sm:w-5 sm:h-5" />
              </a>
              <Link
                to="/privacy-policy"
                className="text-muted-foreground hover:text-foreground transition-colors text-sm"
              >
                Privacy Policy
              </Link>
              <Link
                to="/terms-of-service"
                className="text-muted-foreground hover:text-foreground transition-colors text-sm"
              >
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;

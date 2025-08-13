import React, { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { Navigation } from "@/components/ui/navigation";
import { Button } from "@/components/ui/button";

const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Get the current page title
  const getPageTitle = () => {
    if (location.pathname === "/") return "Dashboard";
    if (location.pathname.startsWith("/feedback")) return "Feedback Management";
    return "Rabbit Scout Admin";
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile sidebar backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={handleDrawerToggle}
        />
      )}

      {/* Mobile sidebar */}
      <div
        className={`fixed inset-y-0 z-50 flex h-full w-72 flex-col border-r bg-background transition-transform duration-300 md:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-14 items-center px-4 border-b">
          <div className="flex items-center justify-between w-full">
            <span className="font-semibold">Rabbit Scout Admin</span>
            <button onClick={handleDrawerToggle} className="p-2">
              <X size={20} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <Navigation
            onNavItemClick={handleDrawerToggle}
            onLogout={handleLogout}
          />
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 z-30">
        <div className="flex flex-col flex-grow border-r bg-background overflow-y-auto">
          <div className="flex h-14 items-center px-4 border-b">
            <span className="font-semibold">Rabbit Scout Admin</span>
          </div>
          <div className="flex-1">
            <Navigation onLogout={handleLogout} />
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col md:pl-72">
        <div className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4">
          <button
            onClick={handleDrawerToggle}
            className="inline-flex items-center justify-center md:hidden"
          >
            <Menu size={20} />
          </button>

          <div className="flex flex-1 items-center justify-between">
            <h1 className="text-lg font-medium">{getPageTitle()}</h1>
            <div className="flex items-center gap-4">
              {user?.email && (
                <span className="hidden text-sm text-muted-foreground md:block">
                  {user.email}
                </span>
              )}
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Log out
              </Button>
            </div>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;

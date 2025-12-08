import { useState, useEffect } from "react";
import { useLocation, Redirect } from "wouter";
import BarLoader from "@/components/ui/bar-loader";
import { useAuth } from "@/lib/auth-provider";
import { AnimatedBg } from "../ui/animated-bg";
import { AdminTopbar } from "./admin-topbar";
import { AdminSidebar } from "./admin-sidebar";
import { CommandMenu } from "./command-menu";
import { TooltipProvider } from "@/components/ui/tooltip";

interface AdminLayoutProps {
  children: React.ReactNode;
}

/**
 * AdminLayout - Premium admin shell with animated background
 * Features collapsible sidebar, translucent topbar, and command palette
 */
export function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const { isAuthenticated, isLoading, userRole } = useAuth();
  const [location] = useLocation();

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  // Keyboard shortcut for command menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
        <div className="flex flex-col items-center gap-6">
          <BarLoader bars={8} barWidth={10} barHeight={70} color="bg-admin-brand" speed={1.2} />
          <span className="text-white/70">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  // Redirect non-admin users
  if (userRole !== "admin" && userRole !== "superadmin") {
    const redirectPath = userRole === "student" ? "/student" : userRole === "teacher" ? "/teacher" : "/login";
    return <Redirect to={redirectPath} />;
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 text-admin-fg">
        {/* Animated background */}
        <AnimatedBg />

        {/* Command menu */}
        <CommandMenu open={commandOpen} onOpenChange={setCommandOpen} />

        {/* Sidebar - Desktop */}
        <AdminSidebar
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
        />

        {/* Sidebar - Mobile */}
        <AdminSidebar
          isOpen={mobileMenuOpen}
          onToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
          isMobile
          onClose={() => setMobileMenuOpen(false)}
        />

        {/* Main content area */}
        <div
          data-admin-content
          className="flex flex-col min-h-screen transition-all duration-250 ease-premium"
          style={{
            marginLeft: sidebarOpen ? "260px" : "72px",
          }}
        >
          {/* Topbar */}
          <AdminTopbar
            onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
            onCommandOpen={() => setCommandOpen(true)}
          />

          {/* Page content */}
          <main className="flex-1 overflow-y-auto bg-[#FEFDF7]">
            {children}
          </main>
        </div>

        {/* Responsive sidebar margin adjustment */}
        <style>{`
          @media (max-width: 1023px) {
            [data-admin-content] {
              margin-left: 0 !important;
            }
          }
        `}</style>
      </div>
    </TooltipProvider>
  );
}

export default AdminLayout;


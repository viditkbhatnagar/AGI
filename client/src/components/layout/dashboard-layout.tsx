import { useState } from "react";
import { Header } from "./header";
import { Sidebar } from "./sidebar";
import { useAuth } from "@/lib/auth-provider";
import { Loader2 } from "lucide-react";
import { useLocation, useSearch, Redirect } from "wouter";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isAuthenticated, isLoading, userRole } = useAuth();
  const [location] = useLocation();
  
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };
  
  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-lg">Loading...</span>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }
  
  // Check if user is trying to access wrong section
  if (
    (userRole === 'student' && location.startsWith('/admin')) ||
    (userRole === 'admin' && location.startsWith('/student'))
  ) {
    return <Redirect to={userRole === 'student' ? '/student' : '/admin'} />;
  }
  
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar - hidden on mobile, but visible when menu is toggled */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden ${
          mobileMenuOpen ? 'block' : 'hidden'
        }`}
        onClick={toggleMobileMenu}
      />
      
      <div
        className={`fixed inset-y-0 left-0 w-64 md:w-64 z-50 md:relative md:translate-x-0 transform transition duration-200 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar isMobile={true} onClose={toggleMobileMenu} />
      </div>
      
      {/* Hidden on mobile */}
      <div className="hidden md:block md:w-64">
        <Sidebar />
      </div>
      
      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header onMobileMenuToggle={toggleMobileMenu} />
        
        <main className="flex-1 overflow-y-auto bg-gray-100">
          {children}
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;

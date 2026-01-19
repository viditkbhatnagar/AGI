import { useState, createContext, useContext } from "react";
import { Header } from "./header";
import { Sidebar } from "./sidebar";
import { StudentSidebar } from "@/components/student/StudentSidebar";
import { useAuth } from "@/lib/auth-provider";
import { Loader2 } from "lucide-react";
import { useLocation, Redirect } from "wouter";

// Context for sidebar collapse state
interface SidebarContextType {
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean) => void;
  toggleSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextType | null>(null);

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a DashboardLayout");
  }
  return context;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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
    (userRole === 'student' && (location.startsWith('/admin') || location.startsWith('/teacher'))) ||
    ((userRole === 'admin' || userRole === 'superadmin') && (location.startsWith('/student') || location.startsWith('/teacher'))) ||
    (userRole === 'teacher' && (location.startsWith('/admin') || location.startsWith('/student')))
  ) {
    const redirectPath = userRole === 'student' ? '/student' :
                        userRole === 'teacher' ? '/teacher' : '/admin';
    return <Redirect to={redirectPath} />;
  }

  // Check if this is a student route for the new sidebar design
  const isStudentRoute = userRole === 'student' && location.startsWith('/student');
  
  const sidebarContextValue: SidebarContextType = {
    isCollapsed: sidebarCollapsed,
    setIsCollapsed: setSidebarCollapsed,
    toggleSidebar: () => setSidebarCollapsed(prev => !prev)
  };

  // Student Layout with new sidebar design
  if (isStudentRoute) {
    return (
      <SidebarContext.Provider value={sidebarContextValue}>
        <div className="flex h-screen bg-[#f6f7f8] font-display antialiased overflow-hidden">
          {/* Mobile Overlay */}
          <div
            className={`fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity ${
              mobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            onClick={toggleMobileMenu}
          />
          
          {/* Mobile Sidebar */}
          <div
            className={`fixed inset-y-0 left-0 w-64 z-50 md:hidden transform transition-transform duration-300 ${
              mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            <StudentSidebar isMobile={true} onClose={toggleMobileMenu} />
          </div>

          {/* Desktop Sidebar - Collapsible */}
          <div 
            className={`hidden md:flex md:flex-shrink-0 transition-all duration-300 ease-in-out ${
              sidebarCollapsed ? 'md:w-0 md:overflow-hidden' : 'md:w-64'
            }`}
          >
            <StudentSidebar isCollapsed={sidebarCollapsed} />
          </div>
          
          {/* Main Content Area */}
          <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
            {/* Top Header Bar */}
            <Header 
              onMobileMenuToggle={toggleMobileMenu} 
              isStudentLayout={true} 
              onSidebarToggle={() => setSidebarCollapsed(prev => !prev)}
              isSidebarCollapsed={sidebarCollapsed}
            />
            
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto bg-[#f6f7f8]">
              {children}
            </div>
          </main>
        </div>
      </SidebarContext.Provider>
    );
  }
  
  // Default Layout for Admin/Teacher
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
        className={`fixed inset-y-0 left-0 w-64 md:w-64 md:hidden z-50 md:relative md:translate-x-0 transform transition duration-200 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar isMobile={true} onClose={toggleMobileMenu} />
      </div>

      {/* Sidebar for desktop screens */}
      {/* <div className="hidden md:block md:w-64">
        <Sidebar />
      </div> */}
      
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
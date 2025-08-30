import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  BookOpen, 
  CalendarClock, 
  GraduationCap, 
  Home, 
  LayoutDashboard, 
  LogOut, 
  School, 
  Settings, 
  Users, 
  Video,
  UserCircle,
  Trophy,
  FileText
} from "lucide-react";
import { useAuth } from "@/lib/auth-provider";

interface SidebarProps {
  className?: string;
  isMobile?: boolean;
  onClose?: () => void;
}

export function Sidebar({ className, isMobile, onClose }: SidebarProps) {
  const [location] = useLocation();
  const { userRole, logout } = useAuth();
  
  const isActive = (path: string) => {
    // For exact matching
    if (path === location) return true;
    
    // For prefix matching (like /student/courses/*)
    if (path !== '/' && location.startsWith(path)) return true;
    
    return false;
  };
  
  const handleLinkClick = () => {
    if (isMobile && onClose) onClose();
  };
  
  return (
    <div
      className={cn(
        "flex flex-col h-full bg-gradient-to-b from-blue-900 to-blue-500 text-white",
        className
      )}
    >
      <div className="flex items-center justify-center h-16">
        <h1 className="font-inter font-bold text-3xl">AGI</h1>
        <h1 className="font-inter font-bold text-3xl"></h1>
      </div>
      
      <ScrollArea className="flex-1 py-2">
        {userRole === 'admin' ? (
          <div className="px-2 space-y-1">
            <p className="px-2 py-1.5 text-xs font-semibold text-blue-200 uppercase">
              Admin Dashboard
            </p>
            <NavItem 
              href="/admin" 
              icon={<LayoutDashboard className="h-4 w-4 md:h-5 md:w-5" />} 
              label="Overview" 
              isActive={isActive('/admin') && !location.includes('/admin/')} 
              onClick={handleLinkClick}
            />
            <NavItem 
              href="/admin/students" 
              icon={<Users className="h-4 w-4 md:h-5 md:w-5" />} 
              label="Students" 
              isActive={isActive('/admin/students')} 
              onClick={handleLinkClick}
            />
            <NavItem 
              href="/admin/courses" 
              icon={<School className="h-4 w-4 md:h-5 md:w-5" />} 
              label="Courses" 
              isActive={isActive('/admin/courses')} 
              onClick={handleLinkClick}
            />
            <NavItem 
              href="/admin/enrollments" 
              icon={<GraduationCap className="h-4 w-4 md:h-5 md:w-5" />} 
              label="Progress" 
              isActive={isActive('/admin/enrollments')} 
              onClick={handleLinkClick}
            />
            <NavItem 
              href="/admin/live-classes" 
              icon={<Video className="h-4 w-4 md:h-5 md:w-5" />} 
              label="Live Classes" 
              isActive={isActive('/admin/live-classes')} 
              onClick={handleLinkClick}
            />
            <NavItem 
              href="/admin/recordings" 
              icon={<Video className="h-4 w-4 md:h-5 md:w-5" />} 
              label="Recordings" 
              isActive={isActive('/admin/recordings')} 
              onClick={handleLinkClick}
            />
            {/* Removed Quiz Scores and Final Examinations from sidebar; now available in header navigation */}
          </div>
        ) : (
          <div className="px-2 space-y-1">
            <p className="px-2 py-1.5 text-xs font-semibold text-blue-200 uppercase">
              Student Dashboard
            </p>
            <NavItem 
              href="/student" 
              icon={<Home className="h-4 w-4 md:h-5 md:w-5" />} 
              label="Home" 
              isActive={isActive('/student') && !location.includes('/student/')} 
              onClick={handleLinkClick}
            />
            <NavItem 
              href="/student/courses" 
              icon={<BookOpen className="h-4 w-4 md:h-5 md:w-5" />} 
              label="My Courses" 
              isActive={isActive('/student/courses')} 
              onClick={handleLinkClick}
            />


            <NavItem 
              href="/student/profile" 
              icon={<UserCircle className="h-4 w-4 md:h-5 md:w-5" />} 
              label="My Profile" 
              isActive={isActive('/student/profile')} 
              onClick={handleLinkClick}
            />
            <NavItem 
              href="/student/support" 
              icon={<Settings className="h-4 w-4 md:h-5 md:w-5" />} 
              label="Support" 
              isActive={isActive('/student/support')} 
              onClick={handleLinkClick}
            />
          </div>
        )}
      </ScrollArea>
      
      <div className="mt-auto p-4 border-t border-blue-800">
        <Button 
          variant="ghost" 
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          onClick={() => {
            logout();
            if (isMobile && onClose) onClose();
          }}
        >
          <LogOut className="mr-2 h-4 w-4 md:h-5 md:w-5" />
          <span className="text-sm md:text-base">Logout</span>
        </Button>
      </div>
    </div>
  );
}

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  onClick?: () => void;
}

function NavItem({ href, icon, label, isActive, onClick }: NavItemProps) {
  return (
    <Link href={href}>
      <Button
        variant="ghost"
        className={cn(
          "w-full justify-start font-normal",
          isActive
            ? "bg-blue-700 text-white font-semibold"
            : "hover:bg-blue-600 hover:text-white"
        )}
        onClick={onClick}
      >
        {icon}
        <span className="ml-2 text-sm md:text-base whitespace-nowrap">
          {label}
        </span>
      </Button>
    </Link>
  );
}

export default Sidebar;
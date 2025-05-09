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
  Video
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
    <div className={cn("flex flex-col h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border", className)}>
      <div className="flex items-center justify-center h-16 border-b border-sidebar-border">
        <h1 className="font-inter font-bold text-2xl">AGI.online</h1>
      </div>
      
      <ScrollArea className="flex-1 py-2">
        {userRole === 'admin' ? (
          <div className="px-2 space-y-1">
            <p className="px-2 py-1.5 text-xs font-semibold text-sidebar-foreground/70 uppercase">
              Admin Dashboard
            </p>
            <NavItem 
              href="/admin" 
              icon={<LayoutDashboard className="h-4 w-4" />} 
              label="Overview" 
              isActive={isActive('/admin') && !location.includes('/admin/')} 
              onClick={handleLinkClick}
            />
            <NavItem 
              href="/admin/students" 
              icon={<Users className="h-4 w-4" />} 
              label="Students" 
              isActive={isActive('/admin/students')} 
              onClick={handleLinkClick}
            />
            <NavItem 
              href="/admin/courses" 
              icon={<School className="h-4 w-4" />} 
              label="Courses" 
              isActive={isActive('/admin/courses')} 
              onClick={handleLinkClick}
            />
            <NavItem 
              href="/admin/enrollments" 
              icon={<GraduationCap className="h-4 w-4" />} 
              label="Enrollments" 
              isActive={isActive('/admin/enrollments')} 
              onClick={handleLinkClick}
            />
            <NavItem 
              href="/admin/live-classes" 
              icon={<Video className="h-4 w-4" />} 
              label="Live Classes" 
              isActive={isActive('/admin/live-classes')} 
              onClick={handleLinkClick}
            />
          </div>
        ) : (
          <div className="px-2 space-y-1">
            <p className="px-2 py-1.5 text-xs font-semibold text-sidebar-foreground/70 uppercase">
              Student Dashboard
            </p>
            <NavItem 
              href="/student" 
              icon={<Home className="h-4 w-4" />} 
              label="Home" 
              isActive={isActive('/student') && !location.includes('/student/')} 
              onClick={handleLinkClick}
            />
            <NavItem 
              href="/student/courses" 
              icon={<BookOpen className="h-4 w-4" />} 
              label="My Courses" 
              isActive={isActive('/student/courses')} 
              onClick={handleLinkClick}
            />
            <NavItem 
              href="/student/live-classes" 
              icon={<CalendarClock className="h-4 w-4" />} 
              label="Live Classes" 
              isActive={isActive('/student/live-classes')} 
              onClick={handleLinkClick}
            />
            <NavItem 
              href="/student/support" 
              icon={<Settings className="h-4 w-4" />} 
              label="Support" 
              isActive={isActive('/student/support')} 
              onClick={handleLinkClick}
            />
          </div>
        )}
      </ScrollArea>
      
      <div className="mt-auto p-4 border-t border-sidebar-border">
        <Button 
          variant="ghost" 
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          onClick={() => {
            logout();
            if (isMobile && onClose) onClose();
          }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Logout</span>
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
            ? "bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent"
            : "hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
        )}
        onClick={onClick}
      >
        {icon}
        <span className="ml-2">{label}</span>
      </Button>
    </Link>
  );
}

export default Sidebar;

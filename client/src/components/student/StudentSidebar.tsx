import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Award,
  BookOpen, 
  GraduationCap, 
  LayoutDashboard, 
  LogOut, 
  MessageSquare,
  Settings, 
  HelpCircle,
  BarChart3,
} from "lucide-react";
import { useAuth } from "@/lib/auth-provider";
import logo from "@/components/layout/AGI Logo.png";

interface StudentSidebarProps {
  className?: string;
  isMobile?: boolean;
  onClose?: () => void;
  isCollapsed?: boolean;
}

export function StudentSidebar({ className, isMobile, onClose, isCollapsed }: StudentSidebarProps) {
  const [location] = useLocation();
  const { student, logout } = useAuth();
  
  const isActive = (path: string) => {
    if (path === location) return true;
    if (path !== '/' && location.startsWith(path)) return true;
    return false;
  };
  
  const handleLinkClick = () => {
    if (isMobile && onClose) onClose();
  };

  const navItems = [
    { href: "/student", icon: LayoutDashboard, label: "Dashboard", exact: true },
    { href: "/student/courses", icon: BookOpen, label: "Courses" },
    { href: "/student/final-examinations", icon: GraduationCap, label: "Grades" },
    { href: "/student/certificates", icon: Award, label: "Certificates" },
  ];

  const supportItems = [
    { href: "/student/profile", icon: Settings, label: "Settings" },
    { href: "/student/support", icon: HelpCircle, label: "Help Center" },
    { href: "/student/feedback", icon: MessageSquare, label: "Feedback" },
  ];
  
  return (
    <aside
      className={cn(
        "w-64 bg-gradient-to-b from-[#1a1f2e] to-[#0f1318] flex flex-col h-full z-20 shadow-2xl",
        className
      )}
    >
      {/* Logo Area */}
      <Link href="/student" className="block">
        <div className="h-20 flex items-center justify-center bg-white cursor-pointer hover:opacity-95 transition-opacity border-r border-slate-300">
          <img
            src={logo}
            alt="American Global Institute"
            className="h-16 w-auto object-contain"
          />
        </div>
      </Link>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-6 px-3">
        <div className="flex flex-col gap-1">
          <p className="px-4 text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3">
            General
          </p>
          
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.exact 
              ? location === item.href 
              : isActive(item.href);
            
            return (
              <Link key={item.href} href={item.href}>
                <button
                  onClick={handleLinkClick}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group text-left",
                    active
                      ? "bg-white/10 text-white shadow-lg"
                      : "text-white/60 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <Icon className={cn(
                    "size-5 transition-colors",
                    active ? "text-[#FF7F11]" : "text-white/50 group-hover:text-white/80"
                  )} />
                  <span className={cn(
                    "text-sm",
                    active ? "font-semibold" : "font-medium"
                  )}>
                    {item.label}
                  </span>
                  {active && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#FF7F11]" />
                  )}
                </button>
              </Link>
            );
          })}

          <div className="my-5 border-t border-white/10" />

          <p className="px-4 text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3">
            Tools
          </p>

          {supportItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            
            return (
              <Link key={item.href} href={item.href}>
                <button
                  onClick={handleLinkClick}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group text-left",
                    active
                      ? "bg-white/10 text-white shadow-lg"
                      : "text-white/60 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <Icon className={cn(
                    "size-5 transition-colors",
                    active ? "text-[#FF7F11]" : "text-white/50 group-hover:text-white/80"
                  )} />
                  <span className={cn(
                    "text-sm",
                    active ? "font-semibold" : "font-medium"
                  )}>
                    {item.label}
                  </span>
                </button>
              </Link>
            );
          })}
        </div>
      </ScrollArea>

      {/* User Profile */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3 mb-3 p-3 rounded-xl bg-white/5">
          <div className="size-10 rounded-full bg-gradient-to-br from-[#FF7F11] to-[#ff9a44] flex items-center justify-center text-white font-bold text-sm shadow-lg">
            {student?.name?.charAt(0) || "S"}
          </div>
          <div className="flex flex-col overflow-hidden flex-1">
            <p className="text-sm font-semibold text-white truncate">
              {student?.name || "Student"}
            </p>
            <p className="text-xs text-white/50 truncate">
              {student?.pathway || "Learning Path"}
            </p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="sm"
          className="w-full justify-start text-white/50 hover:bg-red-500/20 hover:text-red-400 transition-colors rounded-xl"
          onClick={() => {
            logout();
            if (isMobile && onClose) onClose();
          }}
        >
          <LogOut className="mr-2 size-4" />
          <span className="text-sm font-medium">Log out</span>
        </Button>
      </div>
    </aside>
  );
}

export default StudentSidebar;

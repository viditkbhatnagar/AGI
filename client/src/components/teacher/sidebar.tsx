import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-provider";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  Video, 
  Calendar,
  FileText,
  GraduationCap,
  LogOut,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { useState } from "react";

interface TeacherSidebarProps {
  isOpen?: boolean;
  onToggle?: () => void;
}

const teacherNavItems = [
  {
    title: "Dashboard",
    href: "/teacher",
    icon: LayoutDashboard,
  },
  {
    title: "My Students",
    href: "/teacher/students",
    icon: Users,
  },
  {
    title: "My Courses",
    href: "/teacher/courses",
    icon: BookOpen,
  },
  {
    title: "Live Classes",
    href: "/teacher/live-classes",
    icon: Video,
  },
  {
    title: "Recordings",
    href: "/teacher/recordings",
    icon: FileText,
  },
  {
    title: "Exam Grading",
    href: "/teacher/exam-results",
    icon: GraduationCap,
  },
];

export function TeacherSidebar({ isOpen = true, onToggle }: TeacherSidebarProps) {
  const [location] = useLocation();
  const { logout, user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
  };

  const toggleCollapsed = () => {
    setCollapsed(!collapsed);
    onToggle?.();
  };

  return (
    <div className={cn(
      "bg-white border-r border-gray-200 flex flex-col transition-all duration-300",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Teacher Portal</h2>
              <p className="text-sm text-gray-600">Welcome, {user?.username}</p>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleCollapsed}
            className="p-2"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {teacherNavItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/teacher" && location.startsWith(item.href));
            
            return (
              <li key={item.href}>
                <Link href={item.href}>
                  <a
                    className={cn(
                      "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      isActive
                        ? "bg-blue-100 text-blue-700 border-r-2 border-blue-700"
                        : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                    )}
                    title={collapsed ? item.title : undefined}
                  >
                    <item.icon className={cn("h-5 w-5", collapsed ? "mx-auto" : "mr-3")} />
                    {!collapsed && <span>{item.title}</span>}
                  </a>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <Button
          variant="ghost"
          onClick={handleLogout}
          className={cn(
            "w-full justify-start text-gray-700 hover:bg-gray-100",
            collapsed && "justify-center px-2"
          )}
          title={collapsed ? "Logout" : undefined}
        >
          <LogOut className={cn("h-5 w-5", collapsed ? "" : "mr-3")} />
          {!collapsed && <span>Logout</span>}
        </Button>
      </div>
    </div>
  );
}
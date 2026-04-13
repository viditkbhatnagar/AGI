import React, { useEffect, useState, useCallback } from "react";
import logo from "@/components/layout/AGI Logo.png";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { User, LogOut, Menu, UserIcon, HelpCircle, Brain, UserPlus, MessageSquare, PanelLeftClose, PanelLeft, Check } from "lucide-react";
import { useAuth } from "@/lib/auth-provider";
import { useConditionalRender } from '@/lib/permissions-provider';
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NotificationItem {
  _id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  actionUrl?: string;
  createdAt: string;
}

function useNotifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { isAuthenticated } = useAuth();

  const fetchNotifications = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch("/api/notifications?limit=10", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(interval);
  }, [isAuthenticated, fetchNotifications]);

  const markAsRead = useCallback(async (id: string) => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // silently fail
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      await fetch("/api/notifications/read-all", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // silently fail
    }
  }, []);

  return { notifications, unreadCount, markAsRead, markAllAsRead, refetch: fetchNotifications };
}

function formatTimeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface HeaderProps {
  onMobileMenuToggle?: () => void;
  isStudentLayout?: boolean;
  onSidebarToggle?: () => void;
  isSidebarCollapsed?: boolean;
}

// Navigation link types and constants
interface NavLink {
  label: string;
  href: string;
}

const STUDENT_LINKS: NavLink[] = [
  { label: "Overview", href: "/student" },
  { label: "My Courses", href: "/student/courses" },
  { label: "Final Examinations", href: "/student/final-examinations" },
  { label: "My Certificates", href: "/student/certificates" },
  { label: "Feedback", href: "/student/feedback" },
];

const TEACHER_LINKS: NavLink[] = [
  { label: "Dashboard", href: "/teacher" },
  { label: "My Students", href: "/teacher/students" },
  { label: "My Courses", href: "/teacher/courses" },
  { label: "Live Classes", href: "/teacher/live-classes" },
  { label: "Recordings", href: "/teacher/recordings" },
  { label: "Exam Grading", href: "/teacher/exam-results" },
  { label: "Student Feedbacks", href: "/admin/feedbacks" },
  { label: "Change Password", href: "/teacher/change-password" },
];

const ADMIN_LINKS: NavLink[] = [
  { label: "Overview", href: "/admin" },
  { label: "Students", href: "/admin/students" },
  { label: "Courses", href: "/admin/courses" },
  { label: "Sandbox Courses", href: "/admin/sandbox-courses" },
  { label: "Quiz Repository", href: "/admin/quiz-repository" },
  { label: "Student Feedbacks", href: "/admin/feedbacks" },
  { label: "Progress", href: "/admin/enrollments" },
  { label: "Live Classes", href: "/admin/live-classes" },
  { label: "Recordings", href: "/admin/recordings" },
  { label: "Quiz Scores", href: "/admin/quiz-scores" },
  { label: "Exam Results", href: "/admin/exam-results" },
  { label: "Last Logins", href: "/admin/last-logins" },
  { label: "Add Teacher", href: "/admin/teachers/new" }
];

// Utility button component
interface UtilityButtonProps {
  icon: React.ReactNode;
  onClick?: () => void;
  title: string;
  className?: string;
}

const UtilityButton = ({ icon, onClick, title, className }: UtilityButtonProps) => (
  <Button
    variant="ghost"
    size="icon"
    onClick={onClick}
    title={title}
    className={className}
  >
    {icon}
  </Button>
);

// Navigation item component
const NavItem = ({ href, label }: NavLink) => {
  const [location] = useLocation();
  const isActive = href === location || (href !== "/" && location.startsWith(href));

  return (
    <Link
      href={href}
      className={cn(
        "text-xl lg:text-2xl xl:text-3xl font-semibold transition-colors whitespace-nowrap",
        isActive
          ? "text-[#375BBE] font-semibold"
          : "text-[#375BBE]/80 hover:text-[#375BBE]"
      )}
    >
      {label}
    </Link>
  );
};

export function Header({ onMobileMenuToggle, isStudentLayout, onSidebarToggle, isSidebarCollapsed }: HeaderProps) {
  const [now, setNow] = useState(new Date());
  const { userRole, logout } = useAuth();
  const { renderIfCanCreate } = useConditionalRender();
  const [location, navigate] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [notifOpen, setNotifOpen] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // close mobile menu whenever route changes
  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  const links = userRole === "admin" || userRole === "superadmin" ? ADMIN_LINKS :
    userRole === "teacher" ? TEACHER_LINKS : STUDENT_LINKS;

  const handleLogout = () => {
    logout();
    setMobileOpen(false);
  };

  const handleProfileClick = () => {
    const profilePath = userRole === "admin" || userRole === "superadmin" ? "/admin/profile" :
      userRole === "teacher" ? "/teacher/profile" : "/student/profile";
    navigate(profilePath);
    setMobileOpen(false);
  };

  const handleSupportClick = () => {
    const supportPath = userRole === "admin" || userRole === "superadmin" ? "/admin/support" :
      userRole === "teacher" ? "/teacher/support" : "/student/support";
    navigate(supportPath);
    setMobileOpen(false);
  };

  const handleFeedbackClick = () => {
    const feedbackPath = userRole === "student" ? "/student/feedback" : "/admin/feedbacks";
    navigate(feedbackPath);
    setMobileOpen(false);
  };

  // Student Layout Header (simpler, cleaner design)
  if (isStudentLayout) {
    return (
      <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-4 md:px-6 sticky top-0 z-30">
        {/* Left Side - Mobile Menu & Sidebar Toggle */}
        <div className="flex items-center gap-2">
          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden p-2 text-slate-500 hover:text-[#18548b]"
            onClick={onMobileMenuToggle}
            title="Menu"
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Desktop Sidebar Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden md:flex p-2 text-slate-500 hover:text-[#18548b] hover:bg-slate-100 transition-colors"
            onClick={onSidebarToggle}
            title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isSidebarCollapsed ? (
              <PanelLeft className="h-5 w-5" />
            ) : (
              <PanelLeftClose className="h-5 w-5" />
            )}
          </Button>
        </div>

        {/* Spacer for layout balance */}
        <div className="flex-1" />

        {/* Right Side - Time & User */}
        <div className="flex items-center gap-4">
          {/* Time Display */}
          <div className="hidden sm:block text-sm font-medium text-[#18548b]">
            {now.toLocaleString(undefined, {
              weekday: "short",
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </div>

          {/* Notifications Button */}
          <DropdownMenu open={notifOpen} onOpenChange={setNotifOpen}>
            <DropdownMenuTrigger asChild>
              <button className="relative p-2 text-slate-500 hover:text-[#18548b] transition-colors rounded-full hover:bg-slate-100">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-[#FF7F11] text-white text-[10px] font-bold rounded-full ring-2 ring-white px-1">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 mt-2 max-h-96 overflow-y-auto">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800">Notifications</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); markAllAsRead(); }}
                    className="text-xs text-[#18548b] hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              {notifications.length === 0 ? (
                <div className="py-8 px-4 text-center text-sm text-slate-500">
                  No notifications yet
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n._id}
                    className={cn(
                      "px-4 py-3 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors",
                      !n.isRead && "bg-blue-50/50"
                    )}
                    onClick={() => {
                      if (!n.isRead) markAsRead(n._id);
                      setNotifOpen(false);
                      if (n.actionUrl) navigate(n.actionUrl);
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm", !n.isRead ? "font-semibold text-slate-900" : "text-slate-700")}>
                          {n.title}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                      </div>
                      {!n.isRead && (
                        <span className="mt-1 size-2 shrink-0 bg-[#18548b] rounded-full" />
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">{formatTimeAgo(n.createdAt)}</p>
                  </div>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 p-2 hover:bg-slate-100 transition-colors rounded-full"
                title="User Menu"
              >
                <User className="h-5 w-5 text-[#18548b]" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 mt-2">
              <DropdownMenuItem
                onClick={handleProfileClick}
                className="cursor-pointer hover:bg-[#18548b]/10 transition-colors"
              >
                <UserIcon className="mr-2 h-4 w-4 text-[#18548b]" />
                <span className="text-slate-700">Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleSupportClick}
                className="cursor-pointer hover:bg-[#18548b]/10 transition-colors"
              >
                <HelpCircle className="mr-2 h-4 w-4 text-[#18548b]" />
                <span className="text-slate-700">Support</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="cursor-pointer hover:bg-red-50 transition-colors"
              >
                <LogOut className="mr-2 h-4 w-4 text-red-600" />
                <span className="text-red-600">Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    );
  }

  return (
    <>
      <header className="bg-[#FEFDF7] shadow-sm h-20 sm:h-24 flex flex-col relative px-4 sm:px-6 py-2">
        <div className="relative flex items-center justify-center flex-1 lg:items-center lg:pb-2">
          {/* Hamburger Menu - Left Side */}
          <div className="absolute left-0 flex items-center">
            <Button
              variant="ghost"
              size="icon"
              className="p-2"
              onClick={() => {
                if (onMobileMenuToggle) onMobileMenuToggle();
                setMobileOpen((prev) => !prev);
              }}
              title="Menu"
            >
              <Menu className="h-8 w-8 sm:h-9 sm:w-9 text-[#375BBE]" />
            </Button>
          </div>

          {/* Centered Logo */}
          <div className="flex-shrink-0">
            <Link href={userRole === "admin" || userRole === "superadmin" ? "/admin" :
              userRole === "teacher" ? "/teacher" : "/student"}>
              <img
                src={logo}
                alt="AGI Logo"
                className="h-12 sm:h-14 md:h-16 lg:h-18 xl:h-20 w-auto cursor-pointer hover:opacity-90 transition-opacity"
              />
            </Link>
          </div>

          {/* Right Side - Time Display, Add Teacher Button and User Menu */}
          <div className="absolute right-0 flex items-center space-x-2 sm:space-x-4">
            {/* Time Display */}
            <div className="hidden sm:block text-xs sm:text-sm font-medium text-[#375BBE]">
              {now.toLocaleString(undefined, {
                weekday: "short",
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </div>



            {/* User Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 p-2 hover:bg-[#375BBE]/10 transition-colors"
                  title="User Menu"
                >
                  <User className="h-6 w-6 sm:h-8 sm:w-8 md:h-9 md:w-9 lg:h-10 lg:w-10 text-[#375BBE]" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 sm:w-56 mt-2">
                <DropdownMenuItem
                  onClick={handleProfileClick}
                  className="cursor-pointer hover:bg-[#375BBE]/10 transition-colors"
                >
                  <UserIcon className="mr-2 h-4 w-4 text-[#375BBE]" />
                  <span className="text-[#375BBE]">Profile</span>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={handleSupportClick}
                  className="cursor-pointer hover:bg-[#375BBE]/10 transition-colors"
                >
                  <HelpCircle className="mr-2 h-4 w-4 text-[#375BBE]" />
                  <span className="text-[#375BBE]">Support</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-[#375BBE]/20" />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer hover:bg-red-50 transition-colors"
                >
                  <LogOut className="mr-2 h-4 w-4 text-red-600" />
                  <span className="text-red-600">Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Hamburger Menu Sidebar */}
      {/* Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30"
          onClick={() => setMobileOpen(false)}
        />
      )}
      {/* Drawer */}
      <div
        className={cn(
          "fixed top-0 left-0 h-full w-72 sm:w-80 bg-[#FEFDF7] shadow-lg z-50 transform transition-transform duration-300 ease-in-out flex flex-col",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Fixed header space */}
        <div className="pt-20 sm:pt-24 px-6 flex-shrink-0">
          <div className="text-sm font-semibold text-[#375BBE]/60 uppercase tracking-wide mb-4">
            {userRole === 'admin' || userRole === 'superadmin' ? 'Admin Dashboard' :
              userRole === 'teacher' ? 'Teacher Portal' : 'Student Dashboard'}
          </div>
        </div>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {/* Mobile Navigation Links */}
          <div className="space-y-4 mb-6">
            {links.map(({ href, label }) => {
              const isActive =
                href === location || (href !== "/" && location.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "block text-xl font-semibold py-2 px-3 rounded-lg transition-all duration-200",
                    isActive
                      ? "text-[#375BBE] bg-[#375BBE]/10"
                      : "text-[#375BBE]/80 hover:text-[#375BBE] hover:bg-[#375BBE]/5"
                  )}
                  onClick={() => setMobileOpen(false)}
                >
                  {label}
                </Link>
              );
            })}
          </div>

          {/* Mobile User Actions */}
          <div className="pt-6 space-y-3 border-t border-[#375BBE]/20">
            {/* Add Teacher Button for Mobile - Only for Admin/Superadmin */}

            <button
              onClick={handleProfileClick}
              className="flex items-center w-full text-left text-lg font-semibold text-[#375BBE]/80 hover:text-[#375BBE] hover:bg-[#375BBE]/5 transition-all duration-200 py-3 px-3 rounded-lg"
            >
              <UserIcon className="mr-3 h-5 w-5" />
              Profile
            </button>

            <button
              onClick={handleSupportClick}
              className="flex items-center w-full text-left text-lg font-semibold text-[#375BBE]/80 hover:text-[#375BBE] hover:bg-[#375BBE]/5 transition-all duration-200 py-3 px-3 rounded-lg"
            >
              <HelpCircle className="mr-3 h-5 w-5" />
              Support
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center w-full text-left text-lg font-semibold text-red-600/80 hover:text-red-600 hover:bg-red-50 transition-all duration-200 py-3 px-3 rounded-lg"
            >
              <LogOut className="mr-3 h-5 w-5" />
              Logout
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default Header;
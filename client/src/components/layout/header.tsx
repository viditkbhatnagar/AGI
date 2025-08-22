import React, { useEffect, useState } from "react";
import logo from "@/components/layout/AGI Logo.png";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Bell, User, LogOut, Menu } from "lucide-react";
import { useAuth } from "@/lib/auth-provider";
import { cn } from "@/lib/utils";

interface HeaderProps {
  onMobileMenuToggle?: () => void;
}

// Navigation link types and constants
interface NavLink {
  label: string;
  href: string;
}

const STUDENT_LINKS: NavLink[] = [
  { label: "Overview",     href: "/student" },
  { label: "My Courses",   href: "/student/courses" },
  { label: "Live Classes", href: "/student/live-classes" },
  { label: "Recordings",   href: "/student/recordings" },
  { label: "Profile",      href: "/student/profile" },
  { label: "Support",      href: "/student/support" },
];

const ADMIN_LINKS: NavLink[] = [
  { label: "Overview",          href: "/admin" },
  { label: "Students",          href: "/admin/students" },
  { label: "Courses",           href: "/admin/courses" },
  { label: "Progress",          href: "/admin/enrollments" },
  { label: "Live Classes",      href: "/admin/live-classes" },
  { label: "Recordings",        href: "/admin/recordings" },
  { label: "Quiz Scores",       href: "/admin/quiz-scores" },
  { label: "Exam Results",      href: "/admin/exam-results" },
  { label: "WhatsApp Bot",      href: "/admin/whatsapp" },
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
        "text-2xl font-semibold transition-colors",
        isActive
          ? "text-[#375BBE] font-semibold"
          : "text-[#375BBE]/80 hover:text-[#375BBE]"
      )}
    >
      {label}
    </Link>
  );
};

export function Header({ onMobileMenuToggle }: HeaderProps) {
  const [now, setNow] = useState(new Date());
  const { userRole, logout } = useAuth();
  const [location, navigate] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0); // Add notification state

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // close mobile menu whenever route changes
  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  const links = userRole === "admin" ? ADMIN_LINKS : STUDENT_LINKS;

  const handleLogout = () => {
    logout();
    setMobileOpen(false);
  };

  const handleProfileClick = () => {
    navigate(userRole === "admin" ? "/admin/profile" : "/student/profile");
    setMobileOpen(false);
  };

  return (
    <>
      <header className="bg-[#FEFDF7] shadow-sm h-24 flex flex-col relative px-6 py-2">
        <div className="hidden md:block absolute inset-x-0 top-1 text-center text-sm md:text-base font-medium text-[#375BBE]">
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

        <div className="flex items-center md:items-end justify-between flex-1 pb-2">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden mr-2"
            onClick={() => {
              if (onMobileMenuToggle) onMobileMenuToggle();
              setMobileOpen((prev) => !prev);
            }}
            title="Menu"
          >
            <Menu className="h-8 w-8 text-[#375BBE]" />
          </Button>

          <Link href={userRole === "admin" ? "/admin" : "/student"}>
            <img
              src={logo}
              alt="AGI Logo"
              className="h-16 md:h-20 lg:h-22 w-auto cursor-pointer hover:opacity-90 transition-opacity"
            />
          </Link>

          <nav className="hidden md:flex space-x-8 lg:space-x-12 mb-1">
            {links.map((link) => (
              <NavItem key={link.href} {...link} />
            ))}
          </nav>

          <div className="flex items-center space-x-6">
            <UtilityButton
              icon={<Bell className="h-12 w-12 text-[#375BBE]" />}
              title="Notifications"
              onClick={() => setNotificationCount(0)}
            />
            <UtilityButton
              icon={<User className="h-12 w-12 text-[#375BBE]" />}
              title="Profile"
              onClick={handleProfileClick}
            />
            <UtilityButton
              icon={<LogOut className="h-12 w-12 text-[#375BBE]" />}
              title="Logout"
              onClick={handleLogout}
            />
          </div>
        </div>
      </header>

      {/* Mobile Sidebar */}
      {/* Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      {/* Drawer */}
      <div
        className={cn(
          "fixed top-0 left-0 h-full w-64 bg-[#FEFDF7] shadow-lg z-50 transform transition-transform duration-300 ease-in-out md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="pt-24 px-6 flex flex-col space-y-6">
          {links.map(({ href, label }) => {
            const isActive =
              href === location || (href !== "/" && location.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "text-xl font-semibold",
                  isActive
                    ? "text-[#375BBE]"
                    : "text-[#375BBE]/80 hover:text-[#375BBE]"
                )}
                onClick={() => setMobileOpen(false)}
              >
                {label}
              </Link>
            );
          })}

          <div className="flex items-center space-x-6 pt-6">
            <UtilityButton
              icon={<Bell className="h-10 w-10 text-[#375BBE]" />}
              title="Notifications"
              onClick={() => {
                setNotificationCount(0);
                setMobileOpen(false);
              }}
            />
            <UtilityButton
              icon={<User className="h-10 w-10 text-[#375BBE]" />}
              title="Profile"
              onClick={handleProfileClick}
            />
            <UtilityButton
              icon={<LogOut className="h-10 w-10 text-[#375BBE]" />}
              title="Logout"
              onClick={handleLogout}
            />
          </div>
        </div>
      </div>
    </>
  );
}

export default Header;
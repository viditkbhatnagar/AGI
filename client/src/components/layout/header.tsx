import React, { useEffect, useState } from "react";
import logo from "@/components/layout/AGI Logo.png";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { User, LogOut, Menu, UserIcon, HelpCircle } from "lucide-react";
import { useAuth } from "@/lib/auth-provider";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

export function Header({ onMobileMenuToggle }: HeaderProps) {
  const [now, setNow] = useState(new Date());
  const { userRole, logout } = useAuth();
  const [location, navigate] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

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

  const handleSupportClick = () => {
    navigate(userRole === "admin" ? "/admin/support" : "/student/support");
    setMobileOpen(false);
  };

  return (
    <>
      <header className="bg-[#FEFDF7] shadow-sm h-20 sm:h-24 flex flex-col relative px-4 sm:px-6 py-2">
        <div className="flex items-center justify-between flex-1 lg:items-center lg:pb-2">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Link href={userRole === "admin" ? "/admin" : "/student"}>
                <img
                  src={logo}
                  alt="AGI Logo"
                  className="h-12 sm:h-14 md:h-16 lg:h-18 xl:h-20 w-auto cursor-pointer hover:opacity-90 transition-opacity"
                />
              </Link>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="ml-2 p-2"
              onClick={() => {
                if (onMobileMenuToggle) onMobileMenuToggle();
                setMobileOpen((prev) => !prev);
              }}
              title="Menu"
            >
              <Menu className="h-6 w-6 sm:h-7 sm:w-7 text-[#375BBE]" />
            </Button>
          </div>

          <nav className="hidden">
            {/* Navigation items are now only available in hamburger menu */}
          </nav>

          <div className="flex items-center justify-end flex-shrink-0 space-x-4">
            {/* Time Display */}
            <div className="hidden sm:block text-sm font-medium text-[#375BBE]">
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
                  className="h-12 w-12 sm:h-14 sm:w-14 p-2 hover:bg-[#375BBE]/10 transition-colors"
                  title="User Menu"
                >
                  <User className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 lg:h-11 lg:w-11 text-[#375BBE]" />
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
          "fixed top-0 left-0 h-full w-72 sm:w-80 bg-[#FEFDF7] shadow-lg z-50 transform transition-transform duration-300 ease-in-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="pt-20 sm:pt-24 px-6 flex flex-col space-y-6">
          {/* Mobile Navigation Links */}
          <div className="space-y-4">
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
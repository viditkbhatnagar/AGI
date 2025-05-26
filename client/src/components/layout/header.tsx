import React, { useEffect, useState } from "react";
import logo from "@/components/layout/AGI Logo.png";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Bell, User, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth-provider";

interface HeaderProps {
  onMobileMenuToggle?: () => void;
}

export function Header({ onMobileMenuToggle }: HeaderProps) {
  // ─── live date‐time ─────────────────────────────────
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const { userRole, logout } = useAuth();
  const [location] = useLocation();

  // ─── role‐based nav ──────────────────────────────────
  const studentLinks = [
    { label: "Overview",     href: "/student" },
    { label: "My Courses",   href: "/student/courses" },
    { label: "Live Classes", href: "/student/live-classes" },
    { label: "Profile",      href: "/student/profile" },
    { label: "Support",      href: "/student/support" },
  ];
  const adminLinks = [
    { label: "Overview",    href: "/admin" },
    { label: "Students",    href: "/admin/students" },
    { label: "Courses",     href: "/admin/courses" },
    { label: "Progress",    href: "/admin/enrollments" },
    { label: "Live Classes",href: "/admin/live-classes" },
  ];
  const links = userRole === "admin" ? adminLinks : studentLinks;

  // ─── single nav item ───────────────────────────────
  const NavItem = ({ href, label }: { href: string; label: string }) => {
    const isActive =
      href === location || (href !== "/" && location.startsWith(href));
    return (
      <Link
        href={href}
        className={
          "text-2xl font-semibold transition-colors " +
          (isActive
            ? "text-[#375BBE] font-semibold"
            : "text-[#375BBE]/80 hover:text-[#375BBE]")
        }
      >
        {label}
      </Link>
    );
  };

  return (
    <header className="bg-[#FEFDF7] shadow-sm h-24 flex flex-col relative px-6 py-2">
      {/* live clock (stays at very top) */}
      <div className="absolute inset-x-0 top-1 text-center text-medium font-medium text-[#375BBE]">
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

      {/* bottom-anchored row: logo / nav / utilities */}
      <div className="flex items-end justify-between flex-1 pb-2">
        {/* logo – larger */}
        <img
          src={logo}
          alt="AGI Logo"
          className="h-20 md:h-22 w-auto"
        />

        {/* nav links – tiny bottom gap */}
        <nav className="flex space-x-12 mb-1">
          {links.map((l) => (
            <NavItem key={l.href} href={l.href} label={l.label} />
          ))}
        </nav>

        {/* utility icons – larger */}
        <div className="flex items-center space-x-6">
          <Button variant="ghost" size="icon">
            <Bell className="h-10 w-10 text-[#375BBE]" />
          </Button>
          <Button variant="ghost" size="icon">
            <User className="h-10 w-10 text-[#375BBE]" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={logout}
            title="Logout"
          >
            <LogOut className="h-10 w-10 text-[#375BBE]" />
          </Button>
        </div>
      </div>
    </header>
  );
}

export default Header;
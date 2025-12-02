import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  Search,
  Bell,
  User,
  LogOut,
  Settings,
  HelpCircle,
  Menu,
  Command,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth-provider";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

interface AdminTopbarProps {
  onMenuToggle?: () => void;
  onCommandOpen?: () => void;
}

/**
 * AdminTopbar - Translucent gradient topbar with blur effect
 * Features logo, global search trigger, time ticker, notifications, and profile
 */
export function AdminTopbar({ onMenuToggle, onCommandOpen }: AdminTopbarProps) {
  const [now, setNow] = useState(new Date());
  const { logout } = useAuth();
  const [, navigate] = useLocation();
  const prefersReducedMotion = useReducedMotion();

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-50 w-full">
      {/* Pearl glossy white backdrop */}
      <div className="absolute inset-0 bg-white/95 backdrop-blur-xl border-b border-gray-200/50 shadow-sm" />

      <div className="relative flex items-center justify-between h-16 px-4 md:px-6">
        {/* Left section: Menu + Logo */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuToggle}
            className="lg:hidden text-gray-600 hover:text-[#375BBE] hover:bg-gray-100"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="hidden md:block">
            <h1 className="text-sm font-semibold text-[#1a1a2e]">Admin Dashboard</h1>
            <p className="text-xs text-gray-500">Overview and controls</p>
          </div>
        </div>

        {/* Center section: Global search trigger */}
        <button
          onClick={onCommandOpen}
          className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-50 border border-gray-200 text-gray-500 hover:text-[#375BBE] hover:bg-white hover:border-[#375BBE]/30 transition-all duration-200 min-w-[280px]"
        >
          <Search className="h-4 w-4" />
          <span className="text-sm">Search or jump to...</span>
          <div className="ml-auto flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 text-[10px] font-medium bg-white rounded border border-gray-200 text-gray-600">
              <Command className="h-2.5 w-2.5 inline" />
            </kbd>
            <kbd className="px-1.5 py-0.5 text-[10px] font-medium bg-white rounded border border-gray-200 text-gray-600">
              K
            </kbd>
          </div>
        </button>

        {/* Right section: Time, notifications, theme, profile */}
        <div className="flex items-center gap-2 md:gap-4">
          {/* Time ticker */}
          <div
            className="hidden lg:block text-xs font-mono text-gray-600"
            role="timer"
            aria-live="polite"
          >
            <span className="text-[#1a1a2e]">
              {now.toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </span>
            <span className="mx-2 text-gray-400">|</span>
            <span>
              {now.toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </span>
          </div>

          {/* Mobile search trigger */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onCommandOpen}
            className="md:hidden text-gray-600 hover:text-[#375BBE] hover:bg-gray-100"
          >
            <Search className="h-5 w-5" />
          </Button>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative text-gray-600 hover:text-[#375BBE] hover:bg-gray-100"
              >
                <Bell className="h-5 w-5" />
                {/* Notification dot */}
                <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[#375BBE] animate-pulse" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-80 bg-white border-gray-200 shadow-lg"
            >
              <div className="px-4 py-3 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-[#1a1a2e]">Notifications</h3>
              </div>
              <div className="py-2 px-4 text-sm text-gray-500">
                No new notifications
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Profile dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-600 hover:text-[#375BBE] hover:bg-gray-100"
              >
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#375BBE] to-[#9B5CFF] flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 bg-white border-gray-200 shadow-lg"
            >
              <DropdownMenuItem
                onClick={() => navigate("/admin/profile")}
                className="text-[#1a1a2e] hover:bg-gray-50 cursor-pointer"
              >
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigate("/admin/settings")}
                className="text-[#1a1a2e] hover:bg-gray-50 cursor-pointer"
              >
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigate("/admin/support")}
                className="text-[#1a1a2e] hover:bg-gray-50 cursor-pointer"
              >
                <HelpCircle className="mr-2 h-4 w-4" />
                Help & Support
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-gray-100" />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-red-600 hover:bg-red-50 cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

export default AdminTopbar;


import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  Calendar,
  UserPlus,
  BookOpen,
  GraduationCap,
  LayoutDashboard,
  Users,
  Video,
  FileText,
  Download,
  Search,
} from "lucide-react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

interface CommandMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CommandAction {
  id: string;
  label: string;
  icon: React.ElementType;
  shortcut?: string;
  href?: string;
  action?: () => void;
}

const quickActions: CommandAction[] = [
  {
    id: "schedule-class",
    label: "Schedule Live Class",
    icon: Calendar,
    shortcut: "S",
    href: "/admin/live-classes/new",
  },
  {
    id: "add-student",
    label: "Add New Student",
    icon: UserPlus,
    shortcut: "N",
    href: "/admin/students/new",
  },
  {
    id: "add-course",
    label: "Add New Course",
    icon: BookOpen,
    shortcut: "C",
    href: "/admin/courses/new",
  },
  {
    id: "create-enrollment",
    label: "Create Enrollment",
    icon: GraduationCap,
    shortcut: "E",
    href: "/admin/enrollments/new",
  },
];

const navigationItems: CommandAction[] = [
  { id: "nav-dashboard", label: "Go to Dashboard", icon: LayoutDashboard, href: "/admin" },
  { id: "nav-students", label: "Go to Students", icon: Users, href: "/admin/students" },
  { id: "nav-courses", label: "Go to Courses", icon: BookOpen, href: "/admin/courses" },
  { id: "nav-live-classes", label: "Go to Live Classes", icon: Video, href: "/admin/live-classes" },
  { id: "nav-enrollments", label: "Go to Progress", icon: GraduationCap, href: "/admin/enrollments" },
  { id: "nav-calendar", label: "Go to Calendar", icon: Calendar, href: "/admin/calendar" },
];

const utilityActions: CommandAction[] = [
  {
    id: "export-report",
    label: "Export Report (CSV)",
    icon: Download,
    action: () => {
      // Trigger CSV export
      console.log("Exporting report...");
    },
  },
];

/**
 * CommandMenu - Global command palette with keyboard shortcuts
 * Opened with ⌘K, provides quick access to actions and navigation
 */
export function CommandMenu({ open, onOpenChange }: CommandMenuProps) {
  const [, navigate] = useLocation();
  const prefersReducedMotion = useReducedMotion();

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Open command menu with ⌘K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onOpenChange(!open);
        return;
      }

      // Quick action shortcuts when command menu is open
      if (open) {
        const shortcutMap: Record<string, string> = {
          s: "/admin/live-classes/new",
          n: "/admin/students/new",
          c: "/admin/courses/new",
          e: "/admin/enrollments/new",
        };

        if (shortcutMap[e.key.toLowerCase()] && !e.metaKey && !e.ctrlKey) {
          e.preventDefault();
          navigate(shortcutMap[e.key.toLowerCase()]);
          onOpenChange(false);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange, navigate]);

  const handleSelect = useCallback(
    (action: CommandAction) => {
      if (action.href) {
        navigate(action.href);
      } else if (action.action) {
        action.action();
      }
      onOpenChange(false);
    },
    [navigate, onOpenChange]
  );

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <div className="bg-admin-surface/95 backdrop-blur-xl border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl">
        <Command className="bg-transparent">
          <div className="flex items-center border-b border-white/[0.06] px-4">
            <Search className="h-4 w-4 text-admin-muted mr-2" />
            <CommandInput
              placeholder="Search commands, navigate, or type a shortcut..."
              className="h-14 bg-transparent text-admin-fg placeholder:text-admin-muted border-0 focus:ring-0"
            />
          </div>

          <CommandList className="max-h-[400px] overflow-y-auto p-2">
            <CommandEmpty className="py-6 text-center text-sm text-admin-muted">
              No results found.
            </CommandEmpty>

            {/* Quick Actions */}
            <CommandGroup heading="Quick Actions" className="text-admin-muted">
              {quickActions.map((action) => (
                <CommandItem
                  key={action.id}
                  onSelect={() => handleSelect(action)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-admin-fg cursor-pointer hover:bg-white/[0.06] aria-selected:bg-admin-brand/10"
                >
                  <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-admin-brand/10">
                    <action.icon className="h-4 w-4 text-admin-brand" />
                  </div>
                  <span className="flex-1">{action.label}</span>
                  {action.shortcut && (
                    <CommandShortcut className="px-2 py-1 text-[10px] font-medium bg-white/[0.06] rounded border border-white/[0.08] text-admin-muted">
                      {action.shortcut}
                    </CommandShortcut>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandSeparator className="my-2 bg-white/[0.06]" />

            {/* Navigation */}
            <CommandGroup heading="Navigation" className="text-admin-muted">
              {navigationItems.map((item) => (
                <CommandItem
                  key={item.id}
                  onSelect={() => handleSelect(item)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-admin-fg cursor-pointer hover:bg-white/[0.06] aria-selected:bg-admin-brand/10"
                >
                  <item.icon className="h-4 w-4 text-admin-muted" />
                  <span>{item.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandSeparator className="my-2 bg-white/[0.06]" />

            {/* Utilities */}
            <CommandGroup heading="Utilities" className="text-admin-muted">
              {utilityActions.map((action) => (
                <CommandItem
                  key={action.id}
                  onSelect={() => handleSelect(action)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-admin-fg cursor-pointer hover:bg-white/[0.06] aria-selected:bg-admin-brand/10"
                >
                  <action.icon className="h-4 w-4 text-admin-muted" />
                  <span>{action.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>

          {/* Footer with keyboard hints */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06] text-[11px] text-admin-muted">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white/[0.06] rounded border border-white/[0.08]">↑↓</kbd>
                navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white/[0.06] rounded border border-white/[0.08]">↵</kbd>
                select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white/[0.06] rounded border border-white/[0.08]">esc</kbd>
                close
              </span>
            </div>
          </div>
        </Command>
      </div>
    </CommandDialog>
  );
}

export default CommandMenu;


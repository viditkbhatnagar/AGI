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
      <div className="bg-[#FEFDF7] backdrop-blur-xl border border-gray-200/50 rounded-2xl overflow-hidden shadow-2xl">
        <Command className="bg-transparent">
          <div className="flex items-center border-b border-gray-200/50 px-4 bg-white/50">
            <Search className="h-4 w-4 text-gray-500 mr-2" />
            <CommandInput
              placeholder="Search commands, navigate, or type a shortcut..."
              className="h-14 bg-transparent text-gray-900 placeholder:text-gray-400 border-0 focus:ring-0"
            />
          </div>

          <CommandList className="max-h-[400px] overflow-y-auto p-2 bg-[#FEFDF7]">
            <CommandEmpty className="py-6 text-center text-sm text-gray-500">
              No results found.
            </CommandEmpty>

            {/* Quick Actions */}
            <CommandGroup heading="Quick Actions" className="text-gray-600">
              {quickActions.map((action, index) => (
                <motion.div
                  key={action.id}
                  initial={prefersReducedMotion ? {} : { opacity: 0, y: -10 }}
                  animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03, duration: 0.2 }}
                >
                  <CommandItem
                    onSelect={() => handleSelect(action)}
                    className="group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-900 cursor-pointer transition-all duration-300 data-[selected='true']:bg-transparent data-[selected=true]:text-gray-900"
                  >
                    <motion.div
                      className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 opacity-0 group-hover:opacity-100 group-data-[selected='true']:opacity-100 transition-opacity duration-300"
                      layoutId={`hover-${action.id}`}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                    <motion.div
                      className="flex items-center justify-center h-8 w-8 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100 group-hover:from-blue-200 group-hover:to-indigo-200 transition-all duration-300 relative z-10"
                      whileHover={prefersReducedMotion ? {} : { scale: 1.1, rotate: 5 }}
                      whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
                    >
                      <action.icon className="h-4 w-4 text-[#375BBE] transition-colors duration-300" />
                    </motion.div>
                    <span className="flex-1 relative z-10 font-medium transition-colors duration-300">{action.label}</span>
                    {action.shortcut && (
                      <CommandShortcut className="px-2 py-1 text-[10px] font-medium bg-gray-100 rounded border border-gray-200 text-gray-600 relative z-10 group-hover:bg-gray-200 transition-colors duration-300">
                        {action.shortcut}
                      </CommandShortcut>
                    )}
                  </CommandItem>
                </motion.div>
              ))}
            </CommandGroup>

            <CommandSeparator className="my-2 bg-gray-200/50" />

            {/* Navigation */}
            <CommandGroup heading="Navigation" className="text-gray-600">
              {navigationItems.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={prefersReducedMotion ? {} : { opacity: 0, y: -10 }}
                  animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
                  transition={{ delay: (quickActions.length + index) * 0.03, duration: 0.2 }}
                >
                  <CommandItem
                    onSelect={() => handleSelect(item)}
                    className="group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-900 cursor-pointer transition-all duration-300 data-[selected='true']:bg-transparent data-[selected=true]:text-gray-900"
                  >
                    <motion.div
                      className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 opacity-0 group-hover:opacity-100 group-data-[selected='true']:opacity-100 transition-opacity duration-300"
                      layoutId={`hover-${item.id}`}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                    <motion.div
                      className="relative z-10"
                      whileHover={prefersReducedMotion ? {} : { x: 4 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    >
                      <item.icon className="h-4 w-4 text-gray-500 group-hover:text-[#375BBE] transition-colors duration-300" />
                    </motion.div>
                    <span className="relative z-10 font-medium transition-colors duration-300">{item.label}</span>
                  </CommandItem>
                </motion.div>
              ))}
            </CommandGroup>

            <CommandSeparator className="my-2 bg-gray-200/50" />

            {/* Utilities */}
            <CommandGroup heading="Utilities" className="text-gray-600">
              {utilityActions.map((action, index) => (
                <motion.div
                  key={action.id}
                  initial={prefersReducedMotion ? {} : { opacity: 0, y: -10 }}
                  animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
                  transition={{ delay: (quickActions.length + navigationItems.length + index) * 0.03, duration: 0.2 }}
                >
                  <CommandItem
                    onSelect={() => handleSelect(action)}
                    className="group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-900 cursor-pointer transition-all duration-300 data-[selected='true']:bg-transparent data-[selected=true]:text-gray-900"
                  >
                    <motion.div
                      className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 opacity-0 group-hover:opacity-100 group-data-[selected='true']:opacity-100 transition-opacity duration-300"
                      layoutId={`hover-${action.id}`}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                    <motion.div
                      className="relative z-10"
                      whileHover={prefersReducedMotion ? {} : { x: 4 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    >
                      <action.icon className="h-4 w-4 text-gray-500 group-hover:text-[#375BBE] transition-colors duration-300" />
                    </motion.div>
                    <span className="relative z-10 font-medium transition-colors duration-300">{action.label}</span>
                  </CommandItem>
                </motion.div>
              ))}
            </CommandGroup>
          </CommandList>

          {/* Footer with keyboard hints */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200/50 text-[11px] text-gray-500 bg-white/50">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-100 rounded border border-gray-200 text-gray-600">↑↓</kbd>
                navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-100 rounded border border-gray-200 text-gray-600">↵</kbd>
                select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-100 rounded border border-gray-200 text-gray-600">esc</kbd>
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


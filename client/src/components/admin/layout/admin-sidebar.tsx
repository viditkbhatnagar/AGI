import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  UserPlus,
  GraduationCap,
  BookOpen,
  Video,
  Calendar,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  FileText,
  Brain,
  MessageSquare,
  Award,
  Clock,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { Button } from "@/components/ui/button";
// Logo from public folder
const logo = "/agi-logo.png";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string | number;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    ],
  },
  {
    title: "Management",
    items: [
      { label: "Students", href: "/admin/students", icon: Users },
      { label: "Teachers", href: "/admin/teachers/new", icon: UserPlus },
      { label: "Courses", href: "/admin/courses", icon: BookOpen },
      { label: "Sandbox Courses", href: "/admin/sandbox-courses", icon: FileText },
      { label: "Quiz Repository", href: "/admin/quiz-repository", icon: Brain },
      { label: "Progress", href: "/admin/enrollments", icon: GraduationCap },
    ],
  },
  {
    title: "Live & Media",
    items: [
      { label: "Live Classes", href: "/admin/live-classes", icon: Video },
      { label: "Recordings", href: "/admin/recordings", icon: Video },
    ],
  },
  {
    title: "Reports",
    items: [
      { label: "Feedbacks", href: "/admin/feedbacks", icon: MessageSquare },
      { label: "Quiz Scores", href: "/admin/quiz-scores", icon: Award },
      { label: "Exam Results", href: "/admin/exam-results", icon: BarChart3 },
      { label: "Last Logins", href: "/admin/last-logins", icon: Clock },
    ],
  },
  {
    title: "System",
    items: [
      { label: "API Usage", href: "/admin/api-usage", icon: Activity },
    ],
  },
];

interface AdminSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  isMobile?: boolean;
  onClose?: () => void;
}

/**
 * AdminSidebar - Collapsible sidebar with glow highlights and magnetic hover
 * Features gradient active indicators and smooth collapse animations
 */
export function AdminSidebar({
  isOpen,
  onToggle,
  isMobile = false,
  onClose,
}: AdminSidebarProps) {
  const [location] = useLocation();
  const prefersReducedMotion = useReducedMotion();

  const isActive = (href: string) => {
    if (href === "/admin") {
      return location === "/admin";
    }
    return location.startsWith(href);
  };

  const handleLinkClick = () => {
    if (isMobile && onClose) {
      onClose();
    }
  };

  const sidebarVariants = {
    open: { width: isMobile ? 280 : 260 },
    closed: { width: 72 },
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isMobile && isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <motion.aside
        initial={false}
        animate={isOpen ? "open" : "closed"}
        variants={prefersReducedMotion ? {} : sidebarVariants}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "fixed top-0 left-0 z-50 h-full flex flex-col",
          "bg-white/95 backdrop-blur-xl border-r border-gray-200/50 shadow-sm",
          isMobile ? "lg:hidden" : "hidden lg:flex",
          isMobile && !isOpen && "-translate-x-full"
        )}
        style={{ paddingTop: isMobile ? 0 : "64px" }}
      >
        {/* Logo at top of sidebar */}
        <div className="flex-shrink-0 border-b border-gray-200" style={{ marginTop: isMobile ? 0 : '-64px' }}>
          <Link href="/admin" className="flex items-center justify-center w-full">
            <motion.img
              src={logo}
              alt="AGI Logo"
              className="h-24 w-full max-w-[240px] object-contain"
              whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
              transition={{ duration: 0.2 }}
            />
          </Link>
        </div>

        {/* Collapse toggle (desktop only) */}
        {!isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="absolute -right-3 top-24 z-10 h-6 w-6 rounded-full bg-white border border-gray-200 text-gray-600 hover:text-[#375BBE] hover:bg-gray-50 shadow-sm"
          >
            {isOpen ? (
              <ChevronLeft className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </Button>
        )}

        {/* Mobile header */}
        {isMobile && (
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
            <span className="text-sm font-semibold text-[#1a1a2e]">Navigation</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-gray-600 hover:text-[#375BBE]"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {navSections.map((section, sectionIndex) => (
            <div key={section.title} className={cn(sectionIndex > 0 && "mt-6")}>
              <AnimatePresence>
                {isOpen && (
                  <motion.h3
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400"
                  >
                    {section.title}
                  </motion.h3>
                )}
              </AnimatePresence>

              <div className="space-y-1">
                {section.items.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link key={item.href} href={item.href} onClick={handleLinkClick}>
                      <motion.div
                        className={cn(
                          "group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors duration-200",
                          active
                            ? "bg-[#375BBE]/10 text-[#375BBE]"
                            : "text-gray-600 hover:text-[#375BBE] hover:bg-gray-50"
                        )}
                        whileHover={
                          prefersReducedMotion
                            ? {}
                            : { x: 2, transition: { duration: 0.15 } }
                        }
                        whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
                      >
                        {/* Active indicator */}
                        {active && (
                          <motion.div
                            layoutId="sidebar-active"
                            className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#375BBE]/10 to-[#9B5CFF]/10 border-l-2 border-[#375BBE]"
                            initial={false}
                            transition={
                              prefersReducedMotion
                                ? { duration: 0 }
                                : { type: "spring", stiffness: 500, damping: 35 }
                            }
                          />
                        )}

                        {/* Icon */}
                        <item.icon
                          className={cn(
                            "h-5 w-5 flex-shrink-0",
                            active ? "text-[#375BBE]" : "text-gray-600 group-hover:text-[#375BBE]"
                          )}
                        />

                        {/* Label */}
                        <AnimatePresence>
                          {isOpen && (
                            <motion.span
                              initial={{ opacity: 0, width: 0 }}
                              animate={{ opacity: 1, width: "auto" }}
                              exit={{ opacity: 0, width: 0 }}
                              className="text-sm font-medium whitespace-nowrap overflow-hidden"
                            >
                              {item.label}
                            </motion.span>
                          )}
                        </AnimatePresence>

                        {/* Badge */}
                        {item.badge && isOpen && (
                          <span className="ml-auto px-2 py-0.5 text-[10px] font-medium rounded-full bg-[#375BBE]/10 text-[#375BBE]">
                            {item.badge}
                          </span>
                        )}

                        {/* Hover glow */}
                        <div className="absolute inset-0 rounded-xl bg-[#375BBE]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
                      </motion.div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Settings at bottom */}
        <div className="p-3 border-t border-gray-200">
          <Link href="/admin/settings" onClick={handleLinkClick}>
            <motion.div
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:text-[#375BBE] hover:bg-gray-50 transition-colors duration-200"
              )}
              whileHover={prefersReducedMotion ? {} : { x: 2 }}
            >
              <Settings className="h-5 w-5" />
              <AnimatePresence>
                {isOpen && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-sm font-medium"
                  >
                    Settings
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.div>
          </Link>
        </div>
      </motion.aside>
    </>
  );
}

export default AdminSidebar;


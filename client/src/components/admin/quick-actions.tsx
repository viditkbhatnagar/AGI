import { motion } from "framer-motion";
import { Link } from "wouter";
import {
  Calendar,
  UserPlus,
  BookOpen,
  GraduationCap,
  LucideIcon,
} from "lucide-react";
import { GlassCard } from "./ui/glass-card";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

interface QuickAction {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
  shortcut?: string;
}

const defaultActions: QuickAction[] = [
  {
    id: "schedule-class",
    label: "Schedule Live Class",
    icon: Calendar,
    href: "/admin/live-classes/new",
    shortcut: "S",
  },
  {
    id: "add-student",
    label: "Add New Student",
    icon: UserPlus,
    href: "/admin/students/new",
    shortcut: "N",
  },
  {
    id: "add-course",
    label: "Add New Course",
    icon: BookOpen,
    href: "/admin/courses/new",
    shortcut: "C",
  },
  {
    id: "create-enrollment",
    label: "Create Enrollment",
    icon: GraduationCap,
    href: "/admin/enrollments/new",
    shortcut: "E",
  },
];

interface QuickActionsProps {
  title?: string;
  actions?: QuickAction[];
  animationDelay?: number;
  className?: string;
  renderAction?: (action: QuickAction) => React.ReactNode;
}

/**
 * QuickActions - Action list with icons and keyboard shortcuts
 * Features hover glow and gradient icons
 */
export function QuickActions({
  title = "Quick Actions",
  actions = defaultActions,
  animationDelay = 0,
  className,
  renderAction,
}: QuickActionsProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <GlassCard animationDelay={animationDelay} className={className}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-6 w-1 rounded-full bg-gradient-to-b from-[#375BBE] to-[#18E6C9]" />
        <h3 className="text-lg font-semibold text-[#375BBE]">{title}</h3>
      </div>

      {/* Actions list */}
      <div className="space-y-2">
        {actions.map((action, index) => {
          // Allow custom rendering for permission checks
          if (renderAction) {
            const rendered = renderAction(action);
            if (!rendered) return null;
            return (
              <ActionItem
                key={action.id}
                action={action}
                index={index}
                animationDelay={animationDelay}
                prefersReducedMotion={prefersReducedMotion}
              />
            );
          }

          return (
            <ActionItem
              key={action.id}
              action={action}
              index={index}
              animationDelay={animationDelay}
              prefersReducedMotion={prefersReducedMotion}
            />
          );
        })}
      </div>

      {/* Keyboard hint */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <p className="text-[11px] text-gray-500 flex items-center gap-2">
          <kbd className="px-1.5 py-0.5 bg-gray-100 rounded border border-gray-200 font-mono text-gray-600">
            ⌘K
          </kbd>
          <span>to open command palette</span>
        </p>
      </div>
    </GlassCard>
  );
}

interface ActionItemProps {
  action: QuickAction;
  index: number;
  animationDelay: number;
  prefersReducedMotion: boolean;
}

function ActionItem({
  action,
  index,
  animationDelay,
  prefersReducedMotion,
}: ActionItemProps) {
  const Icon = action.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        delay: animationDelay + index * 0.05,
        duration: prefersReducedMotion ? 0 : 0.3,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <Link href={action.href}>
        <motion.div
          className={cn(
            "group relative flex items-center gap-3 px-4 py-3 rounded-xl",
            "bg-gray-50 border border-gray-100",
            "hover:bg-[#375BBE]/5 hover:border-[#375BBE]/20",
            "transition-colors duration-200 cursor-pointer"
          )}
          whileHover={prefersReducedMotion ? {} : { x: 4 }}
          whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
        >
          {/* Icon */}
          <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-[#375BBE]/10 border border-[#375BBE]/20 group-hover:border-[#375BBE]/30 transition-colors">
            <Icon className="h-4 w-4 text-[#375BBE]" />
          </div>

          {/* Label */}
          <span className="flex-1 text-sm font-medium text-gray-700 group-hover:text-[#375BBE] transition-colors">
            {action.label}
          </span>

          {/* Shortcut */}
          {action.shortcut && (
            <kbd className="px-2 py-1 text-[10px] font-medium bg-gray-100 rounded border border-gray-200 text-gray-500 group-hover:text-[#375BBE] transition-colors">
              {action.shortcut}
            </kbd>
          )}

          {/* Hover glow */}
          <div className="absolute inset-0 rounded-xl bg-[#375BBE]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
        </motion.div>
      </Link>
    </motion.div>
  );
}

export default QuickActions;


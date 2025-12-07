import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

interface FilterOption {
  label: string;
  value: string;
}

interface FilterChipsProps {
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

/**
 * FilterChips - Animated pill-style filter selector
 * Features smooth active state transitions with gradient backgrounds
 */
export function FilterChips({
  options,
  value,
  onChange,
  className,
}: FilterChipsProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 p-1 rounded-xl bg-gray-100 border border-gray-200",
        className
      )}
    >
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative px-3 py-1.5 text-sm font-medium rounded-lg transition-colors duration-200",
              isActive ? "text-white" : "text-gray-500 hover:text-[#375BBE]"
            )}
          >
            {isActive && (
              <motion.div
                layoutId="filter-active-bg"
                className="absolute inset-0 rounded-lg bg-gradient-to-r from-[#375BBE] to-[#9B5CFF]"
                initial={false}
                transition={
                  prefersReducedMotion
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 500, damping: 35 }
                }
              />
            )}
            <span className="relative z-10">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// Preset filter options (for other views that may use this component)
export const periodOptions: FilterOption[] = [
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
  { label: "Quarter", value: "quarter" },
  { label: "Year", value: "year" },
];

export default FilterChips;


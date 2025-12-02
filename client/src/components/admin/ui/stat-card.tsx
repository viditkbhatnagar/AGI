import { motion } from "framer-motion";
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { GlassCard } from "./glass-card";
import { useEffect, useState, useRef } from "react";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: number | string;
  delta?: {
    value: number;
    isPositive: boolean;
  };
  subtitle?: string;
  sparklineData?: number[];
  animationDelay?: number;
  onClick?: () => void;
  className?: string;
  sparklineColor?: {
    line: string;
    gradient: [string, string];
    dot: string;
  };
}

/**
 * StatCard - Premium KPI card with glassmorphism, sparkline, and delta indicators
 * Features gradient icon chips, animated counters, and hover lift effects
 */
export function StatCard({
  icon: Icon,
  label,
  value,
  delta,
  subtitle,
  sparklineData = [],
  animationDelay = 0,
  onClick,
  className,
  sparklineColor,
}: StatCardProps) {
  const prefersReducedMotion = useReducedMotion();
  const [displayValue, setDisplayValue] = useState(0);
  const valueRef = useRef<number>(typeof value === "number" ? value : 0);

  // Animated counter effect
  useEffect(() => {
    if (typeof value !== "number" || prefersReducedMotion) {
      setDisplayValue(typeof value === "number" ? value : 0);
      return;
    }

    const duration = 700;
    const startTime = Date.now();
    const startValue = 0;
    const endValue = value;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function: cubic-bezier(0.22, 1, 0.36, 1)
      const eased = 1 - Math.pow(1 - progress, 3);
      
      const current = Math.round(startValue + (endValue - startValue) * eased);
      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    const timer = setTimeout(() => {
      requestAnimationFrame(animate);
    }, animationDelay * 1000);

    return () => clearTimeout(timer);
  }, [value, animationDelay, prefersReducedMotion]);

  // Get color scheme based on label or use provided colors
  const getColorScheme = () => {
    if (sparklineColor) return sparklineColor;
    
    // Default color schemes for different card types
    const colorMap: Record<string, { line: string; gradient: [string, string]; dot: string }> = {
      "Total Students": {
        line: "#3B82F6", // Vibrant blue
        gradient: ["#3B82F6", "#8B5CF6"], // Blue to purple
        dot: "#3B82F6"
      },
      "Total Courses": {
        line: "#10B981", // Emerald green
        gradient: ["#10B981", "#06B6D4"], // Green to cyan
        dot: "#10B981"
      },
      "Active Enrollments": {
        line: "#F59E0B", // Amber
        gradient: ["#F59E0B", "#EF4444"], // Amber to red
        dot: "#F59E0B"
      },
      "Upcoming Classes": {
        line: "#8B5CF6", // Purple
        gradient: ["#8B5CF6", "#EC4899"], // Purple to pink
        dot: "#8B5CF6"
      }
    };
    
    return colorMap[label] || {
      line: "#375BBE",
      gradient: ["#375BBE", "#9B5CFF"],
      dot: "#375BBE"
    };
  };

  // Sparkline rendering
  const renderSparkline = () => {
    if (!sparklineData.length) return null;

    const max = Math.max(...sparklineData);
    const min = Math.min(...sparklineData);
    const range = max - min || 1;
    const width = 80;
    const height = 32;
    const padding = 2;

    const points = sparklineData.map((val, i) => {
      const x = padding + (i / (sparklineData.length - 1)) * (width - padding * 2);
      const y = height - padding - ((val - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    });

    const pathD = `M ${points.join(" L ")}`;
    const areaD = `${pathD} L ${width - padding},${height - padding} L ${padding},${height - padding} Z`;
    
    const colors = getColorScheme();
    const gradientId = `sparkline-gradient-${label.replace(/\s+/g, "-")}`;

    return (
      <svg width={width} height={height} className="overflow-visible">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.gradient[0]} stopOpacity="0.4" />
            <stop offset="50%" stopColor={colors.gradient[1]} stopOpacity="0.2" />
            <stop offset="100%" stopColor={colors.gradient[1]} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d={areaD}
          fill={`url(#${gradientId})`}
          className="transition-all duration-500"
        />
        <path
          d={pathD}
          fill="none"
          stroke={colors.line}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-all duration-500"
          style={{ filter: `drop-shadow(0 0 2px ${colors.line}40)` }}
        />
        <circle
          cx={width - padding}
          cy={height - padding - ((sparklineData[sparklineData.length - 1] - min) / range) * (height - padding * 2)}
          r="3.5"
          fill={colors.dot}
          className="animate-pulse"
          style={{ filter: `drop-shadow(0 0 4px ${colors.dot})` }}
        />
      </svg>
    );
  };

  return (
    <GlassCard
      variant={onClick ? "interactive" : "default"}
      animationDelay={animationDelay}
      className={cn("group", className)}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Icon with gradient background */}
        <motion.div
          className="relative p-3 rounded-xl bg-gradient-to-br from-admin-brand/20 to-admin-accent/10 border border-admin-brand/20"
          whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
          transition={{ duration: 0.2 }}
        >
          <Icon className="h-5 w-5 text-admin-brand" />
          {/* Glow effect */}
          <div className="absolute inset-0 rounded-xl bg-admin-brand/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </motion.div>

        {/* Delta indicator */}
        {delta && (
          <div
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
              delta.isPositive
                ? "bg-admin-success/10 text-admin-success"
                : delta.value === 0
                ? "bg-admin-muted/10 text-admin-muted"
                : "bg-admin-danger/10 text-admin-danger"
            )}
          >
            {delta.isPositive ? (
              <TrendingUp className="h-3 w-3" />
            ) : delta.value === 0 ? (
              <Minus className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            <span>{Math.abs(delta.value)}%</span>
          </div>
        )}
      </div>

      <div className="mt-4 space-y-1">
        <p className="text-sm font-medium text-[#375BBE]">{label}</p>
        <p className="text-3xl font-bold text-[#1a1a2e] tracking-tight">
          {typeof value === "number" ? displayValue.toLocaleString() : value}
        </p>
        {subtitle && (
          <p className="text-xs text-gray-500">{subtitle}</p>
        )}
      </div>

      {/* Sparkline */}
      {sparklineData.length > 0 && (
        <div className="mt-4 flex items-end justify-between">
          <div className="flex-1">{renderSparkline()}</div>
          <span className="text-[10px] text-gray-400 ml-2">7d trend</span>
        </div>
      )}

      {/* View details CTA */}
      {onClick && (
        <div className="mt-4 pt-3 border-t border-gray-100">
          <span className="text-xs text-[#375BBE] font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            View details →
          </span>
        </div>
      )}
    </GlassCard>
  );
}

export default StatCard;


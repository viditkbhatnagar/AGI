import { motion } from "framer-motion";
import { GlassCard } from "../ui/glass-card";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useState } from "react";

interface BarData {
  name: string;
  value: number;
}

interface HorizontalBarsProps {
  title: string;
  badge?: string;
  data: BarData[];
  gradientColors?: [string, string];
  animationDelay?: number;
  className?: string;
}

/**
 * HorizontalBars - Gradient horizontal bars with reveal animation
 * Features rounded ends, hover tooltips, and animated grow-in
 */
export function HorizontalBars({
  title,
  badge,
  data,
  gradientColors = ["#1E8CFF", "#18E6C9"],
  animationDelay = 0,
  className,
}: HorizontalBarsProps) {
  const prefersReducedMotion = useReducedMotion();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  
  const maxValue = Math.max(...data.map((d) => d.value));
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <GlassCard animationDelay={animationDelay} className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="h-6 w-1 rounded-full bg-gradient-to-b from-[#375BBE] to-[#18E6C9]" />
          <h3 className="text-lg font-semibold text-[#375BBE]">{title}</h3>
          {badge && (
            <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-[#375BBE]/10 text-[#375BBE] border border-[#375BBE]/20">
              {badge}
            </span>
          )}
        </div>
      </div>

      {/* Bars */}
      <div className="space-y-4">
        {data.map((item, index) => {
          const percentage = (item.value / maxValue) * 100;
          const totalPercentage = ((item.value / total) * 100).toFixed(1);
          const isHovered = hoveredIndex === index;

          return (
            <motion.div
              key={item.name}
              className="group relative"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                delay: animationDelay + index * 0.08,
                duration: prefersReducedMotion ? 0 : 0.4,
                ease: [0.22, 1, 0.36, 1],
              }}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {/* Label row */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600 truncate max-w-[60%]">
                  {item.name}
                </span>
                <span className="text-sm font-medium text-[#1a1a2e]">
                  {item.value.toLocaleString()}
                  <span className="text-gray-400 ml-1">({totalPercentage}%)</span>
                </span>
              </div>

              {/* Bar */}
              <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{
                    background: `linear-gradient(90deg, ${gradientColors[0]}, ${gradientColors[1]})`,
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{
                    delay: animationDelay + index * 0.08 + 0.2,
                    duration: prefersReducedMotion ? 0 : 0.7,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                />
                
                {/* Glow effect on hover */}
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full opacity-0 group-hover:opacity-100"
                  style={{
                    width: `${percentage}%`,
                    background: `linear-gradient(90deg, ${gradientColors[0]}40, ${gradientColors[1]}40)`,
                    filter: "blur(8px)",
                  }}
                  transition={{ duration: 0.2 }}
                />
              </div>

              {/* Tooltip on hover */}
              {isHovered && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10"
                >
                  <p className="text-xs text-[#1a1a2e] whitespace-nowrap">
                    <span className="font-medium">{item.name}</span>: {item.value.toLocaleString()} enrollments
                  </p>
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-white border-r border-b border-gray-200" />
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>
    </GlassCard>
  );
}

export default HorizontalBars;


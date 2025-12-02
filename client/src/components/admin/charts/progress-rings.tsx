import { motion } from "framer-motion";
import { GlassCard } from "../ui/glass-card";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useEffect, useState } from "react";

interface ProgressRingData {
  label: string;
  percentage: number;
  count: number;
  color: string;
}

interface ProgressRingsProps {
  title: string;
  badge?: string;
  rings: ProgressRingData[];
  totalLabel?: string;
  total?: number;
  animationDelay?: number;
  className?: string;
}

/**
 * ProgressRings - Circular progress indicators with animated heads
 * Features count-up percentages and absolute numbers
 */
export function ProgressRings({
  title,
  badge,
  rings,
  totalLabel = "total enrollments",
  total,
  animationDelay = 0,
  className,
}: ProgressRingsProps) {
  const prefersReducedMotion = useReducedMotion();
  const computedTotal = total ?? rings.reduce((sum, r) => sum + r.count, 0);

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

      {/* Rings */}
      <div className="flex flex-wrap items-center justify-center gap-8 py-6">
        {rings.map((ring, index) => (
          <ProgressRing
            key={ring.label}
            {...ring}
            delay={animationDelay + index * 0.1}
            prefersReducedMotion={prefersReducedMotion}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-gray-500 pt-4 border-t border-gray-100">
        Based on {computedTotal.toLocaleString()} {totalLabel}
      </div>
    </GlassCard>
  );
}

interface ProgressRingProps extends ProgressRingData {
  delay: number;
  prefersReducedMotion: boolean;
  size?: number;
}

function ProgressRing({
  label,
  percentage,
  count,
  color,
  delay,
  prefersReducedMotion,
  size = 120,
}: ProgressRingProps) {
  const [displayPercentage, setDisplayPercentage] = useState(0);
  const [displayCount, setDisplayCount] = useState(0);

  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (displayPercentage / 100) * circumference;

  // Animated counter
  useEffect(() => {
    if (prefersReducedMotion) {
      setDisplayPercentage(percentage);
      setDisplayCount(count);
      return;
    }

    const duration = 700;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      setDisplayPercentage(Math.round(percentage * eased));
      setDisplayCount(Math.round(count * eased));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    const timer = setTimeout(() => {
      requestAnimationFrame(animate);
    }, delay * 1000);

    return () => clearTimeout(timer);
  }, [percentage, count, delay, prefersReducedMotion]);

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        {/* Background circle */}
        <svg
          width={size}
          height={size}
          className="transform -rotate-90"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(55, 91, 190, 0.1)"
            strokeWidth={strokeWidth}
          />
          {/* Progress circle */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={prefersReducedMotion ? circumference - (percentage / 100) * circumference : strokeDashoffset}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference - (percentage / 100) * circumference }}
            transition={{
              duration: prefersReducedMotion ? 0 : 0.7,
              delay: delay,
              ease: [0.22, 1, 0.36, 1],
            }}
            style={{
              filter: `drop-shadow(0 0 6px ${color}40)`,
            }}
          />
          {/* Animated head dot */}
          {!prefersReducedMotion && percentage > 0 && (
            <motion.circle
              cx={size / 2 + radius * Math.cos((Math.PI / 2) - (2 * Math.PI * percentage / 100))}
              cy={size / 2 - radius * Math.sin((Math.PI / 2) - (2 * Math.PI * percentage / 100))}
              r={strokeWidth / 2 + 2}
              fill={color}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: delay + 0.5, duration: 0.2 }}
              style={{
                filter: `drop-shadow(0 0 8px ${color})`,
              }}
            />
          )}
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold" style={{ color }}>
            {displayPercentage}%
          </span>
          <span className="text-xs text-gray-500">
            {displayCount.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Label */}
      <p className="mt-3 text-sm text-gray-600 text-center max-w-[100px]">
        {label}
      </p>
    </div>
  );
}

export default ProgressRings;


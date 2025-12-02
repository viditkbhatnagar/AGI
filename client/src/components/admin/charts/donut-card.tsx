import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { GlassCard } from "../ui/glass-card";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useEffect, useState } from "react";

interface DonutData {
  name: string;
  value: number;
}

interface DonutCardProps {
  title: string;
  badge?: string;
  data: DonutData[];
  colors?: string[];
  centerLabel?: string;
  centerValue?: string | number;
  animationDelay?: number;
  className?: string;
}

/**
 * DonutCard - Animated donut chart with gradient sweep
 * Features count-up center labels, segmented legend, and glass styling
 */
export function DonutCard({
  title,
  badge,
  data,
  colors = ["#1E8CFF", "#9B5CFF", "#18E6C9", "#FFC857"],
  centerLabel = "Total",
  centerValue,
  animationDelay = 0,
  className,
}: DonutCardProps) {
  const prefersReducedMotion = useReducedMotion();
  const [displayValue, setDisplayValue] = useState(0);
  
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const finalValue = centerValue !== undefined ? Number(centerValue) : total;

  // Animated counter for center value
  useEffect(() => {
    if (prefersReducedMotion) {
      setDisplayValue(finalValue);
      return;
    }

    const duration = 700;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(finalValue * eased);
      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    const timer = setTimeout(() => {
      requestAnimationFrame(animate);
    }, (animationDelay + 0.3) * 1000);

    return () => clearTimeout(timer);
  }, [finalValue, animationDelay, prefersReducedMotion]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;

    const item = payload[0];
    const percentage = ((item.value / total) * 100).toFixed(1);

    return (
      <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-lg">
        <div className="flex items-center gap-2 mb-1">
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: item.payload.fill }}
          />
          <span className="text-sm font-medium text-[#1a1a2e]">{item.name}</span>
        </div>
        <p className="text-lg font-semibold text-[#1a1a2e]">
          {item.value.toLocaleString()}
          <span className="text-sm text-gray-500 ml-1">({percentage}%)</span>
        </p>
      </div>
    );
  };

  return (
    <GlassCard animationDelay={animationDelay} className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="h-6 w-1 rounded-full bg-gradient-to-b from-[#375BBE] to-[#9B5CFF]" />
          <h3 className="text-lg font-semibold text-[#375BBE]">{title}</h3>
          {badge && (
            <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-[#375BBE]/10 text-[#375BBE] border border-[#375BBE]/20">
              {badge}
            </span>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="relative h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <defs>
              {colors.map((color, index) => (
                <linearGradient
                  key={index}
                  id={`donut-gradient-${index}`}
                  x1="0"
                  y1="0"
                  x2="1"
                  y2="1"
                >
                  <stop offset="0%" stopColor={color} stopOpacity={1} />
                  <stop offset="100%" stopColor={color} stopOpacity={0.7} />
                </linearGradient>
              ))}
            </defs>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={95}
              paddingAngle={3}
              dataKey="value"
              animationDuration={prefersReducedMotion ? 0 : 700}
              animationEasing="ease-out"
            >
              {data.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={`url(#donut-gradient-${index % colors.length})`}
                  stroke="transparent"
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <motion.span
            className="text-3xl font-bold text-[#375BBE]"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              delay: animationDelay + 0.3,
              duration: prefersReducedMotion ? 0 : 0.4,
            }}
          >
            {displayValue.toLocaleString()}
          </motion.span>
          <span className="text-xs text-gray-500 mt-1">{centerLabel}</span>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        {data.map((item, index) => {
          const percentage = ((item.value / total) * 100).toFixed(0);
          return (
            <div
              key={item.name}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-100"
            >
              <div
                className="h-3 w-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: colors[index % colors.length] }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 truncate">{item.name}</p>
                <p className="text-sm font-medium text-[#1a1a2e]">
                  {item.value}
                  <span className="text-gray-400 ml-1">({percentage}%)</span>
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}

export default DonutCard;


import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { GlassCard } from "../ui/glass-card";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

interface DataPoint {
  name: string;
  value: number;
  [key: string]: string | number;
}

interface AreaChartCardProps {
  title: string;
  badge?: string;
  data: DataPoint[];
  dataKey?: string;
  gradientColors?: [string, string];
  animationDelay?: number;
  className?: string;
}

/**
 * AreaChartCard - Themed area chart with gradient fill and glass tooltip
 * Features soft blue gradients, dotted grid, and animated entry
 */
export function AreaChartCard({
  title,
  badge,
  data,
  dataKey = "value",
  gradientColors = ["#1E8CFF", "#9B5CFF"],
  animationDelay = 0,
  className,
}: AreaChartCardProps) {
  const prefersReducedMotion = useReducedMotion();
  const gradientId = `area-gradient-${title.replace(/\s+/g, "-")}`;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;

    return (
      <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-lg">
        <p className="text-xs text-gray-500 mb-1">{label}</p>
        <p className="text-lg font-semibold text-[#1a1a2e]">
          {payload[0].value.toLocaleString()}
        </p>
      </div>
    );
  };

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

      {/* Chart */}
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={gradientColors[0]} stopOpacity={0.4} />
                <stop offset="50%" stopColor={gradientColors[1]} stopOpacity={0.2} />
                <stop offset="100%" stopColor={gradientColors[1]} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(55, 91, 190, 0.1)"
              vertical={false}
            />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#6B7280", fontSize: 12 }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#6B7280", fontSize: 12 }}
              dx={-10}
              tickFormatter={(value) => value.toLocaleString()}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={gradientColors[0]}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              animationDuration={prefersReducedMotion ? 0 : 700}
              animationEasing="ease-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  );
}

export default AreaChartCard;


import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from "recharts";
import { GlassCard } from "../ui/glass-card";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

interface BarStackData {
  name: string;
  [key: string]: string | number;
}

interface BarStackCardProps {
  title: string;
  badge?: string;
  data: BarStackData[];
  dataKeys: string[];
  colors?: string[];
  layout?: "horizontal" | "vertical";
  animationDelay?: number;
  className?: string;
}

/**
 * BarStackCard - Stacked bar chart with gradient fills
 * Features animated grow-in, glass tooltips, and dotted grid
 */
export function BarStackCard({
  title,
  badge,
  data,
  dataKeys,
  colors = ["#6B7280", "#FFC857", "#18E6C9"],
  layout = "horizontal",
  animationDelay = 0,
  className,
}: BarStackCardProps) {
  const prefersReducedMotion = useReducedMotion();

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;

    const total = payload.reduce((sum: number, entry: any) => sum + entry.value, 0);

    return (
      <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-lg min-w-[160px]">
        <p className="text-sm font-medium text-[#1a1a2e] mb-2 border-b border-gray-100 pb-2">
          {label}
        </p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-4 py-1">
            <div className="flex items-center gap-2">
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: entry.fill }}
              />
              <span className="text-xs text-gray-600 capitalize">
                {entry.dataKey.replace(/([A-Z])/g, " $1").trim()}
              </span>
            </div>
            <span className="text-xs font-medium text-[#1a1a2e]">
              {entry.value} ({Math.round((entry.value / total) * 100)}%)
            </span>
          </div>
        ))}
        <div className="flex items-center justify-between gap-4 pt-2 mt-2 border-t border-gray-100">
          <span className="text-xs text-gray-500">Total</span>
          <span className="text-sm font-semibold text-[#1a1a2e]">{total}</span>
        </div>
      </div>
    );
  };

  const legendLabels: Record<string, string> = {
    notStarted: "Not Started",
    inProgress: "In Progress",
    completed: "Completed",
  };

  const CustomLegend = ({ payload }: any) => (
    <div className="flex items-center justify-center gap-6 mt-4">
      {payload?.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-2">
          <div
            className="h-3 w-3 rounded"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-xs text-gray-600">
            {legendLabels[entry.value] || entry.value}
          </span>
        </div>
      ))}
    </div>
  );

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
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout={layout}
            margin={{ top: 10, right: 10, left: layout === "vertical" ? 80 : 0, bottom: 10 }}
          >
            <defs>
              {colors.map((color, index) => (
                <linearGradient
                  key={index}
                  id={`bar-gradient-${index}`}
                  x1="0"
                  y1="0"
                  x2={layout === "vertical" ? "1" : "0"}
                  y2={layout === "vertical" ? "0" : "1"}
                >
                  <stop offset="0%" stopColor={color} stopOpacity={0.9} />
                  <stop offset="100%" stopColor={color} stopOpacity={0.6} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(55, 91, 190, 0.1)"
              horizontal={layout === "horizontal"}
              vertical={layout === "vertical"}
            />
            {layout === "horizontal" ? (
              <>
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#6B7280", fontSize: 11 }}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#6B7280", fontSize: 12 }}
                />
              </>
            ) : (
              <>
                <XAxis
                  type="number"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#6B7280", fontSize: 12 }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#6B7280", fontSize: 11 }}
                  width={75}
                />
              </>
            )}
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(55, 91, 190, 0.05)" }} />
            <Legend content={<CustomLegend />} />
            {dataKeys.map((key, index) => (
              <Bar
                key={key}
                dataKey={key}
                stackId="stack"
                fill={`url(#bar-gradient-${index})`}
                radius={index === dataKeys.length - 1 ? [4, 4, 0, 0] : 0}
                animationDuration={prefersReducedMotion ? 0 : 700}
                animationEasing="ease-out"
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  );
}

export default BarStackCard;


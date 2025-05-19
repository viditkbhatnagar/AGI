import { Card, CardContent } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useMemo } from "react";

const COLORS = [ "#A8D5E2", "#E2A8C6", "#F2D388", "#B8E986", "#D4A5A5", "#D8C1A5", "#C5D8A4", "#B1A8E2", "#E2C1A8", "#A8E2B8" ];

type Props = { modules: { title: string; percentComplete: number }[] };

// Custom Y-axis tick: truncate long names and show full text on hover
const AdaptiveTick = (props: any) => {
  const { x, y, payload } = props;
  const text: string = payload.value;

  // Truncate if longer than 35 characters
  const MAX = 35;
  const display = text.length > MAX ? text.slice(0, MAX) + "…" : text;

  // Slightly reduce font size for anything > 25 chars
  const fontSize = text.length > 25 ? 12 : 14;

  return (
    <text
      x={x}
      y={y}
      dy={3}
      textAnchor="end"
      fill="#374151"
      fontSize={fontSize}
    >
      <title>{text}</title> {/* tooltip with full title */}
      {display}
    </text>
  );
};

export default function ModuleBreakdown({ modules }: Props) {
  const data = useMemo(() =>
    modules.map((m, i) => ({
      name: m.title,
      value: m.percentComplete,
      fill: COLORS[i % COLORS.length]
    })),
    [modules]
  );
  // Dynamic height: ~34 px per bar, with a sensible minimum
  const chartHeight = Math.max(modules.length * 34, 200);

  return (
    <Card className="shadow-sm hover:shadow-lg transition-shadow mb-6">
      <div className="px-5 py-4 border-b"><h2 className="text-lg font-medium">Module Progress</h2></div>
      <CardContent>
        <div className="overflow-x-auto pb-2">
          <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 20, right: 40, left: 0, bottom: 20 }}
          >
            <XAxis type="number" domain={[0, 'dataMax']} hide />
            <YAxis
              type="category"
              dataKey="name"
              width={250}
              tick={<AdaptiveTick />}
            />
            <Tooltip formatter={(v: number) => `${v}%`} />
            <Bar dataKey="value" radius={[0, 5, 5, 0]} barSize={24} isAnimationActive={false}>
              {data.map((entry, idx) => (
                <Cell key={`cell-${idx}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
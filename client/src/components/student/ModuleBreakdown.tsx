import { Card, CardContent } from "@/components/ui/card";
import { PieChart, Pie, ResponsiveContainer, Cell } from "recharts";
import { useMemo } from "react";
// Soft‑mint text color (formerly imported from "@/lib/colors")
const SOFT_LILAC = "#B2E0D6";

type Props = { modules: { title: string; percentComplete: number }[] };

export default function ModuleBreakdown({ modules }: Props) {
  // 👉 Guard for empty data
  if (modules.length === 0) {
    return (
      <Card className="shadow-sm mb-6 rounded-2xl bg-[#FEFDF7] text-[#2E3A59]">
        <div className="sticky top-0 z-10 px-5 py-4 rounded-t-2xl bg-[#375BBE]">
          <h2 className="text-2xl font-semibold text-white">Module Wise Progress</h2>
        </div>
        <CardContent className="py-12 flex items-center justify-center">
          <span className="text-sm">No module progress data yet</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm mb-6 rounded-2xl bg-[#FEFDF7] text-[#2E3A59]">
      {/* Gradient header for Module Progress */}
      <div className="sticky top-0 z-10 px-5 py-4 rounded-t-2xl bg-[#375BBE]">
        <h2 className="text-2xl font-semibold text-white">Module Wise Progress</h2>
      </div>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 bg-[#FEFDF7]">
        {modules.map((m, idx) => {
          // determine color by percentage
          let fillColor = "#E63946";        // <50%
          if (m.percentComplete >= 75) fillColor = "#5BC0EB";
          else if (m.percentComplete >= 50) fillColor = "#FF7F50";
          return (
            <div key={idx} className="flex items-center space-x-4">
              <PieChart width={120} height={120}>
                <Pie
                  data={[
                    { value: m.percentComplete },
                    { value: 100 - m.percentComplete }
                  ]}
                  dataKey="value"
                  startAngle={90}
                  endAngle={-270}
                  innerRadius={40}
                  outerRadius={50}
                >
                  <Cell fill={fillColor} />
                  <Cell fill="#E5E5E5" />
                </Pie>
                <text
                  x={60}
                  y={60}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-lg font-semibold fill-[#2E3A59]"
                >
                  {m.percentComplete}%
                </text>
              </PieChart>
              <div className="text-base text-[#375BBE] w-40 break-words">
                {m.title}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
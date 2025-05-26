import { Card, CardContent } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
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

  const data = useMemo(() =>
    modules.map((m) => ({
      name: m.title,
      value: m.percentComplete,
    })),
    [modules]
  );
  // Give each bar a little more vertical space so the chart
  // visually fills the card. 56 px per bar keeps the labels
  // readable and eliminates the large empty area at the bottom.
  const chartHeight = Math.max(modules.length * 56, 300);

  return (
    <Card className="shadow-sm mb-6 rounded-2xl bg-[#FEFDF7] text-[#2E3A59]">
      {/* Gradient header for Module Progress */}
      <div className="sticky top-0 z-10 px-5 py-4 rounded-t-2xl bg-[#375BBE]">
        <h2 className="text-2xl font-semibold text-white">Module Wise Progress</h2>
      </div>
      <CardContent className="p-0 flex justify-center items-center">
        <div className="w-full py-6">
          <div className="overflow-x-auto">
            <ResponsiveContainer width="100%" height={chartHeight}>
              <BarChart
                data={data}
                layout="vertical"
                margin={{ top: 0, right: 40, left: 0, bottom: 0 }}
              >
                <XAxis type="number" domain={[0, 'dataMax']} hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={280}
                  tickLine={false}
                  tickMargin={8}
                  tick={{ fill: "#2E3A59", fontSize: 14 }}
                  tickFormatter={(value: string) =>
                    value.length > 35 ? value.slice(0, 35) + "…" : value
                  }
                />
                <Tooltip formatter={(v: number) => `${v}%`} contentStyle={{ backgroundColor: '#36454F', color: '#B2E0D6', borderRadius: 8 }} />
                <Bar radius={[0,4,4,0]} barSize={24} dataKey="value" isAnimationActive={false}>
                  {data.map((entry, idx) => {
                    let color = "#E63946"; // alert <50
                    if (entry.value >= 75) color = "#5BC0EB"; // cool
                    else if (entry.value >= 50) color = "#FF7F50"; // warm
                    return <Cell key={idx} fill={color} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
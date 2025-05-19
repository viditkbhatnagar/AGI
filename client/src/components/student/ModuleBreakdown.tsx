import { Card, CardContent } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useMemo } from "react";

const COLORS = [ "#A8D5E2", "#E2A8C6", "#F2D388", "#B8E986", "#D4A5A5", "#D8C1A5", "#C5D8A4", "#B1A8E2", "#E2C1A8", "#A8E2B8" ];

type Props = { modules: { title: string; percentComplete: number }[] };

export default function ModuleBreakdown({ modules }: Props) {
  const data = useMemo(() =>
    modules.map((m, i) => ({
      name: m.title,
      value: m.percentComplete,
      fill: COLORS[i % COLORS.length]
    })),
    [modules]
  );

  return (
    <Card className="shadow-sm hover:shadow-lg transition-shadow mb-6">
      <div className="px-5 py-4 border-b"><h2 className="text-lg font-medium">Module Progress</h2></div>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
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
              tick={{
                fontSize: 14,
                fill: "#374151"
              }}
            />
            <Tooltip formatter={(v: number) => `${v}%`} />
            <Bar dataKey="value" radius={[0, 5, 5, 0]} barSize={20} isAnimationActive={false}>
              {data.map((entry, idx) => (
                <Cell key={`cell-${idx}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
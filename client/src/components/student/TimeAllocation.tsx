// client/src/components/student/TimeAllocation.tsx
import { Card, CardContent } from "@/components/ui/card";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

type Slice = { name: string; value: number };
type Props = { data: Slice[] };

const COLORS = ["#3b82f6", "#10b981", "#f59e0b"];

export default function TimeAllocation({ data }: Props) {
  return (
    <Card className="shadow-sm hover:shadow-lg transition-shadow mb-6 p-4 sm:p-6">
      <div className="px-5 py-4 border-b">
        <h2 className="text-md sm:text-lg font-medium">
          Time Allocation to Documents and Quizzes
        </h2>
      </div>
      <CardContent>
        <div className="flex flex-col sm:flex-row items-center justify-around gap-4">
          <div className="text-center">
            <div className="font-semibold">{data[0]?.name}</div>
            <div className="mb-2">{data[0]?.value}m</div>
          </div>
          <div className="w-40 h-40 sm:w-56 sm:h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label={({ percent }) => `${Math.round(percent * 100)}%`} labelLine={false}>
                  {data.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(value: number, name: string, props) => {
                  const percent = props.payload.value / data.reduce((sum, d) => sum + d.value, 0) * 100;
                  return [`${value}m (${Math.round(percent)}%)`, name];
                }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="text-center">
            <div className="font-semibold">{data[1]?.name}</div>
            <div className="mb-2">{data[1]?.value}m</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
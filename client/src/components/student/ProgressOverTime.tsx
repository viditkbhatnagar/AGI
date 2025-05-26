// components/student/ProgressOverTime.tsx
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function ProgressOverTime({ dates }: { dates: { date: string; percent: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart
        data={dates}
        margin={{ top: 20, right: 20, bottom: 0, left: 40 }}
      >
        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
        <YAxis width={35} domain={[0, 100]} tickFormatter={(v) => v + '%'} />
        <Tooltip formatter={(v: number) => v + '%'} />
        <Line
          type="monotone"
          dataKey="percent"
          stroke="#5BC0EB"
          strokeWidth={3}
          dot={{ r: 3 }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
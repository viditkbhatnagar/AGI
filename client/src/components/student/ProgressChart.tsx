// client/src/components/student/ProgressChart.tsx
import React from 'react';
// Make sure to install recharts: `npm install recharts`
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

export interface DailyWatch {
  date: string;     // e.g. '2025-05-12'
  minutes: number;  // total minutes watched on that date
}

interface ProgressChartProps {
  data: DailyWatch[];
}

export default function ProgressChart({ data }: ProgressChartProps) {
  // Calculate a base width so each data point gets ~40 px.
  const baseWidth = Math.max(data.length * 40, 400); // at least 400 px

  return (
    <div className="overflow-x-auto pb-2">
      <ResponsiveContainer width={baseWidth} height={200}>
        <AreaChart
          data={data}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            interval="preserveStartEnd"
            tick={{ fontSize: 12, fill: '#4B5563' }}
            tickFormatter={(str) => {
              const [year, month, day] = str.split('-');
              return `${month}/${day}`;
            }}
          />
          <YAxis
            domain={[0, 'dataMax']}
            tick={{ fontSize: 12, fill: '#4B5563' }}
            tickFormatter={(n) => `${n}m`}
          />
          <Tooltip formatter={(value: number) => `${value} minutes`} />
          <Area
            type="monotone"
            dataKey="minutes"
            stroke="#4F46E5"
            fill="#E0E7FF"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
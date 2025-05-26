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

interface WatchTime {
  thisWeek: number;
  total: number;
}

interface ProgressChartProps {
  data: DailyWatch[];
  watchTime: WatchTime;
}

export default function ProgressChart({ data, watchTime }: ProgressChartProps) {
  return (
    <div className="shadow-sm rounded-2xl mb-6 overflow-hidden bg-[#FEFDF7] text-[#2E3A59]">
      <div className="p-4 flex flex-col space-y-4">
        <div className="overflow-x-auto w-full">
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart
              data={data}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                interval="preserveStartEnd"
                tick={{ fontSize: 12, fill: '#2E3A59' }}
                tickFormatter={(str) => {
                  const [year, month, day] = str.split('-');
                  return `${month}/${day}`;
                }}
              />
              <YAxis
                domain={[0, 'dataMax']}
                tick={{ fontSize: 12, fill: '#2E3A59' }}
                tickFormatter={(n) => `${n}m`}
              />
              <Tooltip formatter={(value: number) => `${value} minutes`} contentStyle={{ backgroundColor: '#FEFDF7', color: '#375BBE' }} />
              <Area
                type="monotone"
                dataKey="minutes"
                stroke="#5BC0EB"
                fill="#5BC0EB"
                fillOpacity={0.3}
                strokeWidth={3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
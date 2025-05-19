import React from 'react';
// Make sure you’ve installed recharts: npm install recharts
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';

export interface QuizScore {
  title: string;   // quiz/module title
  score: number;   // best score (0–100)
}

interface QuizScoresChartProps {
  data: QuizScore[];
}

// A simple palette for slices
const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#3B82F6'];

export default function QuizScoresChart({ data }: QuizScoresChartProps) {
  if (!data || data.length === 0) {
    return <p className="text-center text-gray-500">No quiz data available.</p>;
  }

  // Ensure enough horizontal space so legend and slices don't crowd on mobile
  const baseWidth = Math.max(data.length * 120, 320); // at least 320 px

  return (
    <div className="overflow-x-auto pb-2">
      <ResponsiveContainer width={baseWidth} height={250}>
        <PieChart>
          <Pie
            data={data}
            dataKey="score"
            nameKey="title"
            cx="50%"
            cy="50%"
            outerRadius={80}
            label={({ name, percent }) =>
              `${name}: ${Math.round(percent * 100)}%`
            }
          >
            {data.map((entry, index) => (
              <Cell
                key={entry.title}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => `${value}%`}
            wrapperStyle={{ outline: 'none' }}
          />
          <Legend
            layout="horizontal"
            verticalAlign="bottom"
            align="center"
            iconType="circle"
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
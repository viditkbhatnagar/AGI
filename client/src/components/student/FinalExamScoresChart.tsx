import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface FinalExamScore {
  attemptNumber: number;
  score: number;
  percentage: number;
  passed: boolean;
  attemptedAt: string;
}

interface FinalExamScoresChartProps {
  data: FinalExamScore[];
  passingScore: number;
}

export default function FinalExamScoresChart({ data, passingScore }: FinalExamScoresChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Final Examination Attempts</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-500">No final exam attempts yet.</p>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map(attempt => ({
    attempt: `Attempt ${attempt.attemptNumber}`,
    score: attempt.percentage,
    date: new Date(attempt.attemptedAt).toLocaleDateString()
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const attemptData = data.find(d => `Attempt ${d.attemptNumber}` === label);
      return (
        <div className="bg-white p-3 border rounded shadow-lg">
          <p className="font-semibold">{label}</p>
          <p className="text-sm">Score: {payload[0].value}%</p>
          <p className="text-sm">Date: {attemptData?.attemptedAt ? new Date(attemptData.attemptedAt).toLocaleDateString() : ''}</p>
          <p className="text-sm font-medium" style={{ color: attemptData?.passed ? '#10B981' : '#EF4444' }}>
            {attemptData?.passed ? 'Passed' : 'Failed'}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Final Examination Attempts</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="attempt" />
            <YAxis domain={[0, 100]} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <ReferenceLine 
              y={passingScore} 
              stroke="#EF4444" 
              strokeDasharray="5 5" 
              label={{ value: `Passing Score (${passingScore}%)`, position: 'right' }}
            />
            <Bar 
              dataKey="score" 
              fill="#3B82F6"
              name="Score (%)"
              radius={[8, 8, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
        
        {/* Summary Stats */}
        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-sm text-gray-500">Best Score</p>
            <p className="text-xl font-bold text-green-600">
              {Math.max(...data.map(d => d.percentage))}%
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Attempts Used</p>
            <p className="text-xl font-bold">
              {data.length}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Status</p>
            <p className="text-xl font-bold" style={{ color: data.some(d => d.passed) ? '#10B981' : '#EF4444' }}>
              {data.some(d => d.passed) ? 'Passed' : 'Not Passed'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 
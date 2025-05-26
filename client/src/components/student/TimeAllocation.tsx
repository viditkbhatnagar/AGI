// src/components/student/TimeAllocation.tsx
import React from "react";
import {
  Card,
  CardContent
} from "@/components/ui/card";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";

interface TimeAllocationProps {
  data: { name: string; value: number }[];
}

export default function TimeAllocation({ data }: TimeAllocationProps) {
  return (
    <Card className="rounded-lg shadow overflow-hidden">
      {/* Header */}
      <div
        className="bg-[#375BBE] text-white font-bold text-[18px] font-inter px-4 py-3"
      >
        Time Allocation to Documents and Quizzes
      </div>

      {/* Content Area */}
      <CardContent className="bg-[#FEFDF7] p-6">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={60}
              outerRadius={80}
              label={({ percent }) =>
                `${(percent * 100).toFixed(0)}%`
              }
              labelLine={false}
            >
              {data.map((entry, idx) => (
                <Cell
                  key={entry.name}
                  fill={
                    idx === 0
                      ? "#FF7F50" // warm accent for docs
                      : "#5BC0EB" // cool accent for quizzes
                  }
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Summary Labels */}
        <div className="mt-6 flex justify-between text-[#2E3A59]">
          <div className="text-center">
            <p className="font-medium">Total time previews</p>
            <p className="text-[20px] font-bold text-[#FF7F50]">
              {data[0].value}m
            </p>
          </div>
          <div className="text-center">
            <p className="font-medium">Total quiz time</p>
            <p className="text-[20px] font-bold text-[#5BC0EB]">
              {data[1].value}m
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
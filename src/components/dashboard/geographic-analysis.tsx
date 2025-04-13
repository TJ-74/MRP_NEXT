'use client';

import { Pie, PieChart, ResponsiveContainer, Cell } from "recharts";

const geographicData = [
  { name: "Northeast", value: 4000 },
  { name: "Southeast", value: 3000 },
  { name: "Midwest", value: 2000 },
  { name: "Southwest", value: 2780 },
  { name: "West", value: 1890 },
];

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

export function GeographicAnalysis() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-[300px]">
          <h3 className="text-lg font-medium mb-4">Cost Distribution by Region</h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={geographicData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {geographicData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Regional Cost Breakdown</h3>
          <div className="space-y-2">
            {geographicData.map((region, index) => (
              <div key={region.name} className="flex items-center space-x-2">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="flex-1">{region.name}</span>
                <span className="font-medium">${region.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 
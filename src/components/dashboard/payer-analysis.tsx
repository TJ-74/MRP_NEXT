'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts";

const payerData = [
  {
    name: "Medicare",
    covered: 85,
    uncovered: 15,
  },
  {
    name: "Medicaid",
    covered: 75,
    uncovered: 25,
  },
  {
    name: "Private A",
    covered: 90,
    uncovered: 10,
  },
  {
    name: "Private B",
    covered: 80,
    uncovered: 20,
  },
  {
    name: "Self-Pay",
    covered: 0,
    uncovered: 100,
  },
];

export function PayerAnalysis() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-[300px]">
          <h3 className="text-lg font-medium mb-4">Coverage by Payer</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={payerData}>
              <XAxis dataKey="name" />
              <YAxis />
              <Bar dataKey="covered" fill="#8884d8" name="Covered" />
              <Bar dataKey="uncovered" fill="#82ca9d" name="Uncovered" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="h-[300px]">
          <h3 className="text-lg font-medium mb-4">Payer Statistics</h3>
          <div className="space-y-4">
            {payerData.map((payer) => (
              <div key={payer.name} className="space-y-2">
                <div className="flex justify-between">
                  <span>{payer.name}</span>
                  <span>{payer.covered}% covered</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full">
                  <div
                    className="h-2 bg-blue-500 rounded-full"
                    style={{ width: `${payer.covered}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 
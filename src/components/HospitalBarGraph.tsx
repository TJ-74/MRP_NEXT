import React from 'react';
import { ResponsiveBar } from '@nivo/bar';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Hospital {
  id: string;
  name: string;
  price: number;
}

interface HospitalBarGraphProps {
  hospitals: Hospital[];
  onClose: () => void;
  isOpen: boolean;
}

export function HospitalBarGraph({ hospitals, onClose, isOpen }: HospitalBarGraphProps) {
  if (!isOpen) return null;

  // Get unique hospitals by name and sort by price
  const uniqueHospitals = hospitals.reduce((acc, hospital) => {
    if (!acc.find(h => h.name === hospital.name)) {
      acc.push(hospital);
    }
    return acc;
  }, [] as Hospital[]).sort((a, b) => a.price - b.price);

  const data = uniqueHospitals.map(hospital => ({
    hospital: hospital.name,
    price: hospital.price
  }));

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg shadow-xl w-[90vw] max-w-6xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Hospital Base Prices</h2>
          <Button
            onClick={onClose}
            className="h-8 w-8 p-0 rounded-full hover:bg-gray-700"
          >
            <X size={16} />
          </Button>
        </div>
        <div className="p-6 flex-1 min-h-[500px]">
          <div className="w-full h-full">
            <ResponsiveBar
              data={data}
              keys={['price']}
              indexBy="hospital"
              margin={{ top: 50, right: 50, bottom: 100, left: 60 }}
              padding={0.3}
              valueScale={{ type: 'linear' }}
              colors={{ scheme: 'category10' }}
              theme={{
                axis: {
                  ticks: {
                    text: {
                      fill: '#D1D5DB'
                    }
                  },
                  legend: {
                    text: {
                      fill: '#D1D5DB'
                    }
                  }
                },
                grid: {
                  line: {
                    stroke: '#374151'
                  }
                },
                tooltip: {
                  container: {
                    background: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '0.5rem',
                    color: '#F3F4F6'
                  }
                }
              }}
              axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                format: value => `$${value.toLocaleString()}`
              }}
              axisBottom={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: -45,
                format: value => value.length > 20 ? value.substring(0, 20) + '...' : value
              }}
              labelSkipWidth={12}
              labelSkipHeight={12}
              labelTextColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
              animate={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
} 
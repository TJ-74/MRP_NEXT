import React, { useState } from 'react';
import { X, Play } from 'lucide-react';

interface SqlQueryWindowProps {
  query: string;
  onExecute: (query: string) => void;
  onClose: () => void;
}

export default function SqlQueryWindow({ query, onExecute, onClose }: SqlQueryWindowProps) {
  const [isExecuting, setIsExecuting] = useState(false);

  const handleExecute = async () => {
    setIsExecuting(true);
    try {
      await onExecute(query);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="relative bg-gray-800 rounded-lg p-4 mb-4 border border-gray-700">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-medium text-gray-300">SQL Query</h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleExecute}
            disabled={isExecuting}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
          >
            <Play size={14} />
            <span>{isExecuting ? 'Executing...' : 'Execute'}</span>
          </button>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>
      
      <div className="font-mono text-sm text-gray-300 bg-gray-900 p-3 rounded-md overflow-x-auto">
        {query}
      </div>
    </div>
  );
} 
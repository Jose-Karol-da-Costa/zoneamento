import React from 'react';
import { MapPin } from 'lucide-react';

interface StatsProps {
  totalMarkers: number;
  selectedMarkers: number;
}

export function Stats({ totalMarkers, selectedMarkers }: StatsProps) {
  return (
    <div className="absolute bottom-4 left-4 z-[1000] flex gap-4">
      <div className="bg-white rounded-lg shadow-md px-4 py-2 flex items-center gap-2">
        <MapPin className="w-4 h-4 text-gray-600" />
        <span className="text-sm font-medium text-gray-700">
          Total: {totalMarkers}
        </span>
      </div>
      <div className="bg-white rounded-lg shadow-md px-4 py-2 flex items-center gap-2">
        <MapPin className="w-4 h-4 text-blue-600" />
        <span className="text-sm font-medium text-gray-700">
          Selected: {selectedMarkers}
        </span>
      </div>
    </div>
  );
}
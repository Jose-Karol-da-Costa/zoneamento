import React, { useState } from 'react';
import { Image } from 'lucide-react';

interface IconEditorProps {
  selectedMarkers: string[];
  onUpdateIcons: (iconUrl: string) => void;
}

export function IconEditor({ selectedMarkers, onUpdateIcons }: IconEditorProps) {
  const [iconUrl, setIconUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (iconUrl.trim()) {
      onUpdateIcons(iconUrl.trim());
      setIconUrl('');
    }
  };

  if (selectedMarkers.length === 0) return null;

  return (
    <div className="absolute bottom-24 left-4 z-[1000] bg-white rounded-lg shadow-md p-4">
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <Image className="w-5 h-5 text-gray-600" />
        <input
          type="url"
          value={iconUrl}
          onChange={(e) => setIconUrl(e.target.value)}
          placeholder="Enter icon URL"
          className="text-sm px-3 py-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
        >
          Update
        </button>
      </form>
    </div>
  );
}
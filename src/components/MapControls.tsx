import React, { useState } from 'react';
import { MapPin, Route, Download, Trash2 } from 'lucide-react';
import { MapMarker } from '../types';
import * as togpx from 'togpx';
import * as tokml from 'tokml';
import JSZip from 'jszip';

interface MapControlsProps {
  selectedMarkers: MapMarker[];
  onToggleDrawing: () => void;
  onOptimizeRoute: (startMarkerId: string | null) => void;
  onExport: () => void;
  onDelete: () => void;
  isDrawing: boolean;
}

export function MapControls({
  selectedMarkers,
  onToggleDrawing,
  onOptimizeRoute,
  onExport,
  onDelete,
  isDrawing
}: MapControlsProps) {
  const [selectingStart, setSelectingStart] = useState(false);
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [exportFormat, setExportFormat] = useState<string>('csv');

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete ${selectedMarkers.length} selected marker${selectedMarkers.length === 1 ? '' : 's'}?`)) {
      onDelete();
    }
  };

  const handleOptimizeRoute = () => {
    if (selectingStart) {
      setSelectingStart(false);
      onOptimizeRoute(null);
    } else {
      setSelectingStart(true);
      alert('Click on a marker to set it as the starting point');
    }
  };

  const exportData = async () => {
    setExportProgress(0);
    const geojson = {
      type: 'FeatureCollection',
      features: selectedMarkers.map(marker => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [marker.longitude, marker.latitude]
        },
        properties: {
          name: marker.name,
          icon: marker.icon,
          ...Object.fromEntries(
            Object.entries(marker).filter(([key]) => 
              !['id', 'latitude', 'longitude'].includes(key)
            )
          )
        }
      }))
    };

    let content: string | Blob;
    let filename: string;
    let type: string;

    try {
      setExportProgress(25);

      switch (exportFormat) {
        case 'csv':
          content = selectedMarkers
            .map(marker => Object.values(marker).join(','))
            .join('\n');
          filename = 'markers.csv';
          type = 'text/csv';
          break;

        case 'json':
          content = JSON.stringify(geojson, null, 2);
          filename = 'markers.json';
          type = 'application/json';
          break;

        case 'gpx':
          content = togpx(geojson);
          filename = 'markers.gpx';
          type = 'application/gpx+xml';
          break;

        case 'kml':
          content = tokml(geojson);
          filename = 'markers.kml';
          type = 'application/vnd.google-earth.kml+xml';
          break;

        case 'kmz':
          const zip = new JSZip();
          const kml = tokml(geojson);
          zip.file('doc.kml', kml);
          content = await zip.generateAsync({ type: 'blob' });
          filename = 'markers.kmz';
          type = 'application/vnd.google-earth.kmz';
          break;

        default:
          throw new Error('Unsupported format');
      }

      setExportProgress(75);

      const blob = content instanceof Blob ? content : new Blob([content], { type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportProgress(100);
      setTimeout(() => setExportProgress(0), 1000);
    } catch (error) {
      console.error('Export failed:', error);
      setExportProgress(0);
    }
  };

  return (
    <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
      <button
        onClick={onToggleDrawing}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-md transition-colors ${
          isDrawing
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : 'bg-white text-gray-700 hover:bg-gray-50'
        }`}
      >
        <MapPin className="w-5 h-5" />
        <span className="text-sm font-medium">
          {isDrawing ? 'Drawing...' : 'Select Area'}
        </span>
      </button>

      <button
        onClick={handleDelete}
        disabled={selectedMarkers.length === 0}
        className={`flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-md transition-colors ${
          selectedMarkers.length === 0
            ? 'opacity-50 cursor-not-allowed'
            : 'hover:bg-red-50'
        }`}
      >
        <Trash2 className="w-5 h-5 text-red-600" />
        <span className="text-sm font-medium text-gray-700">Delete Selected</span>
      </button>

      <button
        onClick={handleOptimizeRoute}
        disabled={selectedMarkers.length < 2}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-md transition-colors ${
          selectingStart
            ? 'bg-green-600 text-white hover:bg-green-700'
            : 'bg-white text-gray-700 hover:bg-gray-50'
        } ${
          selectedMarkers.length < 2
            ? 'opacity-50 cursor-not-allowed'
            : ''
        }`}
      >
        <Route className="w-5 h-5" />
        <span className="text-sm font-medium">
          {selectingStart ? 'Select Start Point' : 'Optimize Route'}
        </span>
      </button>

      <div className="flex flex-col gap-2 bg-white rounded-lg shadow-md p-2">
        <select
          value={exportFormat}
          onChange={(e) => setExportFormat(e.target.value)}
          className="text-sm p-1 border rounded"
        >
          <option value="csv">CSV</option>
          <option value="json">GeoJSON</option>
          <option value="gpx">GPX</option>
          <option value="kml">KML</option>
          <option value="kmz">KMZ</option>
        </select>
        
        <button
          onClick={exportData}
          disabled={selectedMarkers.length === 0}
          className={`flex items-center gap-2 px-4 py-2 bg-white rounded-lg transition-colors ${
            selectedMarkers.length === 0
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:bg-gray-50'
          }`}
        >
          <Download className="w-5 h-5 text-purple-600" />
          <span className="text-sm font-medium text-gray-700">Export</span>
        </button>

        {exportProgress > 0 && (
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${exportProgress}%` }}
            ></div>
          </div>
        )}
      </div>
    </div>
  );
}
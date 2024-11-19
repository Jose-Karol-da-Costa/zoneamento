import React, { useState, useRef } from 'react';
import { Upload, AlertCircle } from 'lucide-react';
import Papa from 'papaparse';
import { MapMarker } from '../types';
import * as toGeoJSON from 'togeojson';

interface FileUploadProps {
  onDataLoaded: (markers: MapMarker[]) => void;
}

export function FileUpload({ onDataLoaded }: FileUploadProps) {
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processGeoJSON = (geojson: any): MapMarker[] => {
    if (!geojson.features) return [];
    
    return geojson.features
      .filter((feature: any) => feature.geometry?.type === 'Point')
      .map((feature: any, index: number) => ({
        id: `marker-${index}`,
        latitude: feature.geometry.coordinates[1],
        longitude: feature.geometry.coordinates[0],
        name: feature.properties?.name || `Location ${index + 1}`,
        ...feature.properties
      }));
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setProgress(0);

    const extension = file.name.split('.').pop()?.toLowerCase();
    const reader = new FileReader();

    reader.onprogress = (event) => {
      if (event.lengthComputable) {
        setProgress((event.loaded / event.total) * 100);
      }
    };

    try {
      switch (extension) {
        case 'csv':
        case 'txt':
          Papa.parse(file, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: (results) => {
              if (results.errors.length > 0) {
                setError('Error parsing file');
                return;
              }

              const firstRow = results.data[0] as any;
              if (!firstRow?.latitude || !firstRow?.longitude) {
                setError('File must contain "latitude" and "longitude" columns');
                return;
              }

              const markers = results.data
                .filter((row: any) => {
                  const lat = parseFloat(row.latitude);
                  const lng = parseFloat(row.longitude);
                  return !isNaN(lat) && !isNaN(lng) && 
                         lat >= -90 && lat <= 90 && 
                         lng >= -180 && lng <= 180;
                })
                .map((row: any, index: number) => ({
                  id: `marker-${index}`,
                  latitude: parseFloat(row.latitude),
                  longitude: parseFloat(row.longitude),
                  name: row.name || `Location ${index + 1}`,
                  ...row
                }));

              if (markers.length === 0) {
                setError('No valid coordinates found');
                return;
              }

              onDataLoaded(markers);
              setProgress(100);
            }
          });
          break;

        case 'json':
        case 'geojson':
          reader.onload = (e) => {
            try {
              const geojson = JSON.parse(e.target?.result as string);
              const markers = processGeoJSON(geojson);
              if (markers.length === 0) {
                setError('No valid points found in GeoJSON');
                return;
              }
              onDataLoaded(markers);
              setProgress(100);
            } catch (err) {
              setError('Invalid JSON format');
            }
          };
          reader.readAsText(file);
          break;

        case 'kml':
        case 'gpx':
          reader.onload = (e) => {
            try {
              const parser = new DOMParser();
              const doc = parser.parseFromString(e.target?.result as string, 'text/xml');
              const geojson = extension === 'kml' 
                ? toGeoJSON.kml(doc)
                : toGeoJSON.gpx(doc);
              
              const markers = processGeoJSON(geojson);
              if (markers.length === 0) {
                setError(`No valid points found in ${extension.toUpperCase()}`);
                return;
              }
              onDataLoaded(markers);
              setProgress(100);
            } catch (err) {
              setError(`Invalid ${extension.toUpperCase()} format`);
            }
          };
          reader.readAsText(file);
          break;

        case 'kmz':
          const JSZip = await import('jszip');
          const zip = new JSZip.default();
          
          reader.onload = async (e) => {
            try {
              const contents = await zip.loadAsync(e.target?.result as ArrayBuffer);
              const kmlFile = Object.values(contents.files).find(file => 
                file.name.toLowerCase().endsWith('.kml')
              );
              
              if (!kmlFile) {
                setError('No KML file found in KMZ');
                return;
              }

              const kmlText = await kmlFile.async('text');
              const parser = new DOMParser();
              const doc = parser.parseFromString(kmlText, 'text/xml');
              const geojson = toGeoJSON.kml(doc);
              
              const markers = processGeoJSON(geojson);
              if (markers.length === 0) {
                setError('No valid points found in KMZ');
                return;
              }
              onDataLoaded(markers);
              setProgress(100);
            } catch (err) {
              setError('Invalid KMZ format');
            }
          };
          reader.readAsArrayBuffer(file);
          break;

        default:
          setError('Unsupported file format');
      }
    } catch (err) {
      setError('Error processing file');
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2">
      <label className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-md cursor-pointer hover:bg-gray-50 transition-colors">
        <Upload className="w-5 h-5 text-blue-600" />
        <span className="text-sm font-medium text-gray-700">Upload File</span>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.txt,.json,.geojson,.kml,.kmz,.gpx"
          onChange={handleFileUpload}
          className="hidden"
        />
      </label>
      {progress > 0 && progress < 100 && (
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}
    </div>
  );
}
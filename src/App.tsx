import React, { useState } from 'react';
import { FileUpload } from './components/FileUpload';
import { Map } from './components/Map';
import { MapControls } from './components/MapControls';
import { Stats } from './components/Stats';
import { IconEditor } from './components/IconEditor';
import { MapMarker } from './types';

export default function App() {
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [selectedMarkers, setSelectedMarkers] = useState<MapMarker[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [optimizedRoute, setOptimizedRoute] = useState<MapMarker[] | null>(null);
  const [startMarkerId, setStartMarkerId] = useState<string | null>(null);

  const handleDataLoaded = (newMarkers: MapMarker[]) => {
    setMarkers(newMarkers);
  };

  const handleMarkersSelected = (selected: MapMarker[]) => {
    setSelectedMarkers(selected);
    setIsDrawing(false);
  };

  const handleToggleDrawing = () => {
    setIsDrawing(!isDrawing);
    if (!isDrawing) {
      setSelectedMarkers([]);
      setOptimizedRoute(null);
      setStartMarkerId(null);
    }
  };

  const calculateOptimizedRoute = (markers: MapMarker[], startId: string) => {
    const startMarker = markers.find(m => m.id === startId);
    if (!startMarker) return null;

    const remainingMarkers = markers.filter(m => m.id !== startId);
    const route = [startMarker];

    while (remainingMarkers.length > 0) {
      const currentPoint = route[route.length - 1];
      let nearestMarker = remainingMarkers[0];
      let minDistance = getDistance(currentPoint, nearestMarker);

      for (let i = 1; i < remainingMarkers.length; i++) {
        const distance = getDistance(currentPoint, remainingMarkers[i]);
        if (distance < minDistance) {
          minDistance = distance;
          nearestMarker = remainingMarkers[i];
        }
      }

      route.push(nearestMarker);
      remainingMarkers.splice(remainingMarkers.indexOf(nearestMarker), 1);
    }

    return route;
  };

  const handleOptimizeRoute = (newStartMarkerId: string | null) => {
    setStartMarkerId(newStartMarkerId);
    if (!newStartMarkerId) {
      setOptimizedRoute(null);
      return;
    }

    const route = calculateOptimizedRoute(selectedMarkers, newStartMarkerId);
    setOptimizedRoute(route);
  };

  const getDistance = (point1: MapMarker, point2: MapMarker) => {
    const lat1 = point1.latitude;
    const lon1 = point1.longitude;
    const lat2 = point2.latitude;
    const lon2 = point2.longitude;
    
    const R = 6371; // Earth's radius in km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const toRad = (value: number) => {
    return value * Math.PI / 180;
  };

  const handleExport = () => {
    const csv = selectedMarkers
      .map(marker => Object.values(marker).join(','))
      .join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'selected-markers.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleDelete = () => {
    const selectedIds = new Set(selectedMarkers.map(m => m.id));
    setMarkers(markers.filter(m => !selectedIds.has(m.id)));
    setSelectedMarkers([]);
    setOptimizedRoute(null);
    setStartMarkerId(null);
  };

  const handleMarkerMove = (id: string, lat: number, lng: number) => {
    const updatedMarkers = markers.map(marker => 
      marker.id === id 
        ? { ...marker, latitude: lat, longitude: lng }
        : marker
    );
    setMarkers(updatedMarkers);

    // Update selected markers if the moved marker was selected
    if (selectedMarkers.some(m => m.id === id)) {
      const updatedSelected = selectedMarkers.map(marker =>
        marker.id === id
          ? { ...marker, latitude: lat, longitude: lng }
          : marker
      );
      setSelectedMarkers(updatedSelected);

      // Recalculate route if we have a start marker
      if (startMarkerId) {
        const newRoute = calculateOptimizedRoute(updatedSelected, startMarkerId);
        setOptimizedRoute(newRoute);
      }
    }
  };

  const handleUpdateIcons = (iconUrl: string) => {
    const selectedIds = new Set(selectedMarkers.map(m => m.id));
    setMarkers(markers.map(marker => 
      selectedIds.has(marker.id)
        ? { ...marker, icon: iconUrl }
        : marker
    ));
  };

  return (
    <div className="relative w-full h-screen">
      <FileUpload onDataLoaded={handleDataLoaded} />
      <MapControls
        selectedMarkers={selectedMarkers}
        onToggleDrawing={handleToggleDrawing}
        onOptimizeRoute={handleOptimizeRoute}
        onExport={handleExport}
        onDelete={handleDelete}
        isDrawing={isDrawing}
      />
      <Stats
        totalMarkers={markers.length}
        selectedMarkers={selectedMarkers.length}
      />
      <IconEditor
        selectedMarkers={selectedMarkers.map(m => m.id)}
        onUpdateIcons={handleUpdateIcons}
      />
      <Map
        markers={markers}
        selectedMarkers={selectedMarkers}
        isDrawing={isDrawing}
        onMarkersSelected={handleMarkersSelected}
        onMarkerMove={handleMarkerMove}
        optimizedRoute={optimizedRoute}
        onStartPointSelect={handleOptimizeRoute}
      />
    </div>
  );
}
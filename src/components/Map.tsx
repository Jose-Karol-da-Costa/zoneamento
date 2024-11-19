import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline, LayersControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-draw';
import { MapMarker } from '../types';
import * as turf from '@turf/turf';

const { BaseLayer } = LayersControl;

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapProps {
  markers: MapMarker[];
  selectedMarkers: MapMarker[];
  isDrawing: boolean;
  onMarkersSelected: (markers: MapMarker[]) => void;
  onMarkerMove: (id: string, lat: number, lng: number) => void;
  optimizedRoute: MapMarker[] | null;
  onStartPointSelect: (markerId: string) => void;
}

function DrawControl({ isDrawing, onMarkersSelected, markers }: { 
  isDrawing: boolean; 
  onMarkersSelected: (markers: MapMarker[]) => void;
  markers: MapMarker[];
}) {
  const map = useMap();
  const drawControlRef = useRef<L.Control.Draw | null>(null);
  const featureGroupRef = useRef<L.FeatureGroup | null>(null);

  useEffect(() => {
    if (!map) return;

    featureGroupRef.current = new L.FeatureGroup();
    map.addLayer(featureGroupRef.current);

    drawControlRef.current = new L.Control.Draw({
      draw: {
        rectangle: true,
        polygon: true,
        circle: false,
        circlemarker: false,
        marker: false,
        polyline: false,
      },
      edit: {
        featureGroup: featureGroupRef.current,
        remove: true
      }
    });

    map.addControl(drawControlRef.current);

    map.on(L.Draw.Event.CREATED, (e: any) => {
      const layer = e.layer;
      if (featureGroupRef.current) {
        featureGroupRef.current.clearLayers();
        featureGroupRef.current.addLayer(layer);
      }

      const drawnShape = layer.toGeoJSON();
      
      const selectedMarkers = markers.filter(marker => {
        const point = turf.point([marker.longitude, marker.latitude]);
        return turf.booleanPointInPolygon(point, drawnShape);
      });
      
      onMarkersSelected(selectedMarkers);
    });

    return () => {
      if (featureGroupRef.current) {
        map.removeLayer(featureGroupRef.current);
      }
      if (drawControlRef.current) {
        map.removeControl(drawControlRef.current);
      }
    };
  }, [map, markers, onMarkersSelected]);

  useEffect(() => {
    if (!map || !drawControlRef.current) return;

    if (isDrawing) {
      new L.Draw.Polygon(map).enable();
    } else if (featureGroupRef.current) {
      featureGroupRef.current.clearLayers();
    }
  }, [isDrawing, map]);

  return null;
}

function MapUpdater({ markers }: { markers: MapMarker[] }) {
  const map = useMap();

  useEffect(() => {
    if (markers.length > 0) {
      const bounds = L.latLngBounds(markers.map(m => [m.latitude, m.longitude]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [markers, map]);

  return null;
}

const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

const customIcon = (selected: boolean, iconUrl: string | undefined, isStart: boolean = false) => {
  if (iconUrl && isValidUrl(iconUrl)) {
    return L.divIcon({
      className: 'marker-icon',
      html: `
        <div style="
          width: 24px;
          height: 24px;
          border-radius: 50%;
          overflow: hidden;
          ${selected ? `border: 2px solid ${isStart ? '#22c55e' : '#3b82f6'}` : ''}
        ">
          <img
            src="${iconUrl}"
            style="
              width: 100%;
              height: 100%;
              object-fit: cover;
            "
            onerror="this.parentElement.innerHTML='<div style=\'width:100%;height:100%;background-color:#9ca3af;\'></div>';"
          />
        </div>
      `,
      iconSize: [24, 24]
    });
  }

  return L.divIcon({
    className: 'marker-icon',
    html: `
      <div style="
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background-color: ${isStart ? '#22c55e' : '#9ca3af'};
        ${selected ? `border: 2px solid ${isStart ? '#22c55e' : '#3b82f6'}` : ''}
      "></div>
    `,
    iconSize: [24, 24]
  });
};

export function Map({ 
  markers, 
  selectedMarkers, 
  isDrawing, 
  onMarkersSelected, 
  onMarkerMove, 
  optimizedRoute,
  onStartPointSelect 
}: MapProps) {
  const defaultCenter: [number, number] = [0, 0];
  const [currentZoom, setCurrentZoom] = useState<number>(2);
  
  const center = markers.length > 0
    ? [
        markers.reduce((sum, m) => sum + m.latitude, 0) / markers.length,
        markers.reduce((sum, m) => sum + m.longitude, 0) / markers.length,
      ] as [number, number]
    : defaultCenter;

  const routePositions = optimizedRoute?.map(marker => [marker.latitude, marker.longitude]) || [];
  const startPoint = optimizedRoute?.[0];

  const handleZoomEnd = (e: L.LeafletEvent) => {
    setCurrentZoom(e.target.getZoom());
  };

  return (
    <MapContainer
      center={center}
      zoom={markers.length > 0 ? 10 : 2}
      className="w-full h-screen"
      style={{ background: '#f3f4f6' }}
      zoomEnd={handleZoomEnd}
    >
      <LayersControl position="topright">
        <BaseLayer checked name="Street">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        </BaseLayer>
        <BaseLayer name="Satellite">
          <TileLayer
            attribution='&copy; <a href="https://www.esri.com">Esri</a>'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
        </BaseLayer>
        <BaseLayer name="Terrain">
          <TileLayer
            attribution='&copy; <a href="https://www.opentopomap.org">OpenTopoMap</a>'
            url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
          />
        </BaseLayer>
      </LayersControl>
      
      {markers.map((marker) => (
        <Marker
          key={marker.id}
          position={[marker.latitude, marker.longitude]}
          icon={customIcon(
            selectedMarkers.includes(marker), 
            marker.icon,
            startPoint?.id === marker.id
          )}
          draggable={true}
          eventHandlers={{
            click: () => {
              if (startPoint === undefined && selectedMarkers.includes(marker)) {
                onStartPointSelect(marker.id);
              }
            },
            dragend: (e) => {
              const latLng = e.target.getLatLng();
              const map = e.target._map;
              onMarkerMove(marker.id, latLng.lat, latLng.lng);
              map.setView(map.getCenter(), currentZoom);
            }
          }}
        >
          <Popup>
            <div className="p-2">
              <h3 className="font-medium">{marker.name || 'Location'}</h3>
              <p className="text-sm text-gray-600">
                {marker.latitude.toFixed(6)}, {marker.longitude.toFixed(6)}
              </p>
              {marker.icon && (
                <div className="mt-2">
                  <img
                    src={marker.icon}
                    alt="Location icon"
                    className="w-8 h-8 object-cover rounded-full"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>
          </Popup>
        </Marker>
      ))}

      {optimizedRoute && (
        <Polyline
          positions={routePositions}
          color="#3b82f6"
          weight={3}
          opacity={0.8}
          dashArray="5, 10"
        />
      )}

      <DrawControl 
        isDrawing={isDrawing} 
        onMarkersSelected={onMarkersSelected} 
        markers={markers}
      />
      <MapUpdater markers={markers} />
    </MapContainer>
  );
}
export interface MapMarker {
  id: string;
  latitude: number;
  longitude: number;
  name?: string;
  icon?: string;
  [key: string]: any;
}

export interface MapState {
  markers: MapMarker[];
  selectedMarkers: MapMarker[];
  isDrawing: boolean;
}
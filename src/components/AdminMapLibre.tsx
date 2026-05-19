import { useState, useMemo } from 'react';
import Map, { Marker, NavigationControl } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

interface IncidentMarker {
  id: string;
  longitude: number;
  latitude: number;
  status: 'Critical' | 'Moderate' | 'Safe';
}

interface AdminMapLibreProps {
  markers: IncidentMarker[];
}

export default function AdminMapLibre({ markers }: AdminMapLibreProps) {
  const [viewState, setViewState] = useState({
    longitude: 0,
    latitude: 30,
    zoom: 1.5,
    bearing: 0,
    pitch: 0
  });

  const getMarkerColor = (status: string) => {
    switch (status) {
      case 'Critical': return '#ef4444'; // Red
      case 'Moderate': return '#eab308'; // Yellow
      case 'Safe': return '#22c55e'; // Green
      default: return '#6b7280';
    }
  };

  return (
    <div className="w-full h-full relative rounded-xl overflow-hidden border border-slate-200">
      <Map
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        style={{ width: '100%', height: '100%' }}
        mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
      >
        <NavigationControl position="top-right" />
        
        {markers.map(marker => (
          <Marker
            key={marker.id}
            longitude={marker.longitude}
            latitude={marker.latitude}
            anchor="center"
          >
            <div className="relative flex items-center justify-center">
              <div 
                className="absolute w-6 h-6 rounded-full opacity-40 animate-ping" 
                style={{ backgroundColor: getMarkerColor(marker.status) }}
              />
              <div 
                className="w-3 h-3 rounded-full border-2 border-white shadow-sm" 
                style={{ backgroundColor: getMarkerColor(marker.status) }}
              />
            </div>
          </Marker>
        ))}
      </Map>
    </div>
  );
}

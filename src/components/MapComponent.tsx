import { MapContainer, TileLayer, Marker, Popup, Polygon, CircleMarker, Circle, Tooltip, ZoomControl, Polyline, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import React, { useEffect, useState } from 'react';
import { Search, Map as MapIcon, Navigation, Route, AlertTriangle, Loader2, Settings, Eraser, PlusCircle, Printer, Download, MapPin, Share2 } from 'lucide-react';

// Fix for default leaflet icons in React
const icon = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png';
const iconShadow = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const getTomTomApiKey = () => {
  try {
    const el = document.querySelector('[data-runtime-config]');
    if (el) {
      const base64Config = el.getAttribute('data-runtime-config') || '';
      const config = JSON.parse(atob(base64Config));
      return config.VITE_TOMTOM_API_KEY || import.meta.env.VITE_TOMTOM_API_KEY || '';
    }
  } catch (err) {
    console.error('Error parsing dynamic runtime config:', err);
  }
  return import.meta.env.VITE_TOMTOM_API_KEY || '';
};

const TOMTOM_API_KEY = getTomTomApiKey();

interface MapComponentProps {
  interactive?: boolean;
  onLocationSelect?: (lat: number, lng: number) => void;
  incidents?: any[];
  gisData?: any;
  layerVisibility?: { residential: boolean; urban: boolean; highRisk: boolean; precipitation: boolean; };
  focusLocation?: [number, number] | null;
  clusters?: any[];
  resources?: any[];
  pulse?: boolean;
}

export default function MapComponent({
  interactive = true,
  onLocationSelect,
  incidents = [],
  gisData,
  layerVisibility = { residential: true, urban: true, highRisk: true, precipitation: true },
  focusLocation: initialFocus,
  clusters = [],
  resources = [],
  pulse = false
}: MapComponentProps) {
  const center: [number, number] = [30.3753, 69.3451];
  const [mapError, setMapError] = useState<string | null>(null);

  const [focusLocation, setFocusLocation] = useState<[number, number] | null>(initialFocus || null);

  // Routing State
  const [routeFrom, setRouteFrom] = useState('');
  const [routeTo, setRouteTo] = useState('');
  const [routes, setRoutes] = useState<{ path: [number, number][], distance: number, time: number, color: string }[]>([]);
  const [isRouting, setIsRouting] = useState(false);

  // Dynamic Data
  const [localGisData, setLocalGisData] = useState<any>(null);

  useEffect(() => {
    const baseLat = focusLocation ? focusLocation[0] : center[0];
    const baseLng = focusLocation ? focusLocation[1] : center[1];

    const generatePoints = (count: number, spread: number) => {
      return Array.from({ length: count }).map(() => [
        baseLat + (Math.random() - 0.5) * spread,
        baseLng + (Math.random() - 0.5) * spread
      ]);
    };

    const precipPoly = [
      [baseLat + 0.05, baseLng - 0.05],
      [baseLat + 0.08, baseLng + 0.02],
      [baseLat + 0.02, baseLng + 0.06],
      [baseLat - 0.03, baseLng + 0.01],
    ];

    setLocalGisData({
      residentialPoints: generatePoints(40, 0.2),
      urbanPoints: generatePoints(20, 0.1),
      precipitationAlerts: [{ id: 'local-precip', polygon: precipPoly }]
    });
  }, [focusLocation]);

  useEffect(() => {
    if (initialFocus) setFocusLocation(initialFocus);
  }, [initialFocus]);

  const isWithinPakistan = (lat: number, lng: number) => {
    return lat > 23.0 && lat < 37.5 && lng > 60.0 && lng < 80.0;
  };

  const geocodeLocation = async (query: string): Promise<[number, number] | null> => {
    const res = await fetch(`https://api.tomtom.com/search/2/geocode/${encodeURIComponent(query)}.json?key=${TOMTOM_API_KEY}`);
    const data = await res.json();
    if (data.results && data.results.length > 0) {
      return [data.results[0].position.lat, data.results[0].position.lon];
    }
    return null;
  };

  const handleRoute = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!routeFrom || !routeTo || !TOMTOM_API_KEY) return;

    setIsRouting(true);
    setMapError(null);
    setRoutes([]);

    try {
      const startCoord = await geocodeLocation(routeFrom);
      const endCoord = await geocodeLocation(routeTo);

      if (!startCoord || !endCoord) {
        setMapError("Could not find start or end location.");
        setIsRouting(false);
        return;
      }

      const res = await fetch(`https://api.tomtom.com/routing/1/calculateRoute/${startCoord[0]},${startCoord[1]}:${endCoord[0]},${endCoord[1]}/json?key=${TOMTOM_API_KEY}&traffic=true&maxAlternatives=2`);
      const data = await res.json();

      if (data.routes && data.routes.length > 0) {
        const routeColors = ['#0ea5e9', '#eab308', '#22c55e']; // Blue, Yellow, Green
        const parsedRoutes = data.routes.map((route: any, index: number) => {
          return {
            path: route.legs[0].points.map((p: any) => [p.latitude, p.longitude] as [number, number]),
            distance: route.summary.lengthInMeters,
            time: route.summary.travelTimeInSeconds,
            color: routeColors[index % routeColors.length]
          };
        });

        setRoutes(parsedRoutes);
        setFocusLocation(startCoord);
      } else {
        setMapError("Could not calculate a route.");
      }
    } catch (err) {
      setMapError("Routing error.");
    } finally {
      setIsRouting(false);
    }
  };

  const formatDistance = (meters: number) => `${(meters / 1000).toFixed(1)} km`;
  const formatTime = (seconds: number) => {
    const totalMinutes = Math.floor(seconds / 60);
    const hrs = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    if (hrs > 0) {
      return `${hrs} ${hrs === 1 ? 'hr' : 'hrs'} ${mins} ${mins === 1 ? 'min' : 'mins'}`;
    }
    return `${mins} ${mins === 1 ? 'min' : 'mins'}`;
  };

  const handleExport = () => {
    if (routes.length === 0) return;
    const exportData = JSON.stringify({ start: routeFrom, end: routeTo, routes }, null, 2);
    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'routes_export.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full h-full overflow-y-auto bg-white text-slate-700 flex flex-col z-[1000] relative">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50 shrink-0">
        <div className="flex items-center gap-2 text-slate-800 font-extrabold tracking-widest text-xs uppercase font-display">
          <Route className="w-4 h-4 text-blue-600" /> ROUTING / DIRECTIONS
        </div>
        <Settings className="w-4 h-4 text-slate-400 cursor-pointer hover:text-slate-600" />
      </div>

      {/* Actions */}
      <div className="px-4 py-3 flex gap-2 border-b border-slate-200 shrink-0 bg-white">
        <button className="flex-1 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider text-slate-600 transition-colors cursor-pointer">
          <Settings className="w-3 h-3" /> Settings
        </button>
        <button
          onClick={() => { setRouteFrom(''); setRouteTo(''); setRoutes([]); }}
          className="flex-1 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider text-slate-600 transition-colors cursor-pointer"
        >
          <Eraser className="w-3 h-3" /> Clear Form
        </button>
      </div>

      {/* Main Content Area */}
      <div className="p-4 flex flex-col flex-1 bg-white">
        <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2 font-display">Enter Locations</h4>
        <p className="text-[10px] text-slate-500 mb-4">Drag and drop to customize ordering</p>

        {/* Location Inputs */}
        <div className="space-y-3 mb-5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-emerald-500 text-white flex items-center justify-center font-bold text-xs rounded shrink-0">1</div>
            <div className="w-2 text-slate-400 font-bold">=</div>
            <input
              type="text"
              value={routeFrom}
              onChange={e => setRouteFrom(e.target.value)}
              placeholder="Enter start location..."
              className="flex-1 bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-red-500 text-white flex items-center justify-center font-bold text-xs rounded shrink-0">2</div>
            <div className="w-2 text-slate-400 font-bold">=</div>
            <input
              type="text"
              value={routeTo}
              onChange={e => setRouteTo(e.target.value)}
              placeholder="Enter destination..."
              className="flex-1 bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-sm"
            />
          </div>
        </div>

        <div className="space-y-3 mb-6 border-b border-slate-200 pb-6">
          <button className="flex items-center gap-2 text-blue-600 hover:text-blue-500 text-xs font-bold transition-colors cursor-pointer">
            <PlusCircle className="w-4 h-4" /> Add Additional Location
          </button>
        </div>

        {/* Buttons */}
        <button
          disabled={isRouting}
          onClick={handleRoute}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded text-xs transition-all mb-2 flex justify-center items-center gap-2 cursor-pointer shadow-md shadow-blue-500/10 active:scale-[0.98]"
        >
          {isRouting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Get Directions'}
        </button>
        <button disabled className="w-full bg-slate-100 text-slate-400 font-bold py-2.5 rounded text-xs opacity-50 cursor-not-allowed mb-4">
          Optimize Route
        </button>

        {/* EMBEDDED MAP CONTAINER (INCREASED HEIGHT TO 480PX) */}
        <div className="w-full h-[480px] rounded-2xl overflow-hidden border border-slate-200 shadow-md relative z-0 mb-4 bg-slate-50">
          {mapError && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] flex items-center justify-center animate-in fade-in zoom-in-95">
              <div className="bg-red-900/90 backdrop-blur-md border border-red-500 p-3 rounded shadow-2xl flex items-center gap-3">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <p className="text-xs font-bold text-red-100">{mapError}</p>
                <button onClick={() => setMapError(null)} className="ml-3 text-[10px] font-black text-white hover:text-red-200 uppercase">Dismiss</button>
              </div>
            </div>
          )}

          <MapContainer
            center={center}
            zoom={6}
            minZoom={5}
            maxBounds={[[23.0, 60.0], [37.5, 80.0]]}
            maxBoundsViscosity={1.0}
            scrollWheelZoom={true}
            className="h-full w-full"
            zoomControl={false}
          >
            <ZoomControl position="bottomright" />

            {/* TomTom Main Map Tiles */}
            <TileLayer
              attribution='&copy; <a href="https://www.tomtom.com">TomTom</a>'
              url={TOMTOM_API_KEY ? `https://api.tomtom.com/map/1/tile/basic/main/{z}/{x}/{y}.png?key=${TOMTOM_API_KEY}` : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"}
            />

            {/* TomTom Traffic Incidents Layer only */}
            {TOMTOM_API_KEY && (
              <TileLayer
                url={`https://api.tomtom.com/traffic/map/4/tile/incidents/s3/{z}/{x}/{y}.png?key=${TOMTOM_API_KEY}`}
                opacity={0.9}
              />
            )}

            <MapHook focusLocation={focusLocation} zoomLevel={focusLocation ? 12 : 6} />

            {/* 25 Mile Red Zone Buffer */}
            <Circle
              center={focusLocation || center}
              radius={40233} // roughly 25 miles
              pathOptions={{ color: '#ef4444', fillColor: '#b91c1c', fillOpacity: 0.45, weight: 2 }}
            >
              <Tooltip sticky className="bg-red-600 text-white font-black text-xs px-2 py-1 border-0">25 MI</Tooltip>
            </Circle>

            {/* Render Routes */}
            {routes.map((route, idx) => (
              <div key={`route-group-${idx}`}>
                <Polyline
                  positions={route.path}
                  pathOptions={{ color: route.color, weight: 4, opacity: 0.9 }}
                />
                {/* Numbered Stops for Start/End if it's the primary route */}
                {idx === 0 && route.path.length > 0 && (
                  <>
                    <Marker position={route.path[0]} icon={createStopIcon(1, '#10b981')}>
                      <Tooltip direction="top" permanent className="bg-emerald-600 text-white font-bold border-0 text-xs">{routeFrom}</Tooltip>
                    </Marker>
                    <Marker position={route.path[route.path.length - 1]} icon={createStopIcon(2, '#ef4444')}>
                      <Tooltip direction="top" permanent className="bg-red-600 text-white font-bold border-0 text-xs">{routeTo}</Tooltip>
                    </Marker>
                  </>
                )}
              </div>
            ))}

            {/* Rest of dynamic data */}
            {/* Residential (Rural) Areas */}
            {layerVisibility.residential && localGisData?.residentialPoints?.map((pos: [number, number], idx: number) => (
              <CircleMarker
                key={`res-${idx}`} center={pos} radius={5}
                pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.9, weight: 1 }}
              />
            ))}

            {/* Urban Areas */}
            {layerVisibility.urban && localGisData?.urbanPoints?.map((pos: [number, number], idx: number) => (
              <CircleMarker
                key={`urb-${idx}`} center={pos} radius={6}
                pathOptions={{ color: '#10b981', fillColor: '#10b981', fillOpacity: 0.9, weight: 1 }}
              />
            ))}

            {/* Precipitation Areas */}
            {layerVisibility.precipitation && localGisData?.precipitationAlerts?.map((alert: any) => (
              <Polygon
                key={alert.id} positions={alert.polygon}
                pathOptions={{ color: '#06b6d4', fillColor: '#22d3ee', fillOpacity: 0.4, weight: 2, dashArray: '5, 5' }}
              />
            ))}

            {/* High Risk Zones */}
            {layerVisibility.highRisk && gisData?.highRiskZones?.map((zone: any) => (
              <Polygon
                key={zone.id} positions={zone.polygon}
                pathOptions={{ color: '#dc2626', fillColor: '#ef4444', fillOpacity: 0.4, weight: 2 }}
              />
            ))}

            {/* Incident Markers */}
            {incidents.filter(inc => inc && (inc.coordinates || (inc.lat && inc.lng))).map((inc: any) => {
              const position = inc.coordinates || [parseFloat(inc.lat), parseFloat(inc.lng)];
              return (
                <CircleMarker
                  key={inc.id} center={position} radius={8}
                  pathOptions={{ color: '#fff', fillColor: '#ef4444', fillOpacity: 1, weight: 2 }}
                >
                  <Popup>
                    <div className="font-sans">
                      <p className="font-black text-red-600 uppercase text-[10px] mb-1">{inc.type}</p>
                      <p className="text-xs font-bold text-slate-900">{inc.location}</p>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}

            {interactive && (
              <MapEvents onLocationSelect={(lat, lng) => {
                if (!isWithinPakistan(lat, lng)) {
                  setMapError("Please select a location within Pakistan.");
                  return;
                }
                onLocationSelect?.(lat, lng);
              }} />
            )}
          </MapContainer>
        </div>

        {/* Route Results (Rendered below the map!) */}
        {routes.length > 0 && (
          <div className="space-y-2 mb-6">
            {routes.map((route, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded hover:bg-slate-100 cursor-pointer transition-colors group shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-sm animate-pulse" style={{ backgroundColor: route.color }}></div>
                  <div>
                    <p className="text-[10px] font-black text-slate-800 uppercase tracking-wider mb-0.5 font-display">Route #{idx + 1}</p>
                    <p className="text-[10px] text-slate-500 font-bold">{formatDistance(route.distance)} — {formatTime(route.time)}</p>
                  </div>
                </div>
                <Settings className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Tools */}
      <div className="p-4 border-t border-slate-200 flex gap-3 bg-slate-50/50 shrink-0">
        <button onClick={() => window.print()} className="flex-1 flex items-center justify-center gap-2 text-[10px] font-bold text-slate-600 hover:text-slate-800 transition-colors uppercase tracking-widest bg-slate-100 hover:bg-slate-200 py-2 rounded cursor-pointer">
          <Printer className="w-3 h-3" /> Print
        </button>
        <button onClick={handleExport} className="flex-1 flex items-center justify-center gap-2 text-[10px] font-bold text-blue-600 hover:text-blue-700 transition-colors uppercase tracking-widest bg-blue-50 hover:bg-blue-100 border border-blue-200 py-2 rounded cursor-pointer">
          <Download className="w-3 h-3" /> Export
        </button>
      </div>
    </div>
  );
}

function MapHook({ focusLocation, zoomLevel }: { focusLocation?: [number, number] | null; zoomLevel: number }) {
  const map = useMap();
  useEffect(() => {
    if (focusLocation) {
      map.flyTo(focusLocation, zoomLevel, { duration: 1.5 });
    }
  }, [focusLocation, zoomLevel, map]);
  return null;
}

function MapEvents({ onLocationSelect }: { onLocationSelect?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      if (onLocationSelect) {
        onLocationSelect(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

// Helper to create the numbered stop icons
function createStopIcon(number: number, bgColor: string) {
  return L.divIcon({
    className: 'custom-stop-icon',
    html: `<div style="background-color: ${bgColor};" class="w-5 h-6 text-white flex items-center justify-center font-bold text-[10px] rounded-sm shadow-[0_4px_10px_rgba(0,0,0,0.5)] border border-white/50 relative">
            ${number}
            <div class="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[6px]" style="border-top-color: ${bgColor};"></div>
           </div>`,
    iconSize: [20, 24],
    iconAnchor: [10, 24],
  });
}

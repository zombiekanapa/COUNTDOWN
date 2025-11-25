import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, Circle, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { Coordinates, EvacuationMarker, AppMode, HazardZone, RouteData } from '../types';
import { Navigation, Pencil } from 'lucide-react';

const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

// Custom Radioactive Marker Icon
const divIconHtml = `
  <div style="
    background-color: #fbbf24;
    border: 2px solid #000;
    border-radius: 50%;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    box-shadow: 0 0 15px rgba(251, 191, 36, 0.5);
  ">
    ☢
  </div>
`;

const HazardIcon = L.divIcon({
  html: divIconHtml,
  className: 'hazard-marker',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  popupAnchor: [0, -20]
});

// User Location Icon (Blue Dot)
const userIconHtml = `
  <div style="
    background-color: #06b6d4;
    border: 2px solid #fff;
    border-radius: 50%;
    width: 20px;
    height: 20px;
    box-shadow: 0 0 0 4px rgba(6, 182, 212, 0.3);
  "></div>
`;

const UserIcon = L.divIcon({
  html: userIconHtml,
  className: 'user-marker',
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

// Start Point Icon (Green Flag style)
const startPointIconHtml = `
  <div style="
    background-color: #22c55e;
    border: 2px solid #fff;
    border-radius: 50%;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 0 10px rgba(34, 197, 94, 0.5);
    font-weight: bold;
    font-size: 14px;
    color: white;
  ">
    A
  </div>
`;

const StartPointIcon = L.divIcon({
  html: startPointIconHtml,
  className: 'start-point-marker',
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

// HUD Search Result Icon (Yellow Delicate Crosshair)
const searchResultIconHtml = `
  <div class="hud-crosshair-container" style="width: 50px; height: 50px;">
    <div class="hud-line-h"></div>
    <div class="hud-line-v"></div>
    <div class="hud-ring-inner"></div>
    <div class="hud-ring-pulse"></div>
  </div>
`;

const SearchResultIcon = L.divIcon({
  html: searchResultIconHtml,
  className: 'hud-marker',
  iconSize: [50, 50],
  iconAnchor: [25, 25]
});

interface MapProps {
  markers: EvacuationMarker[];
  hazardZones: HazardZone[];
  showHeatmap: boolean;
  routeData: RouteData | null;
  mode: AppMode;
  onMapClick: (pos: Coordinates) => void;
  onEditMarker: (marker: EvacuationMarker) => void;
  center: Coordinates;
  userLocation: Coordinates | null;
  customStartPoint?: Coordinates | null;
  searchResult?: Coordinates | null;
}

const MapEvents: React.FC<{ onClick: (pos: Coordinates) => void; mode: AppMode }> = ({ onClick, mode }) => {
  useMapEvents({
    click(e) {
      onClick(e.latlng);
    },
  });
  return null;
};

// Component to fly to location when center prop changes
const MapController: React.FC<{ coords: Coordinates }> = ({ coords }) => {
  const map = useMap();
  useEffect(() => {
    // Safety check before flying
    if (!isNaN(coords.lat) && !isNaN(coords.lng)) {
      map.flyTo([coords.lat, coords.lng], 14, { duration: 1.5 });
    }
  }, [coords, map]);
  return null;
};

const MapComponent: React.FC<MapProps> = ({ 
  markers, 
  hazardZones,
  showHeatmap,
  routeData,
  mode, 
  onMapClick, 
  onEditMarker,
  center, 
  userLocation,
  customStartPoint,
  searchResult
}) => {
  const openInGoogleMaps = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank');
  };

  const getHazardColor = (level: string) => {
    switch (level) {
      case 'high': return '#ef4444'; // Red
      case 'medium': return '#f97316'; // Orange
      default: return '#eab308'; // Yellow
    }
  };

  // Ensure center is valid to prevent MapContainer crash
  const safeCenter: [number, number] = 
    (!isNaN(center.lat) && !isNaN(center.lng)) 
      ? [center.lat, center.lng] 
      : [53.4285, 14.5528]; // Fallback to Szczecin default

  return (
    <MapContainer 
      center={safeCenter} 
      zoom={13} 
      style={{ height: '100%', width: '100%', background: '#111827' }}
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      
      <MapController coords={center} />
      <MapEvents onClick={onMapClick} mode={mode} />

      {/* User Location Marker */}
      {userLocation && !isNaN(userLocation.lat) && !isNaN(userLocation.lng) && (
        <>
          <Marker position={[userLocation.lat, userLocation.lng]} icon={UserIcon}>
            <Popup className="custom-popup">
              <div className="font-bold text-cyan-400">YOU ARE HERE</div>
            </Popup>
          </Marker>
          <Circle 
            center={[userLocation.lat, userLocation.lng]} 
            radius={500} 
            pathOptions={{ color: '#06b6d4', fillColor: '#06b6d4', fillOpacity: 0.1, weight: 1 }} 
          />
        </>
      )}

      {/* Custom Start Point (for routing) */}
      {customStartPoint && !isNaN(customStartPoint.lat) && !isNaN(customStartPoint.lng) && (
        <Marker position={[customStartPoint.lat, customStartPoint.lng]} icon={StartPointIcon} zIndexOffset={100}>
           <Popup>
              <div className="text-xs font-bold text-green-500">Route Start Point</div>
           </Popup>
        </Marker>
      )}

      {/* Search Result HUD Crosshair */}
      {searchResult && !isNaN(searchResult.lat) && !isNaN(searchResult.lng) && (
         <Marker position={[searchResult.lat, searchResult.lng]} icon={SearchResultIcon} zIndexOffset={1000} />
      )}

      {/* Evacuation Route Polyline */}
      {routeData && (
        <Polyline
          positions={routeData.coordinates.map(c => [c.lat, c.lng])}
          pathOptions={{ color: '#10b981', weight: 4, dashArray: '10, 10', opacity: 0.8 }}
        >
          <Popup>
            <div className="p-1">
              <h3 className="font-bold text-green-500 uppercase">Safe Route</h3>
              <p className="text-xs text-gray-300">Distance: {(routeData.distance / 1000).toFixed(2)} km</p>
              <p className="text-xs text-gray-300">Est. Time: {Math.ceil(routeData.duration / 60)} min (Foot)</p>
            </div>
          </Popup>
        </Polyline>
      )}

      {/* Hazard Heatmap Zones - Filter invalid coords */}
      {showHeatmap && hazardZones.map((zone) => {
        if (isNaN(zone.position.lat) || isNaN(zone.position.lng)) return null;
        return (
          <Circle
            key={zone.id}
            center={[zone.position.lat, zone.position.lng]}
            radius={zone.radius || 500}
            pathOptions={{
              color: getHazardColor(zone.riskLevel),
              fillColor: getHazardColor(zone.riskLevel),
              fillOpacity: 0.3,
              weight: 1
            }}
          >
            <Popup>
              <div className="p-1">
                <h3 className="font-bold text-red-500 uppercase flex items-center gap-2">
                  ⚠️ High Risk Zone
                </h3>
                <p className="text-xs text-gray-300 font-bold">{zone.category.toUpperCase()}</p>
                <p className="text-sm text-gray-200 mt-1">{zone.description}</p>
              </div>
            </Popup>
          </Circle>
        );
      })}

      {/* Evacuation Markers - Filter invalid coords */}
      {markers.map((marker) => {
        if (isNaN(marker.position.lat) || isNaN(marker.position.lng)) return null;
        return (
          <Marker key={marker.id} position={[marker.position.lat, marker.position.lng]} icon={HazardIcon}>
            <Popup>
              <div className="p-1 min-w-[200px]">
                <div className="flex items-center justify-between mb-2 border-b border-yellow-500/30 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">☢</span>
                    <h3 className="font-bold text-yellow-400 text-lg uppercase">{marker.name}</h3>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditMarker(marker);
                    }}
                    className="text-gray-400 hover:text-white p-1"
                    title="Edit Description"
                  >
                    <Pencil size={14} />
                  </button>
                </div>
                
                <p className="text-sm text-gray-200 mb-3 leading-relaxed">{marker.description}</p>
                
                <div className="flex justify-between items-center text-xs text-gray-400 mt-2">
                  <span>Type: <span className="text-white capitalize">{marker.type.replace('_', ' ')}</span></span>
                </div>
                
                <button 
                  onClick={() => openInGoogleMaps(marker.position.lat, marker.position.lng)}
                  className="mt-3 w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2 px-3 rounded flex items-center justify-center gap-2 transition-colors"
                >
                  <Navigation size={14} />
                  Navigate (Google Maps)
                </button>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
};

export default MapComponent;
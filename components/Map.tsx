import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, Circle, Polyline, Polygon } from 'react-leaflet';
import L from 'leaflet';
import { Coordinates, EvacuationMarker, AppMode, HazardZone, RouteData, OfficialAlert } from '../types';
import { Navigation, Pencil, Siren, MessageSquareText } from 'lucide-react';

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

// Message Board Icon
const messageBoardIconHtml = `
  <div style="
    background-color: #eab308;
    border: 2px solid #fff;
    border-radius: 4px;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: black;
    box-shadow: 0 0 10px rgba(234, 179, 8, 0.6);
  ">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
  </div>
`;

const MessageBoardIcon = L.divIcon({
  html: messageBoardIconHtml,
  className: 'message-board-marker',
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

interface MapProps {
  markers: EvacuationMarker[];
  hazardZones: HazardZone[];
  officialAlerts?: OfficialAlert[];
  showHeatmap: boolean;
  showAlerts?: boolean;
  routeData: RouteData | null;
  mode: AppMode;
  onMapClick: (pos: Coordinates) => void;
  onEditMarker: (marker: EvacuationMarker) => void;
  center: Coordinates;
  userLocation: Coordinates | null;
  customStartPoint?: Coordinates | null;
  searchResult?: Coordinates | null;
  messageBoardLocation?: Coordinates;
  onMessageBoardClick?: () => void; // New prop handler
}

const MapEvents: React.FC<{ onClick: (pos: Coordinates) => void; mode: AppMode }> = ({ onClick, mode }) => {
  useMapEvents({
    click(e) {
      onClick(e.latlng);
    },
  });
  return null;
};

// Helper to validate coordinates
const isValidCoord = (c: Coordinates | null | undefined): boolean => {
  return !!c && typeof c.lat === 'number' && typeof c.lng === 'number' && !isNaN(c.lat) && !isNaN(c.lng);
};

// Component to fly to location when center prop changes
const MapController: React.FC<{ coords: Coordinates }> = ({ coords }) => {
  const map = useMap();
  useEffect(() => {
    // Safety check before flying
    if (isValidCoord(coords)) {
      map.flyTo([coords.lat, coords.lng], 14, { duration: 1.5 });
    }
  }, [coords, map]);
  return null;
};

// Component to fit bounds to route when routeData changes
const RouteFitter: React.FC<{ coords: Coordinates[] }> = ({ coords }) => {
  const map = useMap();
  useEffect(() => {
    if (coords && coords.length > 0) {
      const validCoords = coords.filter(c => isValidCoord(c));
      if (validCoords.length > 0) {
        const bounds = L.latLngBounds(validCoords.map(c => [c.lat, c.lng]));
        map.fitBounds(bounds, { padding: [50, 50], animate: true, duration: 1.5 });
      }
    }
  }, [coords, map]);
  return null;
};

const MapComponent: React.FC<MapProps> = ({ 
  markers, 
  hazardZones,
  officialAlerts,
  showHeatmap,
  showAlerts,
  routeData,
  mode, 
  onMapClick, 
  onEditMarker,
  center, 
  userLocation,
  customStartPoint,
  searchResult,
  messageBoardLocation,
  onMessageBoardClick
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

  const safeCenter: [number, number] = 
    isValidCoord(center)
      ? [center.lat, center.lng] 
      : [53.4285, 14.5528];

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
      
      {isValidCoord(center) && <MapController coords={center} />}
      <MapEvents onClick={onMapClick} mode={mode} />
      
      {routeData && routeData.coordinates.length > 0 && (
        <RouteFitter coords={routeData.coordinates} />
      )}

      {isValidCoord(userLocation) && userLocation && (
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

      {isValidCoord(customStartPoint) && customStartPoint && (
        <Marker position={[customStartPoint.lat, customStartPoint.lng]} icon={StartPointIcon} zIndexOffset={100}>
           <Popup>
              <div className="text-xs font-bold text-green-500">Route Start Point</div>
           </Popup>
        </Marker>
      )}

      {isValidCoord(searchResult) && searchResult && (
         <Marker position={[searchResult.lat, searchResult.lng]} icon={SearchResultIcon} zIndexOffset={1000} />
      )}

      {/* Message Board Location Marker */}
      {isValidCoord(messageBoardLocation) && messageBoardLocation && (
        <Marker 
          position={[messageBoardLocation.lat, messageBoardLocation.lng]} 
          icon={MessageBoardIcon}
          eventHandlers={{
            click: () => onMessageBoardClick && onMessageBoardClick()
          }}
        >
          <Popup>
             <div className="text-center p-1">
               <h3 className="font-bold text-yellow-500 uppercase text-xs mb-1">Comm-Link Omega</h3>
               <p className="text-[10px] text-gray-400">Public Message Board</p>
               <button onClick={() => onMessageBoardClick && onMessageBoardClick()} className="mt-1 bg-yellow-600 text-black text-[10px] px-2 py-0.5 rounded font-bold">OPEN</button>
             </div>
          </Popup>
        </Marker>
      )}

      {routeData && (
        <Polyline
          positions={routeData.coordinates.filter(c => isValidCoord(c)).map(c => [c.lat, c.lng])}
          pathOptions={{ color: '#10b981', weight: 6, opacity: 0.8, lineCap: 'round', lineJoin: 'round' }}
        />
      )}

      {showHeatmap && hazardZones.map((zone) => {
        if (!isValidCoord(zone.position)) return null;
        return (
          <Circle
            key={zone.id}
            center={[zone.position.lat, zone.position.lng]}
            radius={zone.radius || 500}
            pathOptions={{
              color: zone.zoneType === 'safe' ? '#22c55e' : getHazardColor(zone.riskLevel),
              fillColor: zone.zoneType === 'safe' ? '#22c55e' : getHazardColor(zone.riskLevel),
              fillOpacity: 0.3,
              weight: 1,
              dashArray: zone.zoneType === 'safe' ? '5,5' : undefined
            }}
          >
            <Popup>
              <div className="p-1">
                <h3 className={`font-bold uppercase flex items-center gap-2 ${zone.zoneType === 'safe' ? 'text-green-500' : 'text-red-500'}`}>
                  {zone.zoneType === 'safe' ? '🛡️ Safe Zone' : '⚠️ High Risk Zone'}
                </h3>
                <p className="text-xs text-gray-300 font-bold">{zone.category.toUpperCase()}</p>
                <p className="text-sm text-gray-200 mt-1">{zone.description}</p>
              </div>
            </Popup>
          </Circle>
        );
      })}

      {/* Official Government Alerts Layer - Strict Validation Added */}
      {showAlerts && officialAlerts && officialAlerts.map(alert => {
        // Filter invalid points first!
        const validPoints = alert.area.filter(c => isValidCoord(c));
        const positions: [number, number][] = validPoints.map(c => [c.lat, c.lng]);
        
        if (positions.length < 3) return null; // Need 3 points for a polygon
        
        return (
          <Polygon 
            key={alert.id}
            positions={positions}
            pathOptions={{ 
              color: '#ef4444', 
              fillColor: '#ef4444', 
              fillOpacity: 0.2, 
              weight: 2, 
              dashArray: '10, 5',
              className: 'hazard-pulse' // Use existing CSS animation
            }}
          >
            <Popup>
              <div className="p-1 border-l-4 border-red-500 pl-2">
                 <h3 className="font-bold text-red-500 uppercase flex items-center gap-2 text-sm">
                   <Siren size={14} className="animate-pulse" /> OFFICIAL ALERT
                 </h3>
                 <div className="text-xs text-gray-400 font-mono mb-1">{alert.source} // {new Date(alert.timestamp).toLocaleTimeString()}</div>
                 <h4 className="font-bold text-white mb-1">{alert.title}</h4>
                 <p className="text-xs text-gray-300 mb-2">{alert.instructions}</p>
                 <div className="bg-red-900/40 text-red-200 text-[10px] p-1 rounded uppercase font-bold text-center">
                   Compliance Mandatory
                 </div>
              </div>
            </Popup>
          </Polygon>
        );
      })}

      {markers.map((marker) => {
        if (!isValidCoord(marker.position)) return null;
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
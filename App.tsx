import React, { useState, useEffect, useRef } from 'react';
import { Coordinates, EvacuationMarker, AppMode, EmergencyContact, HazardZone, RouteData, AlertLevel, BroadcastMessage } from './types';
import MapComponent from './components/Map';
import MarkerModal from './components/MarkerModal';
import ContactsModal from './components/ContactsModal';
import AboutAIModal from './components/AboutAIModal';
import TransmissionModal from './components/TransmissionModal';
import BroadcastReceiver from './components/BroadcastReceiver';
import { Radio, Plus, Map as MapIcon, Locate, Menu, X, CheckCircle, Search, Users, ShieldAlert, Trash2, Flame, Bot, Info, Footprints, Loader2, Navigation, Antenna, Wifi, WifiOff, RefreshCw, Clock, Move } from 'lucide-react';
import { moderateMarkerContent, getStrategicAnalysis, generateBroadcast } from './services/geminiService';

const LOCAL_STORAGE_KEY_MARKERS = 'szczecin_evac_markers';
const LOCAL_STORAGE_KEY_CONTACTS = 'szczecin_evac_contacts';

// Helper for distance calc
const getDistanceInMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
};

// Initial dummy data for Szczecin
const INITIAL_MARKERS: EvacuationMarker[] = [
  {
    id: '1',
    name: 'Galaxy Centrum Shelter',
    description: 'Underground parking reinforced structure. Main gathering point for City Center.',
    position: { lat: 53.4330, lng: 14.5530 },
    createdAt: Date.now(),
    type: 'shelter',
    verificationStatus: 'verified',
    authorName: 'System Admin'
  },
  {
    id: '2',
    name: 'Jasne Błonia Assembly',
    description: 'Large open park area for mass evacuation and helicopter access.',
    position: { lat: 53.4410, lng: 14.5380 },
    createdAt: Date.now(),
    type: 'gathering_point',
    verificationStatus: 'verified',
    authorName: 'System Admin'
  }
];

const App: React.FC = () => {
  // Markers State
  const [markers, setMarkers] = useState<EvacuationMarker[]>([]);
  const [mode, setMode] = useState<AppMode>(AppMode.VIEW);
  const [tempMarkerPos, setTempMarkerPos] = useState<Coordinates | null>(null);
  const [editingMarker, setEditingMarker] = useState<EvacuationMarker | null>(null);
  
  // UI State
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [adminClicks, setAdminClicks] = useState(0); 
  const [isAdmin, setIsAdmin] = useState(false);
  const [showContactsModal, setShowContactsModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showTransmissionModal, setShowTransmissionModal] = useState(false);
  
  // Connectivity State
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Location & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [mapCenter, setMapCenter] = useState<Coordinates>({ lat: 53.4285, lng: 14.5528 });
  const [searchResult, setSearchResult] = useState<Coordinates | null>(null);

  // Intel & Heatmap & Routing State
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [incomingContacts, setIncomingContacts] = useState<EmergencyContact[] | null>(null);
  const [hazardZones, setHazardZones] = useState<HazardZone[]>([]);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [intelHeadlines, setIntelHeadlines] = useState<string[]>([]);
  const [defcon, setDefcon] = useState<{level: number, description: string}>({level: 5, description: "Loading..."});
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);

  // Broadcast Receiver State
  const [broadcasts, setBroadcasts] = useState<BroadcastMessage[]>([]);
  const [alertLevel, setAlertLevel] = useState<AlertLevel>('low');
  const [isReceiverOpen, setIsReceiverOpen] = useState(true);
  const timerRef = useRef<number | null>(null);

  // Custom Navigation State
  const [showNavOptions, setShowNavOptions] = useState(false);
  const [navStartMode, setNavStartMode] = useState<'gps' | 'cursor'>('gps');
  const [navStartPoint, setNavStartPoint] = useState<Coordinates | null>(null);
  const [navTargetId, setNavTargetId] = useState<string>('');

  // Handle Online/Offline Status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load Data
  useEffect(() => {
    const savedMarkers = localStorage.getItem(LOCAL_STORAGE_KEY_MARKERS);
    if (savedMarkers) {
      try {
        const parsedMarkers = JSON.parse(savedMarkers);
        // Validate markers to ensure no NaN coordinates
        const validMarkers = parsedMarkers.filter((m: any) => 
          m.position && 
          typeof m.position.lat === 'number' && 
          typeof m.position.lng === 'number' &&
          !isNaN(m.position.lat) &&
          !isNaN(m.position.lng)
        );
        setMarkers(validMarkers);
      } catch (e) {
        console.error("Failed to parse markers", e);
        setMarkers(INITIAL_MARKERS);
      }
    } else {
      setMarkers(INITIAL_MARKERS);
    }

    const savedContacts = localStorage.getItem(LOCAL_STORAGE_KEY_CONTACTS);
    if (savedContacts) {
      try {
        setContacts(JSON.parse(savedContacts));
      } catch (e) {
         console.error("Failed to parse contacts", e);
      }
    }

    // Check for shared roster in URL
    const params = new URLSearchParams(window.location.search);
    const rosterHash = params.get('roster');
    if (rosterHash) {
      try {
        // Decode: Base64 -> Escape -> URI Component (Handles UTF-8)
        const json = decodeURIComponent(escape(window.atob(rosterHash)));
        const sharedData = JSON.parse(json);
        if (Array.isArray(sharedData)) {
          setIncomingContacts(sharedData);
          setShowContactsModal(true);
        }
      } catch (e) {
        console.error("Failed to parse roster link", e);
      }
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }

    // Fetch AI Analysis (Only if online)
    if (navigator.onLine) {
      const fetchIntel = async () => {
        const report = await getStrategicAnalysis();
        setHazardZones(report.zones);
        setIntelHeadlines(report.headlines);
        setDefcon({
           level: report.defcon.level,
           description: report.defcon.description
        });
      };
      fetchIntel();
    }
  }, []);

  // Broadcast Simulation Loop
  useEffect(() => {
    // Clear existing timer when alert level changes
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
    }

    // Calculate interval based on Alert Level
    // Low: ~45s, Medium: ~25s, High: ~10s
    const getInterval = () => {
      switch (alertLevel) {
        case 'high': return 10000 + Math.random() * 5000;
        case 'medium': return 25000 + Math.random() * 10000;
        case 'low': return 45000 + Math.random() * 15000;
      }
    };

    const fetchBroadcast = async () => {
      // 30% chance to skip if Low to reduce spam
      if (alertLevel === 'low' && Math.random() > 0.7) return;

      const newMsg = await generateBroadcast(alertLevel);
      setBroadcasts(prev => [...prev.slice(-19), newMsg]); // Keep last 20
    };

    // Run immediately once if online
    if (isOnline) {
      fetchBroadcast();
      timerRef.current = window.setInterval(fetchBroadcast, getInterval());
    }

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [alertLevel, isOnline]);

  // Save Data
  useEffect(() => {
    if (markers.length > 0) localStorage.setItem(LOCAL_STORAGE_KEY_MARKERS, JSON.stringify(markers));
  }, [markers]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY_CONTACTS, JSON.stringify(contacts));
  }, [contacts]);

  // Handlers
  const handleLogoClick = () => {
    const newCount = adminClicks + 1;
    setAdminClicks(newCount);
    if (newCount === 5) {
      setIsAdmin(true);
      alert("⚠️ CO-CREATOR MODE ENABLED ⚠️\nYou can now delete markers.");
    }
  };

  const handleMapClick = (pos: Coordinates) => {
    if (pos && !isNaN(pos.lat) && !isNaN(pos.lng)) {
      if (mode === AppMode.ADD_MARKER) {
        setTempMarkerPos(pos);
      } else if (showNavOptions && navStartMode === 'cursor') {
        setNavStartPoint(pos);
      }
    }
  };

  const handleMarkerSubmit = async (name: string, description: string, type: 'shelter' | 'gathering_point' | 'medical') => {
    let verificationStatus: EvacuationMarker['verificationStatus'] = 'pending_sync';
    
    // Only perform AI moderation if online
    if (isOnline) {
      const moderationResult = await moderateMarkerContent(name, description);
      if (!moderationResult.approved) {
        alert(`⛔ REQUEST DENIED BY AI AGENT\n\nReason: ${moderationResult.reason}`);
        return; 
      }
      verificationStatus = 'ai_approved';
    }

    if (editingMarker) {
      // Update existing
      setMarkers(markers.map(m => m.id === editingMarker.id ? { ...m, name, description, type, verificationStatus: isOnline ? 'ai_approved' : 'pending_sync' } : m));
      setEditingMarker(null);
    } else if (tempMarkerPos) {
      // Create new
      const newMarker: EvacuationMarker = {
        id: crypto.randomUUID(),
        name,
        description,
        position: tempMarkerPos,
        createdAt: Date.now(),
        type,
        verificationStatus,
        authorName: 'Community Scout'
      };
      setMarkers([...markers, newMarker]);
      setTempMarkerPos(null);
    }
    
    setMode(AppMode.VIEW);
  };

  const handleSync = async () => {
    if (!isOnline) return;
    setIsSyncing(true);
    
    const pendingMarkers = markers.filter(m => m.verificationStatus === 'pending_sync');
    const processedMarkers = [...markers];
    let approvedCount = 0;
    let rejectedCount = 0;

    for (const marker of pendingMarkers) {
       const result = await moderateMarkerContent(marker.name, marker.description);
       const index = processedMarkers.findIndex(m => m.id === marker.id);
       if (index !== -1) {
         if (result.approved) {
           processedMarkers[index] = { ...processedMarkers[index], verificationStatus: 'ai_approved' };
           approvedCount++;
         } else {
           // If rejected, we might tag it or delete it. For now, let's keep it but mark vaguely or delete.
           // Decision: Delete rejected spam from local storage to keep map clean.
           processedMarkers.splice(index, 1);
           rejectedCount++;
         }
       }
    }

    setMarkers(processedMarkers);
    setIsSyncing(false);
    alert(`Sync Complete.\nApproved: ${approvedCount}\nRejected/Removed: ${rejectedCount}`);
  };

  const deleteMarker = (id: string) => {
    if (confirm("Delete this marker?")) {
      setMarkers(markers.filter(m => m.id !== id));
    }
  };

  const handleGeoLocation = () => {
    if (navigator.geolocation) {
       navigator.geolocation.getCurrentPosition(
         (position) => {
           const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
           if (!isNaN(coords.lat) && !isNaN(coords.lng)) {
             setUserLocation(coords);
             setMapCenter(coords); // Move map to user
           }
         },
         (error) => {
           console.error(error);
           alert("Unable to retrieve location. Please enable GPS permissions.");
         }
       );
    } else {
      alert("Geolocation is not supported by this browser.");
    }
  };

  const calculateCustomRoute = async () => {
    if (!isOnline) {
      alert("Offline Mode: Routing services unavailable.");
      return;
    }

    // 1. Determine Start
    let startCoords: Coordinates | null = null;
    
    if (navStartMode === 'gps') {
      if (userLocation) {
        startCoords = userLocation;
      } else {
        // Try getting GPS now
         await new Promise<void>((resolve) => {
             navigator.geolocation.getCurrentPosition(
             (pos) => {
               const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
               if (!isNaN(c.lat) && !isNaN(c.lng)) {
                 setUserLocation(c);
                 startCoords = c;
               }
               resolve();
             },
             () => {
               alert("GPS Required.");
               resolve();
             }
           );
         });
      }
    } else {
      startCoords = navStartPoint;
    }

    if (!startCoords || isNaN(startCoords.lat) || isNaN(startCoords.lng)) {
      alert("Please define a valid starting location.");
      return;
    }

    // 2. Determine Target
    const targetMarker = markers.find(m => m.id === navTargetId);
    if (!targetMarker) {
      alert("Please select a valid destination.");
      return;
    }

    // 3. Execute
    setIsCalculatingRoute(true);
    setRouteData(null);
    
    try {
      const osrmUrl = `https://router.project-osrm.org/route/v1/foot/${startCoords.lng},${startCoords.lat};${targetMarker.position.lng},${targetMarker.position.lat}?overview=full&geometries=geojson`;
      const response = await fetch(osrmUrl);
      const data = await response.json();

      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        setRouteData({
          coordinates: route.geometry.coordinates.map((c: number[]) => ({ lat: c[1], lng: c[0] })),
          distance: route.distance,
          duration: route.duration,
          startPoint: navStartMode === 'cursor' ? startCoords : undefined
        });
        
        // No longer forcing mapCenter here as the MapComponent's RouteFitter will handle zoom/bounds
        if(window.innerWidth < 768) setSidebarOpen(false); // Close sidebar on mobile
      } else {
        alert("Path calculation failed. Locations might be unreachable.");
      }
    } catch (e) {
      alert("Routing service offline.");
    } finally {
      setIsCalculatingRoute(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOnline) {
      alert("Offline Mode: Search unavailable.");
      return;
    }
    if (!searchQuery) return;
    setIsSearching(true);
    setSearchResult(null); // Clear previous
    
    try {
      // Nominatim Search (OpenStreetMap) bounded to Szczecin area roughly
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery + " Szczecin")}&viewbox=14.3,53.3,14.8,53.6&bounded=1`);
      const data = await response.json();
      
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        // Strict number check
        if (!isNaN(lat) && !isNaN(lon)) {
          const resultCoords = { lat, lng: lon };
          setMapCenter(resultCoords);
          setSearchResult(resultCoords); // Set HUD Target
        } else {
          alert("Invalid coordinates received from search provider.");
        }
      } else {
        alert("Location not found in Szczecin.");
      }
    } catch (err) {
      alert("Search failed. Check connection.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleImportContacts = (newContacts: EmergencyContact[]) => {
    setContacts(prev => [...prev, ...newContacts]);
    setIncomingContacts(null); 
    alert(`Imported ${newContacts.length} contacts to My Crew.`);
  };

  // Helper for DEFCON Color
  const getDefconColor = (level: number) => {
     if (level <= 2) return 'bg-red-600 text-white animate-pulse';
     if (level === 3) return 'bg-yellow-500 text-black';
     if (level === 4) return 'bg-green-600 text-white';
     return 'bg-blue-600 text-white';
  };

  const pendingSyncCount = markers.filter(m => m.verificationStatus === 'pending_sync').length;

  return (
    <div className="flex h-screen w-screen bg-gray-900 overflow-hidden relative font-sans">
      
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 bg-gray-900 border-r border-yellow-500/30 w-80 transform transition-transform duration-300 z-[1100] ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 flex flex-col`}>
        <div className="p-4 border-b border-yellow-500/30 flex items-center justify-between shrink-0">
          <div onClick={handleLogoClick} className="flex items-center gap-2 text-yellow-500 cursor-pointer select-none">
            <Radio className={`animate-pulse ${isAdmin ? 'text-red-500' : ''}`} />
            <span className="font-bold tracking-wider">{isAdmin ? 'ADMIN OVERRIDE' : 'SZCZECIN DEFENSE'}</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-gray-400 hover:text-white">
            <X />
          </button>
        </div>

        {/* Connectivity Status Bar */}
        <div className={`px-4 py-2 text-xs font-bold uppercase flex items-center justify-between ${isOnline ? 'bg-gray-800 text-gray-500' : 'bg-red-900/80 text-white animate-pulse'}`}>
          <div className="flex items-center gap-2">
            {isOnline ? <Wifi size={14} className="text-green-500" /> : <WifiOff size={14} />}
            {isOnline ? 'SYSTEM ONLINE' : 'OFFLINE MODE'}
          </div>
          {isOnline && pendingSyncCount > 0 && (
             <button 
               onClick={handleSync}
               disabled={isSyncing}
               className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300"
             >
               {isSyncing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
               SYNC ({pendingSyncCount})
             </button>
          )}
        </div>

        <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
          {/* DEFCON Status Widget */}
          <button 
             onClick={() => setShowAboutModal(true)}
             className={`w-full mb-6 rounded p-4 border border-gray-700 flex flex-col items-center justify-center gap-2 transition-all hover:scale-105 ${getDefconColor(defcon.level)}`}
          >
             <h2 className="text-3xl font-black tracking-widest">DEFCON {defcon.level}</h2>
             <div className="text-[10px] uppercase font-bold text-center opacity-80">{defcon.description}</div>
             <div className="text-[8px] opacity-60 mt-1">Source: AI Analysis / DefconLevel.com</div>
          </button>

          <h3 className="text-gray-400 text-xs font-bold uppercase mb-3">Tactical Controls</h3>
          
          <div className="space-y-2 mb-6">
            <button
              onClick={() => { setMode(AppMode.ADD_MARKER); setShowNavOptions(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded font-bold transition-all ${
                mode === AppMode.ADD_MARKER 
                  ? 'bg-yellow-500 text-black shadow-[0_0_15px_rgba(234,179,8,0.4)]' 
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <Plus size={18} />
              ADD EVACUATION POINT
            </button>
            <button
              onClick={() => { setMode(AppMode.VIEW); setShowNavOptions(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded font-bold transition-all ${mode === AppMode.VIEW && !showNavOptions ? 'bg-cyan-900/50 text-cyan-400 border border-cyan-500/50' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
            >
              <MapIcon size={18} />
              VIEW MAP
            </button>
            
            {/* Navigation Toggle */}
            <button
              onClick={() => setShowNavOptions(!showNavOptions)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded font-bold transition-all ${showNavOptions ? 'bg-green-900/50 text-green-400 border border-green-500' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
            >
              <Navigation size={18} />
              NAVIGATION
            </button>

            {/* Navigation Drawer */}
            {showNavOptions && (
              <div className="bg-gray-800/50 p-3 rounded border-l-2 border-green-500 space-y-3 animate-in slide-in-from-top-2 duration-200">
                 {/* From */}
                 <div>
                   <label className="text-[10px] uppercase text-gray-500 font-bold">From</label>
                   <div className="flex gap-2 mt-1">
                     <button 
                       onClick={() => setNavStartMode('gps')}
                       className={`flex-1 text-xs py-2 px-2 rounded border flex items-center justify-center gap-1 ${navStartMode === 'gps' ? 'bg-green-700 text-white border-green-500' : 'bg-gray-900 text-gray-400 border-gray-600 hover:bg-gray-700'}`}
                     >
                       <Locate size={12} /> My GPS
                     </button>
                     <button 
                       onClick={() => setNavStartMode('cursor')}
                       className={`flex-1 text-xs py-2 px-2 rounded border flex items-center justify-center gap-1 ${navStartMode === 'cursor' ? 'bg-green-700 text-white border-green-500' : 'bg-gray-900 text-gray-400 border-gray-600 hover:bg-gray-700'}`}
                     >
                       <MapIcon size={12} /> Cursor
                     </button>
                   </div>
                   {navStartMode === 'cursor' && (
                     <div className={`text-[10px] mt-1 text-center ${navStartPoint ? 'text-green-400' : 'text-yellow-500 animate-pulse'}`}>
                       {navStartPoint ? 'Start Point Set' : 'Click Map to set Start'}
                     </div>
                   )}
                 </div>

                 {/* To */}
                 <div>
                   <label className="text-[10px] uppercase text-gray-500 font-bold">To</label>
                   <select 
                     value={navTargetId}
                     onChange={(e) => setNavTargetId(e.target.value)}
                     className="w-full mt-1 bg-gray-900 text-white text-xs p-2 rounded border border-gray-600 focus:border-green-500 outline-none"
                   >
                     <option value="">-- Select Shelter --</option>
                     {markers.map(m => (
                       <option key={m.id} value={m.id}>{m.name}</option>
                     ))}
                   </select>
                 </div>

                 <button
                   onClick={calculateCustomRoute}
                   disabled={isCalculatingRoute || !navTargetId || (navStartMode === 'cursor' && !navStartPoint) || !isOnline}
                   className="w-full bg-green-600 hover:bg-green-500 text-white text-xs font-bold py-2 rounded uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_10px_rgba(34,197,94,0.3)]"
                 >
                   {isCalculatingRoute ? <Loader2 className="animate-spin inline mr-1 h-3 w-3" /> : !isOnline ? 'OFFLINE' : 'CALCULATE ROUTE'}
                 </button>

                 {/* Mission Brief / Results */}
                 {routeData && !isCalculatingRoute && (
                   <div className="mt-3 border-t border-gray-600 pt-3 animate-in fade-in duration-300">
                     <h4 className="text-[10px] text-green-400 font-bold uppercase mb-2 flex items-center gap-1">
                       <CheckCircle size={10} /> Mission Brief
                     </h4>
                     <div className="grid grid-cols-2 gap-2">
                       <div className="bg-gray-900 p-2 rounded text-center border border-gray-700">
                         <Clock size={14} className="mx-auto text-yellow-500 mb-1" />
                         <span className="text-sm font-bold text-white block">{Math.ceil(routeData.duration / 60)} min</span>
                         <span className="text-[9px] text-gray-500 uppercase">Est. Time</span>
                       </div>
                       <div className="bg-gray-900 p-2 rounded text-center border border-gray-700">
                         <Move size={14} className="mx-auto text-blue-500 mb-1" />
                         <span className="text-sm font-bold text-white block">{(routeData.distance / 1000).toFixed(2)} km</span>
                         <span className="text-[9px] text-gray-500 uppercase">Distance</span>
                       </div>
                     </div>
                   </div>
                 )}
              </div>
            )}

            <button
              onClick={() => {
                setShowContactsModal(true);
                setIncomingContacts(null); // Ensure we open local contacts by default unless specified
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded font-bold bg-gray-800 text-gray-300 hover:bg-gray-700 transition-all border border-gray-700 hover:border-cyan-500"
            >
              <Users size={18} />
              ☢ MY CREW ({contacts.length})
            </button>
            <button
              onClick={() => setShowTransmissionModal(true)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded font-bold bg-gray-800 text-purple-400 hover:bg-gray-700 transition-all border border-gray-700 hover:border-purple-500 mt-2"
            >
              <Antenna size={18} />
              TRANSMISSION HUB
            </button>
          </div>

          <h3 className="text-gray-400 text-xs font-bold uppercase mb-3 flex justify-between">
            <span>Locations ({markers.length})</span>
            {isAdmin && <span className="text-red-500">ADMIN</span>}
          </h3>
          
          <div className="space-y-2 pr-1">
            {markers.map(m => (
              <div key={m.id} className={`bg-gray-800/50 p-3 rounded border-l-4 ${m.verificationStatus === 'pending_sync' ? 'border-gray-500 opacity-70' : 'border-yellow-500'} hover:bg-gray-800 transition-colors group relative`}>
                <div className="flex justify-between items-start">
                  <div className="text-sm font-bold text-gray-200 group-hover:text-yellow-400 transition-colors">{m.name}</div>
                  {m.verificationStatus === 'ai_approved' && (
                     <span className="text-[10px] bg-blue-900 text-blue-300 px-1 rounded border border-blue-700">AI</span>
                  )}
                  {m.verificationStatus === 'pending_sync' && (
                     <span className="text-[10px] bg-gray-700 text-gray-300 px-1 rounded border border-gray-600">WAITING</span>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-1 truncate">{m.description}</div>
                
                <div className="flex gap-2 mt-2">
                  <button 
                    onClick={() => setMapCenter(m.position)}
                    className="text-[10px] text-cyan-500 hover:text-cyan-400 uppercase font-bold tracking-wide flex items-center gap-1"
                  >
                    <Locate size={10} /> Jump To
                  </button>
                  <button 
                    onClick={() => setEditingMarker(m)}
                    className="text-[10px] text-yellow-600 hover:text-yellow-400 uppercase font-bold tracking-wide flex items-center gap-1"
                  >
                    Edit
                  </button>
                </div>

                {isAdmin && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteMarker(m.id); }}
                    className="absolute top-2 right-2 p-1 bg-red-900/80 text-red-200 rounded hover:bg-red-600 transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Map Area */}
      <div className="flex-1 h-full md:ml-80 relative flex flex-col">
        
        {/* Intel Ticker */}
        {intelHeadlines.length > 0 && isOnline && (
          <div className="bg-black/80 text-yellow-500 text-xs font-mono py-1 overflow-hidden whitespace-nowrap z-[1000] border-b border-yellow-600/50 shrink-0">
             <div className="inline-block animate-marquee pl-full">
               {intelHeadlines.map((h, i) => (
                 <span key={i} className="mx-8">☢ {h}</span>
               ))}
             </div>
          </div>
        )}

        {/* Search Bar Overlay */}
        <div className="absolute top-12 left-1/2 transform -translate-x-1/2 w-[90%] md:w-[400px] z-[1000]">
          <form onSubmit={handleSearch} className="relative shadow-2xl shadow-black/50">
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isOnline ? "Search street in Szczecin..." : "Search Unavailable (Offline)"}
              disabled={!isOnline}
              className={`w-full bg-gray-900/90 text-white pl-4 pr-12 py-3 rounded-lg border focus:outline-none backdrop-blur-sm ${isOnline ? 'border-yellow-500/30 focus:border-yellow-500' : 'border-red-900/50 opacity-50 cursor-not-allowed'}`}
            />
            <button 
              type="submit" 
              disabled={!isOnline}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 text-gray-400 hover:text-yellow-500 transition-colors"
            >
              {isSearching ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-yellow-500 border-t-transparent" /> : <Search size={20} />}
            </button>
          </form>
        </div>

        <div className="flex-1 relative">
          <MapComponent 
            markers={markers} 
            hazardZones={hazardZones}
            showHeatmap={showHeatmap}
            routeData={routeData}
            mode={mode} 
            onMapClick={handleMapClick} 
            onEditMarker={setEditingMarker}
            center={mapCenter}
            userLocation={userLocation}
            customStartPoint={navStartPoint}
            searchResult={searchResult}
          />

          {/* Mobile Header Toggle */}
          <div className="absolute top-4 left-4 z-[1000] md:hidden">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="bg-gray-900/90 text-yellow-500 p-2 rounded border border-yellow-500/50 backdrop-blur-sm"
            >
              <Menu />
            </button>
          </div>

          {/* Floating Action Buttons */}
          <div className="absolute bottom-8 right-4 z-[1000] flex flex-col gap-3 items-end">
             {/* Heatmap Controls */}
             <div className="flex items-center gap-2">
                {showHeatmap && (
                  <button 
                    onClick={() => setShowAboutModal(true)}
                    className="bg-gray-900/80 text-cyan-400 p-2 rounded-full border border-cyan-500/50 backdrop-blur-sm shadow-lg hover:text-white transition-colors"
                    title="About AI Analysis"
                  >
                    <Info size={20} />
                  </button>
                )}
                <button 
                  onClick={() => setShowHeatmap(!showHeatmap)}
                  className={`p-4 rounded-full border transition-all shadow-lg ${showHeatmap ? 'bg-red-600 text-white border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'bg-gray-800 text-gray-400 border-gray-600'}`}
                  title="Toggle Threat Heatmap"
                >
                  <Flame className={showHeatmap ? 'animate-pulse' : ''} />
                </button>
             </div>

             <button 
               onClick={handleGeoLocation}
               className="bg-cyan-900/90 hover:bg-cyan-800 text-white p-4 rounded-full border border-cyan-500/50 transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] group relative"
             >
               <Locate className="group-hover:animate-ping absolute inline-flex h-full w-full opacity-75" />
               <Locate className="relative" />
             </button>
          </div>

          {/* Mode Indicator Toast */}
          {mode === AppMode.ADD_MARKER && (
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-[1000] bg-yellow-500 text-black px-6 py-3 rounded-full font-bold shadow-[0_0_20px_rgba(234,179,8,0.5)] animate-bounce text-center whitespace-nowrap">
              CLICK MAP TO PLACE MARKER
            </div>
          )}
           {showNavOptions && navStartMode === 'cursor' && !navStartPoint && (
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-[1000] bg-green-500 text-black px-6 py-3 rounded-full font-bold shadow animate-bounce text-center whitespace-nowrap">
              CLICK MAP TO SET START POINT
            </div>
          )}
        </div>
      </div>

      {/* Broadcast Receiver Widget - Only shows if online or has messages */}
      <BroadcastReceiver 
         messages={broadcasts}
         alertLevel={alertLevel}
         setAlertLevel={setAlertLevel}
         isOpen={isReceiverOpen}
         toggleOpen={() => setIsReceiverOpen(!isReceiverOpen)}
      />

      {/* Modals */}
      {(tempMarkerPos || editingMarker) && (
        <MarkerModal
          position={editingMarker ? editingMarker.position : tempMarkerPos!}
          initialData={editingMarker ? { 
            name: editingMarker.name, 
            description: editingMarker.description, 
            type: editingMarker.type 
          } : undefined}
          onSubmit={handleMarkerSubmit}
          onCancel={() => {
            setTempMarkerPos(null);
            setEditingMarker(null);
            setMode(AppMode.VIEW);
          }}
          isOnline={isOnline}
        />
      )}

      {showContactsModal && (
        <ContactsModal 
          contacts={incomingContacts || contacts}
          onAdd={(c) => setContacts([...contacts, c])}
          onDelete={(id) => setContacts(contacts.filter(c => c.id !== id))}
          onClose={() => {
             setShowContactsModal(false);
             setIncomingContacts(null);
          }}
          currentLocation={userLocation}
          hazardZones={hazardZones}
          importedContacts={incomingContacts ? incomingContacts : undefined}
          onImport={handleImportContacts}
        />
      )}

      {showAboutModal && (
        <AboutAIModal onClose={() => setShowAboutModal(false)} />
      )}

      {showTransmissionModal && (
        <TransmissionModal onClose={() => setShowTransmissionModal(false)} />
      )}
    </div>
  );
};

export default App;
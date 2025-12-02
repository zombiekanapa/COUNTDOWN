
import React, { useState, useEffect, useRef } from 'react';
import { Coordinates, EvacuationMarker, AppMode, EmergencyContact, HazardZone, RouteData, AlertLevel, BroadcastMessage, BroadcastConfig, OfficialAlert } from './types';
import MapComponent from './components/Map';
import MarkerModal from './components/MarkerModal';
import ContactsModal from './components/ContactsModal';
import AboutAIModal from './components/AboutAIModal';
import TransmissionModal from './components/TransmissionModal';
import BroadcastReceiver from './components/BroadcastReceiver';
import EducationModal from './components/EducationModal';
import InventoryModal from './components/InventoryModal'; 
import SignalModal from './components/SignalModal'; 
import MessageBoardModal from './components/MessageBoardModal';
import SyncManagerModal from './components/SyncManagerModal';
import EvaConverterModal from './components/EvaConverterModal'; // New
import { Radio, Plus, Map as MapIcon, Locate, Menu, X, CheckCircle, Search, Users, Trash2, Flame, Info, Loader2, Navigation, Antenna, Wifi, WifiOff, RefreshCw, Clock, Move, Download, EyeOff, Eye, Compass, CloudLightning, Siren, MessageSquareText, Backpack, Zap, BrainCircuit } from 'lucide-react';
import { moderateMarkerContent, getStrategicAnalysis, generateBroadcast } from './services/geminiService';

const LOCAL_STORAGE_KEY_MARKERS = 'szczecin_evac_markers';
const LOCAL_STORAGE_KEY_CONTACTS = 'szczecin_evac_contacts';

interface DeviceOrientationEventiOS extends DeviceOrientationEvent {
  webkitCompassHeading?: number;
}

const App: React.FC = () => {
  // --- STATE ---
  const [markers, setMarkers] = useState<EvacuationMarker[]>([]);
  const [mode, setMode] = useState<AppMode>(AppMode.VIEW);
  const [tempMarkerPos, setTempMarkerPos] = useState<Coordinates | null>(null);
  const [editingMarker, setEditingMarker] = useState<EvacuationMarker | null>(null);
  
  // UI State
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [adminClicks, setAdminClicks] = useState(0); 
  const [isAdmin, setIsAdmin] = useState(false);
  const [stealthMode, setStealthMode] = useState(false);
  const [showCompass, setShowCompass] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  
  // Modals
  const [activeModal, setActiveModal] = useState<'contacts' | 'about' | 'transmission' | 'education' | 'messageBoard' | 'inventory' | 'signal' | 'eva' | null>(null);
  
  // Connectivity
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<'high' | 'medium' | 'low' | 'offline'>('offline');
  
  // Map Data
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [mapCenter, setMapCenter] = useState<Coordinates>({ lat: 53.4285, lng: 14.5528 });
  const [searchResult, setSearchResult] = useState<Coordinates | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Intel
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [incomingContacts, setIncomingContacts] = useState<EmergencyContact[] | null>(null);
  const [hazardZones, setHazardZones] = useState<HazardZone[]>([]);
  const [officialAlerts, setOfficialAlerts] = useState<OfficialAlert[]>([]);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showAlerts, setShowAlerts] = useState(true); 
  const [intelHeadlines, setIntelHeadlines] = useState<string[]>([]);
  const [defcon, setDefcon] = useState<{level: 1 | 2 | 3 | 4 | 5, description: string}>({level: 5, description: "Loading..."});
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [showNavOptions, setShowNavOptions] = useState(false);
  const [navStartMode, setNavStartMode] = useState<'gps' | 'cursor'>('gps');
  const [navStartPoint, setNavStartPoint] = useState<Coordinates | null>(null);
  const [navTargetId, setNavTargetId] = useState<string>('');
  const [locationHistory, setLocationHistory] = useState<Coordinates[]>([]);

  // Broadcasts
  const [broadcasts, setBroadcasts] = useState<BroadcastMessage[]>([]);
  const [broadcastConfig, setBroadcastConfig] = useState<BroadcastConfig>({ frequency: 120, types: ['civil'], enabled: true });
  const [isReceiverOpen, setIsReceiverOpen] = useState(window.innerWidth > 768);
  const timerRef = useRef<number | null>(null);

  // Message Board
  const [publicMessages, setPublicMessages] = useState<any[]>([]);
  const [messageBoardRefreshInterval, setMessageBoardRefreshInterval] = useState<number | null>(null);
  const messageBoardTimerRef = useRef<number | null>(null);

  const pendingSyncMarkers = markers.filter(m => m.verificationStatus === 'pending_sync');
  const pendingCount = pendingSyncMarkers.length;

  useEffect(() => {
    const handleStatus = () => {
      const online = navigator.onLine;
      setIsOnline(online);
      
      if (online) {
        const start = Date.now();
        fetch('https://www.google.com/favicon.ico', { mode: 'no-cors' })
          .then(() => {
            const latency = Date.now() - start;
            setConnectionQuality(latency < 100 ? 'high' : latency < 500 ? 'medium' : 'low');
          })
          .catch(() => setConnectionQuality('low'));
      } else {
        setConnectionQuality('offline');
      }
    };

    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);
    handleStatus();

    const handleOrientation = (e: DeviceOrientationEvent) => {
      const event = e as DeviceOrientationEventiOS;
      if (typeof event.webkitCompassHeading === 'number') {
        setHeading(event.webkitCompassHeading);
      } else if (e.alpha) {
        setHeading(360 - e.alpha);
      }
    };

    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', handleOrientation);
    }

    return () => {
      window.removeEventListener('online', handleStatus);
      window.removeEventListener('offline', handleStatus);
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, []);

  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      setShowSyncModal(true);
    }
  }, [isOnline]);

  useEffect(() => {
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const newLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(newLocation);
        setLocationHistory((prev) => [...prev.slice(-19), newLocation]); 
      },
      (err) => console.error("Geolocation error:", err),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  useEffect(() => {
    try {
      const m = localStorage.getItem(LOCAL_STORAGE_KEY_MARKERS);
      if (m) {
        const parsed = JSON.parse(m);
        const validMarkers = parsed.filter((x: any) => 
          x.position && 
          typeof x.position.lat === 'number' && 
          typeof x.position.lng === 'number' &&
          !isNaN(x.position.lat) &&
          !isNaN(x.position.lng)
        );
        setMarkers(validMarkers);
      }
    } catch(e) { console.error("Error loading markers from localStorage:", e); }

    try {
      const c = localStorage.getItem(LOCAL_STORAGE_KEY_CONTACTS);
      if (c) setContacts(JSON.parse(c));
    } catch(e) { console.error("Error loading contacts from localStorage:", e); }

    const rosterHash = new URLSearchParams(window.location.search).get('roster');
    if (rosterHash) {
      try {
        const json = decodeURIComponent(escape(window.atob(rosterHash)));
        setIncomingContacts(JSON.parse(json));
        setActiveModal('contacts');
        window.history.replaceState({}, '', window.location.pathname);
      } catch(e) { console.error("Error parsing roster link:", e); }
    }

    if (navigator.onLine) {
       getStrategicAnalysis().then(report => {
         setHazardZones(report.zones);
         setIntelHeadlines(report.headlines);
         setDefcon(report.defcon);
         if (report.officialAlerts) setOfficialAlerts(report.officialAlerts);
       }).catch(e => console.error("Strategic analysis failed:", e));
    }
  }, []);

  useEffect(() => { if(markers.length) localStorage.setItem(LOCAL_STORAGE_KEY_MARKERS, JSON.stringify(markers)); }, [markers]);
  useEffect(() => { localStorage.setItem(LOCAL_STORAGE_KEY_CONTACTS, JSON.stringify(contacts)); }, [contacts]);

  useEffect(() => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    if (!broadcastConfig.enabled) return;

    const fetchBroadcast = async () => {
      const msg = await generateBroadcast('medium', broadcastConfig.types);
      setBroadcasts(prev => [...prev.slice(-15), msg]);
    };

    if (isOnline) {
      fetchBroadcast();
      timerRef.current = window.setInterval(fetchBroadcast, Math.max(10000, broadcastConfig.frequency * 1000));
    }
    return () => { if (timerRef.current) window.clearInterval(timerRef.current); };
  }, [broadcastConfig, isOnline]);

  useEffect(() => {
    if (messageBoardTimerRef.current) window.clearInterval(messageBoardTimerRef.current);
    if (!isOnline) return;

    const fetchPublicMessages = async () => {
      setPublicMessages([
        { id: 'pb1', text: "Jagiellońska 11th November LOST CAT! Call 513943126. [AI OK]", urgent: true, timestamp: Date.now() - 1000 * 60 * 5 },
        { id: 'pb2', text: "Seeking medical supplies near Kaskada. Meet at south entrance. [AI OK]", urgent: true, timestamp: Date.now() - 1000 * 60 * 15 },
        { id: 'pb3', text: "Water distribution at Plac Grunwaldzki - 14:00. Limit 1L per person. [AI OK]", urgent: false, timestamp: Date.now() - 1000 * 60 * 25 },
        { id: 'pb4', text: "FOUND KEYS near Wały Chrobrego. Describe to claim. [AI OK]", urgent: false, timestamp: Date.now() - 1000 * 60 * 45 },
      ]);
    };

    fetchPublicMessages(); 
    messageBoardTimerRef.current = window.setInterval(fetchPublicMessages, 30 * 60 * 1000); 
    
    return () => { if (messageBoardTimerRef.current) window.clearInterval(messageBoardTimerRef.current); };
  }, [isOnline]);

  const handleLogoClick = () => {
    setAdminClicks(prev => prev + 1);
    if (adminClicks + 1 === 5) { setIsAdmin(true); alert("Admin Mode Unlocked"); }
  };

  const handleMapClick = (pos: Coordinates) => {
    if (mode === AppMode.ADD_MARKER) setTempMarkerPos(pos);
    else if (navStartMode === 'cursor') setNavStartPoint(pos);
  };

  const handleMarkerSubmit = async (name: string, description: string, type: any) => {
    let status: EvacuationMarker['verificationStatus'] = 'pending_sync';
    let aiFeedback: string | undefined = undefined; 
    
    if (isOnline) {
      const res = await moderateMarkerContent(name, description);
      
      if (res.status === 'rejected') {
        const message = `Submission Rejected.\n\nReason: ${res.reason}`;
        const suggestion = res.suggestedFix ? `\n\nSuggestion: ${res.suggestedFix}` : '';
        alert(message + suggestion);
        aiFeedback = res.reason + (res.suggestedFix ? ` (Fix: ${res.suggestedFix})` : '');
        return;
      }
      
      if (res.status === 'error') {
        alert(`AI Error: ${res.reason}`);
        aiFeedback = `AI System Error: ${res.reason}`;
        status = 'pending_sync';
      } else { 
        status = 'ai_approved';
        aiFeedback = res.reason || "Approved by AI.";
      }
    }

    const newM = {
      id: editingMarker?.id || crypto.randomUUID(),
      name, description, type,
      position: tempMarkerPos || editingMarker!.position, 
      createdAt: Date.now(),
      verificationStatus: status,
      authorName: 'Scout',
      aiVerificationDetails: aiFeedback 
    } as EvacuationMarker;

    setMarkers(prev => editingMarker ? prev.map(m => m.id === editingMarker.id ? newM : m) : [...prev, newM]);
    setTempMarkerPos(null);
    setEditingMarker(null);
    setMode(AppMode.VIEW);
  };

  const handleBatchSync = async (markersToSync: EvacuationMarker[]) => {
    setIsSyncing(true);
    setShowSyncModal(false);
    
    const updatedMarkers = [...markers];
    let syncCount = 0;
    
    await new Promise(r => setTimeout(r, 800)); 

    for (const marker of markersToSync) {
      const idx = updatedMarkers.findIndex(m => m.id === marker.id);
      if (idx === -1) continue;

      syncCount++;
      const res = await moderateMarkerContent(marker.name, marker.description);
      
      if (res.status === 'approved') {
        updatedMarkers[idx] = { 
            ...updatedMarkers[idx], 
            verificationStatus: 'ai_approved',
            aiVerificationDetails: res.reason || "Approved during sync."
        };
      } else if (res.status === 'rejected') {
        updatedMarkers.splice(idx, 1); 
      } else { 
        updatedMarkers[idx] = {
            ...updatedMarkers[idx],
            verificationStatus: 'pending_sync',
            aiVerificationDetails: `Sync Error: ${res.reason}`
        };
      }
    }
    
    setMarkers(updatedMarkers);
    setIsSyncing(false);
    if (syncCount > 0) alert(`Sync Complete. Processed ${syncCount} items.`);
  };

  const handleDiscardMarkers = (ids: string[]) => {
    setMarkers(prev => prev.filter(m => !ids.includes(m.id)));
  };

  const calculateCustomRoute = async () => {
    if (!isOnline) return alert("Offline: Cannot calculate route.");
    const start = navStartMode === 'gps' ? userLocation : navStartPoint;
    const target = markers.find(m => m.id === navTargetId);
    
    if (!start || !target) return alert("Navigation Error: Start point or destination not set.");
    
    setIsCalculatingRoute(true);
    try {
      if (isNaN(start.lat) || isNaN(start.lng) || isNaN(target.position.lat) || isNaN(target.position.lng)) {
        alert("Navigation Error: Invalid coordinates for route calculation.");
        return;
      }

      const res = await fetch(`https://router.project-osrm.org/route/v1/foot/${start.lng},${start.lat};${target.position.lng},${target.position.lat}?overview=full&geometries=geojson`);
      const data = await res.json();
      
      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        setRouteData({
          coordinates: data.routes[0].geometry.coordinates.map((c: any) => ({ lat: c[1], lng: c[0] })).filter((c: Coordinates) => !isNaN(c.lat) && !isNaN(c.lng)),
          distance: data.routes[0].distance,
          duration: data.routes[0].duration,
          startPoint: navStartMode === 'cursor' ? start : undefined
        });
        if(window.innerWidth < 768) setSidebarOpen(false); 
      } else {
        alert("Navigation Error: No route found or OSRM service issue.");
      }
    } catch (error) { 
      console.error("Route calculation failed:", error);
      alert("Navigation Error: Could not reach routing service."); 
    }
    setIsCalculatingRoute(false);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOnline || !searchQuery) return;
    setIsSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery + " Szczecin")}&bounded=1&viewbox=14.3,53.3,14.8,53.6`, {
          headers: { 'User-Agent': 'SzczecinEvacuationMap/1.0' }
      });
      const data = await res.json();
      if (data?.[0]) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        if (!isNaN(lat) && !isNaN(lng)) {
          const c = { lat, lng };
          setMapCenter(c);
          setSearchResult(c);
        } else {
          alert("Search Error: Invalid coordinates received from search service.");
        }
      } else alert("Search Error: Location not found in Szczecin.");
    } catch (error) { 
      console.error("Search failed:", error);
      alert("Search Error: Could not perform search."); 
    }
    setIsSearching(false);
  };

  const messageBoardLocation: Coordinates = { lat: 53.4258, lng: 14.5516 }; 

  return (
    <div className={`flex h-screen w-screen bg-gray-900 overflow-hidden font-sans ${stealthMode ? 'grayscale contrast-150' : ''}`}>
      
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 bg-gray-900 border-r border-yellow-500/30 w-80 z-[1100] transition-transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 flex flex-col`}>
        <div className="p-4 border-b border-yellow-500/30 flex justify-between items-center bg-gray-950">
          <div onClick={handleLogoClick} className="flex items-center gap-2 text-yellow-500 cursor-pointer">
            <Radio className={`animate-pulse ${isAdmin ? 'text-red-500' : ''}`} />
            <span className="font-bold tracking-widest">SZCZECIN DEFENSE</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-white"><X /></button>
        </div>

        <div className="px-4 py-3 border-b border-gray-800 flex justify-between items-center bg-gray-900">
           <div className="flex items-center gap-2 text-xs font-bold">
             <div className="flex gap-0.5">
                <div className={`w-1 h-3 rounded ${connectionQuality !== 'offline' ? 'bg-green-500' : 'bg-gray-700'}`}></div>
                <div className={`w-1 h-3 rounded ${['high', 'medium'].includes(connectionQuality) ? 'bg-green-500' : 'bg-gray-700'}`}></div>
                <div className={`w-1 h-3 rounded ${connectionQuality === 'high' ? 'bg-green-500' : 'bg-gray-700'}`}></div>
             </div>
             <span className={isOnline ? 'text-green-500' : 'text-red-500'}>
               {isOnline ? (connectionQuality === 'high' ? 'STRONG LINK' : 'WEAK LINK') : 'DISCONNECTED'}
             </span>
           </div>
           
           <button 
             onClick={() => setShowSyncModal(true)}
             disabled={!isOnline || isSyncing || pendingCount === 0}
             className={`p-1 rounded text-[10px] font-bold uppercase flex items-center gap-1 transition-colors 
               ${pendingCount > 0 ? (isOnline ? 'bg-orange-500/20 text-orange-400 border border-orange-500 animate-pulse' : 'bg-gray-800 text-gray-500') : 'bg-gray-800 text-gray-500 hover:text-white'}`}
           >
             <CloudLightning size={12} />
             {isSyncing ? 'UPLOADING...' : `SYNC (${pendingCount})`}
           </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
           <button onClick={() => setActiveModal('about')} className={`mb-6 p-4 rounded text-center border cursor-pointer hover:scale-105 transition-transform w-full ${defcon.level <= 2 ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'}`}>
              <h2 className="text-3xl font-black">DEFCON {defcon.level}</h2>
              <div className="text-[9px] uppercase">{defcon.description}</div>
           </button>

           <div className="space-y-2 mb-6">
             <button onClick={() => setMode(AppMode.ADD_MARKER)} className={`w-full p-3 rounded font-bold flex gap-2 ${mode === AppMode.ADD_MARKER ? 'bg-yellow-500 text-black' : 'bg-gray-800 text-gray-300'}`}><Plus size={18}/> ADD MARKER</button>
             <button onClick={() => setMode(AppMode.VIEW)} className="w-full p-3 rounded font-bold bg-gray-800 text-gray-300 flex gap-2"><MapIcon size={18}/> VIEW MAP</button>
             
             <button onClick={() => setShowNavOptions(!showNavOptions)} className={`w-full p-3 rounded font-bold flex gap-2 ${showNavOptions ? 'bg-green-900/50 text-green-400 border border-green-500' : 'bg-gray-800 text-gray-300'}`}><Navigation size={18}/> NAVIGATE</button>
             {showNavOptions && (
               <div className="bg-gray-800/50 p-3 rounded border-l-2 border-green-500 space-y-2 text-sm">
                 <div className="flex gap-2">
                   <button onClick={() => setNavStartMode('gps')} className={`flex-1 p-1 rounded border ${navStartMode === 'gps' ? 'bg-green-700' : 'bg-gray-900'}`}>GPS</button>
                   <button onClick={() => setNavStartMode('cursor')} className={`flex-1 p-1 rounded border ${navStartMode === 'cursor' ? 'bg-green-700' : 'bg-gray-900'}`}>Cursor</button>
                 </div>
                 {navStartMode === 'cursor' && <div className="text-[10px] text-green-400 text-center">{navStartPoint ? "Start Set: " + navStartPoint.lat.toFixed(4) : "Click Map to Set Start"}</div>}
                 
                 <select onChange={e => setNavTargetId(e.target.value)} value={navTargetId} className="w-full bg-gray-900 border border-gray-600 rounded p-1 text-white">
                   <option value="">Select Destination</option>
                   {markers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                 </select>
                 
                 <button onClick={calculateCustomRoute} disabled={isCalculatingRoute || !navTargetId || (!userLocation && navStartMode === 'gps') || (!navStartPoint && navStartMode === 'cursor')} className="w-full bg-green-600 text-white font-bold p-2 rounded disabled:opacity-50">
                   {isCalculatingRoute ? <Loader2 className="animate-spin mx-auto"/> : "CALC ROUTE"}
                 </button>

                 {routeData && (
                   <div className="flex justify-between text-[10px] text-gray-300 bg-gray-900 p-2 rounded border border-gray-700">
                     <span className="flex gap-1 items-center text-green-400 font-bold"><Clock size={12}/> {Math.ceil(routeData.duration/60)} MIN</span>
                     <span className="flex gap-1 items-center text-blue-400 font-bold"><Move size={12}/> {(routeData.distance/1000).toFixed(2)} KM</span>
                   </div>
                 )}
               </div>
             )}
             
             <div className="pt-4 border-t border-gray-700 space-y-2">
                 <h3 className="text-gray-500 text-[10px] font-bold uppercase">Tactical Tools</h3>
                 <button onClick={() => setActiveModal('eva')} className="w-full p-2 rounded text-xs font-bold bg-purple-900/40 text-purple-400 border border-purple-700 flex items-center gap-2 hover:bg-purple-900/60 transition-colors"><BrainCircuit size={16}/> PROTOCOL DECRYPTOR (EVA-01)</button>
                 <button onClick={() => setActiveModal('inventory')} className="w-full p-2 rounded text-xs font-bold bg-green-900/40 text-green-400 border border-green-700 flex items-center gap-2 hover:bg-green-900/60 transition-colors"><Backpack size={16}/> THE BACKPACK</button>
                 <button onClick={() => setActiveModal('signal')} className="w-full p-2 rounded text-xs font-bold bg-red-900/40 text-red-400 border border-red-700 flex items-center gap-2 hover:bg-red-900/60 transition-colors"><Zap size={16}/> VISUAL SOS</button>
             </div>

             <div className="pt-2 border-t border-gray-700 space-y-2">
                <button onClick={() => { setActiveModal('contacts'); setIncomingContacts(null); }} className="w-full p-2 rounded text-xs font-bold bg-gray-800 text-gray-300 flex gap-2"><Users size={16}/> MY CREW</button>
                <button onClick={() => setActiveModal('messageBoard')} className="w-full p-2 rounded text-xs font-bold bg-gray-800 text-yellow-300 flex gap-2"><MessageSquareText size={16}/> COMM-LINK OMEGA</button>
                <button onClick={() => setActiveModal('transmission')} className="w-full p-2 rounded text-xs font-bold bg-gray-800 text-purple-400 flex gap-2"><Antenna size={16}/> TRANSMISSION HUB</button>
                <button onClick={() => setActiveModal('education')} className="w-full p-2 rounded text-xs font-bold bg-gray-800 text-orange-400 flex gap-2"><Download size={16}/> MANUAL</button>
             </div>
           </div>
           
           <div className="mb-4">
              <button 
                onClick={() => setStealthMode(!stealthMode)} 
                className={`w-full p-2 rounded border text-xs font-bold uppercase flex items-center justify-center gap-2 transition-all ${stealthMode ? 'bg-black text-gray-400 border-gray-700' : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-white'}`}
              >
                {stealthMode ? <EyeOff size={14} /> : <Eye size={14} />} 
                {stealthMode ? 'Stealth Mode: ON' : 'Stealth Mode: OFF'}
              </button>
           </div>

           <div className="space-y-2">
             <h3 className="text-gray-500 text-xs font-bold uppercase">Points of Interest</h3>
             {markers.length === 0 && <div className="text-gray-600 text-xs text-center py-4">No markers active.</div>}
             {markers.map(m => (
               <div key={m.id} className="bg-gray-800/50 p-2 rounded border-l-2 border-yellow-500 relative group">
                 <div className="font-bold text-sm text-gray-200">{m.name}</div>
                 <div className="text-[10px] text-gray-400 truncate">{m.description}</div>
                 {m.aiVerificationDetails && (
                   <div className="text-[9px] text-red-400 font-mono mt-1 flex items-center gap-1">
                     <Info size={10} /> AI Note: {m.aiVerificationDetails}
                   </div>
                 )}
                 <div className="flex gap-2 mt-2">
                    <button onClick={() => setMapCenter(m.position)} className="text-[10px] text-cyan-400 uppercase font-bold flex gap-1"><Locate size={10}/> Jump</button>
                    <button onClick={() => {setEditingMarker(m); setTempMarkerPos(m.position);}} className="text-[10px] text-yellow-500 uppercase font-bold flex gap-1">Edit</button>
                 </div>
                 {isAdmin && <button onClick={() => setMarkers(prev => prev.filter(x => x.id !== m.id))} className="absolute top-2 right-2 text-red-500 hover:text-red-400"><Trash2 size={12}/></button>}
               </div>
             ))}
           </div>
        </div>
      </div>

      <div className={`flex-1 h-full md:ml-80 relative flex flex-col ${stealthMode ? 'bg-black' : ''}`}>
        {!stealthMode && isOnline && intelHeadlines.length > 0 && (
          <div className="bg-black text-yellow-500 text-[10px] font-mono whitespace-nowrap overflow-hidden border-b border-yellow-600/50">
             <div className="inline-block animate-marquee pl-full">
                {intelHeadlines.map((h, i) => (
                    <span key={i} className="mx-8">
                        {h.toUpperCase().includes("URGENT") || h.toUpperCase().includes("ALERT") ? <span className="animate-pulse text-red-500 font-bold mr-2">❕❗❕❗</span> : '☢ '}
                        {h}
                    </span>
                ))}
             </div>
          </div>
        )}

        {!stealthMode && (
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-3/4 max-w-sm z-[1000]">
           <form onSubmit={handleSearch} className="relative">
             <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} disabled={!isOnline} className="w-full bg-gray-900/90 text-white pl-3 pr-10 py-2 rounded-lg border border-yellow-500/30 focus:border-yellow-500 outline-none backdrop-blur-sm" placeholder="Search Szczecin..." />
             <button type="submit" disabled={!isOnline} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-yellow-500">{isSearching ? <Loader2 className="animate-spin" size={16}/> : <Search size={16}/>}</button>
           </form>
        </div>
        )}

        <div className="flex-1 relative">
          <MapComponent 
             markers={markers} hazardZones={hazardZones} officialAlerts={officialAlerts} 
             showHeatmap={showHeatmap} showAlerts={showAlerts} routeData={routeData} mode={mode}
             onMapClick={handleMapClick} onEditMarker={setEditingMarker} center={mapCenter} userLocation={userLocation}
             customStartPoint={navStartPoint} searchResult={searchResult}
             messageBoardLocation={messageBoardLocation}
             onMessageBoardClick={() => setActiveModal('messageBoard')}
          />
          
          <button onClick={() => setSidebarOpen(true)} className="md:hidden absolute top-4 left-4 z-[1000] bg-gray-900/90 text-yellow-500 p-2 rounded border border-yellow-500/50"><Menu/></button>

          {!stealthMode && showCompass && heading !== null && (
            <div className="absolute top-24 right-4 z-[1000] w-16 h-16 bg-black/50 rounded-full border-2 border-white/30 backdrop-blur-sm flex items-center justify-center shadow-lg transition-transform" style={{ transform: `rotate(${-heading}deg)` }}>
               <div className="w-1 h-3 bg-red-500 absolute top-0.5 rounded-full"></div>
               <div className="text-[10px] font-bold text-white mt-4">N</div>
            </div>
          )}
          
          <div className="absolute bottom-24 right-4 z-[1000] flex flex-col gap-2 md:bottom-8">
             <button onClick={() => setShowCompass(!showCompass)} className={`p-3 rounded-full border shadow-lg hidden md:flex ${showCompass ? 'bg-blue-600 border-blue-400 text-white' : 'bg-gray-800 border-gray-600 text-gray-400'}`} title="Toggle Compass"><Compass size={20}/></button>
             
             {/* Alert Toggle */}
             <button onClick={() => setShowAlerts(!showAlerts)} className={`p-3 rounded-full border shadow-lg ${showAlerts ? 'bg-red-600 border-red-400 text-white animate-pulse' : 'bg-gray-800 border-gray-600 text-gray-400'}`} title="Gov Alerts"><Siren size={20}/></button>
             
             <button onClick={() => setShowHeatmap(!showHeatmap)} className={`p-3 rounded-full border shadow-lg ${showHeatmap ? 'bg-orange-600 border-orange-400 text-white' : 'bg-gray-800 border-gray-600 text-gray-400'}`} title="Heatmap"><Flame size={20}/></button>
             <button onClick={() => navigator.geolocation.getCurrentPosition(p => { const c = {lat: p.coords.latitude, lng: p.coords.longitude}; setUserLocation(c); setMapCenter(c); })} className="bg-cyan-900/90 text-white p-3 rounded-full border border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.3)]"><Locate size={20}/></button>
          </div>
          
          {mode === AppMode.ADD_MARKER && <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[1000] bg-yellow-500 text-black px-4 py-2 rounded-full font-bold shadow-lg animate-bounce text-xs">CLICK MAP TO PLACE</div>}
        </div>
      </div>

      <BroadcastReceiver messages={broadcasts} config={broadcastConfig} setConfig={setBroadcastConfig} isOpen={isReceiverOpen} toggleOpen={() => setIsReceiverOpen(!isReceiverOpen)} />
      
      {showSyncModal && (
        <SyncManagerModal 
           pendingMarkers={pendingSyncMarkers} 
           onSync={handleBatchSync} 
           onDiscard={handleDiscardMarkers} 
           onClose={() => setShowSyncModal(false)} 
        />
      )}

      {(tempMarkerPos || editingMarker) && (
        <MarkerModal
          position={editingMarker ? editingMarker.position : tempMarkerPos!}
          initialData={editingMarker ? { name: editingMarker.name, description: editingMarker.description, type: editingMarker.type, aiVerificationDetails: editingMarker.aiVerificationDetails } : undefined}
          onSubmit={handleMarkerSubmit} onCancel={() => { setTempMarkerPos(null); setEditingMarker(null); setMode(AppMode.VIEW); }}
          isOnline={isOnline}
        />
      )}

      {activeModal === 'contacts' && <ContactsModal contacts={incomingContacts || contacts} onAdd={c => setContacts([...contacts, c])} onDelete={id => setContacts(contacts.filter(c => c.id !== id))} onClose={() => {setActiveModal(null); setIncomingContacts(null);}} currentLocation={userLocation} hazardZones={hazardZones} importedContacts={incomingContacts || undefined} onImport={c => { setContacts(p => [...p, ...c]); setIncomingContacts(null); }} />}
      {activeModal === 'about' && <AboutAIModal onClose={() => setActiveModal(null)} />}
      {activeModal === 'transmission' && <TransmissionModal onClose={() => setActiveModal(null)} />}
      {activeModal === 'education' && <EducationModal onClose={() => setActiveModal(null)} />}
      {activeModal === 'inventory' && <InventoryModal onClose={() => setActiveModal(null)} />}
      {activeModal === 'signal' && <SignalModal onClose={() => setActiveModal(null)} />}
      {activeModal === 'eva' && <EvaConverterModal onClose={() => setActiveModal(null)} />}
      {activeModal === 'messageBoard' && <MessageBoardModal messages={publicMessages} onSubmitMessage={async (text) => {
        const moderation = await moderateMarkerContent("PublicMsg", text);
        if(moderation.status === 'approved') {
             setPublicMessages(prev => [{id: crypto.randomUUID(), text: `[AI OK] ${text}`, urgent: false, timestamp: Date.now()}, ...prev]);
        } else {
            alert(`Message blocked: ${moderation.reason}`);
        }
      }} onClose={() => setActiveModal(null)} />}
    </div>
  );
};
export default App;

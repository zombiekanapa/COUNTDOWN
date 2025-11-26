import React, { useState, useEffect, useRef } from 'react';
import { Coordinates, EvacuationMarker, AppMode, EmergencyContact, HazardZone, RouteData, AlertLevel, BroadcastMessage, BroadcastConfig } from './types';
import MapComponent from './components/Map';
import MarkerModal from './components/MarkerModal';
import ContactsModal from './components/ContactsModal';
import AboutAIModal from './components/AboutAIModal';
import TransmissionModal from './components/TransmissionModal';
import BroadcastReceiver from './components/BroadcastReceiver';
import TacticalPlayer from './components/TacticalPlayer';
import EducationModal from './components/EducationModal';
import { Radio, Plus, Map as MapIcon, Locate, Menu, X, CheckCircle, Search, Users, Trash2, Flame, Info, Loader2, Navigation, Antenna, Wifi, WifiOff, RefreshCw, Clock, Move, Download } from 'lucide-react';
import { moderateMarkerContent, getStrategicAnalysis, generateBroadcast } from './services/geminiService';

const LOCAL_STORAGE_KEY_MARKERS = 'szczecin_evac_markers';
const LOCAL_STORAGE_KEY_CONTACTS = 'szczecin_evac_contacts';

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
  
  // Modals
  const [activeModal, setActiveModal] = useState<'contacts' | 'about' | 'transmission' | 'education' | null>(null);
  
  // Connectivity
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Map Data
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [mapCenter, setMapCenter] = useState<Coordinates>({ lat: 53.4285, lng: 14.5528 });
  const [searchResult, setSearchResult] = useState<Coordinates | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Intel / Nav
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [incomingContacts, setIncomingContacts] = useState<EmergencyContact[] | null>(null);
  const [hazardZones, setHazardZones] = useState<HazardZone[]>([]);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [intelHeadlines, setIntelHeadlines] = useState<string[]>([]);
  const [defcon, setDefcon] = useState({level: 5, description: "Loading..."});
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [showNavOptions, setShowNavOptions] = useState(false);
  const [navStartMode, setNavStartMode] = useState<'gps' | 'cursor'>('gps');
  const [navStartPoint, setNavStartPoint] = useState<Coordinates | null>(null);
  const [navTargetId, setNavTargetId] = useState<string>('');

  // Broadcasts
  const [broadcasts, setBroadcasts] = useState<BroadcastMessage[]>([]);
  const [broadcastConfig, setBroadcastConfig] = useState<BroadcastConfig>({ frequency: 120, types: ['civil'], enabled: true });
  const [isReceiverOpen, setIsReceiverOpen] = useState(window.innerWidth > 768);
  const timerRef = useRef<number | null>(null);

  // --- EFFECT: Online Status ---
  useEffect(() => {
    const handleStatus = () => {
      const online = navigator.onLine;
      setIsOnline(online);
      if (online && markers.some(m => m.verificationStatus === 'pending_sync')) {
        if(confirm("Connection Restored. Sync pending markers?")) handleSync();
      }
    };
    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);
    return () => {
      window.removeEventListener('online', handleStatus);
      window.removeEventListener('offline', handleStatus);
    };
  }, [markers]);

  // --- EFFECT: Init Data ---
  useEffect(() => {
    // Load Markers
    try {
      const m = localStorage.getItem(LOCAL_STORAGE_KEY_MARKERS);
      if (m) setMarkers(JSON.parse(m).filter((x: any) => !isNaN(x.position.lat)));
    } catch(e) { console.error(e); }

    // Load Contacts
    try {
      const c = localStorage.getItem(LOCAL_STORAGE_KEY_CONTACTS);
      if (c) setContacts(JSON.parse(c));
    } catch(e) { console.error(e); }

    // Check Roster Link
    const rosterHash = new URLSearchParams(window.location.search).get('roster');
    if (rosterHash) {
      try {
        const json = decodeURIComponent(escape(window.atob(rosterHash)));
        setIncomingContacts(JSON.parse(json));
        setActiveModal('contacts');
        window.history.replaceState({}, '', window.location.pathname);
      } catch(e) {}
    }

    // AI Intel
    if (navigator.onLine) {
       getStrategicAnalysis().then(report => {
         setHazardZones(report.zones);
         setIntelHeadlines(report.headlines);
         setDefcon(report.defcon);
       });
    }
  }, []);

  // --- EFFECT: Save Data ---
  useEffect(() => { if(markers.length) localStorage.setItem(LOCAL_STORAGE_KEY_MARKERS, JSON.stringify(markers)); }, [markers]);
  useEffect(() => { localStorage.setItem(LOCAL_STORAGE_KEY_CONTACTS, JSON.stringify(contacts)); }, [contacts]);

  // --- EFFECT: Broadcast Loop ---
  useEffect(() => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    if (!broadcastConfig.enabled) return;

    const fetchBroadcast = async () => {
      const msg = await generateBroadcast('medium', broadcastConfig.types);
      setBroadcasts(prev => [...prev.slice(-15), msg]);
    };

    if (isOnline) {
      fetchBroadcast();
      timerRef.current = window.setInterval(fetchBroadcast, Math.max(60000, broadcastConfig.frequency * 1000));
    }
    return () => { if (timerRef.current) window.clearInterval(timerRef.current); };
  }, [broadcastConfig, isOnline]);

  // --- ACTIONS ---
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
    if (isOnline) {
      const res = await moderateMarkerContent(name, description);
      if (res.status === 'rejected') return alert(`Rejected: ${res.reason}`);
      if (res.status === 'error') return alert("AI Error");
      status = 'ai_approved';
    }

    const newM = {
      id: editingMarker?.id || crypto.randomUUID(),
      name, description, type,
      position: tempMarkerPos || editingMarker!.position,
      createdAt: Date.now(),
      verificationStatus: status,
      authorName: 'Scout'
    } as EvacuationMarker;

    setMarkers(prev => editingMarker ? prev.map(m => m.id === editingMarker.id ? newM : m) : [...prev, newM]);
    setTempMarkerPos(null);
    setEditingMarker(null);
    setMode(AppMode.VIEW);
  };

  const handleSync = async () => {
    setIsSyncing(true);
    const updated = [...markers];
    for (let i = 0; i < updated.length; i++) {
      if (updated[i].verificationStatus === 'pending_sync') {
        const res = await moderateMarkerContent(updated[i].name, updated[i].description);
        if (res.status === 'approved') updated[i].verificationStatus = 'ai_approved';
        else if (res.status === 'rejected') updated.splice(i--, 1);
      }
    }
    setMarkers(updated);
    setIsSyncing(false);
  };

  const calculateCustomRoute = async () => {
    if (!isOnline) return alert("Offline");
    const start = navStartMode === 'gps' ? userLocation : navStartPoint;
    const target = markers.find(m => m.id === navTargetId);
    
    if (!start || !target) return alert("Invalid Start/End");
    
    setIsCalculatingRoute(true);
    try {
      const res = await fetch(`https://router.project-osrm.org/route/v1/foot/${start.lng},${start.lat};${target.position.lng},${target.position.lat}?overview=full&geometries=geojson`);
      const data = await res.json();
      if (data.code === 'Ok') {
        setRouteData({
          coordinates: data.routes[0].geometry.coordinates.map((c: any) => ({ lat: c[1], lng: c[0] })),
          distance: data.routes[0].distance,
          duration: data.routes[0].duration,
          startPoint: navStartMode === 'cursor' ? start : undefined
        });
        if(window.innerWidth < 768) setSidebarOpen(false);
      } else alert("No Route Found");
    } catch { alert("Route Error"); }
    setIsCalculatingRoute(false);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOnline || !searchQuery) return;
    setIsSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery + " Szczecin")}&bounded=1&viewbox=14.3,53.3,14.8,53.6`);
      const data = await res.json();
      if (data?.[0]) {
        const c = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        setMapCenter(c);
        setSearchResult(c);
      } else alert("Not Found");
    } catch { alert("Search Error"); }
    setIsSearching(false);
  };

  const pendingCount = markers.filter(m => m.verificationStatus === 'pending_sync').length;

  return (
    <div className="flex h-screen w-screen bg-gray-900 overflow-hidden font-sans">
      
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 bg-gray-900 border-r border-yellow-500/30 w-80 z-[1100] transition-transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 flex flex-col`}>
        <div className="p-4 border-b border-yellow-500/30 flex justify-between items-center">
          <div onClick={handleLogoClick} className="flex items-center gap-2 text-yellow-500 cursor-pointer">
            <Radio className={`animate-pulse ${isAdmin ? 'text-red-500' : ''}`} />
            <span className="font-bold">SZCZECIN DEFENSE</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-white"><X /></button>
        </div>

        {/* Status */}
        <div className={`px-4 py-2 text-xs font-bold flex justify-between ${isOnline ? 'bg-gray-800 text-gray-400' : 'bg-red-900 text-white'}`}>
           <span className="flex items-center gap-2">{isOnline ? <Wifi size={14} className="text-green-500"/> : <WifiOff size={14}/>} {isOnline ? 'ONLINE' : 'OFFLINE'}</span>
           {pendingCount > 0 && <button onClick={handleSync} className="text-yellow-500 flex gap-1 animate-pulse"><RefreshCw size={12}/> SYNC ({pendingCount})</button>}
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
           {/* Defcon */}
           <div onClick={() => setActiveModal('about')} className={`mb-6 p-4 rounded text-center border cursor-pointer hover:scale-105 transition-transform ${defcon.level <= 2 ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'}`}>
              <h2 className="text-3xl font-black">DEFCON {defcon.level}</h2>
              <div className="text-[9px] uppercase">{defcon.description}</div>
           </div>

           {/* Commands */}
           <div className="space-y-2 mb-6">
             <button onClick={() => setMode(AppMode.ADD_MARKER)} className={`w-full p-3 rounded font-bold flex gap-2 ${mode === AppMode.ADD_MARKER ? 'bg-yellow-500 text-black' : 'bg-gray-800 text-gray-300'}`}><Plus size={18}/> ADD MARKER</button>
             <button onClick={() => setMode(AppMode.VIEW)} className="w-full p-3 rounded font-bold bg-gray-800 text-gray-300 flex gap-2"><MapIcon size={18}/> VIEW MAP</button>
             <button onClick={() => setShowNavOptions(!showNavOptions)} className={`w-full p-3 rounded font-bold flex gap-2 ${showNavOptions ? 'bg-green-900/50 text-green-400 border border-green-500' : 'bg-gray-800 text-gray-300'}`}><Navigation size={18}/> NAVIGATE</button>

             {/* Navigation Panel */}
             {showNavOptions && (
               <div className="bg-gray-800/50 p-3 rounded border-l-2 border-green-500 space-y-2 text-sm">
                 <div className="flex gap-2">
                   <button onClick={() => setNavStartMode('gps')} className={`flex-1 p-1 rounded border ${navStartMode === 'gps' ? 'bg-green-700' : 'bg-gray-900'}`}>GPS</button>
                   <button onClick={() => setNavStartMode('cursor')} className={`flex-1 p-1 rounded border ${navStartMode === 'cursor' ? 'bg-green-700' : 'bg-gray-900'}`}>Cursor</button>
                 </div>
                 {navStartMode === 'cursor' && <div className="text-[10px] text-green-400 text-center">{navStartPoint ? "Start Set" : "Click Map"}</div>}
                 
                 <select onChange={e => setNavTargetId(e.target.value)} value={navTargetId} className="w-full bg-gray-900 border border-gray-600 rounded p-1 text-white">
                   <option value="">Select Destination</option>
                   {markers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                 </select>
                 
                 <button onClick={calculateCustomRoute} disabled={isCalculatingRoute || !navTargetId} className="w-full bg-green-600 text-white font-bold p-2 rounded disabled:opacity-50">
                   {isCalculatingRoute ? <Loader2 className="animate-spin mx-auto"/> : "CALC ROUTE"}
                 </button>

                 {routeData && (
                   <div className="flex justify-between text-[10px] text-gray-300 bg-gray-900 p-2 rounded">
                     <span className="flex gap-1"><Clock size={12}/> {Math.ceil(routeData.duration/60)}m</span>
                     <span className="flex gap-1"><Move size={12}/> {(routeData.distance/1000).toFixed(2)}km</span>
                   </div>
                 )}
               </div>
             )}

             <button onClick={() => { setActiveModal('contacts'); setIncomingContacts(null); }} className="w-full p-3 rounded font-bold bg-gray-800 text-gray-300 flex gap-2"><Users size={18}/> MY CREW</button>
             <button onClick={() => setActiveModal('transmission')} className="w-full p-3 rounded font-bold bg-gray-800 text-purple-400 flex gap-2"><Antenna size={18}/> COMMS</button>
             <button onClick={() => setActiveModal('education')} className="w-full p-3 rounded font-bold bg-gray-800 text-orange-400 flex gap-2"><Download size={18}/> MANUAL</button>
           </div>

           {/* Location List */}
           <div className="space-y-2">
             {markers.map(m => (
               <div key={m.id} className="bg-gray-800/50 p-2 rounded border-l-2 border-yellow-500 relative group">
                 <div className="font-bold text-sm text-gray-200">{m.name}</div>
                 <div className="text-[10px] text-gray-400 truncate">{m.description}</div>
                 <div className="flex gap-2 mt-2">
                    <button onClick={() => setMapCenter(m.position)} className="text-[10px] text-cyan-400 uppercase font-bold flex gap-1"><Locate size={10}/> Jump</button>
                    <button onClick={() => setEditingMarker(m)} className="text-[10px] text-yellow-500 uppercase font-bold flex gap-1">Edit</button>
                 </div>
                 {isAdmin && <button onClick={() => setMarkers(prev => prev.filter(x => x.id !== m.id))} className="absolute top-2 right-2 text-red-500 hover:text-red-400"><Trash2 size={12}/></button>}
               </div>
             ))}
           </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 h-full md:ml-80 relative flex flex-col">
        {/* Ticker */}
        {isOnline && intelHeadlines.length > 0 && (
          <div className="bg-black text-yellow-500 text-[10px] font-mono whitespace-nowrap overflow-hidden border-b border-yellow-600/50">
             <div className="inline-block animate-marquee pl-full">{intelHeadlines.map((h, i) => <span key={i} className="mx-8">☢ {h}</span>)}</div>
          </div>
        )}

        {/* Search */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-3/4 max-w-sm z-[1000]">
           <form onSubmit={handleSearch} className="relative">
             <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} disabled={!isOnline} className="w-full bg-gray-900/90 text-white pl-3 pr-10 py-2 rounded-lg border border-yellow-500/30 focus:border-yellow-500 outline-none backdrop-blur-sm" placeholder="Search Szczecin..." />
             <button type="submit" disabled={!isOnline} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-yellow-500">{isSearching ? <Loader2 className="animate-spin" size={16}/> : <Search size={16}/>}</button>
           </form>
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          <MapComponent 
             markers={markers} hazardZones={hazardZones} showHeatmap={showHeatmap} routeData={routeData} mode={mode}
             onMapClick={handleMapClick} onEditMarker={setEditingMarker} center={mapCenter} userLocation={userLocation}
             customStartPoint={navStartPoint} searchResult={searchResult}
          />
          <TacticalPlayer />
          
          {/* Mobile Menu Btn */}
          <button onClick={() => setSidebarOpen(true)} className="md:hidden absolute top-4 left-4 z-[1000] bg-gray-900/90 text-yellow-500 p-2 rounded border border-yellow-500/50"><Menu/></button>

          {/* Floating Tools */}
          <div className="absolute bottom-24 right-4 z-[1000] flex flex-col gap-2 md:bottom-8">
             <button onClick={() => setShowHeatmap(!showHeatmap)} className={`p-3 rounded-full border shadow-lg ${showHeatmap ? 'bg-red-600 border-red-400 text-white' : 'bg-gray-800 border-gray-600 text-gray-400'}`}><Flame size={20}/></button>
             <button onClick={() => navigator.geolocation.getCurrentPosition(p => { const c = {lat: p.coords.latitude, lng: p.coords.longitude}; setUserLocation(c); setMapCenter(c); })} className="bg-cyan-900/90 text-white p-3 rounded-full border border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.3)]"><Locate size={20}/></button>
          </div>
          
          {/* Add Marker Hint */}
          {mode === AppMode.ADD_MARKER && <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[1000] bg-yellow-500 text-black px-4 py-2 rounded-full font-bold shadow-lg animate-bounce text-xs">CLICK MAP TO PLACE</div>}
        </div>
      </div>

      <BroadcastReceiver messages={broadcasts} config={broadcastConfig} setConfig={setBroadcastConfig} isOpen={isReceiverOpen} toggleOpen={() => setIsReceiverOpen(!isReceiverOpen)} />

      {/* Modals */}
      {(tempMarkerPos || editingMarker) && (
        <MarkerModal
          position={editingMarker ? editingMarker.position : tempMarkerPos!}
          initialData={editingMarker ? { name: editingMarker.name, description: editingMarker.description, type: editingMarker.type } : undefined}
          onSubmit={handleMarkerSubmit} onCancel={() => { setTempMarkerPos(null); setEditingMarker(null); setMode(AppMode.VIEW); }}
          isOnline={isOnline}
        />
      )}

      {activeModal === 'contacts' && <ContactsModal contacts={incomingContacts || contacts} onAdd={c => setContacts([...contacts, c])} onDelete={id => setContacts(contacts.filter(c => c.id !== id))} onClose={() => {setActiveModal(null); setIncomingContacts(null);}} currentLocation={userLocation} hazardZones={hazardZones} importedContacts={incomingContacts || undefined} onImport={c => { setContacts(p => [...p, ...c]); setIncomingContacts(null); }} />}
      {activeModal === 'about' && <AboutAIModal onClose={() => setActiveModal(null)} />}
      {activeModal === 'transmission' && <TransmissionModal onClose={() => setActiveModal(null)} />}
      {activeModal === 'education' && <EducationModal onClose={() => setActiveModal(null)} />}
    </div>
  );
};
export default App;
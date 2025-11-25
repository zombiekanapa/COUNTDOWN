import React, { useState, useEffect } from 'react';
import { Coordinates, EvacuationMarker, AppMode, EmergencyContact, HazardZone, RouteData } from './types';
import MapComponent from './components/Map';
import MarkerModal from './components/MarkerModal';
import ContactsModal from './components/ContactsModal';
import AboutAIModal from './components/AboutAIModal';
import TransmissionModal from './components/TransmissionModal';
import { Radio, Plus, Map as MapIcon, Locate, Menu, X, CheckCircle, Search, Users, ShieldAlert, Trash2, Flame, Bot, Info, Footprints, Loader2, Navigation, Antena } from 'lucide-react';
import { moderateMarkerContent, getStrategicAnalysis } from './services/geminiService';

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
  
  // Location & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [mapCenter, setMapCenter] = useState<Coordinates>({ lat: 53.4285, lng: 14.5528 });
  const [searchResult, setSearchResult] = useState<Coordinates | null>(null);

  // Intel & Heatmap & Routing State
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [hazardZones, setHazardZones] = useState<HazardZone[]>([]);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [intelHeadlines, setIntelHeadlines] = useState<string[]>([]);
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);

  // Custom Navigation State
  const [showNavOptions, setShowNavOptions] = useState(false);
  const [navStartMode, setNavStartMode] = useState<'gps' | 'cursor'>('gps');
  const [navStartPoint, setNavStartPoint] = useState<Coordinates | null>(null);
  const [navTargetId, setNavTargetId] = useState<string>('');

  // Load Data
  useEffect(() => {
    const savedMarkers = localStorage.getItem(LOCAL_STORAGE_KEY_MARKERS);
    if (savedMarkers) setMarkers(JSON.parse(savedMarkers));
    else setMarkers(INITIAL_MARKERS);

    const savedContacts = localStorage.getItem(LOCAL_STORAGE_KEY_CONTACTS);
    if (savedContacts) setContacts(JSON.parse(savedContacts));

    // Fetch AI Analysis
    const fetchIntel = async () => {
      const report = await getStrategicAnalysis();
      setHazardZones(report.zones);
      setIntelHeadlines(report.headlines);
    };
    fetchIntel();
  }, []);

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
    if (mode === AppMode.ADD_MARKER) {
      setTempMarkerPos(pos);
    } else if (showNavOptions && navStartMode === 'cursor') {
      setNavStartPoint(pos);
      // alert("Start Point Set");
    }
  };

  const handleMarkerSubmit = async (name: string, description: string, type: 'shelter' | 'gathering_point' | 'medical') => {
    const moderationResult = await moderateMarkerContent(name, description);

    if (!moderationResult.approved) {
      alert(`⛔ REQUEST DENIED BY AI AGENT\n\nReason: ${moderationResult.reason}`);
      return; 
    }

    if (editingMarker) {
      // Update existing
      setMarkers(markers.map(m => m.id === editingMarker.id ? { ...m, name, description, type } : m));
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
        verificationStatus: 'ai_approved',
        authorName: 'Community Scout'
      };
      setMarkers([...markers, newMarker]);
      setTempMarkerPos(null);
    }
    
    setMode(AppMode.VIEW);
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
           setUserLocation(coords);
           setMapCenter(coords); // Move map to user
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
               setUserLocation(c);
               startCoords = c;
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

    if (!startCoords) {
      alert("Please define a starting location.");
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
        
        // Center map to mid-point roughly or start
        setMapCenter(startCoords);
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

        <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
          {/* Status Panel */}
          <div className="mb-6 bg-gray-800 rounded p-3 border border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center border border-yellow-500">
                <span className="text-xl">☢</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-white">Public Access</div>
                <div className="text-xs text-green-400 flex items-center gap-1">
                  <CheckCircle size={10} /> AI Moderator Active
                </div>
              </div>
            </div>
          </div>

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
                   disabled={isCalculatingRoute || !navTargetId || (navStartMode === 'cursor' && !navStartPoint)}
                   className="w-full bg-green-600 hover:bg-green-500 text-white text-xs font-bold py-2 rounded uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                   {isCalculatingRoute ? <Loader2 className="animate-spin inline mr-1 h-3 w-3" /> : 'Get Path'}
                 </button>
              </div>
            )}

            <button
              onClick={() => setShowContactsModal(true)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded font-bold bg-gray-800 text-gray-300 hover:bg-gray-700 transition-all border border-gray-700 hover:border-cyan-500"
            >
              <Users size={18} />
              ☢ MY CREW ({contacts.length})
            </button>
             <button
              onClick={() => setShowAboutModal(true)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded font-bold bg-gray-800 text-cyan-400 hover:bg-gray-700 transition-all border border-gray-700 hover:border-cyan-500 mt-2"
            >
              <Bot size={18} />
              AI SYSTEM BRIEFING
            </button>
            <button
              onClick={() => setShowTransmissionModal(true)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded font-bold bg-gray-800 text-purple-400 hover:bg-gray-700 transition-all border border-gray-700 hover:border-purple-500 mt-2"
            >
              <Antena size={18} />
              TRANSMISSION HUB
            </button>
          </div>

          <h3 className="text-gray-400 text-xs font-bold uppercase mb-3 flex justify-between">
            <span>Locations ({markers.length})</span>
            {isAdmin && <span className="text-red-500">ADMIN</span>}
          </h3>
          
          <div className="space-y-2 pr-1">
            {markers.map(m => (
              <div key={m.id} className="bg-gray-800/50 p-3 rounded border-l-4 border-yellow-500 hover:bg-gray-800 transition-colors group relative">
                <div className="flex justify-between items-start">
                  <div className="text-sm font-bold text-gray-200 group-hover:text-yellow-400 transition-colors">{m.name}</div>
                  {m.verificationStatus === 'ai_approved' && (
                     <span className="text-[10px] bg-blue-900 text-blue-300 px-1 rounded border border-blue-700">AI</span>
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
        {intelHeadlines.length > 0 && (
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
              placeholder="Search street in Szczecin..."
              className="w-full bg-gray-900/90 text-white pl-4 pr-12 py-3 rounded-lg border border-yellow-500/30 focus:border-yellow-500 focus:outline-none backdrop-blur-sm"
            />
            <button 
              type="submit" 
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
        />
      )}

      {showContactsModal && (
        <ContactsModal 
          contacts={contacts}
          onAdd={(c) => setContacts([...contacts, c])}
          onDelete={(id) => setContacts(contacts.filter(c => c.id !== id))}
          onClose={() => setShowContactsModal(false)}
          currentLocation={userLocation}
          hazardZones={hazardZones}
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
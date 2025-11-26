import React, { useState } from 'react';
import { Play, Pause, SkipForward, SkipBack, Music, Minimize2, Maximize2 } from 'lucide-react';

const TRACK_LIST = [
  { title: "ZombieKanapa - YouTube Protocol", type: "youtube", id: "videoseries?list=PL_JtGzX_s5Ry7Sj-tXqC0I5QzJqQJqQJq" }, // Example Playlist
  { title: "SoundCloud - Trippin", type: "soundcloud", url: "https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/users/384692&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true&visual=true" }
];

const TacticalPlayer: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);

  const currentTrack = TRACK_LIST[currentTrackIndex];

  const handleNext = () => {
    setCurrentTrackIndex((prev) => (prev + 1) % TRACK_LIST.length);
  };

  const handlePrev = () => {
    setCurrentTrackIndex((prev) => (prev - 1 + TRACK_LIST.length) % TRACK_LIST.length);
  };

  return (
    <div className={`fixed top-4 right-16 z-[1050] transition-all duration-300 ${isOpen ? 'w-80' : 'w-12'}`}>
      {!isOpen ? (
        <button 
          onClick={() => setIsOpen(true)}
          className="bg-gray-900 border border-purple-500 text-purple-400 p-3 rounded-full shadow-[0_0_15px_rgba(168,85,247,0.4)] hover:text-white hover:bg-gray-800 transition-all"
        >
          <Music size={20} className="animate-pulse" />
        </button>
      ) : (
        <div className="bg-gray-900/95 border border-purple-500 rounded-lg shadow-2xl backdrop-blur-md overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-purple-900/30 p-2 flex items-center justify-between border-b border-purple-500/30">
            <div className="flex items-center gap-2 text-purple-400 text-xs font-bold uppercase tracking-wider">
              <Music size={14} /> Audio Uplink
            </div>
            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white">
              <Minimize2 size={14} />
            </button>
          </div>

          {/* Player Content */}
          <div className="aspect-video bg-black relative">
            {currentTrack.type === 'youtube' && (
              <iframe 
                width="100%" 
                height="100%" 
                src={`https://www.youtube.com/embed/${currentTrack.id}`} 
                title="YouTube video player" 
                frameBorder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowFullScreen
              ></iframe>
            )}
            {currentTrack.type === 'soundcloud' && (
               <iframe 
                 width="100%" 
                 height="100%" 
                 scrolling="no" 
                 frameBorder="0" 
                 allow="autoplay" 
                 src={currentTrack.url}
               ></iframe>
            )}
          </div>

          {/* Controls */}
          <div className="p-3">
             <div className="text-white text-xs font-bold truncate mb-2">{currentTrack.title}</div>
             <div className="flex justify-between items-center">
                <button onClick={handlePrev} className="text-gray-400 hover:text-white p-2 hover:bg-gray-800 rounded">
                  <SkipBack size={16} />
                </button>
                <div className="text-[10px] text-purple-400 font-mono">CHANNEL {currentTrackIndex + 1}/{TRACK_LIST.length}</div>
                <button onClick={handleNext} className="text-gray-400 hover:text-white p-2 hover:bg-gray-800 rounded">
                  <SkipForward size={16} />
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TacticalPlayer;
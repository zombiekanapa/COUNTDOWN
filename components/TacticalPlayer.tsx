import React, { useState } from 'react';
import { Play, Pause, SkipForward, Disc, Minimize2, Maximize2, Volume2, ExternalLink } from 'lucide-react';

const TRACK_LIST = [
  { type: 'youtube', id: 'video_id_placeholder', title: 'ZombieKanapa - Frequency 1', url: 'https://www.youtube.com/embed/videoseries?list=PLYou_provided_playlist_id' }, // Placeholder based on channel
  { type: 'soundcloud', id: 'sc1', title: 'KanapaTrippin', url: 'https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/users/zombiekanapa' },
  { type: 'audio', id: 'ac1', title: 'Audio.com Collection', url: 'https://audio.com/zombiekanapa/embed' },
];

const TacticalPlayer: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const currentTrack = TRACK_LIST[currentTrackIndex];

  const handleNext = () => {
    setCurrentTrackIndex((prev) => (prev + 1) % TRACK_LIST.length);
  };

  // Note: True autoplay is restricted by browsers, so we render the iframe active on load
  
  return (
    <div className={`fixed z-[1000] transition-all duration-300 ease-in-out ${isOpen ? 'top-20 right-4 w-80' : 'top-20 right-4 w-12 h-12 overflow-hidden rounded-full'}`}>
      
      {/* Minimized State (Toggle Button) */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="w-full h-full bg-purple-900/80 border border-purple-500 flex items-center justify-center text-purple-300 hover:text-white hover:bg-purple-800 shadow-[0_0_15px_rgba(168,85,247,0.4)] animate-pulse"
          title="Open Tactical Player"
        >
          <Disc size={20} className={isPlaying ? 'animate-spin' : ''} />
        </button>
      )}

      {/* Maximized State (Player Deck) */}
      {isOpen && (
        <div className="bg-gray-900/95 border-2 border-purple-500 rounded-lg shadow-2xl backdrop-blur-md overflow-hidden flex flex-col">
          
          {/* Header */}
          <div className="bg-purple-900/50 p-2 flex items-center justify-between border-b border-purple-500/30">
            <div className="flex items-center gap-2 text-purple-300">
              <Disc size={16} className="animate-spin-slow" />
              <span className="text-xs font-bold uppercase tracking-widest">Sonic Uplink</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white"><Minimize2 size={14}/></button>
            </div>
          </div>

          {/* Screen / Visualizer */}
          <div className="aspect-video bg-black relative">
            {/* Embed Loader */}
            <iframe
              key={currentTrack.id}
              src={currentTrack.url}
              title={currentTrack.title}
              className="w-full h-full absolute inset-0"
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>

          {/* Controls */}
          <div className="p-3 bg-gray-900 space-y-2">
            <div className="flex justify-between items-center text-xs text-gray-400 font-mono">
              <span className="truncate max-w-[150px]">{currentTrack.title}</span>
              <span className="text-purple-500 uppercase">{currentTrack.type}</span>
            </div>

            <div className="flex justify-between items-center">
               <div className="flex gap-2">
                 {/* Fake Play Controls (Actual control is via Iframe) */}
                 <div className="text-[10px] text-gray-500 uppercase">External Deck Control</div>
               </div>
               
               <button 
                 onClick={handleNext}
                 className="p-2 hover:bg-purple-500/20 rounded text-purple-400 hover:text-white transition-colors flex items-center gap-1 text-xs font-bold uppercase border border-purple-500/30"
               >
                 Next Signal <SkipForward size={14} />
               </button>
            </div>
          </div>
          
          {/* Footer Link */}
          <a 
            href="https://linktr.ee/zombiekanapa" 
            target="_blank" 
            rel="noreferrer"
            className="block bg-black py-1 text-center text-[9px] text-gray-500 hover:text-purple-400 uppercase tracking-widest"
          >
            Access Full Archive via LinkTree
          </a>
        </div>
      )}
    </div>
  );
};

export default TacticalPlayer;
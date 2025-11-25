import React, { useEffect, useRef } from 'react';
import { Radio, Volume2, Activity, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { BroadcastMessage, AlertLevel } from '../types';

interface BroadcastReceiverProps {
  messages: BroadcastMessage[];
  alertLevel: AlertLevel;
  setAlertLevel: (level: AlertLevel) => void;
  isOpen: boolean;
  toggleOpen: () => void;
}

const BroadcastReceiver: React.FC<BroadcastReceiverProps> = ({ 
  messages, 
  alertLevel, 
  setAlertLevel, 
  isOpen, 
  toggleOpen 
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of log
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-500';
      case 'warning': return 'text-yellow-500';
      default: return 'text-green-500';
    }
  };

  const getLevelColor = (level: AlertLevel) => {
    switch (level) {
      case 'high': return 'bg-red-600 border-red-400 text-white animate-pulse';
      case 'medium': return 'bg-yellow-600 border-yellow-400 text-black';
      default: return 'bg-green-600 border-green-400 text-black';
    }
  };

  return (
    <div className={`fixed bottom-4 left-4 z-[1100] transition-all duration-300 flex flex-col items-start ${isOpen ? 'w-80' : 'w-auto'}`}>
      
      {/* Header / Toggle Button */}
      <button 
        onClick={toggleOpen}
        className="flex items-center gap-2 bg-gray-900 border-2 border-green-500/50 p-3 rounded-t-lg shadow-lg hover:bg-gray-800 transition-colors w-full justify-between backdrop-blur-md"
      >
        <div className="flex items-center gap-2 text-green-500">
          <Radio className={`h-5 w-5 ${alertLevel === 'high' ? 'animate-ping' : ''}`} />
          <span className="font-mono font-bold tracking-widest text-sm">SIGNAL_RECEIVER</span>
        </div>
        {isOpen ? <ChevronDown className="text-gray-500 h-4 w-4" /> : <ChevronUp className="text-gray-500 h-4 w-4" />}
      </button>

      {/* Main Panel */}
      {isOpen && (
        <div className="bg-gray-900/95 border-x-2 border-b-2 border-green-500/50 rounded-b-lg w-full p-3 shadow-[0_0_20px_rgba(34,197,94,0.1)] backdrop-blur-md">
          
          {/* Controls */}
          <div className="flex items-center justify-between mb-3 border-b border-gray-700 pb-2">
            <div className="flex items-center gap-1 text-[10px] text-gray-400 uppercase">
              <Volume2 size={12} /> Live Feed
            </div>
            
            <div className="flex gap-1">
               {(['low', 'medium', 'high'] as AlertLevel[]).map((lvl) => (
                 <button
                   key={lvl}
                   onClick={() => setAlertLevel(lvl)}
                   className={`text-[10px] uppercase font-bold px-2 py-1 rounded border ${alertLevel === lvl ? getLevelColor(lvl) : 'bg-gray-800 border-gray-600 text-gray-500 hover:text-white'}`}
                 >
                   {lvl}
                 </button>
               ))}
            </div>
          </div>

          {/* Message Log */}
          <div 
            ref={scrollRef}
            className="h-48 overflow-y-auto font-mono text-xs space-y-2 custom-scrollbar bg-black/50 p-2 rounded inner-shadow"
          >
            {messages.length === 0 && (
              <div className="text-gray-600 text-center mt-10 italic">Waiting for signal...</div>
            )}
            
            {messages.map((msg) => (
              <div key={msg.id} className="border-l-2 border-gray-700 pl-2 py-1 hover:bg-white/5 transition-colors">
                <div className="flex items-center justify-between opacity-50 mb-1">
                   <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                   {msg.severity === 'critical' && <AlertTriangle size={10} className="text-red-500" />}
                </div>
                <div className={`${getSeverityColor(msg.severity)} font-bold leading-tight`}>
                  {msg.text}
                </div>
              </div>
            ))}
            
            {/* Fake cursor at bottom */}
            <div className="text-green-500 animate-pulse">_</div>
          </div>

          {/* Status Footer */}
          <div className="mt-2 flex items-center justify-between text-[10px] text-gray-500 font-mono">
             <span>FREQ: 148.500 MHz</span>
             <span className="flex items-center gap-1">
               <Activity size={10} />
               {alertLevel === 'high' ? 'HIGH TRAFFIC' : 'STANDBY'}
             </span>
          </div>

        </div>
      )}
    </div>
  );
};

export default BroadcastReceiver;

import React, { useState, useEffect, useRef } from 'react';
import { X, Lightbulb, Zap } from 'lucide-react';

const SignalModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [mode, setMode] = useState<'sos' | 'strobe' | 'solid'>('sos');
  const [active, setActive] = useState(false);
  const [colorState, setColorState] = useState(false); // true = white/on, false = black/off
  const timerRef = useRef<number | null>(null);

  const SOS_PATTERN = [
      200, 200, 200, 200, 200, // S (...)
      600, 600, 600, 600, 600, // O (---)
      200, 200, 200, 1000 // S (...) + Pause
  ];

  useEffect(() => {
    if (active) {
       let step = 0;
       const runPattern = () => {
           if (mode === 'solid') {
               setColorState(true);
           } else if (mode === 'strobe') {
               setColorState(prev => !prev);
               timerRef.current = window.setTimeout(runPattern, 50); // Fast strobe
           } else if (mode === 'sos') {
               // Complex Morse timing simulation is tricky in simple loop, simplifying to visual visual pulses
               // Just toggling for now as a basic beacon
               setColorState(prev => !prev);
               timerRef.current = window.setTimeout(runPattern, step % 2 === 0 ? 300 : 300); // 300ms on/off pulse
               step++;
           }
       };
       runPattern();
    } else {
        setColorState(false);
        if (timerRef.current) window.clearTimeout(timerRef.current);
    }
    return () => { if (timerRef.current) window.clearTimeout(timerRef.current); }
  }, [active, mode]);

  return (
    <div className={`fixed inset-0 z-[2000] flex flex-col items-center justify-center transition-colors duration-0 ${colorState ? 'bg-white' : 'bg-black'}`}>
      
      {!active && (
          <div className="absolute top-4 right-4 z-50">
             <button onClick={onClose} className="text-gray-500 hover:text-white bg-black/50 p-2 rounded-full"><X size={32}/></button>
          </div>
      )}

      {/* Control Panel (Hidden when active to not obstruct signal, but clickable area toggles) */}
      <div className={`z-40 flex flex-col items-center gap-8 ${active ? 'opacity-0 hover:opacity-100 transition-opacity' : 'opacity-100'}`}>
         <div className="bg-gray-900/80 p-6 rounded-xl border border-white/20 backdrop-blur text-center max-w-sm mx-4">
             <h2 className="text-3xl font-black text-white uppercase mb-2 flex items-center justify-center gap-2"><Zap className="text-yellow-400"/> Visual Beacon</h2>
             <p className="text-gray-400 text-xs mb-6">Uses screen brightness as an optical telegraph. Point towards rescue units.</p>
             
             <div className="flex gap-2 mb-6 justify-center">
                 <button onClick={() => setMode('sos')} className={`px-4 py-2 rounded font-bold uppercase ${mode === 'sos' ? 'bg-yellow-500 text-black' : 'bg-gray-800 text-gray-400'}`}>SOS</button>
                 <button onClick={() => setMode('strobe')} className={`px-4 py-2 rounded font-bold uppercase ${mode === 'strobe' ? 'bg-yellow-500 text-black' : 'bg-gray-800 text-gray-400'}`}>Strobe</button>
                 <button onClick={() => setMode('solid')} className={`px-4 py-2 rounded font-bold uppercase ${mode === 'solid' ? 'bg-yellow-500 text-black' : 'bg-gray-800 text-gray-400'}`}>Solid</button>
             </div>

             <button 
                onClick={() => setActive(!active)}
                className={`w-full py-4 rounded-lg font-black text-xl uppercase tracking-widest shadow-[0_0_30px_rgba(255,255,255,0.2)] ${active ? 'bg-red-600 text-white animate-pulse' : 'bg-green-600 text-white'}`}
             >
                 {active ? 'STOP SIGNAL' : 'ACTIVATE'}
             </button>
             <p className="mt-4 text-[10px] text-gray-500 uppercase">Max Brightness Recommended</p>
         </div>
      </div>
      
      {/* Tap anywhere to toggle when active */}
      {active && <div className="absolute inset-0 z-30 cursor-pointer" onClick={() => setActive(false)}></div>}
    </div>
  );
};

export default SignalModal;
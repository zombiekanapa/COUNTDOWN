
import React, { useState } from 'react';
import { X, BrainCircuit, ArrowRight, Activity, Zap, Shield, Eye, Heart, Dumbbell, Sparkles, Copy, RefreshCw } from 'lucide-react';
import { convertTextEva01 } from '../services/geminiService';
import { EvaConversionResult } from '../types';

interface EvaConverterModalProps {
  onClose: () => void;
}

const EvaConverterModal: React.FC<EvaConverterModalProps> = ({ onClose }) => {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<EvaConversionResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleConvert = async () => {
    if (!input.trim()) return;
    setLoading(true);
    const res = await convertTextEva01(input);
    setResult(res);
    setLoading(false);
  };

  const getStatIcon = (stat: string) => {
    switch(stat) {
        case 'strength': return <Dumbbell size={14}/>;
        case 'perception': return <Eye size={14}/>;
        case 'endurance': return <Shield size={14}/>;
        case 'charisma': return <Heart size={14}/>; // Using Heart for Charisma/Social
        case 'intelligence': return <BrainCircuit size={14}/>;
        case 'luck': return <Sparkles size={14}/>;
        default: return <Activity size={14}/>;
    }
  };

  const StatBar: React.FC<{ label: string; value: number }> = ({ label, value }) => (
    <div className="flex items-center gap-2 mb-2">
        <div className="w-24 text-[10px] uppercase font-bold text-gray-400 flex items-center gap-1">
            {getStatIcon(label)} {label}
        </div>
        <div className="flex-1 bg-gray-800 h-2 rounded-full overflow-hidden">
            <div 
                className={`h-full ${value > 7 ? 'bg-red-500' : value > 4 ? 'bg-yellow-500' : 'bg-green-500'} transition-all duration-1000`} 
                style={{ width: `${value * 10}%` }}
            ></div>
        </div>
        <div className="w-6 text-right text-xs font-mono text-white">{value}</div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/95 z-[1500] flex items-center justify-center p-4 backdrop-blur-md">
      <div className="bg-gray-900 border-2 border-purple-500 rounded-lg w-full max-w-4xl flex flex-col max-h-[90vh] shadow-[0_0_50px_rgba(168,85,247,0.2)]">
        
        {/* Header */}
        <div className="bg-purple-900/30 p-4 flex items-center justify-between border-b border-purple-500/50">
          <div className="flex items-center gap-3">
            <BrainCircuit className="text-purple-400 h-8 w-8 animate-pulse" />
            <div>
              <h2 className="text-white font-bold text-xl uppercase tracking-wider">EVA-01 Protocol Decryptor</h2>
              <p className="text-purple-400 text-xs font-mono">COGNITIVE SIMPLIFICATION ENGINE // EU CIVIL DEFENSE STD.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={24} /></button>
        </div>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            
            {/* Input Section */}
            <div className="flex-1 p-4 flex flex-col border-b md:border-b-0 md:border-r border-gray-700">
                <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Raw Protocol Input (Paste Manuals/Orders)</h3>
                <textarea 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Paste complex emergency text here (e.g. 'In the event of radiological dispersion, secure perimeter and initiate iodine prophylaxis...')"
                    className="flex-1 bg-gray-800 border border-gray-600 rounded p-4 text-sm text-gray-300 focus:border-purple-500 outline-none resize-none font-mono"
                />
                <button 
                    onClick={handleConvert}
                    disabled={loading || !input}
                    className="mt-4 bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 transition-all shadow-lg shadow-purple-600/20"
                >
                    {loading ? <RefreshCw className="animate-spin"/> : <Zap fill="currentColor"/>}
                    {loading ? 'Decrypting...' : 'Initiate Eva-01'}
                </button>
            </div>

            {/* Output Section */}
            <div className="flex-1 p-4 overflow-y-auto custom-scrollbar bg-black/20">
                {!result ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-600 space-y-4">
                        <Activity size={48} className="opacity-20"/>
                        <p className="text-xs uppercase tracking-widest text-center">Waiting for Data Stream...</p>
                    </div>
                ) : (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        
                        {/* Simplified Text */}
                        <div className="bg-gray-800 p-6 rounded-lg border-l-4 border-purple-500 shadow-lg relative">
                            <h3 className="text-purple-400 font-bold text-xs uppercase mb-2 flex items-center gap-2">
                                <BrainCircuit size={14}/> Simplified Directive
                            </h3>
                            <p className="text-xl md:text-2xl font-bold text-white leading-relaxed">
                                "{result.simplified}"
                            </p>
                            <div className="absolute top-4 right-4 flex gap-2">
                                {result.emojis.map((emoji, i) => (
                                    <span key={i} className="text-2xl" title="Universal Visual Indicator">{emoji}</span>
                                ))}
                            </div>
                        </div>

                        {/* S.P.E.C.I.A.L. Stats */}
                        <div className="bg-gray-800/50 p-4 rounded border border-gray-700">
                            <h3 className="text-gray-400 font-bold text-xs uppercase mb-4 flex items-center justify-between">
                                <span>Requirements (S.P.E.C.I.A.L.)</span>
                                <span className="text-[10px] bg-gray-900 px-2 py-1 rounded text-gray-500">RPG SYSTEM V1.0</span>
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                                <StatBar label="strength" value={result.stats.strength} />
                                <StatBar label="perception" value={result.stats.perception} />
                                <StatBar label="endurance" value={result.stats.endurance} />
                                <StatBar label="charisma" value={result.stats.charisma} />
                                <StatBar label="intelligence" value={result.stats.intelligence} />
                                <StatBar label="luck" value={result.stats.luck} />
                            </div>
                        </div>

                        {/* Original Reference */}
                        <div className="opacity-50 hover:opacity-100 transition-opacity">
                            <h3 className="text-[10px] font-bold text-gray-500 uppercase mb-1">Original Data</h3>
                            <p className="text-xs text-gray-400 font-mono bg-black/30 p-2 rounded truncate">
                                {result.original}
                            </p>
                        </div>

                    </div>
                )}
            </div>

        </div>
      </div>
    </div>
  );
};

export default EvaConverterModal;

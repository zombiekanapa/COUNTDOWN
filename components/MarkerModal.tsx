import React, { useState, useEffect } from 'react';
import { Coordinates } from '../types';
import { generateSpotDescription } from '../services/geminiService';
import { Loader2, Wand2, ShieldCheck, TriangleAlert, WifiOff } from 'lucide-react';

interface MarkerModalProps {
  position: Coordinates;
  initialData?: { name: string; description: string; type: 'shelter' | 'gathering_point' | 'medical' | 'underground'; aiVerificationDetails?: string; };
  onSubmit: (name: string, description: string, type: 'shelter' | 'gathering_point' | 'medical' | 'underground') => Promise<void>;
  onCancel: () => void;
  isOnline: boolean;
}

const MarkerModal: React.FC<MarkerModalProps> = ({ position, initialData, onSubmit, onCancel, isOnline }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'shelter' | 'gathering_point' | 'medical' | 'underground'>('gathering_point');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setDescription(initialData.description);
      setType(initialData.type);
    }
  }, [initialData]);

  const handleGenerateAI = async () => {
    if (!name || !isOnline) return;
    setIsGenerating(true);
    const desc = await generateSpotDescription(name, position.lat, position.lng);
    setDescription(desc.slice(0, 200)); // Enforce limit
    setIsGenerating(false);
  };

  const handleSubmit = async () => {
    if (!name || !description) return;
    setIsSubmitting(true);
    await onSubmit(name, description, type);
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[1300] p-4 backdrop-blur-sm">
      <div className="bg-gray-900 border-2 border-yellow-500 rounded-lg w-full max-w-md shadow-2xl shadow-yellow-500/20 relative">
        
        {isSubmitting && (
          <div className="absolute inset-0 bg-gray-900/90 z-50 flex flex-col items-center justify-center text-center p-6 rounded-lg">
            <Loader2 className="animate-spin text-yellow-500 w-12 h-12 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">{isOnline ? 'AI Agent is Verifying...' : 'Saving Offline Draft...'}</h3>
            <p className="text-gray-400 text-sm">{isOnline ? 'Checking for civil defense relevance.' : 'Data will be queued for sync.'}</p>
          </div>
        )}

        <div className={`p-3 flex items-center gap-2 ${isOnline ? 'bg-yellow-500' : 'bg-gray-700'}`}>
          {isOnline ? <TriangleAlert className="text-black h-6 w-6" /> : <WifiOff className="text-gray-300 h-6 w-6" />}
          <h2 className={`${isOnline ? 'text-black' : 'text-gray-200'} font-bold text-lg uppercase tracking-wider`}>
            {initialData ? 'Edit Marker' : 'Propose Evacuation Point'}
          </h2>
          {!isOnline && <span className="text-[10px] bg-black text-white px-2 py-0.5 rounded ml-auto uppercase font-bold">Offline Mode</span>}
        </div>
        
        <div className="p-6 space-y-4">
          {!initialData && (
            <div className="bg-gray-800 p-3 rounded text-xs text-gray-300 border border-gray-700">
              <p className="flex items-start gap-2">
                <ShieldCheck className={`w-4 h-4 shrink-0 ${isOnline ? 'text-green-400' : 'text-gray-500'}`} />
                <span>
                  {isOnline 
                    ? "Markers are public. An AI Agent will review your submission immediately."
                    : "You are offline. Marker will be saved as 'Pending Sync' and verified when connection returns."}
                </span>
              </p>
            </div>
          )}

          {/* AI Verification Details Display */}
          {initialData?.aiVerificationDetails && (
            <div className="bg-red-900/30 p-3 rounded text-xs text-red-200 border border-red-700">
              <p className="flex items-start gap-2">
                <TriangleAlert className="w-4 h-4 shrink-0 text-red-400" />
                <span className="font-bold">AI FEEDBACK:</span> {initialData.aiVerificationDetails}
              </p>
            </div>
          )}

          <div>
            <label className="block text-yellow-500 text-xs uppercase font-bold mb-1">Spot Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Plac Grunwaldzki Assembly"
              className="w-full bg-gray-800 border border-gray-700 text-white p-2 rounded focus:border-yellow-500 focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-yellow-500 text-xs uppercase font-bold mb-1">Type</label>
            <select 
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full bg-gray-800 border border-gray-700 text-white p-2 rounded focus:border-yellow-500 focus:outline-none"
            >
              <option value="gathering_point">Gathering Point</option>
              <option value="shelter">Bunker / Shelter</option>
              <option value="medical">Medical Station</option>
              <option value="underground">Underground / Metro</option>
            </select>
          </div>

          <div>
            <div className="flex justify-between items-end mb-1">
              <label className="block text-yellow-500 text-xs uppercase font-bold">Description (Max 200)</label>
              <button
                onClick={handleGenerateAI}
                disabled={!name || isGenerating || !isOnline}
                className="text-xs flex items-center gap-1 text-cyan-400 hover:text-cyan-300 disabled:opacity-50 transition-colors"
                title={!isOnline ? "AI Unavailable Offline" : "Auto-Generate Text"}
              >
                {isGenerating ? <Loader2 className="animate-spin h-3 w-3" /> : <Wand2 className="h-3 w-3" />}
                {isOnline ? 'Auto-Write' : 'AI Offline'}
              </button>
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 200))}
              placeholder="Safety instructions..."
              rows={3}
              maxLength={200}
              className="w-full bg-gray-800 border border-gray-700 text-white p-2 rounded focus:border-yellow-500 focus:outline-none transition-colors"
            />
            <div className="text-right text-[10px] text-gray-500 mt-1">
              {description.length}/200
            </div>
          </div>
        </div>

        <div className="p-4 bg-gray-800/50 flex justify-end gap-3 border-t border-gray-700">
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 text-gray-400 hover:text-white text-sm font-bold uppercase transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name || !description || isSubmitting}
            className={`px-6 py-2 text-black text-sm font-bold uppercase rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg ${isOnline ? 'bg-yellow-500 hover:bg-yellow-400 shadow-yellow-500/50' : 'bg-gray-500 hover:bg-gray-400 shadow-gray-500/50'}`}
          >
            {initialData ? 'Update Details' : isOnline ? 'Verify & Submit' : 'Save Offline'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MarkerModal;
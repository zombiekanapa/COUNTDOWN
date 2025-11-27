import React, { useState } from 'react';
import { EvacuationMarker } from '../types';
import { CloudLightning, Trash2, CheckSquare, Square, X } from 'lucide-react';

interface SyncManagerModalProps {
  pendingMarkers: EvacuationMarker[];
  onSync: (markersToSync: EvacuationMarker[]) => void;
  onDiscard: (markerIds: string[]) => void;
  onClose: () => void;
}

const SyncManagerModal: React.FC<SyncManagerModalProps> = ({ pendingMarkers, onSync, onDiscard, onClose }) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(pendingMarkers.map(m => m.id)));

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const toggleAll = () => {
    if (selectedIds.size === pendingMarkers.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(pendingMarkers.map(m => m.id)));
  };

  const handleSync = () => {
    const toSync = pendingMarkers.filter(m => selectedIds.has(m.id));
    onSync(toSync);
  };

  const handleDiscard = () => {
    const toDiscard = Array.from(selectedIds);
    if (confirm(`Delete ${toDiscard.length} items permanently?`)) {
      onDiscard(toDiscard);
      setSelectedIds(new Set());
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-[1500] flex items-center justify-center p-4 backdrop-blur-md">
      <div className="bg-gray-900 border-2 border-orange-500 rounded-lg w-full max-w-md flex flex-col max-h-[80vh] shadow-[0_0_30px_rgba(249,115,22,0.2)]">
        <div className="p-4 border-b border-orange-500/30 flex justify-between items-center bg-orange-900/20">
          <div className="flex items-center gap-2 text-orange-400">
            <CloudLightning className="animate-pulse" />
            <h2 className="font-bold text-lg uppercase">Offline Data Sync</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X /></button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
          <p className="text-sm text-gray-300 mb-4">
            Connection restored. You have <strong>{pendingMarkers.length}</strong> items created offline. 
            Review and select items to synchronize with the public network.
          </p>

          <div className="flex justify-between items-center mb-2 px-1">
            <button onClick={toggleAll} className="text-xs font-bold text-gray-400 hover:text-white flex items-center gap-2">
              {selectedIds.size === pendingMarkers.length ? <CheckSquare size={14} /> : <Square size={14} />}
              Select All
            </button>
            <span className="text-xs text-gray-500">{selectedIds.size} Selected</span>
          </div>

          <div className="space-y-2">
            {pendingMarkers.map(m => (
              <div key={m.id} onClick={() => toggleSelect(m.id)} className={`p-3 rounded border cursor-pointer flex items-center gap-3 transition-colors ${selectedIds.has(m.id) ? 'bg-orange-900/30 border-orange-500' : 'bg-gray-800 border-gray-700 hover:border-gray-500'}`}>
                <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedIds.has(m.id) ? 'bg-orange-500 border-orange-500 text-black' : 'border-gray-500'}`}>
                  {selectedIds.has(m.id) && <CheckSquare size={12} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-gray-200 text-sm truncate">{m.name}</div>
                  <div className="text-xs text-gray-400 truncate">{m.description}</div>
                </div>
                <div className="text-[10px] uppercase font-mono text-gray-500">{m.type}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-gray-800 flex gap-3 bg-gray-900">
          <button 
            onClick={handleDiscard}
            disabled={selectedIds.size === 0}
            className="px-4 py-2 border border-red-900 text-red-500 hover:bg-red-900/30 rounded text-xs font-bold uppercase flex items-center gap-2 disabled:opacity-50"
          >
            <Trash2 size={14} /> Delete
          </button>
          <button 
            onClick={handleSync}
            disabled={selectedIds.size === 0}
            className="flex-1 bg-orange-600 hover:bg-orange-500 text-white py-2 rounded text-sm font-bold uppercase shadow-lg shadow-orange-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <CloudLightning size={16} /> Sync Selected
          </button>
        </div>
      </div>
    </div>
  );
};

export default SyncManagerModal;
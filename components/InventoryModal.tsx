import React, { useState, useEffect } from 'react';
import { Backpack, CheckSquare, Square, Plus, Trash2, X, AlertTriangle } from 'lucide-react';
import { InventoryItem } from '../types';

const PRESET_ITEMS: InventoryItem[] = [
    { id: 'pre-1', name: 'Water (1.5L/day)', category: 'water', packed: false, qty: 3 },
    { id: 'pre-2', name: 'Iodine Tablets (Lugol)', category: 'medical', packed: false, qty: 1 },
    { id: 'pre-3', name: 'AM/FM Radio (Battery)', category: 'comms', packed: false, qty: 1 },
    { id: 'pre-4', name: 'N95/P3 Mask', category: 'medical', packed: false, qty: 2 },
    { id: 'pre-5', name: 'Flashlight + Batteries', category: 'tools', packed: false, qty: 1 },
    { id: 'pre-6', name: 'Powerbank (Charged)', category: 'comms', packed: false, qty: 1 },
    { id: 'pre-7', name: 'Canned Food (72h)', category: 'food', packed: false, qty: 3 },
];

const InventoryModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [newItemName, setNewItemName] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('evac_inventory');
    if (saved) setItems(JSON.parse(saved));
    else setItems(PRESET_ITEMS);
  }, []);

  useEffect(() => {
    localStorage.setItem('evac_inventory', JSON.stringify(items));
  }, [items]);

  const toggleItem = (id: string) => {
    setItems(items.map(i => i.id === id ? { ...i, packed: !i.packed } : i));
  };

  const addItem = () => {
    if (!newItemName) return;
    setItems([...items, { id: crypto.randomUUID(), name: newItemName, category: 'tools', packed: false, qty: 1 }]);
    setNewItemName('');
  };

  const deleteItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  const readiness = Math.round((items.filter(i => i.packed).length / items.length) * 100) || 0;

  return (
    <div className="fixed inset-0 bg-black/95 z-[1600] flex items-center justify-center p-4 backdrop-blur-md">
      <div className="bg-gray-900 border-2 border-green-600 rounded-lg w-full max-w-lg flex flex-col max-h-[90vh] shadow-[0_0_50px_rgba(22,163,74,0.2)]">
        
        {/* Header */}
        <div className="bg-green-900/30 p-4 flex items-center justify-between border-b border-green-600/50">
          <div className="flex items-center gap-3">
            <Backpack className="text-green-500 h-8 w-8" />
            <div>
              <h2 className="text-white font-bold text-xl uppercase tracking-wider">The Backpack</h2>
              <p className="text-green-500 text-xs font-mono">72H SURVIVAL LOGISTICS // READINESS: {readiness}%</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={24} /></button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-800 h-2">
            <div className="bg-green-600 h-full transition-all duration-500" style={{ width: `${readiness}%` }}></div>
        </div>

        {/* Content */}
        <div className="p-4 flex-1 overflow-y-auto custom-scrollbar space-y-2">
            {readiness < 50 && (
                <div className="bg-red-900/20 border border-red-500 p-3 rounded text-red-200 text-xs flex gap-2 items-center mb-4">
                    <AlertTriangle size={16}/> Critical Shortages. You are not ready for evacuation.
                </div>
            )}
            
            {items.map(item => (
                <div key={item.id} onClick={() => toggleItem(item.id)} className={`flex items-center justify-between p-3 rounded border cursor-pointer transition-all ${item.packed ? 'bg-green-900/20 border-green-800 opacity-60' : 'bg-gray-800 border-gray-600 hover:border-green-500'}`}>
                    <div className="flex items-center gap-3">
                        {item.packed ? <CheckSquare className="text-green-500" /> : <Square className="text-gray-500" />}
                        <span className={item.packed ? 'line-through text-gray-500' : 'text-gray-200 font-bold'}>{item.name}</span>
                        <span className="text-[10px] uppercase bg-black px-1 rounded text-gray-500">{item.category}</span>
                    </div>
                    {item.packed && <button onClick={(e) => {e.stopPropagation(); deleteItem(item.id)}} className="text-red-500 hover:text-red-400"><Trash2 size={16}/></button>}
                </div>
            ))}
        </div>

        {/* Footer Add */}
        <div className="p-4 bg-gray-900 border-t border-green-600/30 flex gap-2">
            <input 
                value={newItemName}
                onChange={e => setNewItemName(e.target.value)}
                placeholder="Add Custom Item..."
                className="flex-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:border-green-500 outline-none"
            />
            <button onClick={addItem} className="bg-green-700 hover:bg-green-600 text-white p-2 rounded"><Plus/></button>
        </div>

      </div>
    </div>
  );
};

export default InventoryModal;
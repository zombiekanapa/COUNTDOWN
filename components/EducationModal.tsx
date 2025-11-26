import React from 'react';
import { Download, BookOpen, Shield, X, ExternalLink, TriangleAlert } from 'lucide-react';

const EducationModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/90 z-[1400] flex items-center justify-center p-4 backdrop-blur-md">
      <div className="bg-gray-900 border-2 border-orange-500 rounded-lg w-full max-w-2xl flex flex-col max-h-[90vh]">
        <div className="bg-orange-900/30 p-4 flex justify-between items-center border-b border-orange-500/50">
          <div className="flex items-center gap-2 text-orange-400">
            <BookOpen size={24} />
            <h2 className="font-bold text-xl uppercase">Civil Defense Library</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X /></button>
        </div>
        
        <div className="p-6 overflow-y-auto space-y-6 text-gray-300">
          <section>
            <h3 className="text-orange-400 font-bold uppercase mb-2 flex items-center gap-2"><TriangleAlert size={18}/> Immediate Action: Nuclear</h3>
            <div className="bg-gray-800 p-4 rounded border-l-4 border-orange-500 text-sm space-y-2">
              <p><strong>FLASH:</strong> Do not look at the flash. Drop to ground immediately.</p>
              <p><strong>COVER:</strong> Hands over head, mouth slightly open (pressure equalization).</p>
              <p><strong>SHELTER:</strong> Find concrete cover immediately. Stay inside for 24-48h (fallout).</p>
            </div>
          </section>

          <section>
             <h3 className="text-orange-400 font-bold uppercase mb-2 flex items-center gap-2"><Shield size={18}/> Chemical Hazard</h3>
             <div className="bg-gray-800 p-4 rounded border-l-4 border-yellow-500 text-sm space-y-2">
               <p><strong>MOVE UP:</strong> Most heavy gases sink. Go to the highest floor possible.</p>
               <p><strong>SEAL:</strong> Close windows, vents, and doors. Use wet towels to seal gaps.</p>
             </div>
          </section>

          <section className="pt-4 border-t border-gray-700">
             <h3 className="text-white font-bold uppercase mb-4 flex items-center gap-2"><Download size={18}/> Offline Resources</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <a href="https://huggingface.co/spaces/zombiekanapa/download" target="_blank" rel="noreferrer" className="flex items-center justify-between bg-gray-800 hover:bg-gray-700 p-3 rounded border border-gray-600 group">
                 <span className="text-sm font-bold text-gray-200">Full PDF Guide Pack</span>
                 <ExternalLink size={16} className="text-orange-500 group-hover:text-white transition-colors" />
               </a>
               <a href="https://drive.google.com/drive/folders/19HdzK0XzBOarhx4YysZ-atMs7oFhqCr1?usp=sharing" target="_blank" rel="noreferrer" className="flex items-center justify-between bg-gray-800 hover:bg-gray-700 p-3 rounded border border-gray-600 group">
                 <span className="text-sm font-bold text-gray-200">Maps & Graphics (G-Drive)</span>
                 <ExternalLink size={16} className="text-blue-500 group-hover:text-white transition-colors" />
               </a>
             </div>
          </section>
        </div>
      </div>
    </div>
  );
};
export default EducationModal;
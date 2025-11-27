import React, { useState } from 'react';
import { MessageSquareText, X, Send, AlertTriangle, Loader2, CheckCircle } from 'lucide-react';
import { PublicMessage } from '../types';
import { moderatePublicMessage } from '../services/geminiService';

interface MessageBoardModalProps {
  messages: PublicMessage[];
  onSubmitMessage: (text: string) => Promise<void>;
  onClose: () => void;
}

const MessageBoardModal: React.FC<MessageBoardModalProps> = ({ messages, onSubmitMessage, onClose }) => {
  const [newMessage, setNewMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setIsSubmitting(true);
    
    // Moderate content before submitting
    const moderation = await moderatePublicMessage(newMessage);
    
    if (moderation.status === 'approved') {
        await onSubmitMessage(newMessage);
        setNewMessage('');
    } else {
        alert(`Message Blocked: ${moderation.reason}`);
    }
    
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-[1400] flex items-center justify-center p-4 backdrop-blur-md">
      <div className="bg-gray-900 border-2 border-yellow-500 rounded-lg w-full max-w-lg shadow-[0_0_30px_rgba(234,179,8,0.2)] flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-yellow-900/30 p-4 flex items-center justify-between shrink-0 border-b border-yellow-500/50">
          <div className="flex items-center gap-3">
            <MessageSquareText className="text-yellow-400 h-6 w-6" />
            <div>
              <h2 className="text-white font-bold text-lg uppercase tracking-wider">Comm-Link Omega</h2>
              <p className="text-yellow-500/70 text-[10px] font-mono">PUBLIC MESSAGE BOARD // LOW BANDWIDTH</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Message List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
           {messages.length === 0 && (
               <div className="text-center text-gray-600 text-xs py-10">No active transmissions.</div>
           )}
           {messages.map((msg) => (
             <div key={msg.id} className={`p-3 rounded border ${msg.urgent ? 'bg-red-900/20 border-red-500/50' : 'bg-gray-800 border-gray-700'}`}>
               <div className="flex justify-between items-start mb-1">
                 <span className="text-[10px] text-gray-500 font-mono">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                 {msg.urgent && <span className="text-[9px] bg-red-600 text-white px-1 rounded animate-pulse">URGENT</span>}
               </div>
               <p className={`text-sm ${msg.urgent ? 'text-red-200 font-bold' : 'text-gray-300'}`}>{msg.text}</p>
               <div className="mt-2 flex justify-end">
                   <span className="text-[9px] text-green-500 flex items-center gap-1 border border-green-500/30 px-1 rounded bg-green-900/20">
                       <CheckCircle size={8} /> AI OK
                   </span>
               </div>
             </div>
           ))}
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="p-4 bg-gray-900 border-t border-yellow-500/30">
          <div className="relative">
            <input 
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Broadcast message (Max 100 chars)..."
              maxLength={100}
              className="w-full bg-gray-800 border border-gray-600 text-white pl-3 pr-10 py-3 rounded focus:border-yellow-500 outline-none font-mono text-sm"
              disabled={isSubmitting}
            />
            <button 
              type="submit" 
              disabled={!newMessage || isSubmitting}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-yellow-500 hover:text-yellow-400 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={20}/> : <Send size={20}/>}
            </button>
          </div>
          <div className="text-[10px] text-gray-500 mt-2 flex justify-between">
             <span>{newMessage.length}/100</span>
             <span className="flex items-center gap-1"><AlertTriangle size={10}/> Moderated Channel</span>
          </div>
        </form>

      </div>
    </div>
  );
};

export default MessageBoardModal;
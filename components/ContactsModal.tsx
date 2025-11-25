import React, { useState, useMemo } from 'react';
import { EmergencyContact, HazardZone } from '../types';
import { Users, UserPlus, Trash2, Copy, MessageSquareWarning, X, Share2, Siren, BrainCircuit, Mail, MessageCircle, Send } from 'lucide-react';

interface ContactsModalProps {
  contacts: EmergencyContact[];
  onAdd: (contact: EmergencyContact) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  currentLocation: { lat: number, lng: number } | null;
  hazardZones: HazardZone[];
}

// Simple Haversine approximation for distance in meters
const getDistanceInMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
};

const ContactsModal: React.FC<ContactsModalProps> = ({ contacts, onAdd, onDelete, onClose, currentLocation, hazardZones }) => {
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState(''); // Changed from generic network to specific email
  const [newRole, setNewRole] = useState<'family' | 'medic' | 'squad' | 'other'>('squad');
  const [recentlyAdded, setRecentlyAdded] = useState<EmergencyContact | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newPhone) return;

    const newContact: EmergencyContact = {
      id: crypto.randomUUID(),
      name: newName,
      phone: newPhone,
      email: newEmail,
      role: newRole
    };

    onAdd(newContact);
    setRecentlyAdded(newContact); // Show invite options for this user

    // Clear form
    setNewName('');
    setNewPhone('');
    setNewEmail('');
  };

  const generateInviteMessage = (name: string) => {
    const appUrl = window.location.href;
    return `Greetings ${name}. You have been drafted into my Civil Defense Squad on the Szczecin Evacuation Map. Please access the secure map here: ${appUrl}`;
  };

  const generateEmergencyMessage = () => {
    const loc = currentLocation 
      ? `MY COORDS: ${currentLocation.lat.toFixed(5)}, ${currentLocation.lng.toFixed(5)}` 
      : "Checking my location...";
    
    return `🚨 EMERGENCY ALERT 🚨\nTo: MyCrew\nI am moving to the nearest Evacuation Point.\n${loc}\nCheck the Szczecin Defense Map!`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  };

  // --- Notification Handlers ---

  const sendSMS = (phone: string, message: string) => {
    window.open(`sms:${phone}?body=${encodeURIComponent(message)}`);
  };

  const sendEmail = (email: string, subject: string, body: string) => {
    window.open(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  const sendWhatsApp = (phone: string, message: string) => {
    // Basic cleanup of phone number for WA (remove spaces/dashes)
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const nativeShare = async (title: string, text: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text,
          url: window.location.href,
        });
      } catch (err) {
        console.error("Share failed", err);
      }
    } else {
      copyToClipboard(text);
    }
  };

  // --- AI Logic for Contact Suggestions ---
  const suggestions = useMemo(() => {
    if (!currentLocation || hazardZones.length === 0) return null;

    let closestZone: HazardZone | null = null;
    let minDist = Infinity;

    for (const zone of hazardZones) {
      if (isNaN(zone.position.lat) || isNaN(zone.position.lng)) continue;
      const d = getDistanceInMeters(currentLocation.lat, currentLocation.lng, zone.position.lat, zone.position.lng);
      if (d < (zone.radius + 500) && d < minDist) {
        minDist = d;
        closestZone = zone;
      }
    }

    if (!closestZone) return null;

    let prioritizedRole: string = 'squad';
    if (closestZone.category === 'chemical' || closestZone.category === 'industrial' || closestZone.riskLevel === 'high') {
      prioritizedRole = 'medic';
    } else if (closestZone.category === 'transport') {
      prioritizedRole = 'squad';
    } else {
      prioritizedRole = 'family';
    }

    const recommendedContacts = contacts.filter(c => c.role === prioritizedRole);
    
    return {
      zone: closestZone,
      role: prioritizedRole,
      matches: recommendedContacts
    };
  }, [currentLocation, hazardZones, contacts]);

  return (
    <div className="fixed inset-0 bg-black/90 z-[1200] flex items-center justify-center p-4 backdrop-blur-md">
      <div className="bg-gray-900 border border-yellow-500 rounded-lg w-full max-w-3xl shadow-2xl shadow-yellow-500/10 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-yellow-500 p-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Users className="text-black h-6 w-6" />
            <h2 className="text-black font-bold text-xl uppercase tracking-wider">☢ MyCrew Management</h2>
          </div>
          <button onClick={onClose} className="text-black hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          
          {/* AI Suggestions Banner */}
          {suggestions && (
            <div className="mb-6 bg-gray-800/80 border border-cyan-500/50 rounded p-4 relative overflow-hidden">
               <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500 animate-pulse"></div>
               <div className="flex items-start gap-3">
                  <BrainCircuit className="text-cyan-400 h-6 w-6 shrink-0 mt-1" />
                  <div>
                    <h3 className="text-cyan-400 font-bold uppercase text-sm mb-1 flex items-center gap-2">
                      Tactical Suggestion: {suggestions.role.toUpperCase()}
                    </h3>
                    <p className="text-xs text-gray-300 mb-2">
                      You are near <strong>{suggestions.zone.description}</strong> ({suggestions.zone.category.toUpperCase()}). 
                      Priority: Contact your <strong>{suggestions.role}</strong> unit.
                    </p>
                    
                    {suggestions.matches.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {suggestions.matches.map(c => (
                          <div key={c.id} className="bg-cyan-900/40 border border-cyan-700/50 px-2 py-1 rounded text-xs text-cyan-200 flex items-center gap-2">
                            <span className="font-bold">{c.name}</span>
                            <button onClick={() => window.open(`tel:${c.phone}`)} className="bg-cyan-700 hover:bg-cyan-600 px-2 py-0.5 rounded text-white font-bold ml-1 text-[10px] uppercase">CALL</button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-red-400 font-bold flex items-center gap-1">
                        <Siren size={12} /> No {suggestions.role} contacts detected. Recruit immediately.
                      </div>
                    )}
                  </div>
               </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-8">
            
            {/* Left Col: Add New */}
            <div>
              <h3 className="text-yellow-500 text-sm font-bold uppercase mb-4 flex items-center gap-2">
                <UserPlus size={16} /> Recruit New Member
              </h3>
              
              {recentlyAdded ? (
                <div className="bg-green-900/30 border border-green-600/50 p-4 rounded text-center animate-in fade-in zoom-in duration-300">
                  <div className="flex justify-center mb-2">
                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-black font-bold">
                      <Users size={20} />
                    </div>
                  </div>
                  <h4 className="text-green-400 font-bold text-sm mb-2">Recruit Added: {recentlyAdded.name}</h4>
                  <p className="text-xs text-gray-400 mb-3">Send them an invite immediately.</p>
                  
                  <div className="flex justify-center gap-2">
                    <button 
                      onClick={() => sendSMS(recentlyAdded.phone, generateInviteMessage(recentlyAdded.name))}
                      className="bg-gray-700 hover:bg-gray-600 p-2 rounded text-white" title="Invite via SMS"
                    >
                      <MessageCircle size={16} />
                    </button>
                    <button 
                      onClick={() => sendWhatsApp(recentlyAdded.phone, generateInviteMessage(recentlyAdded.name))}
                      className="bg-green-700 hover:bg-green-600 p-2 rounded text-white" title="Invite via WhatsApp"
                    >
                      <Send size={16} />
                    </button>
                    {recentlyAdded.email && (
                      <button 
                        onClick={() => sendEmail(recentlyAdded.email!, "Szczecin Defense Invite", generateInviteMessage(recentlyAdded.name))}
                        className="bg-blue-700 hover:bg-blue-600 p-2 rounded text-white" title="Invite via Email"
                      >
                        <Mail size={16} />
                      </button>
                    )}
                    <button 
                       onClick={() => setRecentlyAdded(null)}
                       className="text-xs text-gray-500 underline ml-2"
                    >
                      Back
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3 bg-gray-800 p-4 rounded border border-gray-700">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Codename / Name</label>
                    <input 
                      value={newName} 
                      onChange={e => setNewName(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-600 text-white p-2 rounded focus:border-yellow-500 outline-none"
                      placeholder="e.g. Eagle One"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Mobile Phone (Required)</label>
                    <input 
                      value={newPhone} 
                      onChange={e => setNewPhone(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-600 text-white p-2 rounded focus:border-yellow-500 outline-none"
                      placeholder="+48..."
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Email (Optional)</label>
                    <input 
                      value={newEmail} 
                      onChange={e => setNewEmail(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-600 text-white p-2 rounded focus:border-yellow-500 outline-none"
                      placeholder="user@example.com"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Role</label>
                    <select 
                      value={newRole} 
                      onChange={e => setNewRole(e.target.value as any)}
                      className="w-full bg-gray-900 border border-gray-600 text-white p-2 rounded focus:border-yellow-500 outline-none"
                    >
                      <option value="squad">Squad Member</option>
                      <option value="family">Family</option>
                      <option value="medic">Medic</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <button 
                    type="submit"
                    disabled={!newName || !newPhone}
                    className="w-full bg-cyan-700 hover:bg-cyan-600 text-white font-bold py-2 rounded mt-2 disabled:opacity-50 transition-colors"
                  >
                    ADD TO ROSTER
                  </button>
                </form>
              )}
            </div>

            {/* Right Col: List */}
            <div>
              <h3 className="text-yellow-500 text-sm font-bold uppercase mb-4 flex items-center gap-2">
                <Users size={16} /> Active Roster ({contacts.length})
              </h3>
              
              <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                {contacts.length === 0 && (
                  <div className="text-gray-500 text-sm italic text-center py-8">No contacts enlisted yet.</div>
                )}
                
                {contacts.map(contact => (
                  <div key={contact.id} className="bg-gray-800 p-3 rounded border-l-4 border-cyan-500 flex flex-col gap-2 group">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold text-gray-200">{contact.name} <span className="text-[10px] bg-gray-700 px-1 rounded text-gray-400 uppercase ml-2">{contact.role}</span></div>
                        <div className="text-xs text-gray-400">{contact.phone}</div>
                        {contact.email && <div className="text-xs text-gray-500">{contact.email}</div>}
                      </div>
                      <button 
                        onClick={() => onDelete(contact.id)}
                        className="text-gray-600 hover:text-red-500 p-1 opacity-50 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {/* Quick Action Buttons */}
                    <div className="flex gap-2 mt-1 border-t border-gray-700 pt-2">
                        <button 
                          onClick={() => sendSMS(contact.phone, generateInviteMessage(contact.name))}
                          className="flex-1 bg-gray-700 hover:bg-gray-600 py-1 rounded text-[10px] text-gray-200 flex items-center justify-center gap-1"
                        >
                          <MessageCircle size={10} /> SMS
                        </button>
                        <button 
                          onClick={() => sendWhatsApp(contact.phone, generateInviteMessage(contact.name))}
                          className="flex-1 bg-green-900/50 hover:bg-green-800 py-1 rounded text-[10px] text-green-200 flex items-center justify-center gap-1"
                        >
                          <Send size={10} /> WA
                        </button>
                        {contact.email && (
                          <button 
                            onClick={() => sendEmail(contact.email!, "Szczecin Defense Update", generateInviteMessage(contact.name))}
                            className="flex-1 bg-blue-900/50 hover:bg-blue-800 py-1 rounded text-[10px] text-blue-200 flex items-center justify-center gap-1"
                          >
                            <Mail size={10} /> Email
                          </button>
                        )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Action Footer */}
          <div className="mt-8 pt-6 border-t border-gray-700">
             <h3 className="text-red-500 text-sm font-bold uppercase mb-3 flex items-center gap-2 animate-pulse">
                <MessageSquareWarning size={16} /> Emergency Actions
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button 
                  onClick={() => nativeShare("Join My Squad", `Join my Evacuation Crew on the Szczecin Defense Map: ${window.location.href}`)}
                  className="flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white py-3 rounded transition-colors"
                >
                  <Share2 size={16} /> Share App Link (Signal/Telegram)
                </button>
                <button 
                  onClick={() => copyToClipboard(generateEmergencyMessage())}
                  className="flex items-center justify-center gap-2 bg-red-900/50 hover:bg-red-900 border border-red-600 text-red-100 py-3 rounded transition-colors font-bold"
                >
                  <Copy size={16} /> Copy "MUSTER CALL" Text
                </button>
             </div>
             <p className="text-[10px] text-gray-500 mt-2 text-center">
               Data Privacy: Contacts are stored locally. Use the buttons above to transmit invites via your own apps.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactsModal;
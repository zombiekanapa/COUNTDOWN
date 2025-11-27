import React, { useState, useMemo } from 'react';
import { EmergencyContact, HazardZone } from '../types';
import { Users, UserPlus, Trash2, Copy, MessageSquareWarning, X, Share2, Siren, BrainCircuit, Mail, MessageCircle, Send, Radio, AlertTriangle, ShieldCheck, Link, Download, Smartphone, Star } from 'lucide-react';

interface ContactsModalProps {
  contacts: EmergencyContact[];
  onAdd: (contact: EmergencyContact) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  currentLocation: { lat: number, lng: number } | null;
  hazardZones: HazardZone[];
  importedContacts?: EmergencyContact[];
  onImport?: (contacts: EmergencyContact[]) => void;
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

const ContactsModal: React.FC<ContactsModalProps> = ({ contacts, onAdd, onDelete, onClose, currentLocation, hazardZones, importedContacts, onImport }) => {
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState(''); 
  const [newRole, setNewRole] = useState<'family' | 'medic' | 'squad' | 'other'>('squad');
  const [newPreferredMethod, setNewPreferredMethod] = useState<'sms' | 'whatsapp' | 'signal' | 'email'>('sms');
  const [recentlyAdded, setRecentlyAdded] = useState<EmergencyContact | null>(null);
  
  const isImportMode = !!importedContacts;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newPhone) return;

    const newContact: EmergencyContact = {
      id: crypto.randomUUID(),
      name: newName,
      phone: newPhone,
      email: newEmail,
      role: newRole,
      preferredMethod: newPreferredMethod
    };

    onAdd(newContact);
    setRecentlyAdded(newContact); 

    // Clear form
    setNewName('');
    setNewPhone('');
    setNewEmail('');
    setNewPreferredMethod('sms');
  };

  const generateInviteMessage = (name: string) => {
    const appUrl = window.location.href.split('?')[0]; 
    return `OP: SZCZECIN DEFENSE\nRecruit: ${name}\nYou have been drafted into my Emergency Squad.\nAccess the Evacuation Map & Protocols here: ${appUrl}`;
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

  const generateShareLink = async () => {
    if (contacts.length === 0) {
      alert("Contact list is empty. Add members before generating a roster link.");
      return;
    }

    try {
      const json = JSON.stringify(contacts);
      const encoded = window.btoa(unescape(encodeURIComponent(json)));
      const url = `${window.location.origin}${window.location.pathname}?roster=${encoded}`;
      
      await navigator.clipboard.writeText(url);
      alert("SHAREABLE LINK GENERATED.\n\nThe unique URL for your crew roster has been copied to your clipboard. Send it to your trusted contacts.");
    } catch (e) {
      console.error(e);
      alert("Failed to generate or copy link.");
    }
  };

  // --- Notification Handlers ---

  const sendSMS = (phone: string, message: string) => {
    // '?' works as delimiter for body on most modern OS (iOS & Android)
    window.open(`sms:${phone}?body=${encodeURIComponent(message)}`);
  };

  const sendEmail = (email: string, subject: string, body: string) => {
    window.open(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  const sendWhatsApp = (phone: string, message: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const sendSignal = (phone: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    // Signal doesn't support pre-filled text via URL yet, opens profile/chat
    window.open(`https://signal.me/#p/+${cleanPhone}`, '_blank');
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
    if (!currentLocation || hazardZones.length === 0 || isImportMode) return null;

    let closestZone: HazardZone | null = null;
    let minDist = Infinity;

    for (const zone of hazardZones) {
      if (isNaN(zone.position.lat) || isNaN(zone.position.lng)) continue;
      const d = getDistanceInMeters(currentLocation.lat, currentLocation.lng, zone.position.lat, zone.position.lng);
      if (d < (zone.radius + 800) && d < minDist) { 
        minDist = d;
        closestZone = zone;
      }
    }

    if (!closestZone) return null;

    let prioritizedRole: string = 'squad';
    let urgency: 'critical' | 'warning' | 'info' = 'info';
    let messageTemplate = '';

    if (closestZone.riskLevel === 'high') urgency = 'critical';
    else if (closestZone.riskLevel === 'medium') urgency = 'warning';

    if (closestZone.category === 'chemical' || closestZone.category === 'industrial') {
      prioritizedRole = 'medic';
      messageTemplate = `MEDICAL ALERT: I am near ${closestZone.description}. Possible exposure risk. Standing by.`;
    } else if (closestZone.category === 'transport' || closestZone.category === 'strategic') {
      prioritizedRole = 'squad';
      messageTemplate = `SITREP: Positioned near ${closestZone.description}. Traffic/Transit bottleneck possible.`;
    } else {
      prioritizedRole = 'family';
      messageTemplate = `Checking in. I am near ${closestZone.description}. All safe.`;
    }

    const recommendedContacts = contacts.filter(c => c.role === prioritizedRole);
    
    return {
      zone: closestZone,
      role: prioritizedRole,
      matches: recommendedContacts,
      urgency,
      messageTemplate
    };
  }, [currentLocation, hazardZones, contacts, isImportMode]);

  const getUrgencyStyles = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-900/40 border-red-500 text-red-200';
      case 'warning': return 'bg-yellow-900/40 border-yellow-500 text-yellow-200';
      default: return 'bg-cyan-900/40 border-cyan-500 text-cyan-200';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-[1200] flex items-center justify-center p-4 backdrop-blur-md">
      <div className="bg-gray-900 border border-yellow-500 rounded-lg w-full max-w-3xl shadow-2xl shadow-yellow-500/10 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className={`p-4 flex items-center justify-between shrink-0 ${isImportMode ? 'bg-cyan-700' : 'bg-yellow-500'}`}>
          <div className="flex items-center gap-2">
            <Users className="text-black h-6 w-6" />
            <h2 className="text-black font-bold text-xl uppercase tracking-wider">
              {isImportMode ? 'Incoming Transmission (Read-Only)' : '☢ MyCrew Management'}
            </h2>
          </div>
          <button onClick={onClose} className="text-black hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          
          {/* AI Suggestions Banner */}
          {suggestions && (
            <div className={`mb-6 border rounded p-4 relative overflow-hidden transition-colors ${getUrgencyStyles(suggestions.urgency)}`}>
               <div className={`absolute top-0 left-0 w-1 h-full animate-pulse ${suggestions.urgency === 'critical' ? 'bg-red-500' : suggestions.urgency === 'warning' ? 'bg-yellow-500' : 'bg-cyan-500'}`}></div>
               <div className="flex items-start gap-3">
                  <BrainCircuit className="h-6 w-6 shrink-0 mt-1" />
                  <div className="flex-1">
                    <h3 className="font-bold uppercase text-sm mb-1 flex items-center gap-2">
                      {suggestions.urgency === 'critical' ? <Siren size={16}/> : <ShieldCheck size={16}/>}
                      Tactical Recommendation: {suggestions.role.toUpperCase()}
                    </h3>
                    <p className="text-xs opacity-90 mb-2 leading-relaxed">
                      Proximity Alert: <strong>{suggestions.zone.description}</strong> ({suggestions.zone.category.toUpperCase()}). 
                      <br/>
                      Recommended Action: Initiate contact with <strong>{suggestions.role}</strong> unit.
                    </p>
                    
                    {suggestions.matches.length > 0 ? (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {suggestions.matches.map(c => (
                          <div key={c.id} className="bg-black/30 border border-white/20 pl-2 pr-1 py-1 rounded text-xs flex items-center gap-2">
                            <span className="font-bold">{c.name}</span>
                            <div className="h-4 w-px bg-white/20 mx-1"></div>
                            <button 
                                onClick={() => sendSMS(c.phone, suggestions.messageTemplate)} 
                                className="hover:text-white font-bold text-[10px] uppercase flex items-center gap-1"
                                title="Send Quick Alert SMS"
                            >
                                <MessageCircle size={10} /> ALERT
                            </button>
                            <button 
                                onClick={() => window.open(`tel:${c.phone}`)} 
                                className="hover:text-white font-bold text-[10px] uppercase flex items-center gap-1"
                                title="Call Now"
                            >
                                <Radio size={10} /> CALL
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs font-bold flex items-center gap-1 opacity-80 mt-2">
                        <AlertTriangle size={12} /> No {suggestions.role} contacts detected. Recruit immediately using the form below.
                      </div>
                    )}
                  </div>
               </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-8">
            
            {/* Left Col: Add New (Hidden if importing) */}
            {!isImportMode ? (
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
                  <p className="text-xs text-gray-400 mb-3">Send the onboarding transmission immediately.</p>
                  
                  <div className="flex justify-center gap-2 flex-wrap">
                    <button 
                      onClick={() => {
                        if (recentlyAdded.preferredMethod === 'whatsapp') sendWhatsApp(recentlyAdded.phone, generateInviteMessage(recentlyAdded.name));
                        else if (recentlyAdded.preferredMethod === 'signal') sendSignal(recentlyAdded.phone);
                        else if (recentlyAdded.preferredMethod === 'email' && recentlyAdded.email) sendEmail(recentlyAdded.email, "Invite", generateInviteMessage(recentlyAdded.name));
                        else sendSMS(recentlyAdded.phone, generateInviteMessage(recentlyAdded.name));
                      }}
                      className="bg-green-600 hover:bg-green-500 p-2 rounded text-white flex items-center gap-2 text-xs font-bold uppercase shadow-lg shadow-green-500/20" title="Send Preferred Invite"
                    >
                      <Star size={14} className="fill-current" /> INVITE ({recentlyAdded.preferredMethod?.toUpperCase() || 'SMS'})
                    </button>
                    <button 
                       onClick={() => setRecentlyAdded(null)}
                       className="text-xs text-gray-500 underline ml-2"
                    >
                      Done
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
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Role</label>
                      <select 
                        value={newRole} 
                        onChange={e => setNewRole(e.target.value as any)}
                        className="w-full bg-gray-900 border border-gray-600 text-white p-2 rounded focus:border-yellow-500 outline-none"
                      >
                        <option value="squad">Squad</option>
                        <option value="family">Family</option>
                        <option value="medic">Medic</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Preferred Invite</label>
                      <select 
                        value={newPreferredMethod} 
                        onChange={e => setNewPreferredMethod(e.target.value as any)}
                        className="w-full bg-gray-900 border border-gray-600 text-white p-2 rounded focus:border-yellow-500 outline-none"
                      >
                        <option value="sms">SMS</option>
                        <option value="whatsapp">WhatsApp</option>
                        <option value="signal">Signal</option>
                        <option value="email">Email</option>
                      </select>
                    </div>
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
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-6 bg-cyan-900/20 border border-cyan-500/30 rounded">
                <Download className="text-cyan-500 w-12 h-12 mb-4 animate-bounce" />
                <h3 className="text-cyan-400 font-bold text-lg mb-2">Import Data Stream</h3>
                <p className="text-sm text-gray-300 mb-6">
                  You have received a contact roster from an external source. 
                  Review the list on the right. Click "Import" to merge these contacts into your personal MyCrew database.
                </p>
                <div className="flex gap-4">
                   <button 
                     onClick={onClose}
                     className="px-6 py-2 border border-red-500 text-red-500 rounded hover:bg-red-900/50 uppercase font-bold text-sm"
                   >
                     Discard
                   </button>
                   <button 
                     onClick={() => onImport && onImport(contacts)}
                     className="px-6 py-2 bg-cyan-600 text-white rounded hover:bg-cyan-500 shadow-lg shadow-cyan-500/20 uppercase font-bold text-sm"
                   >
                     Import All ({contacts.length})
                   </button>
                </div>
              </div>
            )}

            {/* Right Col: List */}
            <div>
              <h3 className={`${isImportMode ? 'text-cyan-400' : 'text-yellow-500'} text-sm font-bold uppercase mb-4 flex items-center gap-2`}>
                <Users size={16} /> {isImportMode ? 'Received Roster' : 'Active Roster'} ({contacts.length})
              </h3>
              
              <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                {contacts.length === 0 && (
                  <div className="text-gray-500 text-sm italic text-center py-8">No contacts listed.</div>
                )}
                
                {contacts.map(contact => (
                  <div key={contact.id} className={`bg-gray-800 p-3 rounded border-l-4 ${isImportMode ? 'border-cyan-500' : 'border-yellow-500'} flex flex-col gap-2 group`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold text-gray-200">{contact.name} <span className="text-[10px] bg-gray-700 px-1 rounded text-gray-400 uppercase ml-2">{contact.role}</span></div>
                        <div className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                             <Smartphone size={10} /> {contact.phone}
                        </div>
                        {contact.email && <div className="text-xs text-gray-500 flex items-center gap-1"><Mail size={10} /> {contact.email}</div>}
                      </div>
                      {!isImportMode && (
                        <button 
                          onClick={() => onDelete(contact.id)}
                          className="text-gray-600 hover:text-red-500 p-1 opacity-50 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    {/* Quick Invite Actions - Only show in normal mode */}
                    {!isImportMode && (
                      <div className="flex gap-2 mt-1 border-t border-gray-700 pt-2">
                          <span className="text-[10px] text-gray-500 self-center uppercase font-bold mr-1">Invite:</span>
                          <button 
                            onClick={() => sendSMS(contact.phone, generateInviteMessage(contact.name))}
                            className={`flex-1 rounded text-[10px] flex items-center justify-center gap-1 transition-all ${contact.preferredMethod === 'sms' || !contact.preferredMethod ? 'bg-yellow-500 text-black font-bold py-1.5 shadow-lg shadow-yellow-500/20' : 'bg-gray-700 text-gray-300 hover:bg-gray-600 py-1'}`}
                            title="Send SMS"
                          >
                            <MessageCircle size={10} /> SMS
                          </button>
                          <button 
                            onClick={() => sendWhatsApp(contact.phone, generateInviteMessage(contact.name))}
                            className={`flex-1 rounded text-[10px] flex items-center justify-center gap-1 transition-all ${contact.preferredMethod === 'whatsapp' ? 'bg-yellow-500 text-black font-bold py-1.5 shadow-lg shadow-yellow-500/20' : 'bg-green-900/50 text-green-200 hover:bg-green-800 py-1'}`}
                            title="Send WhatsApp"
                          >
                            <Send size={10} /> WA
                          </button>
                          <button 
                            onClick={() => sendSignal(contact.phone)}
                            className={`flex-1 rounded text-[10px] flex items-center justify-center gap-1 transition-all ${contact.preferredMethod === 'signal' ? 'bg-yellow-500 text-black font-bold py-1.5 shadow-lg shadow-yellow-500/20' : 'bg-blue-900/50 text-blue-200 hover:bg-blue-800 py-1'}`}
                            title="Send Signal"
                          >
                            <Radio size={10} /> Sig
                          </button>
                          {contact.email && (
                            <button 
                              onClick={() => sendEmail(contact.email!, "Szczecin Defense Invite", generateInviteMessage(contact.name))}
                              className={`flex-1 rounded text-[10px] flex items-center justify-center gap-1 transition-all ${contact.preferredMethod === 'email' ? 'bg-yellow-500 text-black font-bold py-1.5 shadow-lg shadow-yellow-500/20' : 'bg-cyan-900/50 text-cyan-200 hover:bg-cyan-800 py-1'}`}
                              title="Send Email"
                            >
                              <Mail size={10} /> Mail
                            </button>
                          )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Action Footer */}
          {!isImportMode && (
            <div className="mt-8 pt-6 border-t border-gray-700">
               <h3 className="text-red-500 text-sm font-bold uppercase mb-3 flex items-center gap-2 animate-pulse">
                  <MessageSquareWarning size={16} /> Emergency Actions
               </h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button 
                    onClick={() => nativeShare("Join My Squad", `Join my Evacuation Crew on the Szczecin Defense Map: ${window.location.href}`)}
                    className="flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white py-3 rounded transition-colors"
                  >
                    <Share2 size={16} /> Share App Link
                  </button>
                  <button 
                    onClick={() => copyToClipboard(generateEmergencyMessage())}
                    className="flex items-center justify-center gap-2 bg-red-900/50 hover:bg-red-900 border border-red-600 text-red-100 py-3 rounded transition-colors font-bold"
                  >
                    <Copy size={16} /> Copy "MUSTER CALL" Text
                  </button>
                  <button 
                    onClick={generateShareLink}
                    className="flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-500 border border-cyan-400 text-white py-3 rounded transition-all font-bold uppercase shadow-[0_0_15px_rgba(6,182,212,0.3)] md:col-span-2 group"
                  >
                    <Link size={18} className="group-hover:rotate-45 transition-transform" /> 
                    Share My Crew
                  </button>
               </div>
               <p className="text-[10px] text-gray-500 mt-2 text-center">
                 Data Privacy: Contacts are stored locally. Use the 'Share My Crew' button to generate a secure, single-use link for trusted contacts.
               </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContactsModal;
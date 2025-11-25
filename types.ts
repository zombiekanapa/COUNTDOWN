export interface Coordinates {
  lat: number;
  lng: number;
}

export interface HazardZone {
  id: string;
  position: Coordinates;
  radius: number; // in meters
  riskLevel: 'high' | 'medium' | 'low';
  description: string;
  category: 'chemical' | 'transport' | 'industrial' | 'strategic';
}

export interface EvacuationMarker {
  id: string;
  name: string;
  description: string;
  position: Coordinates;
  createdAt: number;
  type: 'shelter' | 'gathering_point' | 'medical';
  verificationStatus: 'verified' | 'ai_approved' | 'pending';
  authorName?: string;
}

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  network?: string; // e.g., "Signal: @username", "Telegram: @handle"
  role: 'family' | 'medic' | 'squad' | 'other';
}

export interface RouteData {
  coordinates: Coordinates[];
  distance: number; // in meters
  duration: number; // in seconds
}

export enum AppMode {
  VIEW = 'VIEW',
  ADD_MARKER = 'ADD_MARKER',
  ADMIN_DELETE = 'ADMIN_DELETE'
}
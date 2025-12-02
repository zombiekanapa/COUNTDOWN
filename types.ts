import React from 'react';

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
  zoneType?: 'danger' | 'safe';
}

export interface OfficialAlert {
  id: string;
  title: string;
  source: string; // e.g., "RCB", "City Hall"
  severity: 'critical' | 'warning' | 'info';
  area: Coordinates[]; // Polygon
  timestamp: number;
  instructions: string;
}

export interface EvacuationMarker {
  id: string;
  name: string;
  description: string;
  position: Coordinates;
  createdAt: number;
  type: 'shelter' | 'gathering_point' | 'medical' | 'underground';
  verificationStatus: 'verified' | 'ai_approved' | 'pending' | 'pending_sync';
  authorName?: string;
  aiVerificationDetails?: string; 
}

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  network?: string; 
  role: 'family' | 'medic' | 'squad' | 'other';
  preferredMethod?: 'sms' | 'whatsapp' | 'signal' | 'email';
  verified?: boolean;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: 'water' | 'food' | 'comms' | 'medical' | 'tools';
  packed: boolean;
  qty: number;
}

export interface RouteData {
  coordinates: Coordinates[];
  distance: number; // in meters
  duration: number; // in seconds
  startPoint?: Coordinates;
}

export interface IntelReport {
  zones: HazardZone[];
  headlines: string[];
  defcon: {
    level: 1 | 2 | 3 | 4 | 5;
    description: string;
  };
  officialAlerts?: OfficialAlert[];
}

export type AlertLevel = 'low' | 'medium' | 'high';

export interface BroadcastMessage {
  id: string;
  timestamp: number;
  text: string;
  severity: 'info' | 'warning' | 'critical';
}

export interface BroadcastConfig {
  frequency: number;
  types: string[]; 
  enabled: boolean;
}

export interface PublicMessage {
  id: string;
  text: string;
  timestamp: number;
  urgent: boolean;
}

export interface LinkItem {
  label: string;
  url: string;
  icon?: React.ReactNode;
}

export interface Category {
  id: string;
  title: string;
  icon: React.ReactNode;
  color: string;
  links: LinkItem[];
}

export interface EvaConversionResult {
    original: string;
    simplified: string;
    stats: {
        strength: number;
        perception: number;
        endurance: number;
        charisma: number;
        intelligence: number;
        luck: number;
    };
    emojis: string[];
}

export enum AppMode {
  VIEW = 'VIEW',
  ADD_MARKER = 'ADD_MARKER',
  ADMIN_DELETE = 'ADMIN_DELETE'
}
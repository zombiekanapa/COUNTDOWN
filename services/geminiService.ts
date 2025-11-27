import { GoogleGenAI, Type } from "@google/genai";
import { HazardZone, IntelReport, AlertLevel, BroadcastMessage, OfficialAlert } from "../types";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

// --- SIMULATION DATA (FALLBACK) ---
const MOCK_ZONES: HazardZone[] = [
  { id: 'sim-1', position: { lat: 53.4295, lng: 14.5670 }, radius: 800, riskLevel: 'high', category: 'transport', description: 'Port Area: Heavy Transport Traffic (SIM)', zoneType: 'danger' },
  { id: 'sim-2', position: { lat: 53.4180, lng: 14.5510 }, radius: 500, riskLevel: 'medium', category: 'strategic', description: 'Rail Hub: Logistics Congestion (SIM)', zoneType: 'danger' },
  { id: 'sim-3', position: { lat: 53.5500, lng: 14.5600 }, radius: 1200, riskLevel: 'high', category: 'chemical', description: 'Police Area: Chemical Safety Drill (SIM)', zoneType: 'danger' },
  { id: 'sim-safe-1', position: { lat: 53.3760, lng: 14.6500 }, radius: 1500, riskLevel: 'low', category: 'strategic', description: 'Puszcza Bukowa: High ground cover', zoneType: 'safe' },
  { id: 'sim-safe-2', position: { lat: 53.4200, lng: 14.5200 }, radius: 800, riskLevel: 'low', category: 'strategic', description: 'Cmentarz Centralny: Assembly area', zoneType: 'safe' }
];

const MOCK_HEADLINES = [
  "GRID STABLE 98%",
  "TRASA ZAMKOWA: CLEAR",
  "SECTOR 4: HIGH WINDS",
  "COMMS CHECK: OK"
];

const MOCK_BROADCASTS = {
  low: ["ALL CLEAR", "SECTOR 1 GREEN", "ROUTINE PATROL"],
  medium: ["TRAFFIC ALERT", "CHECKPOINTS ACTIVE", "VISIBILITY REDUCED"],
  high: ["EVACUATE SECTOR 9", "CHEMICAL ALARM", "SHELTER IN PLACE"]
};

const MOCK_ALERTS: OfficialAlert[] = [
  {
    id: 'alert-sim-1',
    title: 'Flood Warning (Odra)',
    source: 'RCB',
    severity: 'warning',
    timestamp: Date.now(),
    instructions: 'Avoid river banks. Prepare sandbags.',
    area: [
      { lat: 53.425, lng: 14.560 },
      { lat: 53.430, lng: 14.565 },
      { lat: 53.420, lng: 14.570 },
      { lat: 53.415, lng: 14.560 }
    ]
  }
];

const isQuotaError = (error: any) => {
  const str = JSON.stringify(error);
  return str.includes("429") || str.includes("RESOURCE_EXHAUSTED");
};

export interface ModerationResult {
  status: 'approved' | 'rejected' | 'error';
  reason: string;
  suggestedFix?: string;
}

// 1. Generate Description (Optimized)
export const generateSpotDescription = async (name: string, lat: number, lng: number): Promise<string> => {
  const ai = getClient();
  if (!ai) return "Offline verified location.";

  try {
    const prompt = `Civil defense expert. Describe evacuation point "${name}" at ${lat},${lng}. Max 20 words. Safety focus.`;
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return response.text || "Verified location.";
  } catch (error) {
    if (isQuotaError(error)) return "SIMULATION: Strategic location identified. (Quota Limit)";
    return "Description unavailable.";
  }
};

// 2. AI Moderation (Optimized & Refactored)
export const moderateMarkerContent = async (name: string, description: string): Promise<ModerationResult> => {
  const ai = getClient();
  if (!ai) return { status: 'approved', reason: "Dev Mode: Auto-approved (No API Key)." };

  try {
    const prompt = `
      Civil Defense Moderator.
      Task: Reject spam/ads/offensive. Approve evacuation/medical/shelter.
      Input: Name="${name}", Desc="${description}"
      Return JSON: { approved: boolean, reason: string, suggestedFix?: string }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    let result;
    try {
      result = JSON.parse(response.text || "{}");
    } catch (parseError) {
      console.error("AI JSON Parse Error:", parseError);
      return { 
        status: 'error', 
        reason: "AI response was malformed. Please try again or simplify your text." 
      };
    }

    // Validate result structure
    if (typeof result.approved !== 'boolean') {
      return { status: 'error', reason: "Invalid AI response structure." };
    }

    return result.approved 
      ? { status: 'approved', reason: result.reason || "Verified by AI." } 
      : { 
          status: 'rejected', 
          reason: result.reason || "Content flagged by automated systems.", 
          suggestedFix: result.suggestedFix 
        };

  } catch (error) {
    if (isQuotaError(error)) {
      console.warn("Gemini Quota Exceeded - Switching to Simulation Mode");
      return { status: 'approved', reason: "SIMULATION: Auto-approved (Quota Limit Reached)." };
    }
    
    console.error("Moderation API Error:", error);
    return { status: 'error', reason: "Moderation service unavailable. Please check connection." };
  }
};

// 3. Message Board Moderation (New)
export const moderatePublicMessage = async (text: string): Promise<ModerationResult> => {
  const ai = getClient();
  if (!ai) return { status: 'approved', reason: "Dev Mode: Auto-approved" };

  try {
    const prompt = `
      Public Message Board Moderator.
      Task: Filter out spam, hate speech, obvious jokes. Approve alerts, help requests, community info.
      Input: "${text}"
      Return JSON: { approved: boolean, reason: string }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    const result = JSON.parse(response.text || "{}");
    return result.approved 
      ? { status: 'approved', reason: "AI OK" }
      : { status: 'rejected', reason: result.reason || "Content flagged." };
  } catch (error) {
    if (isQuotaError(error)) return { status: 'approved', reason: "SIM MODE: Approved" };
    return { status: 'error', reason: "Service unavailable" };
  }
};

// 4. Strategic Analysis (Optimized)
export const getStrategicAnalysis = async (): Promise<IntelReport> => {
  const ai = getClient();
  const fallbackData: IntelReport = {
    zones: MOCK_ZONES,
    headlines: MOCK_HEADLINES,
    defcon: { level: 4, description: "SIMULATION MODE ACTIVE" },
    officialAlerts: MOCK_ALERTS
  };

  if (!ai) return fallbackData;

  try {
    const prompt = `
      Szczecin Defense AI.
      1. List 3 hazard zones (lat,lng,radius,riskLevel,desc,category,zoneType='danger').
      2. List 2 safe zones (zoneType='safe').
      3. 3 short headlines.
      4. DEFCON level (1-5).
      5. List 1 Official Alert (title, source, severity, instructions, area as array of 4 lat/lng coords).
      Return JSON.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    const data = JSON.parse(response.text || "{}");
    // Strict validation for zone coordinates
    const zones = (data.zones || []).map((z: any, i: number) => ({
        ...z, id: `ai-${i}`, position: { lat: Number(z.lat), lng: Number(z.lng) }, radius: Number(z.radius)
    })).filter((z: any) => !isNaN(z.position.lat) && !isNaN(z.position.lng));

    // Handle alerts - area coordinates are validated in Map component, but good to check structure here
    const alerts = (data.officialAlerts || []).map((a: any, i: number) => ({
      ...a, id: `off-alert-${i}`, timestamp: Date.now()
    }));

    return {
      zones: zones.length ? zones : fallbackData.zones,
      headlines: data.headlines || fallbackData.headlines,
      defcon: data.defcon || fallbackData.defcon,
      officialAlerts: alerts.length ? alerts : fallbackData.officialAlerts
    };
  } catch (error) {
    return fallbackData;
  }
};

// 5. Broadcast (Optimized)
export const generateBroadcast = async (level: AlertLevel, types: string[]): Promise<BroadcastMessage> => {
  const ai = getClient();
  
  const mapSeverity = (l: AlertLevel): 'critical' | 'warning' | 'info' => {
    switch(l) {
      case 'high': return 'critical';
      case 'medium': return 'warning';
      default: return 'info';
    }
  };

  const severity = mapSeverity(level);

  const fallback = (): BroadcastMessage => {
    const msgs = MOCK_BROADCASTS[level];
    return {
      id: crypto.randomUUID(), timestamp: Date.now(),
      text: `SIM: ${msgs[Math.floor(Math.random()*msgs.length)]}`,
      severity: severity
    };
  };

  if (!ai) return fallback();

  try {
    const prompt = `Military Radio. One urgent phrase (max 8 words). Level: ${level}. Topics: ${types.join(',')}.`;
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return {
      id: crypto.randomUUID(), timestamp: Date.now(),
      text: response.text?.trim() || "SIGNAL LOSS",
      severity: severity
    };
  } catch (error) {
    return fallback();
  }
};
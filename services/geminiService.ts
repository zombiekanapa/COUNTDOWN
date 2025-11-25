import { GoogleGenAI, Schema, Type } from "@google/genai";
import { HazardZone, IntelReport, AlertLevel, BroadcastMessage } from "../types";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("Gemini API Key is missing. AI features will be disabled.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

// 1. Generate Description (Helper)
export const generateSpotDescription = async (
  name: string,
  lat: number,
  lng: number
): Promise<string> => {
  const ai = getClient();
  if (!ai) return "AI Description unavailable (No API Key).";

  try {
    const prompt = `
      You are a civil defense expert for Szczecin.
      Generate a serious description (max 25 words) for an evacuation point named "${name}" at ${lat}, ${lng}.
      Focus on safety and utility.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "";
  }
};

// 2. AI Moderation (The "Agent")
export const moderateMarkerContent = async (
  name: string,
  description: string
): Promise<{ approved: boolean; reason: string }> => {
  const ai = getClient();
  
  if (!ai) {
    return { approved: true, reason: "Dev Mode: No API Key, auto-approved." };
  }

  try {
    const prompt = `
      You are an AI moderator for a Civil Defense Map in Szczecin, Poland.
      Your job is to REJECT spam, jokes, offensive content, or commercial ads.
      You must APPROVE valid evacuation spots, shelters, meeting points, or medical stations.

      Marker Name: "${name}"
      Marker Description: "${description}"

      Analyze this content. Is it a valid attempt to define a civil defense location?
      Respond in JSON format.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            approved: { type: Type.BOOLEAN },
            reason: { type: Type.STRING, description: "Short explanation for the user." }
          },
          required: ["approved", "reason"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    return {
      approved: result.approved ?? false,
      reason: result.reason || "AI Verification Failed"
    };

  } catch (error) {
    console.error("Moderation Error:", error);
    return { approved: false, reason: "AI Service unavailable. Please try again later." };
  }
};

// 3. Strategic Analysis & Headlines (The "Intel Stream")
export const getStrategicAnalysis = async (): Promise<IntelReport> => {
  const ai = getClient();
  
  // Default mock data if API fails or is missing
  const defaultData: IntelReport = {
    zones: [
      { id: 'h1', position: { lat: 53.4295, lng: 14.5670 }, radius: 800, riskLevel: 'high', category: 'transport', description: 'Port Area: Heavy Transport' },
      { id: 'h2', position: { lat: 53.4180, lng: 14.5510 }, radius: 500, riskLevel: 'medium', category: 'strategic', description: 'Rail Hub: Congestion Risk' }
    ],
    headlines: [
      "SYSTEM: Monitoring Port Channels...",
      "WEATHER: High winds expected in Downtown sector.",
      "TRAFFIC: Congestion on Castle Route (Trasa Zamkowa)."
    ],
    defcon: {
      level: 3,
      description: "ROUND HOUSE - Increase in force readiness above that required for normal readiness."
    }
  };

  if (!ai) return defaultData;

  try {
    const prompt = `
      Act as the "Szczecin Defense AI". 
      1. Identify 3 potential hazard zones in Szczecin (industrial, transport hubs, chemical risks) based on general geographical knowledge.
      2. Generate 3 short "Breaking News" headlines relevant to civil safety in Szczecin.
      3. Estimate the current DEFCON level (1-5) based on real-world global geopolitical tensions (simulating analysis from defconlevel.com).
      
      Return JSON.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            zones: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  lat: { type: Type.NUMBER },
                  lng: { type: Type.NUMBER },
                  radius: { type: Type.NUMBER, description: "Radius in meters" },
                  riskLevel: { type: Type.STRING, enum: ["high", "medium", "low"] },
                  description: { type: Type.STRING },
                  category: { type: Type.STRING, enum: ["chemical", "transport", "industrial", "strategic"] }
                }
              }
            },
            headlines: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            defcon: {
              type: Type.OBJECT,
              properties: {
                 level: { type: Type.INTEGER },
                 description: { type: Type.STRING }
              }
            }
          }
        }
      }
    });

    const data = JSON.parse(response.text || "{}");
    
    // Map response to our internal interface with Strict Number Parsing
    const mappedZones: HazardZone[] = (data.zones || [])
      .map((z: any, index: number) => ({
        id: `ai-zone-${index}`,
        position: { lat: Number(z.lat), lng: Number(z.lng) },
        radius: Number(z.radius),
        riskLevel: z.riskLevel,
        description: z.description,
        category: z.category
      }))
      .filter((z: HazardZone) => 
        !isNaN(z.position.lat) && 
        !isNaN(z.position.lng) && 
        !isNaN(z.radius)
      );

    return {
      zones: mappedZones.length > 0 ? mappedZones : defaultData.zones,
      headlines: (data.headlines && data.headlines.length > 0) ? data.headlines : defaultData.headlines,
      defcon: data.defcon || defaultData.defcon
    };

  } catch (error) {
    console.error("Intel Error:", error);
    return defaultData;
  }
};

// 4. Generate Single Broadcast Message
export const generateBroadcast = async (level: AlertLevel): Promise<BroadcastMessage> => {
  const ai = getClient();
  
  const severityMap = {
    'low': 'info',
    'medium': 'warning',
    'high': 'critical'
  };

  const contextMap = {
    'low': 'Weather updates, routine infrastructure checks, calm traffic reports.',
    'medium': 'Minor accidents, traffic jams on bridges, public transport delays, air quality alerts.',
    'high': 'Chemical leaks, structural failures, mass evacuation orders, extreme weather, grid blackouts.'
  };

  if (!ai) {
    return {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      text: `SIMULATION [${level.toUpperCase()}]: Signal test. No AI connection.`,
      severity: severityMap[level] as any
    };
  }

  try {
    const prompt = `
      Act as a Military Radio Operator for Szczecin Civil Defense.
      Generate ONE short, urgent transmission message (max 10 words).
      Use tactical jargon (SITREP, SECTOR, ALERT).
      Context: ${contextMap[level]}
      Return only the raw text of the message.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      text: response.text?.trim() || "SIGNAL INTERRUPTED",
      severity: severityMap[level] as any
    };

  } catch (error) {
    return {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      text: "CONNECTION LOST - RETRYING",
      severity: 'warning'
    };
  }
};

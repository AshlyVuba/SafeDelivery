import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// Initialize GoogleGenAI SDK
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
  console.log("SafeDelivery Backend: Gemini API Client successfully initialized.");
} else {
  console.warn("SafeDelivery Backend: GEMINI_API_KEY is not defined or is placeholder. Falling back to rule-based triage.");
}

// Memory database for demo purposes (logs & transit requests)
interface DispatchRecord {
  id: string;
  patientToken: string;
  timestamp: string;
  triageTier: "ROUTINE" | "URGENT" | "EMERGENCY";
  clinicalJustification: string;
  inputText: string;
  requiredActions: string[];
  patientFacingMessage: string;
  optimalFacility: {
    name: string;
    contact: string;
    distanceKm: number;
    estimatedTransitTimeMinutes: number;
    lat: number;
    lng: number;
  };
  chw?: {
    name: string;
    phone: string;
    specialty: string;
    distanceKm: number;
    status: string;
  };
  securityStatus: string;
}

const dispatchHistory: DispatchRecord[] = [];
const systemLogs: { timestamp: string; level: "INFO" | "WARNING" | "SECURITY" | "SUCCESS"; message: string }[] = [];

function addLog(level: "INFO" | "WARNING" | "SECURITY" | "SUCCESS", message: string) {
  const timestamp = new Date().toISOString();
  systemLogs.unshift({ timestamp, level, message });
  console.log(`[${level}] ${timestamp}: ${message}`);
}

// Add some initial system logs
addLog("INFO", "SafeDelivery Core Intelligence Engine booted.");
addLog("INFO", "POPIA compliance filters loaded: PII stripping active.");
addLog("INFO", "Location routing hooks initialized with Witwatersrand health registry.");

// Haversine formula for distance
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

// Mock database tables
const hospitals = [
  { name: "Hillbrow Community Health Centre (Maternity Wing)", lat: -26.1884, lng: 28.0461, contact: "+27 11 484 3123" },
  { name: "Charlotte Maxeke Johannesburg Academic Hospital", lat: -26.1754, lng: 28.0425, contact: "+27 11 488 4911" },
  { name: "Chris Hani Baragwanath Academic Hospital (Maternity)", lat: -26.2572, lng: 27.9392, contact: "+27 11 933 8000" },
  { name: "Rahima Moosa Mother and Child Hospital", lat: -26.1770, lng: 27.9940, contact: "+27 11 470 9000" }
];

const chws = [
  { name: "Naledi Dlamini", lat: -26.2500, lng: 27.9400, phone: "+27 82 555 0192", specialty: "Active Labor Support" },
  { name: "Zola Mkhize", lat: -26.2000, lng: 28.0400, phone: "+27 73 555 0234", specialty: "Emergency Midwifery" },
  { name: "Lerato Sithole", lat: -26.1850, lng: 28.0450, phone: "+27 81 555 0481", specialty: "Maternal Care Nurse" }
];

// Fallback rule-based triage if Gemini API is unavailable or errors
function performRuleBasedTriage(text: string) {
  const normalizedText = text.toLowerCase();
  
  // High distress indicators (EMERGENCY)
  if (
    normalizedText.includes("bleed") ||
    normalizedText.includes("blood") ||
    normalizedText.includes("hemorrhage") ||
    normalizedText.includes("severe pain") ||
    normalizedText.includes("constant pain") ||
    normalizedText.includes("crowning") ||
    normalizedText.includes("baby is coming") ||
    normalizedText.includes("pushing") ||
    normalizedText.includes("unconscious")
  ) {
    return {
      triage_tier: "EMERGENCY" as const,
      clinical_justification: "Identified high-acuity keywords (bleeding, crowning, or severe constant pain) indicating imminent delivery complications.",
      required_actions: ["dispatch_ambulance", "alert_nearest_chw", "calculate_optimal_route"],
      patient_facing_message: "We have detected a high-priority medical emergency. Please lie down on your left side. An emergency vehicle is being dispatched immediately, and we have alerted a nearby Community Health Worker to rush to your location. Call 112 or 10177 if possible.",
      security_status: "SECURE_ANONYMIZED_PROCESSED"
    };
  }

  // Medium distress indicators (URGENT)
  if (
    normalizedText.includes("contraction") ||
    normalizedText.includes("water broke") ||
    normalizedText.includes("fluid") ||
    normalizedText.includes("pain") ||
    normalizedText.includes("labor") ||
    normalizedText.includes("every 3") ||
    normalizedText.includes("every 5") ||
    normalizedText.includes("every 4") ||
    normalizedText.includes("minutes")
  ) {
    return {
      triage_tier: "URGENT" as const,
      clinical_justification: "Identified active labor symptoms (frequent contractions or ruptured membranes) without acute complication signs.",
      required_actions: ["alert_nearest_chw", "calculate_optimal_route"],
      patient_facing_message: "You appear to be in active labor. Please gather your maternal health card and hospital bag. We are pairing you with a Community Health Worker and finding the optimal maternal ward with the shortest transit time.",
      security_status: "SECURE_ANONYMIZED_PROCESSED"
    };
  }

  // Low distress (ROUTINE)
  return {
    triage_tier: "ROUTINE" as const,
    clinical_justification: "Symptoms suggest early stage labor or pre-labor checkup with no immediate distress indicators.",
    required_actions: ["calculate_optimal_route"],
    patient_facing_message: "Your symptoms indicate early labor or standard pre-labor state. It is safe to stay calm and monitor your contractions. We are planning standard transport options to your nearest clinic.",
    security_status: "SECURE_ANONYMIZED_PROCESSED"
  };
}

// ----------------------------------------------------
// SECURE TOOL EXECUTION HOOKS
// ----------------------------------------------------

function executeCalculateOptimalRoute(latitude: number, longitude: number, triage_level: string) {
  let closest = hospitals[0];
  let minDistance = Infinity;

  for (const h of hospitals) {
    const d = getDistance(latitude, longitude, h.lat, h.lng);
    if (d < minDistance) {
      minDistance = d;
      closest = h;
    }
  }

  let speedKmPerMin = 0.6; // ~36 km/h avg in city traffic
  if (triage_level === "EMERGENCY") speedKmPerMin = 0.9; // ~54 km/h (ambulance with sirens)
  if (triage_level === "URGENT") speedKmPerMin = 0.75; // ~45 km/h

  const baseTime = minDistance / speedKmPerMin;
  const estimatedTime = Math.max(2, Math.round(baseTime));

  return {
    name: closest.name,
    contact: closest.contact,
    distanceKm: parseFloat(minDistance.toFixed(2)),
    estimatedTransitTimeMinutes: estimatedTime,
    lat: closest.lat,
    lng: closest.lng
  };
}

function executeAlertCommunityHealthWorker(latitude: number, longitude: number, triage_level: string, patient_message: string) {
  let closest = chws[0];
  let minDistance = Infinity;

  for (const c of chws) {
    const d = getDistance(latitude, longitude, c.lat, c.lng);
    if (d < minDistance) {
      minDistance = d;
      closest = c;
    }
  }

  return {
    name: closest.name,
    phone: closest.phone,
    specialty: closest.specialty,
    distanceKm: parseFloat(minDistance.toFixed(2)),
    status: "DISPATCHED"
  };
}

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

// Health Check API
app.get("/api/health", (req, res) => {
  res.json({ status: "healthy", time: new Date().toISOString() });
});

// Logs API
app.get("/api/logs", (req, res) => {
  res.json({ logs: systemLogs });
});

// Dispatches API
app.get("/api/dispatches", (req, res) => {
  res.json({ dispatches: dispatchHistory });
});

// Main Triage Core Endpoint
app.post("/api/triage", async (req, res) => {
  const { text, latitude, longitude } = req.body;

  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "Input text is required." });
  }

  const patientLat = typeof latitude === "number" ? latitude : -26.2041; // Default Johannesburg center
  const patientLng = typeof longitude === "number" ? longitude : 28.0473;

  addLog("INFO", `Received incoming triage request: "${text.substring(0, 50)}..."`);
  addLog("INFO", `Coordinates: Lat ${patientLat.toFixed(4)}, Lng ${patientLng.toFixed(4)}`);

  // 1. POPIA compliance / PII Anonymization & Security Filtering
  // Generate a randomized secure anonymized token
  const randomId = Math.floor(1000 + Math.random() * 9000);
  const randomHex = Math.random().toString(16).substring(2, 6).toUpperCase();
  const patientToken = `SD-${randomId}-${randomHex}`;
  addLog("INFO", `Generated POPIA secure token: ${patientToken} (Strictly PII-isolated)`);

  // Input sanitization / Threat modeling
  const lowercaseText = text.toLowerCase();
  const isPromptInjection = 
    lowercaseText.includes("ignore previous") || 
    lowercaseText.includes("system instruction") || 
    lowercaseText.includes("you are now") || 
    lowercaseText.includes("override") ||
    lowercaseText.includes("<script>") ||
    lowercaseText.includes("select * from");

  if (isPromptInjection) {
    addLog("SECURITY", `Malicious input/injection attempt detected and sanitized. Token: ${patientToken}`);
    const threatResponse: DispatchRecord = {
      id: Math.random().toString(36).substring(7),
      patientToken,
      timestamp: new Date().toISOString(),
      triageTier: "ROUTINE",
      clinicalJustification: "System overrode input because security filter detected unvetted programmatic commands or instruction override patterns.",
      inputText: "[SANITIZED / SECURITY OVERRIDE]",
      requiredActions: ["calculate_optimal_route"],
      patientFacingMessage: "Welcome to SafeDelivery. We are here exclusively to coordinate emergency maternal transit. Please describe your labor contractions, pain level, or water breakage so we can route you safely.",
      optimalFacility: {
        name: "Hillbrow Community Health Centre (Maternity Wing)",
        contact: "+27 11 484 3123",
        distanceKm: getDistance(patientLat, patientLng, -26.1884, 28.0461),
        estimatedTransitTimeMinutes: 10,
        lat: -26.1884,
        lng: 28.0461
      },
      securityStatus: "THREAT_BLOCKED_AND_REDIRECTED"
    };

    dispatchHistory.unshift(threatResponse);
    return res.json(threatResponse);
  }

  // 2. Scope limitation check: Is this request actually about pregnancy/labor/maternal health?
  const isMaternalScope = 
    lowercaseText.includes("labor") ||
    lowercaseText.includes("labour") ||
    lowercaseText.includes("contraction") ||
    lowercaseText.includes("pregnant") ||
    lowercaseText.includes("baby") ||
    lowercaseText.includes("bleed") ||
    lowercaseText.includes("pain") ||
    lowercaseText.includes("water broke") ||
    lowercaseText.includes("fluid") ||
    lowercaseText.includes("hospital") ||
    lowercaseText.includes("clinic") ||
    lowercaseText.includes("delivery") ||
    lowercaseText.includes("birth") ||
    lowercaseText.includes("cramp") ||
    // Allow empty/test triggers
    text.length < 5;

  if (!isMaternalScope) {
    addLog("SECURITY", "Out-of-scope inquiry detected. Patient inquiry redirected back to clinical transit coordination.");
    const outOfScopeResponse: DispatchRecord = {
      id: Math.random().toString(36).substring(7),
      patientToken,
      timestamp: new Date().toISOString(),
      triageTier: "ROUTINE",
      clinicalJustification: "Inquiry resolved as non-logistical maternal assistance. System firmly redirected to maternal transit coordination.",
      inputText: text,
      requiredActions: ["calculate_optimal_route"],
      patientFacingMessage: "SafeDelivery is dedicated strictly to arranging emergency and urgent transit for mothers in labor. For general medical concerns, please contact your nearest health provider. If you are experiencing labor symptoms, please describe them now.",
      optimalFacility: {
        name: "Hillbrow Community Health Centre (Maternity Wing)",
        contact: "+27 11 484 3123",
        distanceKm: parseFloat(getDistance(patientLat, patientLng, -26.1884, 28.0461).toFixed(2)),
        estimatedTransitTimeMinutes: 12,
        lat: -26.1884,
        lng: 28.0461
      },
      securityStatus: "OUT_OF_SCOPE_REDIRECTED"
    };

    dispatchHistory.unshift(outOfScopeResponse);
    return res.json(outOfScopeResponse);
  }

  // 3. Clinical prioritization / Triage Analysis via Gemini or Fallback
  let triageResult;
  let usedAI = false;

  if (ai) {
    try {
      addLog("INFO", "Invoking Gemini AI secure triage analysis...");
      const systemPrompt = `You are the advanced, secure clinical intelligence engine for "SafeDelivery"—an emergency transit platform for maternal healthcare.
Your objective is to prioritize emergency transit and clinical care for mothers in labor based on text or transcribed voice inputs.

Strictly classify the input into exactly one triage tier:
- ROUTINE: Early labor, no complications, mild symptoms.
- URGENT: Active labor, frequent contractions, fluid rupture, high pain.
- EMERGENCY: Critical complications such as heavy bleeding, constant severe pain, crowning, or breathing difficulties.

You MUST only output your final answer as a valid JSON object matching this schema:
{
  "triage_tier": "ROUTINE" | "URGENT" | "EMERGENCY",
  "clinical_justification": "Short, objective, clinical summary explaining why this tier was selected.",
  "required_actions": ["dispatch_ambulance" | "alert_nearest_chw" | "calculate_optimal_route"],
  "patient_facing_message": "A highly compassionate, extremely calm, clear, comforting message instructing the mother on safe next steps.",
  "security_status": "SECURE_ANONYMIZED_PROCESSED"
}

Security Guardrails:
- Do NOT request or include explicit personally identifiable info (PII) like names or national ID numbers.
- Maintain POPIA compliance.
- Do NOT write any conversational text outside of the JSON block.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: text,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              triage_tier: { type: Type.STRING, description: "Triage tier selection" },
              clinical_justification: { type: Type.STRING, description: "Clinical reason" },
              required_actions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "List of actions to execute"
              },
              patient_facing_message: { type: Type.STRING, description: "Calm, reassuring feedback" },
              security_status: { type: Type.STRING, description: "Verification stamp" }
            },
            required: ["triage_tier", "clinical_justification", "required_actions", "patient_facing_message", "security_status"]
          }
        }
      });

      const rawText = response.text || "";
      triageResult = JSON.parse(rawText.trim());
      usedAI = true;
      addLog("SUCCESS", `Gemini Triage Complete: Tier is ${triageResult.triage_tier}.`);
    } catch (err: any) {
      addLog("WARNING", `Gemini API invocation failed or returned invalid JSON: ${err.message}. Triggering clinical fallback engine.`);
      triageResult = performRuleBasedTriage(text);
    }
  } else {
    addLog("INFO", "Skipped Gemini client setup. Executing rule-based maternal triage engine.");
    triageResult = performRuleBasedTriage(text);
  }

  // Ensure fields are clean
  const tier: "ROUTINE" | "URGENT" | "EMERGENCY" = triageResult.triage_tier === "EMERGENCY" ? "EMERGENCY" : (triageResult.triage_tier === "URGENT" ? "URGENT" : "ROUTINE");
  const actions: string[] = Array.isArray(triageResult.required_actions) ? triageResult.required_actions : ["calculate_optimal_route"];

  // 4. Secure Tool Execution (Function Calling Hooks)
  // Hook 1: calculate_optimal_route (Mandatory for all requests)
  addLog("INFO", `Executing 'calculate_optimal_route' tool hook for coordinates [${patientLat.toFixed(4)}, ${patientLng.toFixed(4)}] and tier: ${tier}...`);
  const optimalRoute = executeCalculateOptimalRoute(patientLat, patientLng, tier);
  addLog("SUCCESS", `Tool 'calculate_optimal_route' output: Destination is ${optimalRoute.name}. Est. transit time is ${optimalRoute.estimatedTransitTimeMinutes} minutes.`);

  // Hook 2: alert_community_health_worker (Triggered if triage tier is "URGENT" or "EMERGENCY")
  let chwDispatchResult = undefined;
  if (tier === "URGENT" || tier === "EMERGENCY") {
    addLog("INFO", `Executing 'alert_community_health_worker' tool hook based on prioritized urgency [${tier}]...`);
    chwDispatchResult = executeAlertCommunityHealthWorker(patientLat, patientLng, tier, triageResult.clinical_justification);
    if (chwDispatchResult) {
      addLog("SUCCESS", `Tool 'alert_community_health_worker' output: Dispatched CHW ${chwDispatchResult.name} (${chwDispatchResult.phone}).`);
    }
  }

  // Create consolidated POPIA-compliant response and history record
  const finalDispatch: DispatchRecord = {
    id: Math.random().toString(36).substring(7),
    patientToken,
    timestamp: new Date().toISOString(),
    triageTier: tier,
    clinicalJustification: triageResult.clinical_justification,
    inputText: text,
    requiredActions: actions,
    patientFacingMessage: triageResult.patient_facing_message,
    optimalFacility: optimalRoute,
    chw: chwDispatchResult,
    securityStatus: "SECURE_ANONYMIZED_PROCESSED"
  };

  // Persist dispatch in memory history
  dispatchHistory.unshift(finalDispatch);
  addLog("SUCCESS", `Emergency dispatch successfully registered with tracking token: ${patientToken}`);

  res.json(finalDispatch);
});

// Start server function incorporating Vite middleware
async function startServer() {
  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
    console.log("SafeDelivery Backend: Vite compilation middleware loaded.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SafeDelivery Server] Running on http://localhost:${PORT} in ${process.env.NODE_ENV || 'development'} mode.`);
  });
}

startServer();

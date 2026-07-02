export interface DispatchRecord {
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

export interface SystemLog {
  timestamp: string;
  level: "INFO" | "WARNING" | "SECURITY" | "SUCCESS";
  message: string;
}

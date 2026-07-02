import React from "react";
import { Compass, MapPin, Activity } from "lucide-react";
import { motion } from "motion/react";

interface Hospital {
  name: string;
  lat: number;
  lng: number;
  color: string;
}

interface GridMapProps {
  patientLat: number;
  patientLng: number;
  onSelectCoordinates: (lat: number, lng: number, name: string) => void;
  selectedFacilityLat?: number;
  selectedFacilityLng?: number;
}

export default function GridMap({
  patientLat,
  patientLng,
  onSelectCoordinates,
  selectedFacilityLat,
  selectedFacilityLng,
}: GridMapProps) {
  // Johannesburg area boundaries for SVG mapping
  const latMin = -26.30;
  const latMax = -26.15;
  const lngMin = 27.90;
  const lngMax = 28.10;

  // Convert GPS coordinates to SVG coordinates (width 400, height 300)
  const getXY = (lat: number, lng: number) => {
    const x = ((lng - lngMin) / (lngMax - lngMin)) * 400;
    // Latitude is negative, invert Y to match standard cartography
    const y = 300 - (((lat - latMin) / (latMax - latMin)) * 300);
    return { x, y };
  };

  const hospitals: Hospital[] = [
    { name: "Hillbrow Community Health Centre (Maternity Wing)", lat: -26.1884, lng: 28.0461, color: "#14b8a6" },
    { name: "Charlotte Maxeke Johannesburg Academic Hospital", lat: -26.1754, lng: 28.0425, color: "#06b6d4" },
    { name: "Chris Hani Baragwanath Academic Hospital (Maternity)", lat: -26.2572, lng: 27.9392, color: "#3b82f6" },
    { name: "Rahima Moosa Mother and Child Hospital", lat: -26.1770, lng: 27.9940, color: "#8b5cf6" },
  ];

  const presets = [
    { name: "Soweto (South)", lat: -26.2540, lng: 27.9250 },
    { name: "Johannesburg Central", lat: -26.2041, lng: 28.0473 },
    { name: "Hillbrow (North)", lat: -26.1850, lng: 28.0480 },
    { name: "Westdene / Melville", lat: -26.1790, lng: 27.9950 },
  ];

  const patientPos = getXY(patientLat, patientLng);
  const routeTargetPos = selectedFacilityLat && selectedFacilityLng ? getXY(selectedFacilityLat, selectedFacilityLng) : null;

  return (
    <div id="grid_map_container" className="bg-[#151619] border border-white/5 rounded-xl p-4 flex flex-col justify-between h-full shadow-xl">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-red-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">Dynamic Dispatch Grid</h3>
          </div>
          <span className="text-[10px] font-mono font-bold text-slate-400 bg-white/5 border border-white/10 px-2.5 py-0.5 rounded">
            Witwatersrand Sector
          </span>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Select a patient coordinate preset below to simulate different emergency locations in real-time:
        </p>
 
        {/* Location Presets */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {presets.map((p) => {
            const isSelected = Math.abs(p.lat - patientLat) < 0.001 && Math.abs(p.lng - patientLng) < 0.001;
            return (
              <button
                key={p.name}
                id={`preset-${p.name.replace(/\s+/g, '-').toLowerCase()}`}
                onClick={() => onSelectCoordinates(p.lat, p.lng, p.name)}
                className={`text-xs px-2.5 py-1.5 rounded-lg border text-left transition-all cursor-pointer ${
                  isSelected
                    ? "bg-red-500/10 border-red-500/30 text-red-400 font-bold shadow-[0_0_10px_rgba(239,68,68,0.1)]"
                    : "bg-black/30 border-white/5 text-slate-400 hover:bg-black/50"
                }`}
              >
                <div className="truncate">{p.name}</div>
                <div className="text-[10px] font-mono opacity-80 truncate">
                  {p.lat.toFixed(4)}, {p.lng.toFixed(4)}
                </div>
              </button>
            );
          })}
        </div>
      </div>
 
      {/* SVG Map Canvas */}
      <div className="relative border border-white/5 rounded-lg overflow-hidden bg-black shadow-inner flex-1 min-h-[220px]">
        {/* Background Grid Lines */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.05]" style={{
          backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
          backgroundSize: "20px 20px"
        }} />
 
        <svg viewBox="0 0 400 300" className="w-full h-full">
          {/* District boundaries or sectors */}
          <line x1="0" y1="150" x2="400" y2="150" stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="4 4" />
          <line x1="200" y1="0" x2="200" y2="300" stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="4 4" />
 
          {/* Dotted Route Line if Facility Selected */}
          {routeTargetPos && (
            <>
              <motion.line
                x1={patientPos.x}
                y1={patientPos.y}
                x2={routeTargetPos.x}
                y2={routeTargetPos.y}
                stroke="#ef4444"
                strokeWidth="2.5"
                strokeDasharray="6 6"
                initial={{ strokeDashoffset: 100 }}
                animate={{ strokeDashoffset: 0 }}
                transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
              />
              <circle
                cx={patientPos.x}
                cy={patientPos.y}
                r="18"
                fill="none"
                stroke="#ef4444"
                strokeWidth="1"
                className="animate-ping opacity-20"
              />
            </>
          )}
 
          {/* Hospital Clinics Pins */}
          {hospitals.map((h) => {
            const pos = getXY(h.lat, h.lng);
            const isTarget = selectedFacilityLat === h.lat && selectedFacilityLng === h.lng;
            return (
              <g key={h.name} className="cursor-help group">
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={isTarget ? "8" : "5"}
                  fill={h.color}
                  stroke="#000"
                  strokeWidth="1.5"
                  className={isTarget ? "animate-pulse" : ""}
                />
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r="12"
                  fill="none"
                  stroke={h.color}
                  strokeWidth="1"
                  className="opacity-40 animate-ping"
                  style={{ animationDuration: isTarget ? "2s" : "4s" }}
                />
                <text
                  x={pos.x}
                  y={pos.y - 12}
                  textAnchor="middle"
                  className="text-[8px] font-bold fill-slate-300 bg-black/80 px-1 py-0.5 rounded"
                >
                  {h.name.split(" ")[0]}
                </text>
              </g>
            );
          })}
 
          {/* Patient Position Pin */}
          <g>
            <circle cx={patientPos.x} cy={patientPos.y} r="6" fill="#ef4444" stroke="#000000" strokeWidth="1.5" />
            <path
              d={`M ${patientPos.x} ${patientPos.y} L ${patientPos.x - 4} ${patientPos.y - 10} A 4 4 0 1 1 ${patientPos.x + 4} ${patientPos.y - 10} Z`}
              fill="#ef4444"
            />
            <circle cx={patientPos.x} cy={patientPos.y - 10} r="2" fill="#ffffff" />
          </g>
        </svg>
 
        {/* Floating Indicator */}
        <div className="absolute bottom-2 left-2 bg-black/80 backdrop-blur border border-white/10 px-2.5 py-1 rounded text-[10px] font-mono text-slate-300 flex items-center gap-1.5 shadow-md">
          <Activity className="w-3 h-3 text-emerald-400 animate-pulse" />
          GPS Lock Verified
        </div>
      </div>
    </div>
  );
}

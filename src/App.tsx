import React, { useState, useEffect } from "react";
import { Shield, HeartPulse, Activity, Bell, Compass, ServerCrash } from "lucide-react";
import { motion } from "motion/react";
import { DispatchRecord, SystemLog } from "./types";
import MotherConsole from "./components/MotherConsole";
import GridMap from "./components/GridMap";
import SystemLogs from "./components/SystemLogs";
import DispatchHistory from "./components/DispatchHistory";

export default function App() {
  // Coordinates
  const [patientLat, setPatientLat] = useState(-26.2041); // Default Jo'burg center
  const [patientLng, setPatientLng] = useState(28.0473);
  const [selectedPresetName, setSelectedPresetName] = useState("Johannesburg Central");

  // Core App states
  const [dispatches, setDispatches] = useState<DispatchRecord[]>([]);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastDispatch, setLastDispatch] = useState<DispatchRecord | null>(null);
  const [selectedDispatchId, setSelectedDispatchId] = useState<string | null>(null);
  const [serverError, setServerError] = useState("");

  // Fetch dispatches & logs on mount
  const refreshData = async () => {
    try {
      const [dispatchesRes, logsRes] = await Promise.all([
        fetch("/api/dispatches"),
        fetch("/api/logs"),
      ]);

      if (dispatchesRes.ok && logsRes.ok) {
        const dispatchesData = await dispatchesRes.json();
        const logsData = await logsRes.json();

        setDispatches(dispatchesData.dispatches);
        setLogs(logsData.logs);
      }
    } catch (err: any) {
      console.error("Error connecting to server:", err);
      setServerError("Failed to connect to the SafeDelivery secure backend. Verify server is running.");
    }
  };

  useEffect(() => {
    refreshData();
    // Set up brief polling for logs and dispatch updates (real-time feel)
    const interval = setInterval(refreshData, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectPreset = (lat: number, lng: number, name: string) => {
    setPatientLat(lat);
    setPatientLng(lng);
    setSelectedPresetName(name);
  };

  const handleSubmitTriage = async (text: string) => {
    setLoading(true);
    setServerError("");
    try {
      const response = await fetch("/api/triage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          latitude: patientLat,
          longitude: patientLng,
        }),
      });

      if (!response.ok) {
        throw new Error("Triage API error response.");
      }

      const result: DispatchRecord = await response.json();
      setLastDispatch(result);
      setSelectedDispatchId(result.id);
      
      // Refresh logs immediately
      await refreshData();
    } catch (err: any) {
      console.error("Error submitting triage:", err);
      setServerError("Clinical processing timeout. Rule-based system handling backup routing.");
    } finally {
      setLoading(false);
    }
  };

  // Quick stats derived from active dispatches list
  const activeEmergencies = dispatches.filter((d) => d.triageTier === "EMERGENCY").length;
  const activeUrgent = dispatches.filter((d) => d.triageTier === "URGENT").length;
  const totalDispatches = dispatches.length;

  return (
    <div id="safedelivery_dashboard" className="min-h-screen bg-[#0A0A0B] text-slate-300 flex flex-col justify-between selection:bg-rose-900/40 selection:text-rose-200 font-sans">
      {/* Header Banner */}
      <header className="bg-[#0F1012] border-b border-white/10 sticky top-0 z-10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]">
              <HeartPulse className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white tracking-tight uppercase">
                  SafeDelivery <span className="text-slate-500 font-normal">Intelligence Engine</span>
                </h1>
                <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                  v2.5 LIVE
                </span>
              </div>
              <p className="text-xs text-slate-400">
                POPIA-Compliant voice-first emergency transit coordination for maternal care
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Status indicators */}
            <div className="flex flex-col items-end mr-3">
              <span className="text-[9px] text-slate-500 uppercase tracking-widest font-mono">Telemetry Lock</span>
              <span className="font-mono text-xs text-emerald-400 font-medium">SD-PRC-7742-ANON</span>
            </div>
            <div className="h-8 w-px bg-white/10 mr-1"></div>
            <div className="flex items-center bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded text-xs font-mono text-emerald-400 font-semibold gap-1.5">
              <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
              POPIA COMPLIANT
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Error Callout */}
        {serverError && (
          <div className="col-span-12 bg-rose-950/40 border border-rose-900/50 rounded-xl p-4 flex items-center gap-3 text-rose-300 text-xs font-medium">
            <ServerCrash className="w-5 h-5 text-rose-400 shrink-0 animate-bounce" />
            <div>
              <span className="font-bold">System Alert:</span> {serverError}
            </div>
          </div>
        )}

        {/* Column Left: Patient Console (Mother Portal) */}
        <div className="col-span-12 lg:col-span-5 flex flex-col justify-stretch">
          <MotherConsole
            onSubmitTriage={handleSubmitTriage}
            loading={loading}
            lastDispatch={lastDispatch}
          />
        </div>

        {/* Column Right: Dispatcher Command dashboard (Grid Map + Audit telemetry) */}
        <div className="col-span-12 lg:col-span-7 flex flex-col gap-6">
          
          {/* Bento Stats Ticker */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-[#151619] border border-white/5 rounded-xl p-4 flex items-center justify-between shadow-sm">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Total Dispatched</span>
                <span className="text-2xl font-bold text-white font-mono mt-1 block">{totalDispatches}</span>
              </div>
              <Compass className="w-8 h-8 text-slate-600" />
            </div>
            <div className="bg-[#151619] border border-red-500/10 rounded-xl p-4 flex items-center justify-between shadow-lg shadow-red-500/5">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Active Emergency</span>
                <span className="text-2xl font-bold text-red-400 font-mono mt-1 block">{activeEmergencies}</span>
              </div>
              <Bell className="w-8 h-8 text-red-500/40 animate-pulse" />
            </div>
            <div className="bg-[#151619] border border-white/5 rounded-xl p-4 flex items-center justify-between shadow-sm">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Active Urgent</span>
                <span className="text-2xl font-bold text-amber-400 font-mono mt-1 block">{activeUrgent}</span>
              </div>
              <Activity className="w-8 h-8 text-amber-500/40" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch flex-1">
            {/* Map Block */}
            <div className="md:col-span-7 h-full">
              <GridMap
                patientLat={patientLat}
                patientLng={patientLng}
                onSelectCoordinates={handleSelectPreset}
                selectedFacilityLat={lastDispatch?.optimalFacility.lat}
                selectedFacilityLng={lastDispatch?.optimalFacility.lng}
              />
            </div>

            {/* Audit Logs block */}
            <div className="md:col-span-5 h-full">
              <SystemLogs logs={logs} />
            </div>
          </div>

          {/* Operational Log records history */}
          <div className="flex-1">
            <DispatchHistory
              dispatches={dispatches}
              selectedId={selectedDispatchId}
              onSelectDispatch={(id) => setSelectedDispatchId(id)}
            />
          </div>

        </div>
      </main>

      {/* Footer info & security notices */}
      <footer className="bg-[#0F1012] border-t border-white/10 py-4 px-6 text-center text-[10px] text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <span>SafeDelivery Clinical-Logistics. Protection of Personal Information Act (POPIA) ISO 27001 Certified Cryptographic Tunnel.</span>
          <span>Johannesburg Emergency Services &middot; Gauteng Department of Health</span>
        </div>
      </footer>
    </div>
  );
}

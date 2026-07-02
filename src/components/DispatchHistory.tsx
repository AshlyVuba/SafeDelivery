import React from "react";
import { ListFilter, Clock, Heart, Shield, Activity, Phone, ChevronRight } from "lucide-react";
import { DispatchRecord } from "../types";

interface DispatchHistoryProps {
  dispatches: DispatchRecord[];
  selectedId: string | null;
  onSelectDispatch: (id: string) => void;
}

export default function DispatchHistory({
  dispatches,
  selectedId,
  onSelectDispatch,
}: DispatchHistoryProps) {
  return (
    <div id="dispatch_history_container" className="bg-[#151619] border border-white/5 rounded-xl p-4 flex flex-col h-full shadow-xl">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          <ListFilter className="w-5 h-5 text-red-400" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-white">Operational Log</h3>
        </div>
        <span className="text-[10px] bg-white/5 text-slate-400 border border-white/10 px-2.5 py-0.5 rounded-full font-mono font-bold">
          {dispatches.length} Active Records
        </span>
      </div>

      <div className="flex-1 overflow-y-auto max-h-[360px] space-y-2 pr-1">
        {dispatches.length === 0 ? (
          <div className="text-slate-500 italic text-center py-10 text-xs">
            No maternal transit records generated yet. Log a distress report to start dispatch.
          </div>
        ) : (
          dispatches.map((d) => {
            const isSelected = selectedId === d.id;
            const timeStr = new Date(d.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

            let tierColor = "bg-teal-500/10 text-teal-400 border-teal-500/20";
            if (d.triageTier === "EMERGENCY") {
              tierColor = "bg-red-500/10 text-red-400 border-red-500/20 animate-pulse";
            } else if (d.triageTier === "URGENT") {
              tierColor = "bg-amber-500/10 text-amber-400 border-amber-500/20";
            }

            return (
              <button
                key={d.id}
                id={`dispatch-item-${d.id}`}
                onClick={() => onSelectDispatch(d.id)}
                className={`w-full p-3 rounded-lg border text-left transition-all flex items-center justify-between group cursor-pointer ${
                  isSelected
                    ? "bg-red-500/10 border-red-500/30 ring-1 ring-red-500/30"
                    : "bg-black/30 border-white/5 hover:bg-black/50"
                }`}
              >
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono font-bold text-slate-200">
                      {d.patientToken}
                    </span>
                    <span className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3" />
                      {timeStr}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`text-[10px] px-2 py-0.5 rounded border font-bold ${tierColor}`}>
                      {d.triageTier}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {d.optimalFacility.name.split(" ")[0]} Clinic
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 line-clamp-1 italic">
                    "{d.inputText}"
                  </p>
                </div>

                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors shrink-0" />
              </button>
            );
          })
        )}
      </div>

      {/* Selected Dispatch Inspector (Sub-panel) */}
      {selectedId && dispatches.find((d) => d.id === selectedId) && (() => {
        const d = dispatches.find((dispatch) => dispatch.id === selectedId)!;
        return (
          <div className="mt-4 pt-3 border-t border-white/5 bg-black/40 rounded-lg p-3 text-xs text-slate-300 space-y-2">
            <div className="flex items-center justify-between font-mono font-bold text-slate-200 text-[11px]">
              <span>INSIGHTS: {d.patientToken}</span>
              <span className="text-emerald-400 flex items-center gap-1 text-[10px]">
                <Shield className="w-3 h-3" />
                POPIA SECURED
              </span>
            </div>

            <div>
              <span className="font-bold text-slate-500 block mb-0.5 uppercase tracking-widest text-[9px] font-mono">Clinical Justification:</span>
              <p className="text-slate-300 leading-relaxed bg-black/50 p-2.5 rounded border border-white/5 italic">
                {d.clinicalJustification}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
              <div className="bg-black/50 p-2.5 rounded border border-white/5">
                <span className="font-bold text-slate-500 block uppercase tracking-widest text-[9px] font-mono">Routing Facility:</span>
                <span className="font-semibold text-slate-200 truncate block mt-0.5">{d.optimalFacility.name}</span>
                <span className="text-[10px] text-slate-400 font-mono block">ETA: {d.optimalFacility.estimatedTransitTimeMinutes}m ({d.optimalFacility.distanceKm}km)</span>
              </div>
              <div className="bg-black/50 p-2.5 rounded border border-white/5">
                <span className="font-bold text-slate-500 block uppercase tracking-widest text-[9px] font-mono">Community Worker:</span>
                {d.chw ? (
                  <>
                    <span className="font-semibold text-slate-200 truncate block mt-0.5">{d.chw.name}</span>
                    <span className="text-[10px] text-cyan-400 font-mono block flex items-center gap-1 mt-0.5">
                      <Phone className="w-2.5 h-2.5" />
                      {d.chw.phone}
                    </span>
                  </>
                ) : (
                  <span className="text-slate-500 italic block mt-0.5">None Required (Routine)</span>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

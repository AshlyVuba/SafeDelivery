import React from "react";
import { ShieldCheck, Terminal, AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";
import { SystemLog } from "../types";

interface SystemLogsProps {
  logs: SystemLog[];
}

export default function SystemLogs({ logs }: SystemLogsProps) {
  return (
    <div id="system_logs_container" className="bg-[#151619] text-slate-100 rounded-xl p-4 flex flex-col h-full border border-white/5 shadow-xl">
      <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-red-400" />
          <h3 className="text-xs font-bold tracking-widest uppercase text-slate-300">
            POPIA & Security Audit Stream
          </h3>
        </div>
        <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] text-emerald-400 font-mono font-bold">
          <ShieldCheck className="w-3.5 h-3.5" />
          ACTIVE COMPLIANCE
        </div>
      </div>

      <div className="flex-1 overflow-y-auto max-h-[170px] space-y-2 pr-1 font-mono text-[11px] leading-relaxed">
        {logs.length === 0 ? (
          <div className="text-slate-500 italic text-center py-4">No security logs recorded.</div>
        ) : (
          logs.map((log, index) => {
            const dateStr = new Date(log.timestamp).toLocaleTimeString();
            
            let badgeColor = "text-slate-400 bg-white/5";
            let Icon = Terminal;

            if (log.level === "SUCCESS") {
              badgeColor = "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20";
              Icon = CheckCircle2;
            } else if (log.level === "SECURITY") {
              badgeColor = "text-red-400 bg-red-500/10 border border-red-500/20";
              Icon = ShieldAlert;
            } else if (log.level === "WARNING") {
              badgeColor = "text-amber-400 bg-amber-500/10 border border-amber-500/20";
              Icon = AlertTriangle;
            }

            return (
              <div
                key={index}
                className={`p-2.5 rounded-lg flex items-start gap-2.5 transition-all hover:bg-white/5 ${
                  log.level === "SECURITY" ? "border-l-2 border-red-500 bg-red-500/5" : ""
                } ${log.level === "SUCCESS" ? "border-l-2 border-emerald-500 bg-emerald-500/5" : ""}`}
              >
                <div className="mt-0.5 shrink-0">
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] text-slate-500">{dateStr}</span>
                    <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${badgeColor}`}>
                      {log.level}
                    </span>
                  </div>
                  <p className="text-slate-300 break-words">{log.message}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-3 border-t border-white/5 pt-2 flex items-center justify-between text-[10px] text-slate-500 font-mono">
        <span>POPIA ISO 27001 Tunnel</span>
        <span>Secure Session Logs</span>
      </div>
    </div>
  );
}

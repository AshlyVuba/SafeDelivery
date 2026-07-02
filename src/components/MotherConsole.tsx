import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Send, Sparkles, Volume2, ShieldCheck, HeartPulse, Hospital, AlertCircle, PhoneCall } from "lucide-react";
import { motion } from "motion/react";
import { DispatchRecord } from "../types";

interface MotherConsoleProps {
  onSubmitTriage: (text: string) => Promise<void>;
  loading: boolean;
  lastDispatch: DispatchRecord | null;
}

export default function MotherConsole({
  onSubmitTriage,
  loading,
  lastDispatch,
}: MotherConsoleProps) {
  const [inputText, setInputText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [ttsActive, setTtsActive] = useState(false);
  const [speechError, setSpeechError] = useState("");

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check SpeechRecognition support
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setVoiceSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-ZA"; // Target South Africa English

      recognition.onstart = () => {
        setIsRecording(true);
        setSpeechError("");
        setTranscription("Listening carefully to your symptoms...");
      };

      recognition.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        setInputText(text);
        setTranscription(`Transcribed: "${text}"`);
      };

      recognition.onerror = (event: any) => {
        console.error("Speech Recognition error:", event.error);
        if (event.error === "not-allowed") {
          setSpeechError("Microphone permission denied. Typing is fully supported!");
        } else {
          setSpeechError(`Speech support issue: ${event.error}. Please type below!`);
        }
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  // Text-To-Speech (TTS) Playback for Mother Support
  const playReassuringVoice = (message: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel(); // Stop any current speech
    
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = "en-ZA"; // English South Africa accent or fallback
    utterance.rate = 0.95; // Calm, clear cadence

    utterance.onstart = () => setTtsActive(true);
    utterance.onend = () => setTtsActive(false);
    utterance.onerror = () => setTtsActive(false);

    window.speechSynthesis.speak(utterance);
  };

  // Auto play TTS when a new dispatch occurs
  useEffect(() => {
    if (lastDispatch && lastDispatch.patientFacingMessage) {
      playReassuringVoice(lastDispatch.patientFacingMessage);
    }
  }, [lastDispatch]);

  const handleStartVoice = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
    } else {
      setTranscription("");
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          // If already running
          recognitionRef.current.stop();
        }
      } else {
        // Fallback simulation if Speech Recognition is not fully active/configured
        setIsRecording(true);
        setTranscription("Simulating voice capture... Speak now.");
        const simulatedTexts = [
          "I am in severe pain, having intense contractions every 3 minutes, and there is heavy bleeding.",
          "My water broke about an hour ago, contractions are starting to feel frequent, maybe every 5 minutes.",
          "I have mild cramps but no bleeding, just want to check early routing coordinates."
        ];
        const randomText = simulatedTexts[Math.floor(Math.random() * simulatedTexts.length)];
        
        setTimeout(() => {
          setInputText(randomText);
          setTranscription(`Transcribed (Simulated Voice): "${randomText}"`);
          setIsRecording(false);
        }, 3000);
      }
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSubmitTriage(inputText);
    setInputText("");
    setTranscription("");
  };

  const handlePresetTrigger = (presetText: string) => {
    setInputText(presetText);
    onSubmitTriage(presetText);
    setInputText("");
    setTranscription("");
  };

  return (
    <div id="mother_console_container" className="bg-[#151619] border border-white/5 rounded-xl p-5 flex flex-col h-full justify-between space-y-5 shadow-xl">
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
              <HeartPulse className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-white">Distress Transit Console</h2>
              <p className="text-[11px] text-slate-400">Voice-first clinical routing coordinate pipeline</p>
            </div>
          </div>
          <span className="text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-0.5 rounded-full flex items-center gap-1.5 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            24/7 LIVE STREAMING
          </span>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Record your clinical labor symptoms below. Our medical intelligence engine will instantly prioritize ambulance dispatch and CHW guidance based on distress urgency.
        </p>
      </div>

      {/* Voice Processing Input Unit */}
      <div className="border border-white/5 rounded-xl p-4 bg-black/40 relative overflow-hidden flex flex-col items-center justify-center min-h-[160px]">
        {isRecording && (
          <div className="absolute inset-0 bg-red-500/5 backdrop-blur-[1px] pointer-events-none" />
        )}

        {/* Pulse waveform visualizer */}
        {isRecording ? (
          <div className="flex items-center gap-1.5 mb-4 justify-center h-8">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <motion.div
                key={i}
                className="w-1.5 bg-red-500 rounded-full"
                animate={{ height: [12, 32, 12] }}
                transition={{
                  repeat: Infinity,
                  duration: 0.6,
                  delay: i * 0.08,
                }}
              />
            ))}
          </div>
        ) : (
          <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-3">
            <Mic className="w-5 h-5 text-slate-400" />
          </div>
        )}

        <button
          id="record_button"
          onClick={handleStartVoice}
          className={`px-5 py-2.5 rounded-full font-semibold text-xs tracking-wide shadow-md flex items-center gap-2 transition-all cursor-pointer ${
            isRecording
              ? "bg-red-600 hover:bg-red-700 text-white animate-pulse"
              : "bg-[#0F1012] hover:bg-black text-slate-300 border border-white/10"
          }`}
        >
          {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
          {isRecording ? "Stop Recording" : "Speak Distress Symptoms"}
        </button>

        {transcription && (
          <p className="text-[11px] font-mono text-emerald-400 text-center mt-3 max-w-xs animate-fade-in px-2">
            {transcription}
          </p>
        )}

        {speechError && (
          <p className="text-[10px] text-amber-400 text-center mt-2 px-2 flex items-center gap-1 justify-center font-medium">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {speechError}
          </p>
        )}
      </div>

      {/* Alternative Text Area Form */}
      <form onSubmit={handleTextSubmit} className="space-y-3">
        <div className="relative">
          <textarea
            id="distress_input"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type labor contractions, bleeding levels, or pain symptoms..."
            disabled={loading}
            className="w-full h-18 text-xs p-3 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 resize-none placeholder:text-slate-600 bg-black/30 text-white"
          />
          <button
            type="submit"
            disabled={loading || !inputText.trim()}
            className="absolute bottom-2 right-2 bg-red-600 hover:bg-red-700 text-white p-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:hover:bg-red-600 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Diagnostic Preset Triggers (For testing easy click triage) */}
        <div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 font-mono">
            Maternal Diagnostic Scenarios
          </span>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              id="preset-emergency"
              onClick={() => handlePresetTrigger("Severe cramping pain with heavy bleeding, baby feels like it is crowning and I feel intense pressure to push.")}
              className="text-[11px] px-3 py-2 rounded bg-red-500/5 hover:bg-red-500/10 text-red-400 text-left border border-red-500/20 transition-colors flex items-center justify-between cursor-pointer"
            >
              <span>🚨 Critical Emergency: Crowning & Bleeding</span>
              <span className="text-[9px] font-bold uppercase tracking-wider bg-red-500/20 px-1.5 py-0.5 rounded text-red-300">EMERGENCY</span>
            </button>
            <button
              type="button"
              id="preset-urgent"
              onClick={() => handlePresetTrigger("My water broke an hour ago. Having intense contractions every 3 minutes. Need dispatch to hospital immediately.")}
              className="text-[11px] px-3 py-2 rounded bg-amber-500/5 hover:bg-amber-500/10 text-amber-400 text-left border border-amber-500/20 transition-colors flex items-center justify-between cursor-pointer"
            >
              <span>⚠️ Active Labor: Water Broken, 3m contractions</span>
              <span className="text-[9px] font-bold uppercase tracking-wider bg-amber-500/20 px-1.5 py-0.5 rounded text-amber-300">URGENT</span>
            </button>
            <button
              type="button"
              id="preset-routine"
              onClick={() => handlePresetTrigger("Early labor. Having mild contractions every 20 minutes, no water breakage or complications yet, just want a routing check.")}
              className="text-[11px] px-3 py-2 rounded bg-teal-500/5 hover:bg-teal-500/10 text-teal-400 text-left border border-teal-500/20 transition-colors flex items-center justify-between cursor-pointer"
            >
              <span>ℹ️ Early Labor: Standard Mild Contractions</span>
              <span className="text-[9px] font-bold uppercase tracking-wider bg-teal-500/20 px-1.5 py-0.5 rounded text-teal-300">ROUTINE</span>
            </button>
          </div>
        </div>
      </form>

      {/* Patient Triage Output (Comfort Card) */}
      {lastDispatch && (
        <div
          id="comfort_card"
          className={`border rounded-xl p-5 space-y-3 shadow-lg ${
            lastDispatch.triageTier === "EMERGENCY"
              ? "bg-red-600 text-white border-red-400/30 shadow-[0_0_20px_rgba(239,68,68,0.15)]"
              : lastDispatch.triageTier === "URGENT"
                ? "bg-amber-500/10 border-amber-500/30 text-amber-200"
                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full bg-current ${lastDispatch.triageTier === "EMERGENCY" ? "animate-pulse" : "animate-ping"} shrink-0`} />
              <span className="text-[10px] font-mono font-bold tracking-widest uppercase opacity-90">
                PATIENT COMFORT TRANSMISSION
              </span>
            </div>
            <button
              id="replay_tts_button"
              onClick={() => playReassuringVoice(lastDispatch.patientFacingMessage)}
              className="flex items-center gap-1 bg-black/40 hover:bg-black/60 text-white text-[10px] px-2.5 py-1 rounded border border-white/10 transition-all shadow-sm cursor-pointer"
            >
              <Volume2 className={`w-3 h-3 ${ttsActive ? "text-red-400 animate-pulse" : ""}`} />
              Replay Speech
            </button>
          </div>

          <p className={`text-sm font-semibold leading-relaxed italic ${lastDispatch.triageTier === "EMERGENCY" ? "text-white" : ""}`}>
            "{lastDispatch.patientFacingMessage}"
          </p>

          <div className={`border-t pt-3 space-y-2 text-[11px] ${lastDispatch.triageTier === "EMERGENCY" ? "border-white/20" : "border-white/5"}`}>
            <div className="flex items-center justify-between">
              <span className="opacity-75 flex items-center gap-1">
                <Hospital className="w-3.5 h-3.5 shrink-0" />
                Nearest Facility:
              </span>
              <span className="font-bold truncate max-w-[200px]">{lastDispatch.optimalFacility.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="opacity-75">Optimal Route ETA:</span>
              <span className="font-bold">
                {lastDispatch.optimalFacility.distanceKm} km (Est. {lastDispatch.optimalFacility.estimatedTransitTimeMinutes} mins)
              </span>
            </div>
            {lastDispatch.chw && (
              <div className="flex items-center justify-between text-cyan-300 font-medium">
                <span className="opacity-75">Assigned Midwife Support:</span>
                <span className="font-bold">
                  {lastDispatch.chw.name} ({lastDispatch.chw.phone})
                </span>
              </div>
            )}
            {lastDispatch.triageTier === "EMERGENCY" && (
              <div className="bg-black/20 p-2.5 rounded-lg border border-white/10 text-[10px] text-white font-medium flex items-center justify-between mt-2 shadow-sm">
                <span>SA National Medical Hotline:</span>
                <a href="tel:112" className="flex items-center gap-1 bg-white text-red-600 px-3 py-1 rounded font-bold hover:bg-white/90">
                  <PhoneCall className="w-2.5 h-2.5" />
                  Dial 112
                </a>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 text-[9px] opacity-65 justify-end pt-1 font-mono">
            <ShieldCheck className="w-3 h-3" />
            POPIA Compliant Secure ID: {lastDispatch.patientToken}
          </div>
        </div>
      )}
    </div>
  );
}

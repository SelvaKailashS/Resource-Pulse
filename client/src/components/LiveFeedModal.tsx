import React, { useState, useEffect } from "react";
import {
  Activity,
  X,
  Radio,
  Pause,
  Play,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Info,
  Send,
  Zap,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface FeedEvent {
  id: string;
  timestamp: string;
  source: string;
  level: "info" | "warning" | "success" | "critical";
  message: string;
  latencyMs: number;
}

const INITIAL_EVENTS: FeedEvent[] = [
  {
    id: "evt-1",
    timestamp: "Just now",
    source: "Telemetry Engine",
    level: "success",
    message: "Live capacity telemetry synchronized across all active team deliverables.",
    latencyMs: 142,
  },
  {
    id: "evt-2",
    timestamp: "12s ago",
    source: "Supabase Postgres",
    level: "success",
    message: "Real-time task synchronization heartbeat verified (vfvwviprodmoqqsxzfva).",
    latencyMs: 24,
  },
  {
    id: "evt-3",
    timestamp: "35s ago",
    source: "AWS EKS Cluster Alpha",
    level: "info",
    message: "Pod autoscale scale-up evaluation completed. 14 pods active, 0 restarts.",
    latencyMs: 18,
  },
  {
    id: "evt-4",
    timestamp: "1m ago",
    source: "GPU Cluster Alpha",
    level: "info",
    message: "H100 Node 2 thermal nominal at 64°C, VRAM utilization 92.4%.",
    latencyMs: 12,
  },
  {
    id: "evt-5",
    timestamp: "2m ago",
    source: "Resource Allocation AI",
    level: "info",
    message: "Samantha Voice Copilot initialized on en-US synthesis engine.",
    latencyMs: 8,
  },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LiveFeedModal({ open, onOpenChange }: Props) {
  const [events, setEvents] = useState<FeedEvent[]>(INITIAL_EVENTS);
  const [isStreaming, setIsStreaming] = useState(true);
  const [filterLevel, setFilterLevel] = useState<string>("all");

  // Simulated live event feed every 7 seconds when streaming is active
  useEffect(() => {
    if (!open || !isStreaming) return;

    const interval = setInterval(() => {
      const liveSources = [
        { source: "Payment Gateway v2.4", level: "info" as const, message: "Webhook ping processed in 38ms from Stripe Sandbox." },
        { source: "Redis Cluster Alpha", level: "success" as const, message: "Memory defragmentation cycle finished. Hit ratio: 98.7%." },
        { source: "GitHub CI/CD", level: "info" as const, message: "PR #142 test suite completed in 3m 42s with zero failures." },
        { source: "PagerDuty Guard", level: "info" as const, message: "On-call rotation verified: primary engineer active for cloud infra." },
        { source: "Capacity Planner AI", level: "info" as const, message: "Milestone buffer check: all deliverables operating in healthy equilibrium." },
      ];

      const chosen = liveSources[Math.floor(Math.random() * liveSources.length)];
      const newEvt: FeedEvent = {
        id: `evt-${Date.now()}`,
        timestamp: "Just now",
        source: chosen.source,
        level: chosen.level,
        message: chosen.message,
        latencyMs: Math.floor(Math.random() * 80) + 12,
      };

      setEvents((prev) => [newEvt, ...prev.slice(0, 19)]);
    }, 6000);

    return () => clearInterval(interval);
  }, [open, isStreaming]);

  const emitManualPing = () => {
    const manualEvt: FeedEvent = {
      id: `evt-${Date.now()}`,
      timestamp: "Just now",
      source: "Manual Telemetry Probe",
      level: "success",
      message: "Operator ping emitted. All 8 Northstar nodes acknowledged within 14ms.",
      latencyMs: 14,
    };
    setEvents((prev) => [manualEvt, ...prev]);
  };

  const filteredEvents = events.filter((e) => {
    if (filterLevel === "all") return true;
    return e.level === filterLevel;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-slate-900 border-slate-700 text-slate-100 p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="p-5 pb-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                <Activity size={20} className={isStreaming ? "animate-pulse" : ""} />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                  Live Operations Feed
                  {isStreaming ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      STREAMING
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      PAUSED
                    </span>
                  )}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400 mt-0.5">
                  Real-time telemetry event stream across all Northstar nodes, pools, and services.
                </DialogDescription>
              </div>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-800"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-800/80">
            <div className="flex items-center gap-1.5">
              {["all", "info", "warning", "success"].map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setFilterLevel(lvl)}
                  className={`text-[11px] font-medium px-2.5 py-1 rounded-md transition-colors capitalize ${
                    filterLevel === lvl
                      ? "bg-sky-500/20 text-sky-300 border border-sky-500/40"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsStreaming(!isStreaming)}
                className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                title={isStreaming ? "Pause Stream" : "Resume Stream"}
              >
                {isStreaming ? <Pause size={12} /> : <Play size={12} />}
                {isStreaming ? "Pause" : "Resume"}
              </button>
              <button
                onClick={emitManualPing}
                className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-md bg-sky-600 hover:bg-sky-500 text-white transition-colors"
                title="Send test telemetry probe"
              >
                <Zap size={12} />
                Emit Ping
              </button>
              <button
                onClick={() => setEvents([])}
                className="p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                title="Clear Events"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        </DialogHeader>

        <div className="p-4 max-h-[420px] overflow-y-auto space-y-2.5">
          {filteredEvents.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              No telemetry events to display. Click "Emit Ping" to generate a live probe.
            </div>
          ) : (
            filteredEvents.map((evt) => (
              <div
                key={evt.id}
                className="p-3 rounded-lg bg-slate-950/40 border border-slate-800/80 hover:border-slate-700/80 transition-all flex items-start justify-between gap-3 text-xs"
              >
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 shrink-0">
                    {evt.level === "warning" && <AlertTriangle size={14} className="text-amber-400" />}
                    {evt.level === "success" && <CheckCircle2 size={14} className="text-emerald-400" />}
                    {evt.level === "info" && <Info size={14} className="text-sky-400" />}
                    {evt.level === "critical" && <AlertTriangle size={14} className="text-rose-400" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-200">{evt.source}</span>
                      <span className="text-[10px] font-mono text-slate-500">{evt.timestamp}</span>
                    </div>
                    <p className="text-slate-300 mt-0.5 leading-relaxed">{evt.message}</p>
                  </div>
                </div>
                <span className="font-mono text-[10px] text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded shrink-0">
                  {evt.latencyMs}ms
                </span>
              </div>
            ))
          )}
        </div>

        <div className="p-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <Radio size={13} className="text-sky-400 animate-pulse" />
            <span>Telemetry engine: WebSockets + Supabase Edge Channels</span>
          </div>
          <span className="font-mono text-slate-500">{events.length} events logged</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

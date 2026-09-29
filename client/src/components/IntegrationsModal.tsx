import React, { useState } from "react";
import {
  Boxes,
  X,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Zap,
  Clock,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";

interface IntegrationItem {
  id: string;
  name: string;
  category: string;
  status: "connected" | "syncing" | "paused";
  lastSync: string;
  description: string;
  enabled: boolean;
}

const DEFAULT_INTEGRATIONS: IntegrationItem[] = [
  {
    id: "jira",
    name: "Jira Software",
    category: "Issue Tracking",
    status: "connected",
    lastSync: "42s ago",
    description: "Syncs Sprint 44 epics, story points, and task blockers automatically.",
    enabled: true,
  },
  {
    id: "github",
    name: "GitHub Actions",
    category: "CI/CD & Code",
    status: "connected",
    lastSync: "1m ago",
    description: "Tracks pull requests, automated E2E test runs, and merge locks.",
    enabled: true,
  },
  {
    id: "supabase",
    name: "Supabase Database",
    category: "Database & Realtime",
    status: "connected",
    lastSync: "Just now",
    description: "High-performance Postgres database (vfvwviprodmoqqsxzfva) with instant sync.",
    enabled: true,
  },
  {
    id: "slack",
    name: "Slack Ops Channel",
    category: "ChatOps & Alerts",
    status: "connected",
    lastSync: "3m ago",
    description: "Broadcasts critical reallocation alerts and Samantha voice approvals to #ops-leads.",
    enabled: true,
  },
  {
    id: "pagerduty",
    name: "PagerDuty",
    category: "Incident Management",
    status: "connected",
    lastSync: "2m ago",
    description: "Monitors team on-call availability and escalation policies.",
    enabled: true,
  },
  {
    id: "aws",
    name: "AWS EKS Cluster",
    category: "Infrastructure",
    status: "connected",
    lastSync: "30s ago",
    description: "Cluster autoscaling telemetry and GPU node health tracking.",
    enabled: true,
  },
  {
    id: "stripe",
    name: "Stripe Billing",
    category: "Financials",
    status: "connected",
    lastSync: "5m ago",
    description: "Calculates live burn rate, overtime budgets, and cash runway projections.",
    enabled: true,
  },
  {
    id: "datadog",
    name: "Datadog APM",
    category: "Observability",
    status: "connected",
    lastSync: "18s ago",
    description: "End-to-end distributed tracing across microservices and edge APIs.",
    enabled: true,
  },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function IntegrationsModal({ open, onOpenChange }: Props) {
  const [integrations, setIntegrations] = useState<IntegrationItem[]>(DEFAULT_INTEGRATIONS);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const handleToggle = (id: string) => {
    setIntegrations((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const nextState = !item.enabled;
          toast(nextState ? `${item.name} enabled` : `${item.name} paused`, {
            description: nextState ? "Real-time sync resumed." : "Synchronization suspended.",
          });
          return {
            ...item,
            enabled: nextState,
            status: nextState ? "connected" : "paused",
          };
        }
        return item;
      })
    );
  };

  const handleSyncAll = () => {
    setSyncingId("all");
    setTimeout(() => {
      setSyncingId(null);
      setIntegrations((prev) =>
        prev.map((i) => (i.enabled ? { ...i, lastSync: "Just now", status: "connected" } : i))
      );
      toast.success("All integrations synchronized", {
        description: "Received fresh data from 8 connected enterprise providers.",
      });
    }, 1200);
  };

  const handleSyncOne = (item: IntegrationItem) => {
    setSyncingId(item.id);
    setTimeout(() => {
      setSyncingId(null);
      setIntegrations((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, lastSync: "Just now", status: "connected" } : i))
      );
      toast.success(`${item.name} refreshed`, {
        description: "Synced latest records and metadata successfully.",
      });
    }, 800);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-slate-900 border-slate-700 text-slate-100 p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="p-5 pb-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                <Boxes size={20} />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                  Enterprise Integrations Hub
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-sky-500/20 text-sky-400 border border-sky-500/30">
                    8 ACTIVE
                  </span>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400 mt-0.5">
                  Connected platforms feeding live capacity, sprint timelines, and incident telemetry.
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
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <ShieldCheck size={14} className="text-emerald-400" />
              <span>TLS 1.3 encrypted webhooks · Zero data retention policy</span>
            </div>
            <button
              onClick={handleSyncAll}
              disabled={syncingId !== null}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white transition-colors disabled:opacity-50"
            >
              <RefreshCw size={13} className={syncingId === "all" ? "animate-spin" : ""} />
              Sync All Now
            </button>
          </div>
        </DialogHeader>

        <div className="p-4 max-h-[420px] overflow-y-auto space-y-2.5">
          {integrations.map((item) => (
            <div
              key={item.id}
              className={`p-3.5 rounded-xl border transition-all ${
                item.enabled
                  ? "bg-slate-950/40 border-slate-800/90 hover:border-slate-700"
                  : "bg-slate-950/20 border-slate-800/40 opacity-60"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white">{item.name}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                      {item.category}
                    </span>
                    {item.enabled ? (
                      <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400">
                        <CheckCircle2 size={12} />
                        Connected
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-slate-500">Paused</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">{item.description}</p>
                  <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-500 font-mono">
                    <Clock size={11} />
                    <span>Last synced: {item.lastSync}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {item.enabled && (
                    <button
                      onClick={() => handleSyncOne(item)}
                      disabled={syncingId === item.id}
                      className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-800"
                      title="Sync this integration"
                    >
                      <RefreshCw size={14} className={syncingId === item.id ? "animate-spin" : ""} />
                    </button>
                  )}
                  <button
                    onClick={() => handleToggle(item.id)}
                    className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-1 ${
                      item.enabled ? "bg-sky-600" : "bg-slate-800"
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full bg-white transition-transform ${
                        item.enabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="p-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-[11px] text-slate-400">
          <span>Need custom webhooks or enterprise API keys?</span>
          <button
            onClick={() => toast.info("API Docs: https://docs.resourcepulse.io/integrations")}
            className="text-sky-400 hover:text-sky-300 inline-flex items-center gap-1 font-semibold"
          >
            <span>View Integration Docs</span>
            <ExternalLink size={12} />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { SECTORS, SectorDefinition } from "@shared/sectorsData";
import { CheckCircle2, ChevronRight, Layers, Sparkles, X } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeSectorId: string;
  onSelectSector: (sector: SectorDefinition) => void;
}

export function SectorModal({ open, onOpenChange, activeSectorId, onSelectSector }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="!max-w-[95vw] lg:!max-w-[1080px] !w-[95vw] !max-h-[90vh] !p-0 !gap-0 overflow-hidden bg-slate-950 border border-sky-500/40 text-white shadow-2xl rounded-2xl !flex !flex-col"
      >
        <DialogHeader className="p-5 px-6 border-b border-sky-900/40 bg-slate-900/90 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-400/30 flex items-center justify-center text-sky-400 shadow-sm shadow-sky-950">
                <Layers size={20} />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                  Multi-Sector Industry Templates
                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                    6 Ready Demos
                  </span>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400">
                  Select an industry sector template to switch resource pools, real-world incident simulations, and operational vocabulary.
                </DialogDescription>
              </div>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </DialogHeader>

        <div className="p-6 overflow-y-auto max-h-[75vh] space-y-3.5 bg-slate-900/20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {SECTORS.map((sector) => {
              const isSelected = sector.id === activeSectorId;
              return (
                <button
                  key={sector.id}
                  onClick={() => {
                    onSelectSector(sector);
                    onOpenChange(false);
                  }}
                  className={`p-4 rounded-xl text-left border transition-all flex flex-col justify-between gap-3 group ${
                    isSelected
                      ? "bg-sky-500/15 border-sky-400/70 shadow-lg shadow-sky-950/60 ring-1 ring-sky-400/30"
                      : "bg-slate-900/70 border-slate-800 hover:border-slate-700 hover:bg-slate-850"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl p-2 rounded-xl bg-slate-950 border border-slate-800 group-hover:scale-105 transition-transform">
                        {sector.icon}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-sm font-bold text-white group-hover:text-sky-300 transition-colors">
                            {sector.name}
                          </strong>
                          {isSelected && <CheckCircle2 size={16} className="text-sky-400" />}
                        </div>
                        <span className="text-[11px] font-mono text-slate-400 block">
                          {sector.organization} · {sector.category}
                        </span>
                      </div>
                    </div>
                    <span
                      className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase"
                      style={{
                        backgroundColor: `${sector.accentColor}20`,
                        color: sector.accentColor,
                        border: `1px solid ${sector.accentColor}40`,
                      }}
                    >
                      {sector.id}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                      <span className="font-mono text-sky-400 font-semibold">Critical Asset at Risk:</span>
                      <span className="font-mono text-rose-400 font-bold">{sector.incidentDelay}</span>
                    </div>
                    <p className="text-slate-300 line-clamp-2 text-[11px] leading-relaxed">
                      {sector.incidentDetail}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
                    <span className="font-mono">Health: {sector.systemHealth} · Cost: {sector.incidentCost}</span>
                    <span className="text-sky-400 font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      {isSelected ? "Active Sector" : "Switch to Sector →"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

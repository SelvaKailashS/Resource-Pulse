import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { SECTORS, SectorDefinition } from "@shared/sectorsData";
import { OrganizationSectorConfig } from "@shared/orgTypes";
import { loadSectorConfig, saveSectorConfig } from "@/lib/orgStore";
import {
  CheckCircle2,
  Layers,
  Sparkles,
  X,
  Search,
  Check,
  Plus,
  Sliders,
  ShieldCheck,
  Building,
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeSectorId?: string;
  onSelectSector?: (sector: SectorDefinition) => void;
  onConfigUpdated?: (config: OrganizationSectorConfig) => void;
}

export function SectorModal({
  open,
  onOpenChange,
  activeSectorId,
  onSelectSector,
  onConfigUpdated,
}: Props) {
  const [config, setConfig] = useState<OrganizationSectorConfig>(() => loadSectorConfig());
  const [search, setSearch] = useState("");
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customName, setCustomName] = useState("");
  const [orgName, setOrgName] = useState(() => localStorage.getItem("resourcepulse_team_name") || "Operations Team");
  const [teamCode, setTeamCode] = useState(() => localStorage.getItem("resourcepulse_team_code") || "RP-TEAM");
  const [isSwitchingOrg, setIsSwitchingOrg] = useState(false);
  const [newOrgCodeInput, setNewOrgCodeInput] = useState("");
  const [copiedCode, setCopiedCode] = useState(false);

  const selectedSet = new Set(config.selectedSectorIds);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(teamCode);
    setCopiedCode(true);
    toast.success("Team invite code copied to clipboard!", { description: teamCode });
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleJoinDifferentOrg = () => {
    if (!newOrgCodeInput.trim()) {
      toast.error("Please enter a valid organization invite code or name");
      return;
    }
    const cleanCode = newOrgCodeInput.trim().toUpperCase();
    const newName = cleanCode.startsWith("RP-") ? `Workspace ${cleanCode}` : newOrgCodeInput.trim();
    localStorage.setItem("resourcepulse_team_name", newName);
    localStorage.setItem("resourcepulse_team_code", cleanCode);
    setOrgName(newName);
    setTeamCode(cleanCode);
    setIsSwitchingOrg(false);
    setNewOrgCodeInput("");
    
    // Update session user if present
    try {
      const stored = localStorage.getItem("resourcepulse_session_user");
      if (stored) {
        const u = JSON.parse(stored);
        u.teamName = newName;
        localStorage.setItem("resourcepulse_session_user", JSON.stringify(u));
      }
    } catch {}

    toast.success(`Switched active workspace to "${newName}"!`, {
      description: `Team code: ${cleanCode}`,
    });
    if (onConfigUpdated) onConfigUpdated(config);
  };

  const filteredSectors = SECTORS.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.category.toLowerCase().includes(search.toLowerCase()) ||
      s.id.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSector = (sectorId: string) => {
    let next: string[];
    if (selectedSet.has(sectorId)) {
      if (config.selectedSectorIds.length === 1) {
        toast.error("At least one sector must remain active");
        return;
      }
      next = config.selectedSectorIds.filter((id) => id !== sectorId);
    } else {
      next = [...config.selectedSectorIds, sectorId];
    }

    // Merge module flags from all selected sectors
    const activeDefs = SECTORS.filter((s) => next.includes(s.id));
    const mergedModules = {
      schedule: activeDefs.some((s) => s.enabledModules.schedule),
      assets: activeDefs.some((s) => s.enabledModules.assets),
      inventory: activeDefs.some((s) => s.enabledModules.inventory),
      predictiveMaintenance: activeDefs.some((s) => s.enabledModules.predictiveMaintenance),
      shiftManagement: activeDefs.some((s) => s.enabledModules.shiftManagement),
      siteAllocation: activeDefs.some((s) => s.enabledModules.siteAllocation),
      workload: true,
      analytics: true,
      forecasting: true,
      scenarios: true,
      pulseAI: true,
    };

    const updatedConfig: OrganizationSectorConfig = {
      ...config,
      selectedSectorIds: next,
      primarySector: next[0] || "it_software",
      enabledModules: mergedModules,
    };

    setConfig(updatedConfig);
  };

  const handleApply = () => {
    const finalOrgName = orgName.trim() || "Operations Team";
    localStorage.setItem("resourcepulse_team_name", finalOrgName);
    localStorage.setItem("resourcepulse_team_code", teamCode);

    try {
      const stored = localStorage.getItem("resourcepulse_session_user");
      if (stored) {
        const u = JSON.parse(stored);
        u.teamName = finalOrgName;
        localStorage.setItem("resourcepulse_session_user", JSON.stringify(u));
      }
    } catch {}

    const finalConfig: OrganizationSectorConfig = {
      ...config,
      customIndustryName: isCustomMode && customName.trim() ? customName.trim() : undefined,
    };
    saveSectorConfig(finalConfig);

    const primaryDef = SECTORS.find((s) => s.id === finalConfig.primarySector) || SECTORS[0];
    localStorage.setItem("resourcepulse_selected_field", isCustomMode && customName.trim() ? customName.trim() : primaryDef.name);

    if (onSelectSector) onSelectSector(primaryDef);
    if (onConfigUpdated) onConfigUpdated(finalConfig);

    toast.success("Organization profile updated!", {
      description: `Workspace: ${finalOrgName} • Sectors: ${finalConfig.selectedSectorIds.length} enabled.`,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="!max-w-[95vw] lg:!max-w-[1100px] !w-[95vw] !max-h-[92vh] !p-0 !gap-0 overflow-hidden bg-slate-950 border border-sky-500/40 text-white shadow-2xl rounded-2xl !flex !flex-col"
      >
        {/* Header */}
        <DialogHeader className="p-4 px-6 border-b border-sky-900/40 bg-slate-900/90 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-400/30 flex items-center justify-center text-sky-400 shadow-sm shadow-sky-950">
                <Layers size={20} />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  Organization Workspace & Sector Configuration
                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                    21 Sectors Supported
                  </span>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400">
                  Update your organization name, view team invite code, and configure active industry modules & AI models.
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

        {/* Organization Details & Switcher Banner */}
        <div className="p-4 px-6 border-b border-sky-900/30 bg-slate-900/60 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto flex-1">
            <div className="flex-1 min-w-[220px] max-w-sm">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Organization / Team Name
              </label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="e.g. Koders Club, Acme Corp"
                className="w-full px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-700 bg-slate-950 text-sky-300 focus:border-sky-400 focus:outline-none"
              />
            </div>

            <div className="min-w-[140px]">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Team Invite Code
              </label>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-xs px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-emerald-400 font-bold select-all">
                  {teamCode}
                </span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="p-1.5 rounded-lg border border-slate-700 hover:border-slate-600 bg-slate-900 text-slate-300 hover:text-white transition-colors"
                  title="Copy Team Code to invite colleagues"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Layers className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isSwitchingOrg ? (
              <button
                type="button"
                onClick={() => setIsSwitchingOrg(true)}
                className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 hover:border-sky-500/50 bg-slate-950 text-slate-300 hover:text-sky-300 transition-colors"
              >
                Switch / Join Workspace
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={newOrgCodeInput}
                  onChange={(e) => setNewOrgCodeInput(e.target.value)}
                  placeholder="Enter Code or Name..."
                  className="px-2.5 py-1 text-xs rounded-lg border border-sky-500 bg-slate-950 text-white placeholder:text-slate-500 w-44"
                />
                <button
                  type="button"
                  onClick={handleJoinDifferentOrg}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-500 text-white"
                >
                  Switch
                </button>
                <button
                  type="button"
                  onClick={() => setIsSwitchingOrg(false)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Toolbar: Search & Custom Industry Toggle */}
        <div className="p-4 px-6 border-b border-border/40 bg-slate-900/40 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by sector or category..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-700 bg-slate-950 text-white placeholder:text-slate-500"
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={isCustomMode}
                onChange={(e) => setIsCustomMode(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-500"
              />
              <span className="font-semibold text-sky-400">+ Custom Industry</span>
            </label>

            {isCustomMode && (
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g. Bio-Robotics / Space Logistics"
                className="px-2.5 py-1 text-xs rounded-lg border border-sky-500/50 bg-slate-950 text-white placeholder:text-slate-500"
              />
            )}
          </div>
        </div>

        {/* Sectors Grid */}
        <div className="p-6 overflow-y-auto max-h-[60vh] space-y-3 bg-slate-900/20">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredSectors.map((sector) => {
              const isSelected = selectedSet.has(sector.id);
              return (
                <div
                  key={sector.id}
                  onClick={() => toggleSector(sector.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2.5 group relative ${
                    isSelected
                      ? "bg-sky-500/15 border-sky-400/80 shadow-md shadow-sky-950/60 ring-1 ring-sky-400/30"
                      : "bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-850"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl p-1.5 rounded-lg bg-slate-950 border border-slate-800 group-hover:scale-105 transition-transform">
                        {sector.icon}
                      </span>
                      <div>
                        <strong className="text-xs font-bold text-white block group-hover:text-sky-300 transition-colors">
                          {sector.name}
                        </strong>
                        <span className="text-[10px] text-slate-400 block font-mono">
                          {sector.category}
                        </span>
                      </div>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                        isSelected
                          ? "bg-sky-500 border-sky-400 text-slate-950"
                          : "border-slate-700 bg-slate-950/60"
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>

                  {/* Core Resources & AI Scope */}
                  <div className="space-y-1 text-[10px] bg-slate-950/50 p-2 rounded-lg border border-slate-800/80">
                    <div className="text-slate-300 truncate">
                      <span className="text-slate-400 font-semibold">Roles: </span>
                      {sector.humanRoles.slice(0, 3).join(", ")}
                    </div>
                    <div className="text-slate-300 truncate">
                      <span className="text-sky-400 font-semibold">Equipment: </span>
                      {sector.physicalResources.slice(0, 2).join(", ")}
                    </div>
                    <div className="text-emerald-300 truncate">
                      <span className="text-emerald-400 font-semibold">AI Predicts: </span>
                      {sector.aiPredictions.slice(0, 2).join(", ")}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer: Dynamic Enabled Modules & Apply Button */}
        <div className="p-4 px-6 border-t border-sky-900/40 bg-slate-900/90 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-300">
            <span className="text-slate-400 font-semibold">Dynamically Enabled Modules:</span>
            {config.enabledModules.schedule && (
              <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">Schedule</span>
            )}
            {config.enabledModules.assets && (
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">Assets</span>
            )}
            {config.enabledModules.inventory && (
              <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">Inventory</span>
            )}
            {config.enabledModules.predictiveMaintenance && (
              <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">Predictive Maintenance</span>
            )}
            {config.enabledModules.shiftManagement && (
              <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">Shift Rostering</span>
            )}
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Pulse AI</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenChange(false)}
              className="px-3.5 py-2 text-xs rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="px-5 py-2 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-500 text-white transition-all shadow-md flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Apply Configuration ({config.selectedSectorIds.length} Sectors)
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from "react";
import {
  Sliders,
  Save,
  RotateCcw,
  Building,
  ShieldAlert,
  CheckCircle2,
  DollarSign,
  Clock,
  Percent,
} from "lucide-react";
import { toast } from "sonner";
import { ThresholdSettings } from "@shared/orgTypes";
import { loadThresholds, saveThresholds, DEFAULT_THRESHOLDS } from "@/lib/orgStore";

interface SettingsViewProps {
  onSettingsSaved?: () => void;
}

export function SettingsView({ onSettingsSaved }: SettingsViewProps) {
  const [thresholds, setThresholds] = useState<ThresholdSettings>(() => loadThresholds());
  const [orgName, setOrgName] = useState(() => localStorage.getItem("resourcepulse_team_name") || "Northstar Operations");
  const [selectedField, setSelectedField] = useState(() => localStorage.getItem("resourcepulse_selected_field") || "Engineering & Cloud Systems");

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveThresholds(thresholds);
    localStorage.setItem("resourcepulse_team_name", orgName);
    localStorage.setItem("resourcepulse_selected_field", selectedField);
    toast.success("Settings saved successfully!");
    if (onSettingsSaved) onSettingsSaved();
  };

  const handleResetDefaults = () => {
    setThresholds(DEFAULT_THRESHOLDS);
    saveThresholds(DEFAULT_THRESHOLDS);
    toast.info("Thresholds reset to default enterprise parameters");
  };

  const handleClearAllData = () => {
    if (
      confirm(
        "WARNING: This will clear all local resource, project, and assignment data. Are you sure you wish to proceed?"
      )
    ) {
      localStorage.removeItem("resourcepulse_enterprise_resources_v2");
      localStorage.removeItem("resourcepulse_enterprise_projects_v2");
      localStorage.removeItem("resourcepulse_enterprise_assignments_v2");
      localStorage.removeItem("resourcepulse_student_resources");
      toast.success("Organizational data reset. Reloading workspace...");
      setTimeout(() => {
        window.location.reload();
      }, 500);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-primary/10 text-primary uppercase tracking-wider">
              System Configuration
            </span>
            <span className="text-xs text-muted-foreground">• Policy & Capacity Rules</span>
          </div>
          <h2 className="text-2xl font-bold text-foreground mt-1">Platform Settings & Thresholds</h2>
          <p className="text-sm text-muted-foreground">
            Configure safety thresholds, default capacity baselines, currency, and organization metadata.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Workspace Identity */}
        <div className="border border-border/50 rounded-xl p-5 bg-card/40 space-y-4">
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm text-foreground">Organization Identity</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-medium text-foreground block mb-1">Organization / Team Name</label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
              />
            </div>

            <div>
              <label className="font-medium text-foreground block mb-1">Discipline / Sector Focus</label>
              <input
                type="text"
                value={selectedField}
                onChange={(e) => setSelectedField(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
              />
            </div>
          </div>
        </div>

        {/* Capacity & Alert Thresholds */}
        <div className="border border-border/50 rounded-xl p-5 bg-card/40 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-sm text-foreground">Capacity & Utilization Thresholds</h3>
            </div>
            <button
              type="button"
              onClick={handleResetDefaults}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" /> Reset Defaults
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="font-medium text-foreground block mb-1 flex items-center justify-between">
                <span>Warning Utilization Threshold</span>
                <span className="font-bold text-amber-500">{thresholds.warningUtilization}%</span>
              </label>
              <input
                type="range"
                min={50}
                max={95}
                value={thresholds.warningUtilization}
                onChange={(e) =>
                  setThresholds({ ...thresholds, warningUtilization: Number(e.target.value) })
                }
                className="w-full accent-amber-500"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Fires yellow warning when resource commitment reaches this band.
              </p>
            </div>

            <div>
              <label className="font-medium text-foreground block mb-1 flex items-center justify-between">
                <span>Critical Overload Threshold</span>
                <span className="font-bold text-red-500">{thresholds.criticalUtilization}%</span>
              </label>
              <input
                type="range"
                min={80}
                max={150}
                value={thresholds.criticalUtilization}
                onChange={(e) =>
                  setThresholds({ ...thresholds, criticalUtilization: Number(e.target.value) })
                }
                className="w-full accent-red-500"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Flags severe burnout risk and milestone delivery blockage.
              </p>
            </div>

            <div>
              <label className="font-medium text-foreground block mb-1 flex items-center justify-between">
                <span>Underutilized Ceiling</span>
                <span className="font-bold text-blue-500">{thresholds.underutilizedThreshold}%</span>
              </label>
              <input
                type="range"
                min={10}
                max={70}
                value={thresholds.underutilizedThreshold}
                onChange={(e) =>
                  setThresholds({ ...thresholds, underutilizedThreshold: Number(e.target.value) })
                }
                className="w-full accent-blue-500"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Flags unallocated capacity available for new deliverables.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2 border-t border-border/30">
            <div>
              <label className="font-medium text-foreground block mb-1">
                Standard Weekly Capacity (Hours per Resource)
              </label>
              <input
                type="number"
                min={10}
                max={80}
                value={thresholds.standardWeeklyHours}
                onChange={(e) =>
                  setThresholds({ ...thresholds, standardWeeklyHours: Number(e.target.value) })
                }
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
              />
            </div>

            <div>
              <label className="font-medium text-foreground block mb-1">Financial Currency</label>
              <select
                value={thresholds.currency}
                onChange={(e) => setThresholds({ ...thresholds, currency: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
              >
                <option value="$">USD ($) - US Dollar</option>
                <option value="€">EUR (€) - Euro</option>
                <option value="£">GBP (£) - British Pound</option>
                <option value="₹">INR (₹) - Indian Rupee</option>
                <option value="¥">JPY (¥) - Japanese Yen</option>
              </select>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xs"
          >
            <Save className="w-3.5 h-3.5" /> Save Configuration
          </button>
        </div>
      </form>

      {/* Danger Zone */}
      <div className="border border-red-500/20 rounded-xl p-5 bg-red-500/5 space-y-3">
        <div className="flex items-center gap-2 text-red-500">
          <ShieldAlert className="w-4 h-4" />
          <h3 className="font-semibold text-sm">Danger Zone</h3>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Clear all stored workforce, project, and simulation records from this browser. This action cannot be undone.
        </p>
        <button
          onClick={handleClearAllData}
          className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all border border-red-500/30"
        >
          Reset All Organization Data
        </button>
      </div>
    </div>
  );
}

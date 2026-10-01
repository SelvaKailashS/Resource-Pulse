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
  Layers,
  Cpu,
  BarChart3,
  Users,
  Plus,
  Trash2,
  Lock,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import {
  ThresholdSettings,
  CustomResourceType,
  CustomMetric,
  OrganizationSectorConfig,
  UserRole,
} from "@shared/orgTypes";
import { SECTORS } from "@shared/sectorsData";
import {
  loadThresholds,
  saveThresholds,
  DEFAULT_THRESHOLDS,
  loadCustomResourceTypes,
  saveCustomResourceTypes,
  loadCustomMetrics,
  saveCustomMetrics,
  loadSectorConfig,
  saveSectorConfig,
  loadOrganizationRoles,
} from "@/lib/orgStore";

interface SettingsViewProps {
  onSettingsSaved?: () => void;
  onOpenSectorModal?: () => void;
}

export function SettingsView({ onSettingsSaved, onOpenSectorModal }: SettingsViewProps) {
  const [activeTab, setActiveTab] = useState<"general" | "sectors" | "custom_types" | "metrics" | "roles">("general");

  // General & Thresholds
  const [thresholds, setThresholds] = useState<ThresholdSettings>(() => loadThresholds());
  const [orgName, setOrgName] = useState(() => localStorage.getItem("resourcepulse_team_name") || "Northstar Operations");
  const [selectedField, setSelectedField] = useState(() => localStorage.getItem("resourcepulse_selected_field") || "IT & Software");

  // Sector & Modules
  const [sectorConfig, setSectorConfig] = useState<OrganizationSectorConfig>(() => loadSectorConfig());

  // Custom Resource Types (Section 37)
  const [customTypes, setCustomTypes] = useState<CustomResourceType[]>(() => loadCustomResourceTypes());
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeCategory, setNewTypeCategory] = useState("Equipment");
  const [newTypeUnit, setNewTypeUnit] = useState("Operating Hours");
  const [newTypeCostUnit, setNewTypeCostUnit] = useState("$/hr");

  // Custom Metrics (Section 38)
  const [customMetrics, setCustomMetrics] = useState<CustomMetric[]>(() => loadCustomMetrics());
  const [newMetricName, setNewMetricName] = useState("");
  const [newMetricFormula, setNewMetricFormula] = useState("");
  const [newMetricDesc, setNewMetricDesc] = useState("");
  const [newMetricTarget, setNewMetricTarget] = useState(85);

  // Roles (Section 33)
  const roles = loadOrganizationRoles();

  const handleSaveGeneral = (e: React.FormEvent) => {
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

  const handleAddCustomType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeName.trim()) return;

    const newType: CustomResourceType = {
      id: `CRT-${Date.now().toString(36).toUpperCase()}`,
      name: newTypeName.trim(),
      category: newTypeCategory,
      unitOfMeasure: newTypeUnit.trim(),
      costUnit: newTypeCostUnit.trim(),
    };

    const updated = [...customTypes, newType];
    setCustomTypes(updated);
    saveCustomResourceTypes(updated);
    toast.success(`Custom Resource Type "${newType.name}" registered!`);

    setNewTypeName("");
  };

  const handleDeleteCustomType = (id: string) => {
    const updated = customTypes.filter((t) => t.id !== id);
    setCustomTypes(updated);
    saveCustomResourceTypes(updated);
    toast.success("Custom resource type removed");
  };

  const handleAddCustomMetric = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMetricName.trim() || !newMetricFormula.trim()) return;

    const newMetric: CustomMetric = {
      id: `CM-${Date.now().toString(36).toUpperCase()}`,
      name: newMetricName.trim(),
      formula: newMetricFormula.trim(),
      description: newMetricDesc.trim() || "User-defined KPI",
      targetValue: Number(newMetricTarget) || 80,
      unit: "%",
    };

    const updated = [...customMetrics, newMetric];
    setCustomMetrics(updated);
    saveCustomMetrics(updated);
    toast.success(`Custom Metric "${newMetric.name}" formulated!`);

    setNewMetricName("");
    setNewMetricFormula("");
    setNewMetricDesc("");
  };

  const handleDeleteMetric = (id: string) => {
    const updated = customMetrics.filter((m) => m.id !== id);
    setCustomMetrics(updated);
    saveCustomMetrics(updated);
    toast.success("Metric removed");
  };

  const handleToggleModule = (modKey: keyof OrganizationSectorConfig["enabledModules"]) => {
    const updated: OrganizationSectorConfig = {
      ...sectorConfig,
      enabledModules: {
        ...sectorConfig.enabledModules,
        [modKey]: !sectorConfig.enabledModules[modKey],
      },
    };
    setSectorConfig(updated);
    saveSectorConfig(updated);
    toast.success(`Module "${String(modKey)}" ${updated.enabledModules[modKey] ? "enabled" : "disabled"}`);
  };

  const handleClearAllData = () => {
    if (
      confirm(
        "WARNING: This will clear all local resource, project, asset, and schedule data from your workspace. Are you sure you wish to proceed?"
      )
    ) {
      localStorage.clear();
      toast.success("Organizational workspace reset. Reloading...");
      setTimeout(() => {
        window.location.reload();
      }, 500);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-primary/10 text-primary uppercase tracking-wider">
              Resource Operating System
            </span>
            <span className="text-xs text-muted-foreground">• Universal Configuration</span>
          </div>
          <h2 className="text-2xl font-bold text-foreground mt-1">Platform Settings & Architecture</h2>
          <p className="text-sm text-muted-foreground">
            Configure multi-sector modules, custom resource types, metric formulas, and role access controls.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/60 gap-1 overflow-x-auto">
        {[
          { key: "general", label: "General & Thresholds", icon: Sliders },
          { key: "sectors", label: "Sectors & Modules", icon: Layers },
          { key: "custom_types", label: "Custom Resource Types", icon: Cpu },
          { key: "metrics", label: "Custom Metrics & Formulas", icon: BarChart3 },
          { key: "roles", label: "Role Permissions (RBAC)", icon: Users },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
                isActive
                  ? "border-primary text-primary bg-primary/5"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/40"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: General & Thresholds */}
      {activeTab === "general" && (
        <form onSubmit={handleSaveGeneral} className="space-y-6">
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
                <label className="font-medium text-foreground block mb-1">Primary Discipline / Sector</label>
                <div className="relative">
                  <input
                    type="text"
                    value={selectedField}
                    disabled
                    className="w-full px-3 py-2 rounded-lg border border-border bg-muted/40 text-muted-foreground cursor-not-allowed pr-8 font-medium"
                  />
                  <Lock className="w-3.5 h-3.5 text-muted-foreground absolute right-2.5 top-1/2 -translate-y-1/2" />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                  🔒 Locked: Organization sector was established upon workspace registration.
                </p>
              </div>
            </div>
          </div>

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
                  <span>Warning Utilization</span>
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
              </div>

              <div>
                <label className="font-medium text-foreground block mb-1 flex items-center justify-between">
                  <span>Critical Overload</span>
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
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2 border-t border-border/30">
              <div>
                <label className="font-medium text-foreground block mb-1">Standard Weekly Hours</label>
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
                <label className="font-medium text-foreground block mb-1">Currency</label>
                <select
                  value={thresholds.currency}
                  onChange={(e) => setThresholds({ ...thresholds, currency: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                >
                  <option value="$">USD ($)</option>
                  <option value="€">EUR (€)</option>
                  <option value="£">GBP (£)</option>
                  <option value="₹">INR (₹)</option>
                  <option value="¥">JPY (¥)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xs"
            >
              <Save className="w-3.5 h-3.5" /> Save Configuration
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: Sectors & Dynamic Modules */}
      {activeTab === "sectors" && (
        <div className="space-y-6">
          <div className="border border-border/50 rounded-xl p-5 bg-card/40 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" /> Active Sector Architecture
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Currently configured sectors: {sectorConfig.selectedSectorIds.length} enabled.
                </p>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-sky-950/40 border border-sky-500/30 text-sky-300">
                <Lock className="w-3.5 h-3.5 text-sky-400" />
                <span>Permanent Sector (Locked)</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-sky-950/20 border border-sky-500/20 text-xs text-slate-300 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <div>
                <strong>Immutable Organization Sector:</strong> This workspace is permanently bound to the{" "}
                <span className="text-sky-300 font-semibold">{selectedField}</span> sector. To maintain data schema integrity, asset definitions, and AI prediction consistency, the organization sector cannot be changed after registration.
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {sectorConfig.selectedSectorIds.map((secId) => {
                const def = SECTORS.find((s) => s.id === secId);
                return (
                  <span
                    key={secId}
                    className="px-3 py-1.5 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-300 text-xs font-semibold flex items-center gap-1.5"
                  >
                    <span>{def?.icon || "🌐"}</span>
                    <span>{def?.name || secId}</span>
                  </span>
                );
              })}
            </div>
          </div>

          {/* Dynamic Module Enablement */}
          <div className="border border-border/50 rounded-xl p-5 bg-card/40 space-y-4">
            <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
              <Sliders className="w-4 h-4 text-primary" /> Dynamically Enabled Operational Modules
            </h3>
            <p className="text-xs text-muted-foreground">
              Toggle operational modules on or off according to your organization's specific requirements.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              {Object.entries(sectorConfig.enabledModules).map(([key, enabled]) => (
                <div
                  key={key}
                  onClick={() => handleToggleModule(key as any)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                    enabled
                      ? "bg-primary/10 border-primary/40 text-foreground font-semibold"
                      : "bg-background/40 border-border/60 text-muted-foreground"
                  }`}
                >
                  <span className="capitalize">{key.replace(/([A-Z])/g, " $1")}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                      enabled ? "bg-primary text-primary-foreground font-bold" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {enabled ? "Active" : "Disabled"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Custom Resource Types (Section 37) */}
      {activeTab === "custom_types" && (
        <div className="space-y-6">
          <div className="border border-border/50 rounded-xl p-5 bg-card/40 space-y-4">
            <div>
              <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                <Cpu className="w-4 h-4 text-primary" /> Custom Resource Type Registry (Section 37)
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Define non-standard assets and specialized roles (e.g. 3D Printer, ICU Bed, Drone Fleet, Cloud Cluster).
              </p>
            </div>

            {/* Creation Form */}
            <form onSubmit={handleAddCustomType} className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs pt-2">
              <input
                type="text"
                required
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                placeholder="Resource Type Name (e.g. 3D Printer)"
                className="px-3 py-2 rounded-lg border border-border bg-background text-foreground sm:col-span-2"
              />
              <select
                value={newTypeCategory}
                onChange={(e) => setNewTypeCategory(e.target.value)}
                className="px-3 py-2 rounded-lg border border-border bg-background text-foreground"
              >
                <option value="Equipment">Equipment</option>
                <option value="Machine">Machine</option>
                <option value="Facility">Facility</option>
                <option value="Computing">Computing</option>
                <option value="Vehicle">Vehicle</option>
              </select>
              <input
                type="text"
                value={newTypeUnit}
                onChange={(e) => setNewTypeUnit(e.target.value)}
                placeholder="Capacity Unit (e.g. Hours)"
                className="px-3 py-2 rounded-lg border border-border bg-background text-foreground"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Register Type
              </button>
            </form>

            {/* List */}
            <div className="space-y-2 pt-2">
              {customTypes.map((type) => (
                <div
                  key={type.id}
                  className="p-3 rounded-lg border border-border/60 bg-card/60 flex items-center justify-between text-xs"
                >
                  <div>
                    <strong className="text-foreground">{type.name}</strong>
                    <span className="text-muted-foreground text-[11px] block">
                      Category: {type.category} • Measure: {type.unitOfMeasure} • Cost: {type.costUnit}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteCustomType(type.id)}
                    className="p-1 rounded text-muted-foreground hover:text-rose-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Custom Metrics (Section 38) */}
      {activeTab === "metrics" && (
        <div className="space-y-6">
          <div className="border border-border/50 rounded-xl p-5 bg-card/40 space-y-4">
            <div>
              <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" /> Custom Organizational KPI Formulas (Section 38)
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Define specialized formulas like "Machine Efficiency" or "Ticket Resolution Velocity".
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleAddCustomMetric} className="space-y-3 text-xs pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  value={newMetricName}
                  onChange={(e) => setNewMetricName(e.target.value)}
                  placeholder="Metric Name (e.g. Production Output Efficiency)"
                  className="px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                />
                <input
                  type="text"
                  required
                  value={newMetricFormula}
                  onChange={(e) => setNewMetricFormula(e.target.value)}
                  placeholder="Formula (e.g. Production Output / Available Production Capacity)"
                  className="px-3 py-2 rounded-lg border border-border bg-background text-foreground font-mono"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  value={newMetricDesc}
                  onChange={(e) => setNewMetricDesc(e.target.value)}
                  placeholder="Metric Description"
                  className="px-3 py-2 rounded-lg border border-border bg-background text-foreground sm:col-span-2"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Save Formula
                </button>
              </div>
            </form>

            {/* List */}
            <div className="space-y-2 pt-2">
              {customMetrics.map((m) => (
                <div
                  key={m.id}
                  className="p-3 rounded-lg border border-border/60 bg-card/60 flex items-center justify-between text-xs"
                >
                  <div>
                    <strong className="text-foreground">{m.name}</strong>
                    <code className="text-sky-400 text-[11px] block mt-0.5">Formula: {m.formula}</code>
                    <p className="text-muted-foreground text-[10px] mt-0.5">{m.description}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteMetric(m.id)}
                    className="p-1 rounded text-muted-foreground hover:text-rose-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: Role Permissions (RBAC) (Section 33) */}
      {activeTab === "roles" && (
        <div className="space-y-6">
          <div className="border border-border/50 rounded-xl p-5 bg-card/40 space-y-4">
            <div>
              <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" /> Role-Based Access Control Matrix (Section 33)
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Configured organizational hierarchy: Super Admin, Org Admin, Resource Manager, Project Manager, Analyst, Employee, Viewer.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              {roles.map((r) => (
                <div
                  key={r.role}
                  className="p-3.5 rounded-xl border border-border/60 bg-card/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <span className="font-bold text-foreground text-sm flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-primary" /> {r.role}
                    </span>
                    <p className="text-muted-foreground text-xs mt-0.5">{r.description}</p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {r.permissions.map((p) => (
                      <span
                        key={p}
                        className="px-2 py-0.5 rounded bg-muted text-[10px] font-mono text-foreground border border-border/50"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Danger Zone */}
      <div className="border border-red-500/20 rounded-xl p-5 bg-red-500/5 space-y-3">
        <div className="flex items-center gap-2 text-red-500">
          <ShieldAlert className="w-4 h-4" />
          <h3 className="font-semibold text-sm">Danger Zone</h3>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Clear all stored workforce, project, asset, and simulation records from this browser. This action cannot be undone.
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

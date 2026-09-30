import { useState, useMemo } from "react";
import {
  Wrench,
  Cpu,
  Truck,
  Building,
  HardDrive,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  Activity,
  Layers,
  ChevronRight,
  Trash2,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { AssetItem, Project } from "@shared/orgTypes";
import { loadInitialAssets, saveAssets, loadInitialProjects } from "@/lib/orgStore";

export function AssetsView() {
  const [assets, setAssets] = useState<AssetItem[]>(() => loadInitialAssets());
  const [projects] = useState<Project[]>(() => loadInitialProjects());
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("All");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Asset Form
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<AssetItem["type"]>("Machine");
  const [formCategory, setFormCategory] = useState("Industrial Rig");
  const [formLocation, setFormLocation] = useState("Plant Floor 1 / HQ");
  const [formHours, setFormHours] = useState(120);
  const [formMaxHours, setFormMaxHours] = useState(500);
  const [formCostPerHour, setFormCostPerHour] = useState(65);
  const [formProjectId, setFormProjectId] = useState(projects[0]?.id || "");
  const [formNextMaintenance, setFormNextMaintenance] = useState(
    new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
  );

  const filteredAssets = useMemo(() => {
    return assets.filter((a) => {
      const matchSearch =
        a.name.toLowerCase().includes(search.toLowerCase()) ||
        a.category.toLowerCase().includes(search.toLowerCase()) ||
        a.location.toLowerCase().includes(search.toLowerCase());
      const matchType = typeFilter === "All" || a.type === typeFilter;
      return matchSearch && matchType;
    });
  }, [assets, search, typeFilter]);

  const summary = useMemo(() => {
    const total = assets.length;
    const inUse = assets.filter((a) => a.status === "In Use").length;
    const maintenance = assets.filter((a) => a.status === "Maintenance").length;
    const avgHealth = total > 0 ? Math.round(assets.reduce((sum, a) => sum + a.healthScore, 0) / total) : 100;
    const totalHours = assets.reduce((sum, a) => sum + a.operatingHours, 0);
    return { total, inUse, maintenance, avgHealth, totalHours };
  }, [assets]);

  const handleCreateAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error("Asset name is required");
      return;
    }

    const health = Math.max(
      40,
      Math.round(100 - (Number(formHours) / (Number(formMaxHours) || 500)) * 60)
    );

    const newAsset: AssetItem = {
      id: `AST-${Date.now().toString(36).toUpperCase()}`,
      name: formName.trim(),
      type: formType,
      category: formCategory.trim(),
      location: formLocation.trim(),
      status: "Available",
      operatingHours: Number(formHours) || 0,
      maxHours: Number(formMaxHours) || 500,
      healthScore: health,
      lastMaintenanceDate: new Date().toISOString().slice(0, 10),
      nextMaintenanceDate: formNextMaintenance,
      assignedProjectId: formProjectId,
      costPerHour: Number(formCostPerHour) || 50,
      oee: Math.min(98, Math.max(75, Math.round(health * 0.95))),
    };

    const updated = [...assets, newAsset];
    setAssets(updated);
    saveAssets(updated);
    toast.success(`Asset "${newAsset.name}" recorded!`);

    setFormName("");
    setIsModalOpen(false);
  };

  const handleDeleteAsset = (id: string, name: string) => {
    if (confirm(`Remove asset "${name}" from registry?`)) {
      const updated = assets.filter((a) => a.id !== id);
      setAssets(updated);
      saveAssets(updated);
      toast.success("Asset removed");
    }
  };

  const handleLogMaintenance = (asset: AssetItem) => {
    const nextDate = new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10);
    const updated = assets.map((a) =>
      a.id === asset.id
        ? {
            ...a,
            status: "Available" as const,
            healthScore: 98,
            operatingHours: 0,
            lastMaintenanceDate: new Date().toISOString().slice(0, 10),
            nextMaintenanceDate: nextDate,
          }
        : a
    );
    setAssets(updated);
    saveAssets(updated);
    toast.success(`Service logged for "${asset.name}". Health restored to 98%.`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-amber-500/10 text-amber-400 uppercase tracking-wider">
              Physical & Capital Resources
            </span>
            <span className="text-xs text-muted-foreground">• Predictive Maintenance & OEE</span>
          </div>
          <h2 className="text-2xl font-bold text-foreground mt-1">Asset & Machine Registry</h2>
          <p className="text-sm text-muted-foreground">
            Track industrial machinery, medical devices, fleet vehicles, and capital infrastructure across your operations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" /> Add Asset / Machine
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl border border-border/50 bg-card/40">
          <p className="text-xs text-muted-foreground font-medium">Total Registered Assets</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-foreground">{summary.total}</span>
            <span className="text-xs text-emerald-400 font-medium">{summary.inUse} deployed</span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border/50 bg-card/40">
          <p className="text-xs text-muted-foreground font-medium">Cumulative Operating Hours</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-sky-400">{summary.totalHours.toLocaleString()}h</span>
            <span className="text-xs text-muted-foreground">logged</span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border/50 bg-card/40">
          <p className="text-xs text-muted-foreground font-medium">Mean Fleet Health Score</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span
              className={`text-2xl font-bold ${
                summary.avgHealth >= 80 ? "text-emerald-400" : "text-amber-400"
              }`}
            >
              {summary.avgHealth}%
            </span>
            <span className="text-xs text-muted-foreground">OEE benchmark: 85%</span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border/50 bg-card/40">
          <p className="text-xs text-muted-foreground font-medium">Maintenance Windows</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span
              className={`text-2xl font-bold ${
                summary.maintenance > 0 ? "text-rose-400" : "text-emerald-400"
              }`}
            >
              {summary.maintenance}
            </span>
            <span className="text-xs text-muted-foreground">
              {summary.maintenance > 0 ? "Under service" : "Zero downtime"}
            </span>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl border border-border/50 bg-card/40">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search assets, locations, serials..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Type:
          </span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground"
          >
            <option value="All">All Types</option>
            <option value="Machine">Machine</option>
            <option value="Equipment">Equipment</option>
            <option value="Vehicle">Vehicle</option>
            <option value="Facility">Facility</option>
            <option value="Server">Server</option>
            <option value="Tool">Tool</option>
          </select>
        </div>
      </div>

      {/* Asset Table */}
      {assets.length === 0 ? (
        <div className="border border-dashed border-border/60 rounded-xl p-12 text-center bg-card/20 max-w-lg mx-auto">
          <Cpu className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold text-base text-foreground">No Physical Assets Configured</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Record physical equipment, production machines, or transport fleet to enable predictive maintenance alerts and OEE telemetry.
          </p>
          <div className="flex items-center justify-center gap-3 mt-4">
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xs"
            >
              + Register First Asset
            </button>
          </div>
        </div>
      ) : (
        <div className="border border-border/60 rounded-xl overflow-hidden bg-card/30">
          <div className="overflow-x-auto">
            <table className="resource-table w-full text-xs">
              <thead>
                <tr>
                  <th>Asset ID</th>
                  <th>Asset Name</th>
                  <th>Type / Category</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Hours (Logged / Max)</th>
                  <th>Health Score</th>
                  <th>Next Service</th>
                  <th>Hourly Rate</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssets.map((asset) => {
                  const isMaintenanceDue =
                    new Date(asset.nextMaintenanceDate).getTime() - Date.now() < 7 * 86400000;
                  return (
                    <tr key={asset.id}>
                      <td className="mono text-sky-400 font-bold">{asset.id}</td>
                      <td>
                        <span className="font-semibold text-white block">{asset.name}</span>
                        {isMaintenanceDue && (
                          <span className="text-[10px] text-amber-400 flex items-center gap-1 mt-0.5">
                            <AlertTriangle className="w-3 h-3" /> Predictive Service Window Due
                          </span>
                        )}
                      </td>
                      <td>
                        <span className="text-slate-300 font-medium">{asset.type}</span>
                        <span className="text-[10px] text-slate-400 block">{asset.category}</span>
                      </td>
                      <td className="text-slate-400">{asset.location}</td>
                      <td>
                        <span
                          className={`status-pill ${
                            asset.status === "In Use"
                              ? "chip-blue"
                              : asset.status === "Available"
                              ? "chip-green"
                              : "chip-coral"
                          }`}
                        >
                          {asset.status}
                        </span>
                      </td>
                      <td className="mono">
                        <span className="text-white font-semibold">{asset.operatingHours}h</span>
                        <span className="text-slate-400"> / {asset.maxHours || 500}h</span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                asset.healthScore >= 80
                                  ? "bg-emerald-500"
                                  : asset.healthScore >= 60
                                  ? "bg-amber-500"
                                  : "bg-rose-500"
                              }`}
                              style={{ width: `${asset.healthScore}%` }}
                            />
                          </div>
                          <span className="font-mono text-[11px] text-slate-300">
                            {asset.healthScore}%
                          </span>
                        </div>
                      </td>
                      <td className="mono text-slate-400">{asset.nextMaintenanceDate}</td>
                      <td className="mono text-emerald-400 font-semibold">${asset.costPerHour}/h</td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleLogMaintenance(asset)}
                            title="Log Service / Reset Health"
                            className="p-1 rounded text-sky-400 hover:bg-sky-500/10 transition-colors"
                          >
                            <Wrench className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteAsset(asset.id, asset.name)}
                            title="Remove Asset"
                            className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Add Asset */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                <Cpu className="w-4 h-4 text-primary" /> Register Physical Asset / Machine
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAsset} className="space-y-3.5 text-xs">
              <div>
                <label className="font-medium text-foreground block mb-1">Asset Name *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. 5-Axis CNC Milling Center / ICU Ventilator V2"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-foreground block mb-1">Asset Type</label>
                  <select
                    value={formType}
                    onChange={(e: any) => setFormType(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                  >
                    <option value="Machine">Machine</option>
                    <option value="Equipment">Equipment</option>
                    <option value="Vehicle">Vehicle</option>
                    <option value="Facility">Facility</option>
                    <option value="Server">Server</option>
                    <option value="Tool">Tool</option>
                  </select>
                </div>
                <div>
                  <label className="font-medium text-foreground block mb-1">Category</label>
                  <input
                    type="text"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    placeholder="e.g. Heavy Machining"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-foreground block mb-1">Location / Site</label>
                  <input
                    type="text"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                  />
                </div>
                <div>
                  <label className="font-medium text-foreground block mb-1">Hourly Operational Cost ($)</label>
                  <input
                    type="number"
                    min={0}
                    value={formCostPerHour}
                    onChange={(e) => setFormCostPerHour(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-foreground block mb-1">Current Operating Hours</label>
                  <input
                    type="number"
                    min={0}
                    value={formHours}
                    onChange={(e) => setFormHours(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                  />
                </div>
                <div>
                  <label className="font-medium text-foreground block mb-1">Max Hours Before Service</label>
                  <input
                    type="number"
                    min={50}
                    value={formMaxHours}
                    onChange={(e) => setFormMaxHours(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                  />
                </div>
              </div>

              <div>
                <label className="font-medium text-foreground block mb-1">Next Scheduled Service Date</label>
                <input
                  type="date"
                  value={formNextMaintenance}
                  onChange={(e) => setFormNextMaintenance(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                />
              </div>

              <div className="pt-3 border-t border-border/40 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-2 rounded-lg border border-border hover:bg-accent text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90"
                >
                  Save Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

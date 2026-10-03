import React, { useState, useEffect, useMemo } from "react";
import {
  Clock,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Plus,
  Download,
  Printer,
  Search,
  Filter,
  User,
  FolderGit2,
  DollarSign,
  Sparkles,
  BarChart3,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { loadInitialResources, loadInitialProjects } from "@/lib/orgStore";

export interface TimesheetEntry {
  id: string;
  resourceId: string;
  resourceName: string;
  projectId: string;
  projectName: string;
  taskName: string;
  date: string;
  plannedHours: number;
  actualHours: number;
  varianceHours: number;
  variancePercent: number;
  billable: boolean;
  hourlyRate: number;
  notes?: string;
  status: "Submitted" | "Approved" | "Draft";
}

const STORAGE_KEY = "resourcepulse_timesheet_entries";

export function TimesheetsView({ onOpenCalendarSync }: { onOpenCalendarSync?: () => void }) {
  const [resources] = useState(() => loadInitialResources());
  const [projects] = useState(() => loadInitialProjects());

  // Date state (defaults to current date YYYY-MM-DD)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });

  const [entries, setEntries] = useState<TimesheetEntry[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}

    // Initial default seed entries based on workspace resources & projects
    const defaultLeadName = resources[0]?.name || "Kailash";
    const defaultProjName = projects[0]?.name || "Core Infrastructure";
    const today = new Date().toISOString().split("T")[0];

    return [
      {
        id: "TS-101",
        resourceId: resources[0]?.id || "MEM-01",
        resourceName: defaultLeadName,
        projectId: projects[0]?.id || "PRJ-01",
        projectName: defaultProjName,
        taskName: "Architecture Review & API Gateway Integration",
        date: today,
        plannedHours: 8.0,
        actualHours: 6.5,
        varianceHours: -1.5,
        variancePercent: -18.75,
        billable: true,
        hourlyRate: 85,
        notes: "Completed deployment scripts ahead of schedule.",
        status: "Approved",
      },
      {
        id: "TS-102",
        resourceId: resources[0]?.id || "MEM-01",
        resourceName: defaultLeadName,
        projectId: projects[0]?.id || "PRJ-01",
        projectName: defaultProjName,
        taskName: "Security Audit & Telemetry Validation",
        date: today,
        plannedHours: 4.0,
        actualHours: 4.5,
        varianceHours: 0.5,
        variancePercent: 12.5,
        billable: true,
        hourlyRate: 85,
        notes: "Extended load testing for edge cases.",
        status: "Submitted",
      },
    ];
  });

  // Modal State for logging new hours
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    resourceName: resources[0]?.name || "Kailash",
    projectName: projects[0]?.name || "Core Operations",
    taskName: "",
    date: new Date().toISOString().split("T")[0],
    plannedHours: 8,
    actualHours: 7.5,
    billable: true,
    hourlyRate: 75,
    notes: "",
  });

  const [searchFilter, setSearchFilter] = useState("");
  const [filterResource, setFilterResource] = useState<string>("All");

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch {}
  }, [entries]);

  // Computed metrics
  const stats = useMemo(() => {
    let totalPlanned = 0;
    let totalActual = 0;
    let billableActual = 0;
    let totalBillableValue = 0;

    entries.forEach((e) => {
      totalPlanned += Number(e.plannedHours) || 0;
      totalActual += Number(e.actualHours) || 0;
      if (e.billable) {
        billableActual += Number(e.actualHours) || 0;
        totalBillableValue += (Number(e.actualHours) || 0) * (Number(e.hourlyRate) || 0);
      }
    });

    const varianceHours = totalActual - totalPlanned;
    const variancePercent = totalPlanned > 0 ? (varianceHours / totalPlanned) * 100 : 0;
    const billableRatio = totalActual > 0 ? (billableActual / totalActual) * 100 : 0;

    return {
      totalPlanned,
      totalActual,
      varianceHours,
      variancePercent,
      billableActual,
      billableRatio,
      totalBillableValue,
    };
  }, [entries]);

  // Filtered entries
  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      const matchSearch =
        e.resourceName.toLowerCase().includes(searchFilter.toLowerCase()) ||
        e.projectName.toLowerCase().includes(searchFilter.toLowerCase()) ||
        e.taskName.toLowerCase().includes(searchFilter.toLowerCase());
      const matchResource = filterResource === "All" || e.resourceName === filterResource;
      return matchSearch && matchResource;
    });
  }, [entries, searchFilter, filterResource]);

  const handleCreateEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.taskName.trim()) {
      toast.error("Task description required");
      return;
    }

    const planned = Number(formData.plannedHours) || 0;
    const actual = Number(formData.actualHours) || 0;
    const varianceHours = Number((actual - planned).toFixed(2));
    const variancePercent = planned > 0 ? Number(((varianceHours / planned) * 100).toFixed(1)) : 0;

    const newEntry: TimesheetEntry = {
      id: `TS-${Date.now().toString().slice(-4)}`,
      resourceId: `RES-${Date.now().toString().slice(-3)}`,
      resourceName: formData.resourceName,
      projectId: `PRJ-${Date.now().toString().slice(-3)}`,
      projectName: formData.projectName,
      taskName: formData.taskName.trim(),
      date: formData.date,
      plannedHours: planned,
      actualHours: actual,
      varianceHours,
      variancePercent,
      billable: formData.billable,
      hourlyRate: Number(formData.hourlyRate) || 75,
      notes: formData.notes.trim(),
      status: "Submitted",
    };

    setEntries([newEntry, ...entries]);
    setIsLogModalOpen(false);
    toast.success("Timesheet Hours Logged", {
      description: `${actual}h logged for "${newEntry.taskName}" (Variance: ${varianceHours > 0 ? `+${varianceHours}h` : `${varianceHours}h`}).`,
    });

    // Reset form
    setFormData({
      resourceName: resources[0]?.name || "Kailash",
      projectName: projects[0]?.name || "Core Operations",
      taskName: "",
      date: new Date().toISOString().split("T")[0],
      plannedHours: 8,
      actualHours: 8,
      billable: true,
      hourlyRate: 75,
      notes: "",
    });
  };

  const handleDeleteEntry = (id: string) => {
    setEntries(entries.filter((e) => e.id !== id));
    toast.info("Timesheet record deleted");
  };

  const handleExportCSV = () => {
    let csv = "ID,Date,Resource,Project,Task,Planned Hours,Actual Hours,Variance (Hours),Variance %,Billable,Rate,Total Cost,Status,Notes\n";
    filteredEntries.forEach((e) => {
      const cost = e.actualHours * (e.hourlyRate || 75);
      csv += `"${e.id}","${e.date}","${e.resourceName}","${e.projectName}","${e.taskName}",${e.plannedHours},${e.actualHours},${e.varianceHours},${e.variancePercent}%,${e.billable ? "Yes" : "No"},$${e.hourlyRate},$${cost},"${e.status}","${e.notes || ""}"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `resourcepulse_timesheets_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    toast.success("Timesheet CSV Exported");
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Fast Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-sky-500/10 text-sky-400 uppercase tracking-wider font-mono">
              Execution Telemetry
            </span>
            <span className="text-xs text-muted-foreground">• Planned vs. Actual Workload Variance</span>
          </div>
          <h2 className="text-2xl font-bold text-foreground mt-1 flex items-center gap-2">
            <span>Daily Timesheet Logging & Variance</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Log employee hours against planned tasks to measure real-time capacity execution, budget slippage, and overtime.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {onOpenCalendarSync && (
            <button
              onClick={onOpenCalendarSync}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 transition-all cursor-pointer shadow-xs"
            >
              <Calendar className="w-3.5 h-3.5 text-sky-400" />
              <span>Sync to Calendar</span>
            </button>
          )}

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border border-border bg-card hover:bg-accent text-foreground transition-all cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setIsLogModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white shadow-lg shadow-sky-500/20 transition-all cursor-pointer active:translate-y-0.5"
          >
            <Plus className="w-4 h-4" />
            <span>+ Log Daily Hours</span>
          </button>
        </div>
      </div>

      {/* 5-Second Executive Variance KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Actual Hours Logged */}
        <div className="p-4.5 rounded-2xl border border-border/40 bg-card/60 backdrop-blur-md shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Actual Logged Hours</span>
            <Clock className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-foreground">{stats.totalActual.toFixed(1)}h</span>
            <span className="text-xs text-muted-foreground font-mono">/ {stats.totalPlanned.toFixed(1)}h planned</span>
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Across {entries.length} recorded task shifts
          </div>
        </div>

        {/* Real Variance % */}
        <div className="p-4.5 rounded-2xl border border-border/40 bg-card/60 backdrop-blur-md shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Workload Variance</span>
            {stats.varianceHours > 0 ? (
              <TrendingUp className="w-4 h-4 text-amber-400" />
            ) : (
              <TrendingDown className="w-4 h-4 text-sky-400" />
            )}
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold font-mono ${
                stats.varianceHours > 0 ? "text-amber-400" : "text-sky-400"
              }`}
            >
              {stats.varianceHours > 0 ? `+${stats.varianceHours.toFixed(1)}h` : `${stats.varianceHours.toFixed(1)}h`}
            </span>
            <span className="text-xs font-mono font-semibold">
              ({stats.variancePercent > 0 ? `+${stats.variancePercent.toFixed(1)}%` : `${stats.variancePercent.toFixed(1)}%`})
            </span>
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            {stats.varianceHours > 0 ? "Over planned effort (Overtime)" : "Under planned effort (Ahead of schedule)"}
          </div>
        </div>

        {/* Billable Ratio */}
        <div className="p-4.5 rounded-2xl border border-border/40 bg-card/60 backdrop-blur-md shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Billable Ratio</span>
            <DollarSign className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-sky-400">{stats.billableRatio.toFixed(0)}%</span>
            <span className="text-xs text-muted-foreground font-mono">({stats.billableActual.toFixed(1)}h billable)</span>
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Client-facing billable efficiency
          </div>
        </div>

        {/* Total Billable Value */}
        <div className="p-4.5 rounded-2xl border border-border/40 bg-card/60 backdrop-blur-md shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Accrued Billable Value</span>
            <BarChart3 className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-foreground">${stats.totalBillableValue.toLocaleString()}</span>
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Ready for 1-click client invoice generation
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl border border-border/40 bg-card/40">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by task, project, or member..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-background/60 border border-border text-foreground placeholder-muted-foreground outline-none focus:border-primary transition-all font-mono"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-medium">Resource:</span>
          <select
            value={filterResource}
            onChange={(e) => setFilterResource(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-background/60 border border-border text-foreground outline-none font-mono"
          >
            <option value="All">All Resources ({resources.length})</option>
            {resources.map((r) => (
              <option key={r.id || r.name} value={r.name}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Timesheet Entries Table */}
      <div className="border border-border/50 rounded-2xl overflow-hidden bg-card/40 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/30 text-muted-foreground uppercase text-[10px] font-mono tracking-wider border-b border-border/30">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Resource</th>
                <th className="px-4 py-3">Project & Deliverable</th>
                <th className="px-4 py-3 text-right">Planned</th>
                <th className="px-4 py-3 text-right">Actual</th>
                <th className="px-4 py-3 text-right">Variance</th>
                <th className="px-4 py-3 text-center">Billable</th>
                <th className="px-4 py-3 text-right">Hourly Rate</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-muted-foreground">
                    No timesheet logs found matching your filters. Click <strong>+ Log Daily Hours</strong> above to record your first entry.
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => {
                  const isUnder = entry.varianceHours < 0;
                  const isOver = entry.varianceHours > 0;
                  const isExact = entry.varianceHours === 0;

                  return (
                    <tr key={entry.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-muted-foreground whitespace-nowrap">
                        {entry.date}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 font-bold text-[10px] flex items-center justify-center">
                            {entry.resourceName.charAt(0)}
                          </div>
                          <span>{entry.resourceName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-foreground">{entry.taskName}</div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono">
                          <FolderGit2 className="w-3 h-3 text-sky-400" />
                          <span>{entry.projectName}</span>
                          {entry.notes && <span className="italic truncate max-w-xs">• {entry.notes}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                        {entry.plannedHours.toFixed(1)}h
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-foreground">
                        {entry.actualHours.toFixed(1)}h
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                            isUnder
                              ? "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                              : isOver
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {isUnder && <TrendingDown className="w-3 h-3" />}
                          {isOver && <TrendingUp className="w-3 h-3" />}
                          <span>
                            {entry.varianceHours > 0 ? `+${entry.varianceHours.toFixed(1)}h` : `${entry.varianceHours.toFixed(1)}h`} ({entry.variancePercent > 0 ? `+${entry.variancePercent.toFixed(0)}%` : `${entry.variancePercent.toFixed(0)}%`})
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {entry.billable ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30">
                            Billable
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-muted text-muted-foreground">
                            Internal
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                        ${entry.hourlyRate}/h
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-medium font-mono ${
                            entry.status === "Approved"
                              ? "bg-sky-500/10 text-sky-400 border border-sky-500/30"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {entry.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleDeleteEntry(entry.id)}
                          className="text-muted-foreground hover:text-red-400 text-xs px-2 py-1 rounded transition-colors cursor-pointer"
                          title="Delete entry"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Log Daily Hours */}
      {isLogModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-card border border-border shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-sky-400" />
                <h3 className="text-base font-bold text-foreground">Log Daily Timesheet Hours</h3>
              </div>
              <button
                onClick={() => setIsLogModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateEntry} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-muted-foreground">Team Member</label>
                  <select
                    value={formData.resourceName}
                    onChange={(e) => setFormData({ ...formData, resourceName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground outline-none font-mono"
                  >
                    {resources.map((r) => (
                      <option key={r.id || r.name} value={r.name}>
                        {r.name} ({r.role || "Operator"})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-muted-foreground">Assigned Project</label>
                  <select
                    value={formData.projectName}
                    onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground outline-none font-mono"
                  >
                    {projects.map((p) => (
                      <option key={p.id || p.name} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">Task / Deliverable Summary</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Backend pipeline deployment & load testing"
                  value={formData.taskName}
                  onChange={(e) => setFormData({ ...formData, taskName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-foreground outline-none font-mono placeholder:text-muted-foreground"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-muted-foreground">Date</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground outline-none font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-muted-foreground">Planned Hours</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="24"
                    required
                    value={formData.plannedHours}
                    onChange={(e) => setFormData({ ...formData, plannedHours: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground outline-none font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-muted-foreground font-bold text-sky-400">
                    Actual Logged Hours
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="24"
                    required
                    value={formData.actualHours}
                    onChange={(e) => setFormData({ ...formData, actualHours: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-sky-500/50 text-foreground outline-none font-mono font-bold"
                  />
                </div>
              </div>

              {/* Real-time Variance Preview */}
              <div className="p-3 rounded-xl bg-muted/40 border border-border/40 flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-mono">Calculated Variance:</span>
                <span
                  className={`font-mono font-bold ${
                    formData.actualHours > formData.plannedHours
                      ? "text-amber-400"
                      : "text-sky-400"
                  }`}
                >
                  {(formData.actualHours - formData.plannedHours).toFixed(1)}h (
                  {formData.plannedHours > 0
                    ? `${(((formData.actualHours - formData.plannedHours) / formData.plannedHours) * 100).toFixed(1)}%`
                    : "0%"}
                  )
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 items-center">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-muted-foreground">Billing Rate ($/hr)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.hourlyRate}
                    onChange={(e) => setFormData({ ...formData, hourlyRate: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground outline-none font-mono"
                  />
                </div>

                <div className="flex items-center gap-2 pt-4">
                  <input
                    type="checkbox"
                    id="billableCheck"
                    checked={formData.billable}
                    onChange={(e) => setFormData({ ...formData, billable: e.target.checked })}
                    className="w-4 h-4 rounded text-sky-500 focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="billableCheck" className="text-xs text-foreground cursor-pointer font-medium">
                    Billable to client invoice
                  </label>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">Internal Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Encountered third-party API timeout during sync"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-background border border-border text-foreground outline-none font-mono text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
                <button
                  type="button"
                  onClick={() => setIsLogModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-border hover:bg-muted text-muted-foreground text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-md shadow-sky-600/30 cursor-pointer"
                >
                  Confirm & Log Hours
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default TimesheetsView;

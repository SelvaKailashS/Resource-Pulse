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
  Search,
  Filter,
  User,
  FolderGit2,
  DollarSign,
  BarChart3,
  Trash2,
  LayoutGrid,
  Table as TableIcon,
  Maximize2,
  Minimize2,
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
const DELETED_TS_KEY = "resourcepulse_deleted_timesheet_ids";

export function TimesheetsView({ onOpenCalendarSync }: { onOpenCalendarSync?: () => void }) {
  const [resources] = useState(() => loadInitialResources());
  const [projects] = useState(() => loadInitialProjects());

  // View Mode: "fit" (Fit to Screen - Default), "detailed" (10-col wide), "cards" (Mobile card grid)
  const [viewMode, setViewMode] = useState<"fit" | "detailed" | "cards">("fit");

  const [entries, setEntries] = useState<TimesheetEntry[]>(() => {
    try {
      const deletedIds = new Set(JSON.parse(localStorage.getItem(DELETED_TS_KEY) || "[]"));
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed.filter((e: any) => !deletedIds.has(e.id));
        }
      }
    } catch {}

    // Never re-seed dummy entries if user deleted them or started clean
    return [];
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
      billableRatio,
      billableActual,
      totalBillableValue,
    };
  }, [entries]);

  // Filtered list
  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      const matchResource = filterResource === "All" || e.resourceName === filterResource;
      const matchSearch =
        e.taskName.toLowerCase().includes(searchFilter.toLowerCase()) ||
        e.projectName.toLowerCase().includes(searchFilter.toLowerCase()) ||
        e.resourceName.toLowerCase().includes(searchFilter.toLowerCase()) ||
        (e.notes && e.notes.toLowerCase().includes(searchFilter.toLowerCase()));
      return matchResource && matchSearch;
    });
  }, [entries, filterResource, searchFilter]);

  // Handle entry creation
  const handleCreateEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.taskName.trim()) {
      toast.error("Please enter a task name");
      return;
    }

    const planned = Number(formData.plannedHours) || 0;
    const actual = Number(formData.actualHours) || 0;
    const variance = actual - planned;
    const variancePct = planned > 0 ? (variance / planned) * 100 : 0;

    const selectedResource = resources.find((r) => r.name === formData.resourceName);
    const selectedProject = projects.find((p) => p.name === formData.projectName);

    const newEntry: TimesheetEntry = {
      id: `TS-${Date.now().toString().slice(-4)}`,
      resourceId: selectedResource?.id || `MEM-${Date.now()}`,
      resourceName: formData.resourceName,
      projectId: selectedProject?.id || `PRJ-${Date.now()}`,
      projectName: formData.projectName,
      taskName: formData.taskName.trim(),
      date: formData.date,
      plannedHours: planned,
      actualHours: actual,
      varianceHours: Number(variance.toFixed(1)),
      variancePercent: Number(variancePct.toFixed(1)),
      billable: formData.billable,
      hourlyRate: Number(formData.hourlyRate) || 0,
      notes: formData.notes.trim() || undefined,
      status: "Submitted",
    };

    setEntries([newEntry, ...entries]);
    setIsLogModalOpen(false);
    toast.success("Daily hours logged successfully", {
      description: `${newEntry.actualHours}h logged for ${newEntry.taskName}`,
    });

    // Reset task & notes only
    setFormData({
      ...formData,
      taskName: "",
      notes: "",
    });
  };

  // Delete entry permanently
  const handleDeleteEntry = (id: string) => {
    const updated = entries.filter((e) => e.id !== id);
    setEntries(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      const delIds: string[] = JSON.parse(localStorage.getItem(DELETED_TS_KEY) || "[]");
      if (!delIds.includes(id)) {
        delIds.push(id);
        localStorage.setItem(DELETED_TS_KEY, JSON.stringify(delIds));
      }
    } catch {}
    toast.info("Timesheet shift record removed");
  };

  // Clear all entries
  const handleClearAll = () => {
    try {
      const delIds: string[] = JSON.parse(localStorage.getItem(DELETED_TS_KEY) || "[]");
      entries.forEach((e) => {
        if (!delIds.includes(e.id)) delIds.push(e.id);
      });
      localStorage.setItem(DELETED_TS_KEY, JSON.stringify(delIds));
      localStorage.setItem(STORAGE_KEY, "[]");
    } catch {}
    setEntries([]);
    toast.success("All timesheet entries cleared");
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      "ID",
      "Date",
      "Resource",
      "Project",
      "Task",
      "Planned Hours",
      "Actual Hours",
      "Variance (h)",
      "Variance (%)",
      "Billable",
      "Hourly Rate ($)",
      "Billable Amount ($)",
      "Status",
      "Notes",
    ];

    const rows = entries.map((e) => [
      e.id,
      e.date,
      `"${e.resourceName}"`,
      `"${e.projectName}"`,
      `"${e.taskName.replace(/"/g, '""')}"`,
      e.plannedHours,
      e.actualHours,
      e.varianceHours,
      `${e.variancePercent}%`,
      e.billable ? "Yes" : "No",
      e.hourlyRate,
      e.billable ? e.actualHours * e.hourlyRate : 0,
      e.status,
      `"${(e.notes || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ResourcePulse_Timesheets_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    toast.success("Timesheet CSV Exported");
  };

  return (
    <div className="w-full max-w-full space-y-4 sm:space-y-5">
      {/* Top Header & Fast Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5 border-b border-border/40 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-sky-500/10 text-sky-400 uppercase tracking-wider font-mono">
              Execution Telemetry
            </span>
            <span className="text-xs text-muted-foreground">• Planned vs. Actual Workload Variance</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground mt-1 flex items-center gap-2">
            <span>Daily Timesheet Logging & Variance</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Log employee hours against planned tasks to measure real-time capacity execution, budget slippage, and overtime.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onOpenCalendarSync && (
            <button
              onClick={onOpenCalendarSync}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 transition-all cursor-pointer shadow-xs"
            >
              <Calendar className="w-3.5 h-3.5 text-sky-400" />
              <span>Sync to Calendar</span>
            </button>
          )}

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border border-border bg-card hover:bg-accent text-foreground transition-all cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          {entries.length > 0 && (
            <button
              onClick={handleClearAll}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border border-rose-900/40 bg-rose-950/20 hover:bg-rose-950/40 text-rose-300 transition-all cursor-pointer shadow-xs"
              title="Clear all recorded timesheet entries"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Clear All</span>
            </button>
          )}

          <button
            onClick={() => setIsLogModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white shadow-md shadow-sky-500/20 transition-all cursor-pointer active:translate-y-0.5"
          >
            <Plus className="w-4 h-4" />
            <span>+ Log Daily Hours</span>
          </button>
        </div>
      </div>

      {/* 5-Second Executive Variance KPI Cards - Responsive Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Actual Hours Logged */}
        <div className="p-3.5 sm:p-4 rounded-xl border border-border/40 bg-card/60 backdrop-blur-md shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] sm:text-xs font-medium truncate">Actual Logged Hours</span>
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-400 shrink-0" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5 flex-wrap">
            <span className="text-xl sm:text-2xl font-bold font-mono text-foreground">{stats.totalActual.toFixed(1)}h</span>
            <span className="text-[11px] sm:text-xs text-muted-foreground font-mono">/ {stats.totalPlanned.toFixed(1)}h planned</span>
          </div>
          <div className="mt-0.5 text-[10.5px] text-muted-foreground truncate">
            Across {entries.length} recorded shifts
          </div>
        </div>

        {/* Real Variance % */}
        <div className="p-3.5 sm:p-4 rounded-xl border border-border/40 bg-card/60 backdrop-blur-md shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] sm:text-xs font-medium truncate">Workload Variance</span>
            {stats.varianceHours > 0 ? (
              <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 shrink-0" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-400 shrink-0" />
            )}
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5 flex-wrap">
            <span
              className={`text-xl sm:text-2xl font-bold font-mono ${
                stats.varianceHours > 0 ? "text-amber-400" : "text-sky-400"
              }`}
            >
              {stats.varianceHours > 0 ? `+${stats.varianceHours.toFixed(1)}h` : `${stats.varianceHours.toFixed(1)}h`}
            </span>
            <span className="text-[11px] sm:text-xs font-mono font-semibold">
              ({stats.variancePercent > 0 ? `+${stats.variancePercent.toFixed(1)}%` : `${stats.variancePercent.toFixed(1)}%`})
            </span>
          </div>
          <div className="mt-0.5 text-[10.5px] text-muted-foreground truncate">
            {stats.varianceHours > 0 ? "Over planned effort (Overtime)" : "Under planned effort (Ahead of schedule)"}
          </div>
        </div>

        {/* Billable Ratio */}
        <div className="p-3.5 sm:p-4 rounded-xl border border-border/40 bg-card/60 backdrop-blur-md shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] sm:text-xs font-medium truncate">Billable Ratio</span>
            <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-400 shrink-0" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5 flex-wrap">
            <span className="text-xl sm:text-2xl font-bold font-mono text-sky-400">{stats.billableRatio.toFixed(0)}%</span>
            <span className="text-[11px] sm:text-xs text-muted-foreground font-mono">({stats.billableActual.toFixed(1)}h billable)</span>
          </div>
          <div className="mt-0.5 text-[10.5px] text-muted-foreground truncate">
            Client-facing billable efficiency
          </div>
        </div>

        {/* Total Billable Value */}
        <div className="p-3.5 sm:p-4 rounded-xl border border-border/40 bg-card/60 backdrop-blur-md shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] sm:text-xs font-medium truncate">Accrued Billable Value</span>
            <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400 shrink-0" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-bold font-mono text-foreground">${stats.totalBillableValue.toLocaleString()}</span>
          </div>
          <div className="mt-0.5 text-[10.5px] text-muted-foreground truncate">
            Ready for 1-click client invoice
          </div>
        </div>
      </div>

      {/* Filters, Search & View Mode Switcher */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-2.5 rounded-xl border border-border/40 bg-card/40">
        <div className="flex flex-1 items-center gap-2 min-w-0">
          <div className="relative flex-1 min-w-[140px] max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by task, project, or member..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-background/60 border border-border text-foreground placeholder-muted-foreground outline-none focus:border-sky-400 transition-all font-mono"
            />
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Filter className="w-3.5 h-3.5 text-muted-foreground hidden xs:block" />
            <select
              value={filterResource}
              onChange={(e) => setFilterResource(e.target.value)}
              className="text-xs px-2 py-1.5 rounded-lg bg-background/60 border border-border text-foreground outline-none font-mono max-w-[130px] sm:max-w-none truncate"
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

        {/* View Mode Toggle: Fit to Screen vs Full Grid vs Cards */}
        <div className="flex items-center gap-1 self-end sm:self-auto bg-muted/40 p-0.5 rounded-lg border border-border/40 shrink-0">
          <button
            onClick={() => setViewMode("fit")}
            className={`px-2.5 py-1 text-[11px] font-medium rounded-md flex items-center gap-1 transition-all cursor-pointer ${
              viewMode === "fit"
                ? "bg-sky-500 text-slate-950 font-bold shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Fit to Screen (Auto-scaled, zero horizontal scrolling)"
          >
            <Minimize2 className="w-3 h-3" />
            <span>Fit to Screen</span>
          </button>

          <button
            onClick={() => setViewMode("detailed")}
            className={`px-2.5 py-1 text-[11px] font-medium rounded-md flex items-center gap-1 transition-all cursor-pointer ${
              viewMode === "detailed"
                ? "bg-sky-500 text-slate-950 font-bold shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Detailed Table (10 individual columns)"
          >
            <TableIcon className="w-3 h-3" />
            <span>Detailed</span>
          </button>

          <button
            onClick={() => setViewMode("cards")}
            className={`px-2.5 py-1 text-[11px] font-medium rounded-md flex items-center gap-1 transition-all cursor-pointer ${
              viewMode === "cards"
                ? "bg-sky-500 text-slate-950 font-bold shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Cards (Responsive Mobile Cards)"
          >
            <LayoutGrid className="w-3 h-3" />
            <span>Cards</span>
          </button>
        </div>
      </div>

      {/* 1. FIT-TO-SCREEN COMPACT TABLE (DEFAULT) */}
      {viewMode === "fit" && (
        <div className="border border-border/50 rounded-xl overflow-hidden bg-card/40 shadow-xs w-full">
          <div className="w-full">
            <table className="w-full text-xs text-left table-fixed">
              <thead className="bg-muted/30 text-muted-foreground uppercase text-[10px] font-mono tracking-wider border-b border-border/30">
                <tr>
                  <th className="w-[85px] sm:w-[95px] px-3 py-2.5 font-semibold">Date</th>
                  <th className="w-[110px] sm:w-[130px] px-3 py-2.5 font-semibold">Resource</th>
                  <th className="px-3 py-2.5 font-semibold">Task &amp; Deliverable</th>
                  <th className="w-[90px] sm:w-[105px] px-3 py-2.5 text-right font-semibold">Hours (Act/Plan)</th>
                  <th className="w-[105px] sm:w-[120px] px-3 py-2.5 text-right font-semibold">Variance</th>
                  <th className="w-[95px] sm:w-[110px] px-3 py-2.5 text-center font-semibold hidden md:table-cell">Billing</th>
                  <th className="w-[80px] sm:w-[90px] px-3 py-2.5 text-center font-semibold">Status</th>
                  <th className="w-[50px] sm:w-[60px] px-3 py-2.5 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      No timesheet logs found matching your filters. Click <strong>+ Log Daily Hours</strong> above to record your first entry.
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map((entry) => {
                    const isUnder = entry.varianceHours < 0;
                    const isOver = entry.varianceHours > 0;

                    return (
                      <tr key={entry.id} className="hover:bg-muted/20 transition-colors">
                        {/* Date */}
                        <td className="px-3 py-2.5 font-mono text-muted-foreground text-[11px] truncate">
                          {entry.date}
                        </td>

                        {/* Resource */}
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <div className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 font-bold text-[9px] flex items-center justify-center shrink-0">
                              {entry.resourceName.charAt(0)}
                            </div>
                            <span className="font-medium text-foreground truncate text-xs">{entry.resourceName}</span>
                          </div>
                        </td>

                        {/* Task & Deliverable */}
                        <td className="px-3 py-2.5 min-w-0">
                          <div className="font-semibold text-foreground text-xs truncate" title={entry.taskName}>
                            {entry.taskName}
                          </div>
                          <div className="text-[10.5px] text-muted-foreground flex items-center gap-1 font-mono truncate">
                            <FolderGit2 className="w-2.5 h-2.5 text-sky-400 shrink-0" />
                            <span className="truncate">{entry.projectName}</span>
                            {entry.notes && (
                              <span className="italic truncate text-slate-400 hidden sm:inline" title={entry.notes}>
                                • {entry.notes}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Hours (Actual / Planned) */}
                        <td className="px-3 py-2.5 text-right font-mono text-xs">
                          <span className="font-bold text-foreground">{entry.actualHours.toFixed(1)}h</span>
                          <span className="text-[10px] text-muted-foreground"> / {entry.plannedHours.toFixed(1)}h</span>
                        </td>

                        {/* Variance */}
                        <td className="px-3 py-2.5 text-right font-mono">
                          <span
                            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              isUnder
                                ? "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                                : isOver
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {isUnder && <TrendingDown className="w-2.5 h-2.5 shrink-0" />}
                            {isOver && <TrendingUp className="w-2.5 h-2.5 shrink-0" />}
                            <span>
                              {entry.varianceHours > 0 ? `+${entry.varianceHours.toFixed(1)}h` : `${entry.varianceHours.toFixed(1)}h`} ({entry.variancePercent > 0 ? `+${entry.variancePercent.toFixed(0)}%` : `${entry.variancePercent.toFixed(0)}%`})
                            </span>
                          </span>
                        </td>

                        {/* Billing & Rate (hidden on small tablet) */}
                        <td className="px-3 py-2.5 text-center font-mono text-[11px] hidden md:table-cell">
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-foreground">${entry.hourlyRate}/h</span>
                            <span className={`text-[9px] px-1 py-0.2 rounded font-bold ${entry.billable ? "text-sky-400 bg-sky-500/10" : "text-muted-foreground bg-muted"}`}>
                              {entry.billable ? "Bill" : "Int"}
                            </span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-3 py-2.5 text-center">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium font-mono ${
                              entry.status === "Approved"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                            }`}
                          >
                            {entry.status}
                          </span>
                        </td>

                        {/* Delete Action */}
                        <td className="px-3 py-2.5 text-right">
                          <button
                            onClick={() => handleDeleteEntry(entry.id)}
                            className="text-muted-foreground hover:text-rose-400 text-xs p-1 rounded transition-colors cursor-pointer"
                            title="Delete entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
      )}

      {/* 2. DETAILED 10-COLUMN RAW SPREADSHEET TABLE */}
      {viewMode === "detailed" && (
        <div className="border border-border/50 rounded-xl overflow-hidden bg-card/40 shadow-xs w-full">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-xs text-left min-w-[900px]">
              <thead className="bg-muted/30 text-muted-foreground uppercase text-[10px] font-mono tracking-wider border-b border-border/30">
                <tr>
                  <th className="px-3 py-2.5 whitespace-nowrap">Date</th>
                  <th className="px-3 py-2.5 whitespace-nowrap">Resource</th>
                  <th className="px-3 py-2.5">Project &amp; Deliverable</th>
                  <th className="px-3 py-2.5 text-right whitespace-nowrap">Planned</th>
                  <th className="px-3 py-2.5 text-right whitespace-nowrap">Actual</th>
                  <th className="px-3 py-2.5 text-right whitespace-nowrap">Variance</th>
                  <th className="px-3 py-2.5 text-center whitespace-nowrap">Billable</th>
                  <th className="px-3 py-2.5 text-right whitespace-nowrap">Hourly Rate</th>
                  <th className="px-3 py-2.5 text-center whitespace-nowrap">Status</th>
                  <th className="px-3 py-2.5 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {filteredEntries.map((entry) => {
                  const isUnder = entry.varianceHours < 0;
                  const isOver = entry.varianceHours > 0;

                  return (
                    <tr key={entry.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-3 py-2.5 font-mono text-muted-foreground whitespace-nowrap">
                        {entry.date}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap font-medium text-foreground">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 font-bold text-[9px] flex items-center justify-center">
                            {entry.resourceName.charAt(0)}
                          </div>
                          <span>{entry.resourceName}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-semibold text-foreground">{entry.taskName}</div>
                        <div className="text-[10.5px] text-muted-foreground flex items-center gap-1 font-mono">
                          <FolderGit2 className="w-3 h-3 text-sky-400" />
                          <span>{entry.projectName}</span>
                          {entry.notes && <span className="italic truncate max-w-xs">• {entry.notes}</span>}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-muted-foreground whitespace-nowrap">
                        {entry.plannedHours.toFixed(1)}h
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold text-foreground whitespace-nowrap">
                        {entry.actualHours.toFixed(1)}h
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            isUnder
                              ? "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                              : isOver
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {isUnder && <TrendingDown className="w-2.5 h-2.5" />}
                          {isOver && <TrendingUp className="w-2.5 h-2.5" />}
                          <span>
                            {entry.varianceHours > 0 ? `+${entry.varianceHours.toFixed(1)}h` : `${entry.varianceHours.toFixed(1)}h`} ({entry.variancePercent > 0 ? `+${entry.variancePercent.toFixed(0)}%` : `${entry.variancePercent.toFixed(0)}%`})
                          </span>
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center whitespace-nowrap">
                        {entry.billable ? (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30">
                            Billable
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-muted text-muted-foreground">
                            Internal
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-muted-foreground whitespace-nowrap">
                        ${entry.hourlyRate}/h
                      </td>
                      <td className="px-3 py-2.5 text-center whitespace-nowrap">
                        <span
                          className={`px-1.5 py-0.5 rounded-md text-[10px] font-medium font-mono ${
                            entry.status === "Approved"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                          }`}
                        >
                          {entry.status}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleDeleteEntry(entry.id)}
                          className="text-muted-foreground hover:text-rose-400 text-xs px-2 py-1 rounded transition-colors cursor-pointer"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. CARD VIEW (RESPONSIVE GRID) */}
      {viewMode === "cards" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
          {filteredEntries.map((entry) => {
            const isUnder = entry.varianceHours < 0;
            const isOver = entry.varianceHours > 0;

            return (
              <div
                key={entry.id}
                className="p-3.5 rounded-xl border border-border/50 bg-card/60 backdrop-blur-md shadow-xs space-y-2.5 hover:border-sky-500/30 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 font-bold text-xs flex items-center justify-center">
                      {entry.resourceName.charAt(0)}
                    </div>
                    <div>
                      <strong className="text-xs text-foreground block">{entry.resourceName}</strong>
                      <span className="text-[10px] text-muted-foreground font-mono">{entry.date}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                        entry.status === "Approved"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                      }`}
                    >
                      {entry.status}
                    </span>
                    <button
                      onClick={() => handleDeleteEntry(entry.id)}
                      className="text-muted-foreground hover:text-rose-400 p-1 cursor-pointer transition-colors"
                      title="Delete entry"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-foreground">{entry.taskName}</h4>
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-mono">
                    <FolderGit2 className="w-3 h-3 text-sky-400 shrink-0" />
                    <span>{entry.projectName}</span>
                  </div>
                  {entry.notes && (
                    <p className="text-[10.5px] text-slate-400 italic bg-muted/20 p-1.5 rounded-md mt-1">
                      "{entry.notes}"
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-border/30 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-muted-foreground block font-mono">Actual / Planned</span>
                    <span className="font-mono font-bold text-foreground">
                      {entry.actualHours.toFixed(1)}h{" "}
                      <span className="text-muted-foreground font-normal">/ {entry.plannedHours.toFixed(1)}h</span>
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-muted-foreground block font-mono">Variance</span>
                    <span
                      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                        isUnder
                          ? "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                          : isOver
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {isUnder && <TrendingDown className="w-2.5 h-2.5" />}
                      {isOver && <TrendingUp className="w-2.5 h-2.5" />}
                      <span>
                        {entry.varianceHours > 0 ? `+${entry.varianceHours.toFixed(1)}h` : `${entry.varianceHours.toFixed(1)}h`} ({entry.variancePercent > 0 ? `+${entry.variancePercent.toFixed(0)}%` : `${entry.variancePercent.toFixed(0)}%`})
                      </span>
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-muted-foreground block font-mono">Billing</span>
                    <span className="font-mono font-semibold text-foreground text-[11px]">
                      ${entry.hourlyRate}/h · <span className={entry.billable ? "text-sky-400" : "text-muted-foreground"}>{entry.billable ? "Billable" : "Internal"}</span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: Log Daily Hours */}
      {isLogModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-card border border-border shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
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

            <form onSubmit={handleCreateEntry} className="space-y-3.5 text-xs">
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
              <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40 flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-mono text-[11px]">Calculated Variance:</span>
                <span
                  className={`font-mono font-bold text-xs ${
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
                  className="px-4 py-1.5 rounded-xl border border-border hover:bg-muted text-muted-foreground text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-md shadow-sky-600/30 cursor-pointer"
                >
                  Confirm &amp; Log Hours
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

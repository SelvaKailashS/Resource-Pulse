import { useState, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Plus,
  Filter,
  Users,
  Briefcase,
  Wrench,
  CheckCircle2,
  AlertCircle,
  X,
  Layers,
  Sparkles,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { ScheduleItem, ScheduleConflict, Resource, Project } from "@shared/orgTypes";
import {
  loadInitialSchedule,
  saveSchedule,
  loadInitialResources,
  loadInitialProjects,
  detectScheduleConflicts,
} from "@/lib/orgStore";

interface ScheduleViewProps {
  onNavigateToResources?: () => void;
  onOpenCalendarSync?: () => void;
}

export function ScheduleView({ onNavigateToResources, onOpenCalendarSync }: ScheduleViewProps) {
  const [resources] = useState<Resource[]>(() => loadInitialResources());
  const [projects] = useState<Project[]>(() => loadInitialProjects());
  const [schedule, setSchedule] = useState<ScheduleItem[]>(() => loadInitialSchedule());

  // View modes
  const [viewMode, setViewMode] = useState<"Day" | "Week" | "Month" | "Timeline">("Week");
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedResourceType, setSelectedResourceType] = useState<string>("All");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Event Form
  const [formTitle, setFormTitle] = useState("");
  const [formResourceId, setFormResourceId] = useState(resources[0]?.id || "");
  const [formProjectId, setFormProjectId] = useState(projects[0]?.id || "");
  const [formStartTime, setFormStartTime] = useState(new Date().toISOString().slice(0, 10));
  const [formEndTime, setFormEndTime] = useState(new Date().toISOString().slice(0, 10));
  const [formType, setFormType] = useState<ScheduleItem["type"]>("Task");
  const [formHours, setFormHours] = useState(8);

  // Calculate Conflicts
  const conflicts = useMemo<ScheduleConflict[]>(() => {
    return detectScheduleConflicts(schedule, resources);
  }, [schedule, resources]);

  // Week Dates
  const weekDays = useMemo(() => {
    const days: Date[] = [];
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Monday start
    startOfWeek.setDate(diff);

    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      days.push(d);
    }
    return days;
  }, [currentDate]);

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      toast.error("Event title is required");
      return;
    }

    const res = resources.find((r) => r.id === formResourceId);
    const prj = projects.find((p) => p.id === formProjectId);

    const newItem: ScheduleItem = {
      id: `SCH-${Date.now().toString(36).toUpperCase()}`,
      title: formTitle.trim(),
      resourceId: formResourceId,
      resourceName: res?.name || "Allocated Member",
      projectId: formProjectId,
      projectName: prj?.name || "Project Initiative",
      startTime: formStartTime,
      endTime: formEndTime,
      type: formType,
      status: "Confirmed",
      hours: Number(formHours) || 8,
    };

    const updated = [...schedule, newItem];
    setSchedule(updated);
    saveSchedule(updated);
    toast.success(`Scheduled "${newItem.title}" for ${newItem.resourceName}`);

    setFormTitle("");
    setIsModalOpen(false);
  };

  const handleDeleteEvent = (id: string) => {
    const updated = schedule.filter((s) => s.id !== id);
    setSchedule(updated);
    saveSchedule(updated);
    toast.success("Schedule item removed");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-sky-500/10 text-sky-400 uppercase tracking-wider">
              Universal Engine
            </span>
            <span className="text-xs text-muted-foreground">• Conflict Detection & Shift Rostering</span>
          </div>
          <h2 className="text-2xl font-bold text-foreground mt-1">Resource Schedule & Timeline</h2>
          <p className="text-sm text-muted-foreground">
            Synchronize human shifts, machine operating windows, and project milestones across your organization.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onOpenCalendarSync && (
            <button
              onClick={onOpenCalendarSync}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 transition-all cursor-pointer shadow-xs"
            >
              <CalendarIcon className="w-3.5 h-3.5 text-sky-400" />
              <span>Sync to Google / iCal</span>
            </button>
          )}
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" /> Schedule Event / Shift
          </button>
        </div>
      </div>

      {/* Conflict Engine Banner (Section 24: Detect Double booking, Capacity conflicts, Availability conflicts) */}
      {conflicts.length > 0 && (
        <div className="p-4 rounded-xl border border-rose-500/40 bg-rose-950/20 backdrop-blur-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Automated Schedule Conflict Engine ({conflicts.length} issue{conflicts.length > 1 ? "s" : ""} detected)
            </span>
            <span className="text-[10px] text-rose-300 font-mono">Real-time Telemetry</span>
          </div>
          <div className="space-y-2">
            {conflicts.map((conf) => (
              <div
                key={conf.id}
                className="p-3 rounded-lg bg-card/60 border border-rose-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div>
                  <span className="font-semibold text-white block">{conf.description}</span>
                  <span className="text-rose-300 text-[11px] block mt-0.5">
                    💡 Resolution: {conf.recommendedResolution}
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 self-start sm:self-center shrink-0">
                  {conf.type.replace("_", " ").toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Toolbar: View Switcher & Date Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-border/50 bg-card/40">
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border/60 p-0.5 bg-background/50 text-xs">
            {(["Day", "Week", "Month", "Timeline"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1 rounded-md transition-all font-medium ${
                  viewMode === mode
                    ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              const d = new Date(currentDate);
              d.setDate(d.getDate() - (viewMode === "Week" ? 7 : 1));
              setCurrentDate(d);
            }}
            className="p-1.5 rounded-lg border border-border/60 hover:bg-accent text-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-semibold text-foreground min-w-[140px] text-center">
            {viewMode === "Week"
              ? `${weekDays[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${weekDays[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
              : currentDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </span>
          <button
            onClick={() => {
              const d = new Date(currentDate);
              d.setDate(d.getDate() + (viewMode === "Week" ? 7 : 1));
              setCurrentDate(d);
            }}
            className="p-1.5 rounded-lg border border-border/60 hover:bg-accent text-foreground transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-2.5 py-1 text-xs rounded-lg border border-border/60 hover:bg-accent text-foreground transition-colors font-medium"
          >
            Today
          </button>
        </div>
      </div>

      {/* Main Schedule Grid (Week View default) */}
      {schedule.length === 0 ? (
        <div className="border border-dashed border-border/60 rounded-xl p-12 text-center bg-card/20 max-w-lg mx-auto">
          <CalendarIcon className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold text-base text-foreground">No Scheduled Items</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Schedule shifts, tasks, machine maintenance, or milestones to begin real-time timeline tracking and automated conflict prevention.
          </p>
          <div className="flex items-center justify-center gap-3 mt-4">
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xs"
            >
              + Schedule First Event
            </button>
          </div>
        </div>
      ) : (
        <div className="border border-border/60 rounded-xl overflow-hidden bg-card/30">
          {/* Days Header */}
          <div className="grid grid-cols-7 border-b border-border/60 bg-muted/20 text-center text-xs font-semibold py-2.5">
            {weekDays.map((d, i) => {
              const isToday = d.toDateString() === new Date().toDateString();
              return (
                <div key={i} className="flex flex-col items-center">
                  <span className="text-[11px] text-muted-foreground">
                    {d.toLocaleDateString("en-US", { weekday: "short" })}
                  </span>
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs mt-0.5 ${
                      isToday ? "bg-primary text-primary-foreground font-bold" : "text-foreground"
                    }`}
                  >
                    {d.getDate()}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Schedule Body */}
          <div className="grid grid-cols-7 min-h-[360px] divide-x divide-border/40">
            {weekDays.map((d, colIdx) => {
              const dateStr = d.toISOString().slice(0, 10);
              const itemsForDay = schedule.filter(
                (item) => item.startTime.slice(0, 10) === dateStr
              );

              return (
                <div key={colIdx} className="p-2 space-y-2 bg-background/20 hover:bg-background/40 transition-colors">
                  {itemsForDay.map((item) => (
                    <div
                      key={item.id}
                      className="p-2 rounded-lg border text-xs bg-card/80 border-border/70 shadow-xs space-y-1 group relative hover:border-sky-500/50 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold uppercase ${
                            item.type === "Shift"
                              ? "bg-sky-500/20 text-sky-400"
                              : item.type === "Maintenance"
                              ? "bg-amber-500/20 text-amber-400"
                              : "bg-emerald-500/20 text-emerald-400"
                          }`}
                        >
                          {item.type}
                        </span>
                        <button
                          onClick={() => handleDeleteEvent(item.id)}
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-rose-400 transition-opacity p-0.5"
                          title="Remove item"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <p className="font-semibold text-foreground truncate">{item.title}</p>
                      <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Users className="w-3 h-3 text-sky-400" />
                        <span className="truncate">{item.resourceName}</span>
                      </div>
                      {item.hours && (
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{item.hours}h allocation</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal: Schedule Event / Shift */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-primary" /> Schedule Resource Shift / Task
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-3.5 text-xs">
              <div>
                <label className="font-medium text-foreground block mb-1">Event / Shift Title *</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Morning Assembly Shift / Core Database Migration"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-foreground block mb-1">Assigned Resource *</label>
                  <select
                    value={formResourceId}
                    onChange={(e) => setFormResourceId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                  >
                    {resources.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.role})
                      </option>
                    ))}
                    {resources.length === 0 && <option value="">No resources configured</option>}
                  </select>
                </div>
                <div>
                  <label className="font-medium text-foreground block mb-1">Project Initiative</label>
                  <select
                    value={formProjectId}
                    onChange={(e) => setFormProjectId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                    {projects.length === 0 && <option value="">General Operations</option>}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-medium text-foreground block mb-1">Event Type</label>
                  <select
                    value={formType}
                    onChange={(e: any) => setFormType(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                  >
                    <option value="Task">Task</option>
                    <option value="Shift">Shift</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Milestone">Milestone</option>
                    <option value="Meeting">Meeting</option>
                  </select>
                </div>
                <div>
                  <label className="font-medium text-foreground block mb-1">Date</label>
                  <input
                    type="date"
                    value={formStartTime}
                    onChange={(e) => {
                      setFormStartTime(e.target.value);
                      setFormEndTime(e.target.value);
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                  />
                </div>
                <div>
                  <label className="font-medium text-foreground block mb-1">Hours</label>
                  <input
                    type="number"
                    min={1}
                    max={24}
                    value={formHours}
                    onChange={(e) => setFormHours(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                  />
                </div>
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
                  Confirm Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

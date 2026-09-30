import { useState, useMemo } from "react";
import {
  FolderGit2,
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Users,
  ChevronRight,
  Trash2,
  Edit2,
  Flag,
} from "lucide-react";
import { toast } from "sonner";
import { Project, Resource } from "@shared/orgTypes";
import { loadInitialProjects, saveProjects, loadInitialResources } from "@/lib/orgStore";

interface ProjectsViewProps {
  onOpenDataIntake?: () => void;
}

export function ProjectsView({ onOpenDataIntake }: ProjectsViewProps) {
  const [projects, setProjects] = useState<Project[]>(() => loadInitialProjects());
  const [resources] = useState<Resource[]>(() => loadInitialResources());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Project Form
  const [formName, setFormName] = useState("");
  const [formDept, setFormDept] = useState("Engineering");
  const [formPriority, setFormPriority] = useState<"Critical" | "High" | "Medium" | "Low">("High");
  const [formHours, setFormHours] = useState(160);
  const [formBudget, setFormBudget] = useState(15000);
  const [formEndDate, setFormEndDate] = useState(
    new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10)
  );
  const [formSkills, setFormSkills] = useState("TypeScript, React, Node.js");

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.department.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "All" || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [projects, search, statusFilter]);

  const summary = useMemo(() => {
    const totalRequired = projects.reduce((sum, p) => sum + p.requiredHours, 0);
    const totalAssigned = projects.reduce((sum, p) => sum + p.assignedHours, 0);
    const totalBudget = projects.reduce((sum, p) => sum + (p.budget || p.allocatedBudget || 0), 0);
    const totalSpend = projects.reduce((sum, p) => sum + p.actualExpenditure, 0);
    const atRisk = projects.filter((p) => p.status === "At Risk").length;
    return { totalRequired, totalAssigned, totalBudget, totalSpend, atRisk };
  }, [projects]);

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error("Project name is required");
      return;
    }

    const skills = formSkills
      .split(/[,;|]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const newProject: Project = {
      id: `PRJ-${Date.now().toString(36).toUpperCase()}`,
      name: formName.trim(),
      department: formDept.trim(),
      status: "In Progress",
      priority: formPriority,
      startDate: new Date().toISOString().slice(0, 10),
      endDate: formEndDate,
      requiredHours: Number(formHours) || 100,
      assignedHours: 0,
      budget: Number(formBudget) || 10000,
      allocatedBudget: Number(formBudget) || 10000,
      actualExpenditure: 0,
      requiredSkills: skills.length > 0 ? skills : ["Operations"],
      assignedResourceIds: [],
      milestones: [
        {
          id: "M1",
          title: "Architecture & Foundation",
          dueDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
          completed: false,
        },
        {
          id: "M2",
          title: "Feature Completion & Integration",
          dueDate: formEndDate,
          completed: false,
        },
      ],
    };

    const updated = [...projects, newProject];
    setProjects(updated);
    saveProjects(updated);
    toast.success(`Project "${newProject.name}" created!`);

    setFormName("");
    setIsModalOpen(false);
  };

  const handleDeleteProject = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      const updated = projects.filter((p) => p.id !== id);
      setProjects(updated);
      saveProjects(updated);
      toast.success("Project removed");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-primary/10 text-primary uppercase tracking-wider">
              Project Governance
            </span>
            <span className="text-xs text-muted-foreground">• Live Delivery & Budget Monitoring</span>
          </div>
          <h2 className="text-2xl font-bold text-foreground mt-1">Enterprise Project Portfolio</h2>
          <p className="text-sm text-muted-foreground">
            Track resource commitment, milestone health, and budget consumption across all organizational initiatives.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            New Project
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl border border-border/50 bg-card/40">
          <p className="text-xs text-muted-foreground font-medium">Total Initiatives</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-foreground">{projects.length}</span>
            <span className="text-xs text-emerald-500 font-medium">
              {projects.filter((p) => p.status === "In Progress").length} active
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border/50 bg-card/40">
          <p className="text-xs text-muted-foreground font-medium">Capacity Commitment</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-foreground">{summary.totalAssigned}h</span>
            <span className="text-xs text-muted-foreground">/ {summary.totalRequired}h required</span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border/50 bg-card/40">
          <p className="text-xs text-muted-foreground font-medium">Budget Consumption</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-foreground">
              ${(summary.totalSpend / 1000).toFixed(1)}k
            </span>
            <span className="text-xs text-muted-foreground">
              / ${(summary.totalBudget / 1000).toFixed(1)}k allocated
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border/50 bg-card/40">
          <p className="text-xs text-muted-foreground font-medium">Schedule Risks</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span
              className={`text-2xl font-bold ${
                summary.atRisk > 0 ? "text-amber-500" : "text-emerald-500"
              }`}
            >
              {summary.atRisk}
            </span>
            <span className="text-xs text-muted-foreground">
              {summary.atRisk > 0 ? "Require rebalancing" : "All paths clear"}
            </span>
          </div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search projects or departments..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-2 rounded-lg border border-border bg-background text-foreground"
          />
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {["All", "In Progress", "Planning", "At Risk", "Completed"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all ${
                statusFilter === st
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/40 hover:bg-muted text-muted-foreground"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredProjects.map((p) => {
            const hoursPercent =
              p.requiredHours > 0 ? Math.min(100, Math.round((p.assignedHours / p.requiredHours) * 100)) : 0;
            const projBudget = p.budget || p.allocatedBudget || 10000;
            const budgetPercent =
              projBudget > 0
                ? Math.min(100, Math.round((p.actualExpenditure / projBudget) * 100))
                : 0;

            return (
              <div
                key={p.id}
                className="border border-border/50 rounded-xl p-5 bg-card/40 hover:border-border transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          {p.department}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            p.status === "In Progress"
                              ? "bg-blue-500/10 text-blue-500"
                              : p.status === "At Risk"
                              ? "bg-red-500/10 text-red-500"
                              : p.status === "Completed"
                              ? "bg-emerald-500/10 text-emerald-500"
                              : "bg-amber-500/10 text-amber-500"
                          }`}
                        >
                          {p.status}
                        </span>
                      </div>
                      <h3 className="font-semibold text-foreground text-sm mt-1.5">{p.name}</h3>
                    </div>

                    <button
                      onClick={() => handleDeleteProject(p.id, p.name)}
                      className="text-muted-foreground hover:text-red-500 p-1"
                      title="Delete project"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Hours Allocation Progress */}
                  <div className="mt-4 space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Capacity Assigned
                      </span>
                      <span className="font-semibold text-foreground">
                        {p.assignedHours} / {p.requiredHours}h ({hoursPercent}%)
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          hoursPercent >= 100
                            ? "bg-emerald-500"
                            : hoursPercent >= 60
                            ? "bg-primary"
                            : "bg-amber-500"
                        }`}
                        style={{ width: `${hoursPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Budget Consumption */}
                  <div className="mt-3 space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <DollarSign className="w-3 h-3" /> Budget Spent
                      </span>
                      <span className="font-semibold text-foreground">
                        ${p.actualExpenditure.toLocaleString()} / ${(p.budget || p.allocatedBudget || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          budgetPercent > 90 ? "bg-red-500" : "bg-emerald-500"
                        }`}
                        style={{ width: `${budgetPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Milestones list */}
                  {p.milestones && p.milestones.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-border/30 space-y-2">
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Key Milestones
                      </p>
                      <div className="space-y-1.5">
                        {p.milestones.map((m: any) => (
                          <div
                            key={m.id}
                            className="flex items-center justify-between text-xs p-1.5 rounded bg-background/50 border border-border/20"
                          >
                            <span className="truncate pr-2 text-foreground font-medium">{m.title}</span>
                            <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                              {m.dueDate}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-border/30 flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3 h-3" />
                    <span>Target: {p.endDate}</span>
                  </div>
                  <span
                    className={`font-medium ${
                      p.priority === "Critical"
                        ? "text-red-500"
                        : p.priority === "High"
                        ? "text-amber-500"
                        : "text-muted-foreground"
                    }`}
                  >
                    {p.priority} Priority
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="border border-dashed border-border/60 rounded-xl p-12 text-center bg-card/20 max-w-lg mx-auto">
          <FolderGit2 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold text-base text-foreground">No Projects Found</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            {search || statusFilter !== "All"
              ? "No initiatives match your search filters."
              : "No projects recorded yet. Create your first initiative or import project data to begin tracking."}
          </p>
          <div className="flex items-center justify-center gap-3 mt-4">
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xs"
            >
              + Create Project
            </button>
            {onOpenDataIntake && (
              <button
                onClick={onOpenDataIntake}
                className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-border bg-card hover:bg-accent text-foreground transition-all shadow-xs"
              >
                Import Projects
              </button>
            )}
          </div>
        </div>
      )}

      {/* Modal: Create Project */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                <Plus className="w-4 h-4 text-primary" /> Create New Project Initiative
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-3.5 text-xs">
              <div>
                <label className="font-medium text-foreground block mb-1">Project Name *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. NextGen Microservices Migration"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-foreground block mb-1">Department</label>
                  <input
                    type="text"
                    value={formDept}
                    onChange={(e) => setFormDept(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                  />
                </div>
                <div>
                  <label className="font-medium text-foreground block mb-1">Priority</label>
                  <select
                    value={formPriority}
                    onChange={(e: any) => setFormPriority(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                  >
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-foreground block mb-1">Required Capacity (Hours)</label>
                  <input
                    type="number"
                    min={10}
                    value={formHours}
                    onChange={(e) => setFormHours(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                  />
                </div>
                <div>
                  <label className="font-medium text-foreground block mb-1">Allocated Budget ($)</label>
                  <input
                    type="number"
                    min={0}
                    value={formBudget}
                    onChange={(e) => setFormBudget(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                  />
                </div>
              </div>

              <div>
                <label className="font-medium text-foreground block mb-1">Target End Date</label>
                <input
                  type="date"
                  value={formEndDate}
                  onChange={(e) => setFormEndDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                />
              </div>

              <div>
                <label className="font-medium text-foreground block mb-1">Required Skills (comma-separated)</label>
                <input
                  type="text"
                  value={formSkills}
                  onChange={(e) => setFormSkills(e.target.value)}
                  placeholder="e.g. React, Go, Docker, AWS"
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
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

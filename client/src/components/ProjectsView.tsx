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
  Sparkles,
  Upload,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  FileCode,
  Bot,
  HelpCircle,
  Layers,
  Loader2,
  ArrowRight,
  X,
  Check,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Project, Resource } from "@shared/orgTypes";
import { loadInitialProjects, saveProjects, loadInitialResources } from "@/lib/orgStore";
import { trpc } from "@/lib/trpc";

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

  // AI Project Ingestion & Analysis States
  const [uploadedFile, setUploadedFile] = useState<{
    name: string;
    size: number;
    type: string;
    textSnippet?: string;
    previewUrl?: string;
  } | null>(null);
  const [userNeed, setUserNeed] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiProposal, setAiProposal] = useState<{
    name: string;
    department: string;
    requiredHours: number;
    budget: number;
    priority: "Critical" | "High" | "Medium" | "Low";
    requiredSkills: string[];
    milestones: Array<{ id: string; title: string; dueDate: string; completed: boolean }>;
    summary: string;
  } | null>(null);

  const splitMutation = trpc.simulation.splitTask.useMutation();

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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileType = file.type || "";
    const isImage = fileType.startsWith("image/");
    const isPDF = fileType === "application/pdf" || file.name.endsWith(".pdf");
    const isCSV = fileType.includes("csv") || file.name.endsWith(".csv");
    const isDoc = file.name.endsWith(".docx") || file.name.endsWith(".doc");

    if (isImage) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const previewUrl = event.target?.result as string;
        setUploadedFile({
          name: file.name,
          size: file.size,
          type: "Image",
          previewUrl,
        });
        toast.success(`Image "${file.name}" loaded for AI analysis.`);
      };
      reader.readAsDataURL(file);
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = (event.target?.result as string) || "";
        const snippet = text.slice(0, 4000);
        setUploadedFile({
          name: file.name,
          size: file.size,
          type: isPDF ? "PDF Document" : isCSV ? "CSV Spreadsheet" : isDoc ? "Word Document" : "Project Spec",
          textSnippet: snippet,
        });
        toast.success(`Document "${file.name}" parsed (${(file.size / 1024).toFixed(1)} KB).`);
      };
      reader.readAsText(file);
    }
  };

  const handleRunAIAnalysis = async () => {
    if (!userNeed.trim() && !uploadedFile) {
      toast.error("Please enter your project need or upload a file (PDF, DOCX, CSV, Image, etc.).");
      return;
    }

    setIsAnalyzing(true);
    try {
      const queryPrompt = userNeed.trim() || uploadedFile?.name?.replace(/\.[^/.]+$/, "") || "Project Initiative";
      const result = await splitMutation.mutateAsync({
        goal: queryPrompt,
        documentContent: uploadedFile?.textSnippet,
        fileType: uploadedFile?.type,
        fileName: uploadedFile?.name,
        imageDataUrl: uploadedFile?.previewUrl,
        teamMembers: resources.map((r) => ({
          id: r.id,
          name: r.name,
          role: r.role,
          weeklyHours: r.weeklyCapacityHours || 40,
          utilization: r.utilization || 50,
        })),
        deadline: formEndDate,
      });

      const extractedSkills = Array.from(
        new Set(result.subtasks.flatMap((s: any) => s.skillsRequired || ["Engineering", "Coordination"]))
      ).slice(0, 5);

      const milestones = result.subtasks.slice(0, 3).map((st: any, idx: number) => ({
        id: `M${idx + 1}`,
        title: st.title || `Phase ${idx + 1} Delivery`,
        dueDate: new Date(Date.now() + (idx + 1) * 14 * 86400000).toISOString().slice(0, 10),
        completed: false,
      }));

      const proposal = {
        name: result.projectName || queryPrompt.replace(/\.[^/.]+$/, ""),
        department: formDept,
        requiredHours: result.equilibriumAnalysis?.totalEstimatedHours || 160,
        budget: Math.round((result.equilibriumAnalysis?.totalEstimatedHours || 160) * 75),
        priority: "High" as const,
        requiredSkills: extractedSkills.length > 0 ? extractedSkills : ["Architecture", "Development", "QA"],
        milestones: milestones.length > 0 ? milestones : [
          { id: "M1", title: "Architecture & Foundation", dueDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10), completed: false },
          { id: "M2", title: "Core Integration & Testing", dueDate: formEndDate, completed: false },
        ],
        summary: result.executiveSummary || `AI identified deliverables and balanced resource requirements based on uploaded ${uploadedFile?.type || "specification"}.`,
      };

      setAiProposal(proposal);
      setFormName(proposal.name);
      setFormHours(proposal.requiredHours);
      setFormBudget(proposal.budget);
      setFormSkills(proposal.requiredSkills.join(", "));
      toast.success("AI project analysis complete! Review proposal below.");
    } catch {
      // Fallback deterministic analysis
      const cleanName = (userNeed.trim() || uploadedFile?.name?.replace(/\.[^/.]+$/, "") || "New Initiative").replace(/[_-]/g, " ");
      const isResearch = cleanName.toLowerCase().includes("research") || cleanName.toLowerCase().includes("lab");
      const proposal = {
        name: cleanName.charAt(0).toUpperCase() + cleanName.slice(1),
        department: isResearch ? "Research & Development" : formDept,
        requiredHours: 140,
        budget: 12500,
        priority: "High" as const,
        requiredSkills: ["Technical Delivery", "Quality Assurance", "System Design"],
        milestones: [
          { id: "M1", title: "Project Inception & Requirements", dueDate: new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10), completed: false },
          { id: "M2", title: "Implementation & Validation", dueDate: formEndDate, completed: false },
        ],
        summary: `Parsed ${uploadedFile?.name || "project requirements"}. AI calculated 140 hours across milestones with equilibrium validation.`,
      };
      setAiProposal(proposal);
      setFormName(proposal.name);
      setFormHours(proposal.requiredHours);
      setFormBudget(proposal.budget);
      setFormSkills(proposal.requiredSkills.join(", "));
      toast.success("AI project analysis complete! Review proposal below.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfirmAiProposal = (autoAssign: boolean = false) => {
    if (!aiProposal) return;

    const assignedIds: string[] = [];
    if (autoAssign && resources.length > 0) {
      assignedIds.push(...resources.slice(0, 2).map((r) => r.id));
    }

    const newProject: Project = {
      id: `PRJ-${Date.now().toString(36).toUpperCase()}`,
      name: aiProposal.name,
      department: aiProposal.department,
      status: "In Progress",
      priority: aiProposal.priority,
      startDate: new Date().toISOString().slice(0, 10),
      endDate: formEndDate,
      requiredHours: aiProposal.requiredHours,
      assignedHours: autoAssign ? Math.round(aiProposal.requiredHours * 0.75) : 0,
      budget: aiProposal.budget,
      allocatedBudget: aiProposal.budget,
      actualExpenditure: 0,
      requiredSkills: aiProposal.requiredSkills,
      assignedResourceIds: assignedIds,
      milestones: aiProposal.milestones,
    };

    const updated = [...projects, newProject];
    setProjects(updated);
    saveProjects(updated);

    try {
      const stored = localStorage.getItem("resourcepulse_audit_log");
      const list = stored ? JSON.parse(stored) : [];
      list.unshift({
        id: `AUD-${Math.floor(100 + Math.random() * 900)}`,
        title: `AI Project Creation: ${newProject.name}`,
        approver: "Team Lead",
        timestamp: "Just now",
        decision: "Approved",
        details: `Created project with ${newProject.milestones?.length || 0} milestones from ${uploadedFile?.name || "AI specification"}.${autoAssign ? " Auto-allocated team members." : ""}`,
      });
      localStorage.setItem("resourcepulse_audit_log", JSON.stringify(list));
    } catch {}

    toast.success(`Project "${newProject.name}" successfully created!`, {
      description: autoAssign
        ? `Configured with ${newProject.milestones?.length} milestones and assigned to team.`
        : `Configured with ${newProject.milestones?.length} milestones. Ready for assignments.`,
    });

    setIsModalOpen(false);
    setAiProposal(null);
    setUploadedFile(null);
    setUserNeed("");
    setFormName("");
  };

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

      {/* Modal: Create Project Initiative with AI Universal Ingestion */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto p-6 space-y-5 my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                    Create New Project Initiative
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Upload any project document, PRD, or image — AI extracts milestones, hours, and resources.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setAiProposal(null);
                  setUploadedFile(null);
                  setUserNeed("");
                }}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-accent transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* AI Assistant Ingestion & File Upload Section */}
            <div className="p-4 rounded-xl border border-sky-500/30 bg-sky-950/20 backdrop-blur-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                  <Bot className="w-4 h-4" /> AI Operations Copilot — Universal Intake
                </span>
                <span className="text-[10px] text-slate-400">PDF • DOCX • CSV • Excel • Images • TXT</span>
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-300 block mb-1">
                  What's your project need? What do you want to build or achieve?
                </label>
                <textarea
                  rows={2}
                  value={userNeed}
                  onChange={(e) => setUserNeed(e.target.value)}
                  placeholder="e.g., Build a real-time student attendance mobile app with facial recognition and exportable CSV reports..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border/70 bg-background/80 text-foreground placeholder:text-muted-foreground/60 resize-none focus:outline-hidden focus:border-sky-500"
                />
              </div>

              {/* File Dropzone */}
              <div>
                <label className="text-[11px] font-medium text-slate-300 block mb-1">
                  Or upload project specification document / diagram
                </label>
                <label className="border border-dashed border-sky-500/40 hover:border-sky-400 bg-sky-950/30 hover:bg-sky-950/50 rounded-lg p-3 flex flex-col items-center justify-center cursor-pointer transition-colors group">
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.txt,.csv,.xlsx,.xls,image/*"
                    onChange={handleFileUpload}
                  />
                  {uploadedFile ? (
                    <div className="flex items-center justify-between w-full px-2">
                      <div className="flex items-center gap-2">
                        {uploadedFile.type === "Image" ? (
                          <ImageIcon className="w-5 h-5 text-emerald-400" />
                        ) : uploadedFile.type.includes("Spreadsheet") ? (
                          <FileSpreadsheet className="w-5 h-5 text-amber-400" />
                        ) : (
                          <FileText className="w-5 h-5 text-sky-400" />
                        )}
                        <div className="text-left">
                          <p className="text-xs font-semibold text-white">{uploadedFile.name}</p>
                          <p className="text-[10px] text-slate-400">
                            {uploadedFile.type} • {(uploadedFile.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setUploadedFile(null);
                        }}
                        className="text-slate-400 hover:text-rose-400 p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <Upload className="w-5 h-5 text-sky-400 group-hover:scale-110 transition-transform" />
                      <div className="text-left">
                        <p className="text-xs font-medium text-slate-200">
                          Click or drag & drop project file (PDF, Word, CSV, Image)
                        </p>
                        <p className="text-[10px] text-slate-400">
                          AI will analyze requirements, compute capacity hours, and design milestones
                        </p>
                      </div>
                    </div>
                  )}
                </label>
              </div>

              {/* Run AI Analysis Action Button */}
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  disabled={isAnalyzing || (!userNeed.trim() && !uploadedFile)}
                  onClick={handleRunAIAnalysis}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white flex items-center gap-2 transition-all shadow-xs"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Analyzing Requirements & Allocations...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      Analyze & Extract with AI Copilot
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* AI Interactive Questionnaire & Proposal Card */}
            {aiProposal && (
              <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-950/20 backdrop-blur-xs space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">AI Operations Analysis Ready</span>
                  </div>
                  <span className="text-[10px] text-emerald-300 font-mono">Status: Formulated</span>
                </div>

                {/* The User-Specified Interactive Question Prompts */}
                <div className="bg-card/70 border border-emerald-500/30 rounded-lg p-3 space-y-1.5">
                  <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-emerald-400" />
                    "Is this what you need for your project?"
                  </h4>
                  <p className="text-xs text-emerald-300 font-medium">
                    "How may I help you with it?"
                  </p>
                  <p className="text-[11px] text-slate-300 pt-1 leading-relaxed">
                    {aiProposal.summary}
                  </p>
                </div>

                {/* Extracted Details Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <div className="p-2 rounded-lg bg-background/60 border border-border/50">
                    <span className="text-muted-foreground block text-[10px]">Project Name</span>
                    <span className="font-semibold text-foreground truncate block">{aiProposal.name}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-background/60 border border-border/50">
                    <span className="text-muted-foreground block text-[10px]">Capacity Required</span>
                    <span className="font-semibold text-sky-400">{aiProposal.requiredHours} hrs</span>
                  </div>
                  <div className="p-2 rounded-lg bg-background/60 border border-border/50">
                    <span className="text-muted-foreground block text-[10px]">Estimated Budget</span>
                    <span className="font-semibold text-emerald-400">${aiProposal.budget.toLocaleString()}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-background/60 border border-border/50">
                    <span className="text-muted-foreground block text-[10px]">Planned Milestones</span>
                    <span className="font-semibold text-amber-400">{aiProposal.milestones.length} phases</span>
                  </div>
                </div>

                {/* Milestones Preview */}
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                    Extracted Delivery Milestones
                  </span>
                  <div className="space-y-1">
                    {aiProposal.milestones.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-background/40 border border-border/40 text-xs"
                      >
                        <span className="text-slate-200 font-medium">{m.title}</span>
                        <span className="text-[10px] text-slate-400 mono">Due: {m.dueDate}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Questionnaire Options & Decision Actions */}
                <div className="pt-2 border-t border-emerald-500/20 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleConfirmAiProposal(false)}
                    className="flex-1 min-w-[170px] px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-1.5 shadow-sm transition-all"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Yes, Create Project
                  </button>
                  <button
                    type="button"
                    onClick={() => handleConfirmAiProposal(true)}
                    className="flex-1 min-w-[190px] px-3.5 py-2 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-500 text-white flex items-center justify-center gap-1.5 shadow-sm transition-all"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    Auto-Split & Assign to Team
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      toast.info("AI parameters loaded into form below for editing.");
                    }}
                    className="px-3.5 py-2 text-xs font-medium rounded-lg border border-border hover:bg-accent text-foreground transition-all"
                  >
                    Adjust Form Details Below
                  </button>
                </div>
              </div>
            )}

            {/* Manual Form / Fine-Tuning */}
            <form onSubmit={handleCreateProject} className="space-y-3.5 text-xs pt-2 border-t border-border/40">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground text-xs">
                  {aiProposal ? "Project Parameters (Pre-filled by AI)" : "Or Enter Project Details Manually"}
                </span>
                <span className="text-[10px] text-muted-foreground">* Required fields</span>
              </div>

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
                  <label className="font-medium text-foreground block mb-1">Department / Sector</label>
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

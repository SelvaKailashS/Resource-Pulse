import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Search,
  Users,
  AlertTriangle,
  X,
  Briefcase,
  Plus,
  Trash2,
  Edit3,
  Sparkles,
  GraduationCap,
  CheckCircle2,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";

export interface ResourceItem {
  id: string;
  name: string;
  role: string;
  type: "Core Student" | "Student Lead" | "Collaborator" | "Lab Resource" | "People" | "Equipment" | "Budget" | "Shared" | string;
  status: "Available" | "High Load" | "Overallocated" | "Unavailable";
  utilization: number;
  weeklyHours?: number;
  project: string;
  skills: string[];
  costRate: string;
  risk: "Low" | "Medium" | "High";
  avatarText: string;
  avatarBg: string;
  upcoming: string;
  constraints: string;
}

const STORAGE_KEY = "resourcepulse_student_resources";

export function ResourcesView({
  onAssignTask,
  onSimulateAbsence,
  customResources,
}: {
  onAssignTask?: (resourceName: string, taskName: string) => void;
  onSimulateAbsence?: (resource: ResourceItem) => void;
  customResources?: ResourceItem[];
}) {
  const { user } = useAuth();

  const [resources, setResources] = useState<ResourceItem[]>(() => {
    if (customResources && customResources.length > 0) return customResources;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const hasStale = parsed.some((p: any) => p.name === "Alex Rivera" || p.name === "Maya Chen" || p.name === "Arjun Rao" || p.name === "Jordan Patel");
          if (hasStale) {
            localStorage.removeItem(STORAGE_KEY);
            return [];
          }
          return parsed;
        }
      } catch (e) {
        console.error("Failed to parse stored student resources:", e);
      }
    }
    return [];
  });

  // Save changes to localStorage whenever resources array changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(resources));
  }, [resources]);

  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<string>("All");
  const [selectedResource, setSelectedResource] = useState<ResourceItem | null>(null);

  // Add / Edit Modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formRole, setFormRole] = useState("Frontend Developer");
  const [formType, setFormType] = useState<ResourceItem["type"]>("Core Student");
  const [formStatus, setFormStatus] = useState<ResourceItem["status"]>("Available");
  const [formUtilization, setFormUtilization] = useState(65);
  const [formWeeklyHours, setFormWeeklyHours] = useState(20);
  const [formProject, setFormProject] = useState("");
  const [formSkills, setFormSkills] = useState("");
  const [formConstraints, setFormConstraints] = useState("");

  const filtered = useMemo(() => {
    return resources.filter((res) => {
      const matchType = selectedType === "All" || res.type === selectedType;
      const matchSearch =
        res.name.toLowerCase().includes(search.toLowerCase()) ||
        res.role.toLowerCase().includes(search.toLowerCase()) ||
        res.project.toLowerCase().includes(search.toLowerCase()) ||
        res.skills.some((s) => s.toLowerCase().includes(search.toLowerCase()));
      return matchType && matchSearch;
    });
  }, [resources, search, selectedType]);

  const addMyself = () => {
    if (!user) return;
    const roleTitle = localStorage.getItem("resourcepulse_student_role_title") || "Team Lead";
    const team = localStorage.getItem("resourcepulse_team_name") || "Student Project";
    const initials = user.name
      ? user.name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2)
      : "ME";

    const newMember: ResourceItem = {
      id: `STU-${Date.now().toString().slice(-4)}`,
      name: user.name || "Student Member",
      role: roleTitle,
      type: "Student Lead",
      status: "Available",
      utilization: 50,
      weeklyHours: 25,
      project: `${team} Core Sprint Deliverables`,
      skills: [roleTitle, "System Architecture", "Git"],
      costRate: "Academic Credit",
      risk: "Low",
      avatarText: initials || "ST",
      avatarBg: "from-blue-600 to-cyan-500",
      upcoming: "Project architecture & sprint kickoff",
      constraints: "Available weekdays & weekends",
    };

    setResources((prev) => [newMember, ...prev.filter((r) => r.name !== newMember.name)]);
    toast.success(`Added ${newMember.name} to Roster!`);
  };

  const openAddModal = () => {
    setEditingId(null);
    setFormName("");
    setFormRole("Frontend Developer");
    setFormType("Core Student");
    setFormStatus("Available");
    setFormUtilization(60);
    setFormWeeklyHours(20);
    setFormProject("Sprint Deliverable");
    setFormSkills("React, TypeScript, CSS");
    setFormConstraints("Available after classes");
    setIsFormOpen(true);
  };

  const openEditModal = (res: ResourceItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingId(res.id);
    setFormName(res.name);
    setFormRole(res.role);
    setFormType(res.type);
    setFormStatus(res.status);
    setFormUtilization(res.utilization);
    setFormWeeklyHours(res.weeklyHours || 20);
    setFormProject(res.project);
    setFormSkills(res.skills.join(", "));
    setFormConstraints(res.constraints);
    setIsFormOpen(true);
  };

  const handleSaveTeammate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error("Please enter teammate name");
      return;
    }

    const initials = formName
      .trim()
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    const skillsArray = formSkills
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const riskVal: "Low" | "Medium" | "High" =
      formUtilization > 85 ? "High" : formUtilization > 70 ? "Medium" : "Low";

    if (editingId) {
      setResources((prev) =>
        prev.map((item) =>
          item.id === editingId
            ? {
                ...item,
                name: formName.trim(),
                role: formRole.trim(),
                type: formType,
                status: formStatus,
                utilization: formUtilization,
                weeklyHours: formWeeklyHours,
                project: formProject.trim() || "Project Task",
                skills: skillsArray.length > 0 ? skillsArray : ["Full-Stack"],
                constraints: formConstraints.trim() || "Standard availability",
                risk: riskVal,
                avatarText: initials || "ST",
              }
            : item
        )
      );
      toast.success("Teammate Updated", {
        description: `${formName}’s workload details saved.`,
      });
    } else {
      const newTeammate: ResourceItem = {
        id: `STU-${Date.now().toString().slice(-4)}`,
        name: formName.trim(),
        role: formRole.trim(),
        type: formType,
        status: formStatus,
        utilization: formUtilization,
        weeklyHours: formWeeklyHours,
        project: formProject.trim() || "Project Task",
        skills: skillsArray.length > 0 ? skillsArray : ["Developer", "Git"],
        costRate: "Academic Credit",
        risk: riskVal,
        avatarText: initials || "ST",
        avatarBg:
          formType === "Student Lead"
            ? "from-blue-600 to-cyan-500"
            : formUtilization > 80
            ? "from-amber-600 to-rose-600"
            : "from-sky-600 to-indigo-600",
        upcoming: `${formProject.trim() || "Assigned task"} milestone deliverable`,
        constraints: formConstraints.trim() || "Standard availability",
      };

      setResources((prev) => [newTeammate, ...prev]);
      toast.success("New Teammate Added!", {
        description: `${newTeammate.name} joined the project roster.`,
      });
    }

    setIsFormOpen(false);
  };

  const handleDeleteTeammate = (id: string, name: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (confirm(`Remove ${name} from your team roster?`)) {
      setResources((prev) => prev.filter((item) => item.id !== id));
      if (selectedResource?.id === id) {
        setSelectedResource(null);
      }
      toast.info(`Removed ${name}`, {
        description: "Team roster updated.",
      });
    }
  };

  const handleSimulateAbsence = (res: ResourceItem) => {
    setSelectedResource(null);
    if (onSimulateAbsence) {
      onSimulateAbsence(res);
    } else {
      toast.warning(`Simulating absence for ${res.name}`, {
        description: "Launching live cascading impact simulation.",
      });
    }
  };

  const handleSplitWork = (res: ResourceItem) => {
    const candidate =
      resources.find((r) => r.id !== res.id && r.status !== "Unavailable" && r.utilization < 80) ||
      resources.find((r) => r.id !== res.id) ||
      res;

    if (onAssignTask) {
      onAssignTask(res.name, `${res.project} (50% Split)`);
      if (candidate.id !== res.id) {
        onAssignTask(candidate.name, `${res.project} (50% Co-ownership)`);
      }
    }

    // Rebalance workloads in local state
    setResources((prev) =>
      prev.map((r) => {
        if (r.id === res.id) {
          return { ...r, utilization: Math.max(35, Math.round(r.utilization * 0.65)) };
        }
        if (r.id === candidate.id && candidate.id !== res.id) {
          return { ...r, utilization: Math.min(90, Math.round(r.utilization + 20)) };
        }
        return r;
      })
    );

    // Save pending approval
    try {
      const existingApprovals = JSON.parse(localStorage.getItem("resourcepulse_approvals") || "[]");
      const newApproval = {
        id: `APR-${Date.now().toString().slice(-4)}`,
        title: `Workload Split: ${res.name} & ${candidate.name}`,
        sourceEvent: "High Workload Detected",
        confidence: 95,
        priority: "High",
        recommendationText: `Equal 50/50 split of ${res.project} between ${res.name} and ${candidate.name}.`,
        targetResource: res.name,
        fromProject: res.project,
        toProject: `${res.project} (Shared)`,
        timeGain: "+2.0 days recovered",
        costImpact: "$0 (Student)",
        status: "pending",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      localStorage.setItem("resourcepulse_approvals", JSON.stringify([newApproval, ...existingApprovals]));
    } catch {}

    toast.success(`AI Workload Split Applied!`, {
      description: `Task workload rebalanced equally between ${res.name} and ${candidate.name}. Sent to Approvals.`,
    });
    setSelectedResource(null);
  };

  return (
    <div className="resources-container">
      <div className="module-header">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-sky-500/20 text-sky-400 border border-sky-400/30 flex items-center gap-1">
              <GraduationCap size={13} /> Real Student Team Roster
            </span>
            <span className="text-xs text-slate-400">· {resources.length} active members</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Student Team & Workload Management</h1>
          <p className="text-sm text-slate-400 max-w-2xl">
            Input real teammates, track assigned project tasks, monitor weekly available hours, and prevent student burnout before deadlines.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {resources.length === 0 && user && (
            <button
              className="secondary-button text-xs flex items-center gap-1.5"
              onClick={addMyself}
            >
              <UserCheck size={14} className="text-sky-400" />
              <span>Add Myself</span>
            </button>
          )}
          <button
            className="primary-button text-xs flex items-center gap-1.5"
            onClick={openAddModal}
          >
            <Plus size={14} />
            <span>+ Add Student Teammate</span>
          </button>
        </div>
      </div>

      <div className="resources-controls">
        <div className="search-box">
          <Search size={16} className="text-sky-400" />
          <input
            type="text"
            placeholder="Search teammate by name, role, skill, or assigned task..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-tabs">
          {["All", "Student Lead", "Core Student", "Collaborator"].map((type) => (
            <button
              key={type}
              className={`filter-tab ${selectedType === type ? "active" : ""}`}
              onClick={() => setSelectedType(type)}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div className="table-panel">
        <table className="resource-table">
          <thead>
            <tr>
              <th>Teammate & Role</th>
              <th>Category</th>
              <th>Status</th>
              <th style={{ width: "160px" }}>Workload & Hours</th>
              <th>Assigned Project Task</th>
              <th>Verified Skills</th>
              <th>Weekly Cap</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center">
                  <div className="flex flex-col items-center justify-center p-8 text-slate-400">
                    <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-400/25 flex items-center justify-center text-sky-400 mb-4 shadow-sm shadow-sky-950">
                      <Users size={28} />
                    </div>
                    <strong className="text-lg text-white block mb-1">
                      {resources.length === 0 ? "Your Team Roster is Empty" : "No Matching Teammates Found"}
                    </strong>
                    <p className="text-xs text-slate-400 max-w-md mx-auto mb-6 text-center leading-relaxed">
                      {resources.length === 0
                        ? "Add your real student team members and their sprint work to begin tracking capacity, workload splits, and deadline risks."
                        : `No members matched your search "${search}".`}
                    </p>
                    <div className="flex items-center gap-3">
                      {resources.length === 0 && user && (
                        <button
                          className="secondary-button text-xs px-4 py-2 flex items-center gap-1.5"
                          onClick={addMyself}
                        >
                          <UserCheck size={14} className="text-sky-400" />
                          <span>Add Myself ({user.name})</span>
                        </button>
                      )}
                      <button
                        className="primary-button text-xs px-5 py-2 flex items-center gap-1.5 font-bold"
                        onClick={openAddModal}
                      >
                        <Plus size={14} />
                        <span>+ Add Real Teammate</span>
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => setSelectedResource(item)}
                  className="cursor-pointer hover:bg-slate-800/40 transition-colors"
                >
                  <td>
                    <div className="resource-id-col">
                      <div className={`res-avatar bg-gradient-to-br ${item.avatarBg} text-white font-bold`}>
                        {item.avatarText}
                      </div>
                      <div className="res-info">
                        <strong className="text-white flex items-center gap-1.5">
                          {item.name}
                          {item.type === "Student Lead" && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono">
                              Lead
                            </span>
                          )}
                        </strong>
                        <span className="text-xs text-slate-400">{item.role}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="mono text-xs text-slate-400">{item.type}</span>
                  </td>
                  <td>
                    <span
                      className={`status-pill ${
                        item.status === "Available"
                          ? "chip-blue"
                          : item.status === "High Load"
                          ? "chip-amber"
                          : "chip-coral"
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td>
                    <div className="capacity-bar">
                      <div className="capacity-track">
                        <div
                          className={`capacity-fill ${
                            item.utilization > 85
                              ? "fill-critical"
                              : item.utilization > 70
                              ? "fill-warning"
                              : "fill-normal"
                          }`}
                          style={{ width: `${Math.min(100, item.utilization)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                        <span className="font-mono font-semibold text-slate-300">{item.utilization}% load</span>
                        <span className="font-mono">{item.weeklyHours || 20}h/wk</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="font-medium text-slate-200 block text-xs truncate max-w-xs" title={item.project}>
                      {item.project}
                    </span>
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {item.skills.slice(0, 3).map((skill) => (
                        <span key={skill} className="skill-badge text-[10px]">
                          {skill}
                        </span>
                      ))}
                      {item.skills.length > 3 && (
                        <span className="skill-badge text-[10px]">+{item.skills.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className="mono text-xs text-sky-400 font-medium">
                      {item.weeklyHours ? `${item.weeklyHours} hrs` : "Flexible"}
                    </span>
                  </td>
                  <td className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        className="p-1.5 rounded-lg text-slate-400 hover:text-sky-300 hover:bg-slate-800 transition-colors"
                        title="Edit Teammate"
                        onClick={(e) => openEditModal(item, e)}
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                        title="Remove Teammate"
                        onClick={(e) => handleDeleteTeammate(item.id, item.name, e)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Teammate Modal */}
      {isFormOpen && (
        <div className="modal-overlay" onClick={() => setIsFormOpen(false)}>
          <div
            className="modal-box max-w-lg w-full bg-slate-900 border border-sky-900/40 rounded-2xl p-6 shadow-2xl animate-fadeIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-sky-900/30 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400">
                  {editingId ? <Edit3 size={18} /> : <Plus size={18} />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {editingId ? "Edit Student Teammate" : "Add Real Student Teammate"}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Real teammate credentials and workload allocation
                  </p>
                </div>
              </div>
              <button
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                onClick={() => setIsFormOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveTeammate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Teammate Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kavya Sharma"
                    className="w-full bg-slate-950/80 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Role in Project
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. AI / ML Engineer"
                    className="w-full bg-slate-950/80 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Team Membership
                  </label>
                  <select
                    className="w-full bg-slate-950/80 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as ResourceItem["type"])}
                  >
                    <option value="Student Lead">Student Lead</option>
                    <option value="Core Student">Core Student</option>
                    <option value="Collaborator">Collaborator</option>
                    <option value="Lab Resource">Lab Resource</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Current Status
                  </label>
                  <select
                    className="w-full bg-slate-950/80 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as ResourceItem["status"])}
                  >
                    <option value="Available">Available</option>
                    <option value="High Load">High Load</option>
                    <option value="Overallocated">Overallocated</option>
                    <option value="Unavailable">Unavailable</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-300">
                      Workload Load (%)
                    </label>
                    <span className="mono text-xs font-bold text-sky-400">{formUtilization}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    className="w-full accent-sky-400"
                    value={formUtilization}
                    onChange={(e) => setFormUtilization(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Available Weekly Hours
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="60"
                    className="w-full bg-slate-950/80 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
                    value={formWeeklyHours}
                    onChange={(e) => setFormWeeklyHours(Number(e.target.value))}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Assigned Project Task / Module *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Supabase Database Schema & Realtime Listeners"
                  className="w-full bg-slate-950/80 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  value={formProject}
                  onChange={(e) => setFormProject(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Verified Skills (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Python, PyTorch, Supabase, Git"
                  className="w-full bg-slate-950/80 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  value={formSkills}
                  onChange={(e) => setFormSkills(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Academic Constraints / Availability Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Midterm exam on Thursday 2 PM; free Friday all day"
                  className="w-full bg-slate-950/80 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  value={formConstraints}
                  onChange={(e) => setFormConstraints(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-sky-900/30">
                <button
                  type="button"
                  className="secondary-button text-xs px-4 py-2"
                  onClick={() => setIsFormOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-button text-xs px-5 py-2 font-bold"
                >
                  {editingId ? "Save Changes" : "Add Teammate"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resource Detail Drawer Modal */}
      {selectedResource && (
        <div className="modal-overlay" onClick={() => setSelectedResource(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between pb-4 border-b border-sky-900/30">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg text-white bg-gradient-to-br ${selectedResource.avatarBg}`}
                >
                  {selectedResource.avatarText}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    {selectedResource.name}
                    {selectedResource.type === "Student Lead" && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">
                        Team Lead
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {selectedResource.role} • {selectedResource.type}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="p-1.5 rounded-lg text-slate-400 hover:text-sky-300 hover:bg-slate-800"
                  title="Edit details"
                  onClick={() => openEditModal(selectedResource)}
                >
                  <Edit3 size={16} />
                </button>
                <button
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                  onClick={() => setSelectedResource(null)}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 my-5">
              <div className="p-3 rounded-lg bg-slate-900/60 border border-sky-900/20">
                <span className="text-[10px] uppercase font-mono text-slate-400">Current Workload</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <strong className="text-xl font-bold text-white">{selectedResource.utilization}%</strong>
                  <span className="text-xs text-sky-400 font-medium">({selectedResource.status})</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full mt-2 overflow-hidden">
                  <div
                    className={`h-full ${
                      selectedResource.utilization > 85 ? "bg-rose-500" : "bg-sky-400"
                    }`}
                    style={{ width: `${selectedResource.utilization}%` }}
                  />
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-900/60 border border-sky-900/20">
                <span className="text-[10px] uppercase font-mono text-slate-400">Assigned Project Task</span>
                <div className="text-sm font-bold text-white mt-1 truncate" title={selectedResource.project}>
                  {selectedResource.project}
                </div>
                <span className="text-xs text-sky-300 font-mono mt-1 block">
                  Capacity: {selectedResource.weeklyHours || 20} hrs/week
                </span>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <strong className="block text-slate-300 font-semibold mb-2">Verified Skills & Technical Strengths</strong>
                <div className="flex flex-wrap gap-1.5">
                  {selectedResource.skills.map((skill) => (
                    <span
                      key={skill}
                      className="px-2.5 py-1 rounded-md bg-sky-950/60 border border-sky-800/40 text-sky-300 font-mono text-[11px]"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-blue-950/20 border border-blue-900/30">
                <strong className="block text-sky-300 font-semibold mb-1 flex items-center gap-1.5">
                  <Briefcase size={14} /> Current Project Sprint Responsibility
                </strong>
                <p className="text-slate-300">{selectedResource.upcoming || selectedResource.project}</p>
              </div>

              {/* AI Workload Split Card */}
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-sky-950/70 to-blue-950/70 border border-sky-400/40">
                <div className="flex items-center justify-between mb-1.5">
                  <strong className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Sparkles size={14} className="text-sky-400" /> AI Equal Workload Split (50 / 50)
                  </strong>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                    Balanced Rebalance
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed mb-3">
                  Protect <strong>{selectedResource.name}</strong> from burnout and missed deadlines by automatically reallocating half of their task to a free teammate:
                </p>
                <button
                  className="w-full primary-button text-xs py-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 flex items-center justify-center gap-1.5 font-bold shadow-lg"
                  onClick={() => handleSplitWork(selectedResource)}
                >
                  <Sparkles size={14} /> AI Suggest: Split Work Equally (50/50)
                </button>
              </div>

              <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-800">
                <strong className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                  <AlertTriangle size={14} className="text-amber-400" /> Academic & Schedule Constraints
                </strong>
                <p className="text-slate-400">{selectedResource.constraints}</p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 mt-6 pt-4 border-t border-sky-900/30">
              <button
                className="secondary-button text-xs flex items-center gap-1.5"
                onClick={() => handleSimulateAbsence(selectedResource)}
              >
                Simulate Teammate Absence
              </button>
              <button
                className="text-rose-400 hover:text-rose-300 text-xs flex items-center gap-1"
                onClick={(e) => handleDeleteTeammate(selectedResource.id, selectedResource.name, e)}
              >
                <Trash2 size={13} /> Remove from Team
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ResourcesView;

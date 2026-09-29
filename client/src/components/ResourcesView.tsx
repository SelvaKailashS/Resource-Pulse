import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { recordTeamMember } from "@/lib/supabase";
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
  Copy,
  Link as LinkIcon,
  Share2,
  Upload,
  Download,
  FileSpreadsheet,
  Mail,
  MessageCircle,
  Send,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

export interface ResourceItem {
  id: string;
  name: string;
  role: string;
  type: "Team Lead" | "Core Member" | "Collaborator" | "Specialist" | "Partner / External" | "Shared Resource" | string;
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
  email?: string;
  phone?: string;
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
        console.error("Failed to parse stored resources:", e);
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
  const [modalTab, setModalTab] = useState<"invite" | "manual">("invite");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formRole, setFormRole] = useState("Lead Engineer / Specialist");
  const [formType, setFormType] = useState<ResourceItem["type"]>("Core Member");
  const [formStatus, setFormStatus] = useState<ResourceItem["status"]>("Available");
  const [formUtilization, setFormUtilization] = useState(65);
  const [formWeeklyHours, setFormWeeklyHours] = useState(40);
  const [formProject, setFormProject] = useState("");
  const [formSkills, setFormSkills] = useState("");
  const [formConstraints, setFormConstraints] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");

  // Batch Import state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [previewImportItems, setPreviewImportItems] = useState<ResourceItem[]>([]);
  const [importMode, setImportMode] = useState<"append" | "replace">("append");

  const currentTeamName = localStorage.getItem("resourcepulse_team_name") || "Operations Team";
  const teamCode = localStorage.getItem("resourcepulse_team_code") || "RP-7842";
  const inviteLink = typeof window !== "undefined"
    ? `${window.location.origin}/?join=${teamCode}&team=${encodeURIComponent(currentTeamName)}`
    : "";

  const sendWhatsAppNotification = (res: ResourceItem, contextNote?: string) => {
    const text =
      `⚡ *Resource Pulse Operations Telemetry*\n\n` +
      `Hello ${res.name},\n` +
      (contextNote ? `📢 *Notice:* ${contextNote}\n\n` : "") +
      `📋 *Assigned Deliverable:* ${res.project}\n` +
      `⏱ *Weekly Capacity:* ${res.weeklyHours || 40} hrs (${res.utilization}% load)\n` +
      `🚦 *Status:* ${res.status}\n` +
      `🎯 *Risk Level:* ${res.risk}\n\n` +
      `_Automated AI Operations Dispatch - Resource Pulse_`;

    if (res.phone) {
      const cleanPhone = res.phone.replace(/[^0-9]/g, "");
      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, "_blank");
      toast.success(`WhatsApp dispatch opened for ${res.name}`, {
        description: `Alert prepared for ${cleanPhone}.`,
      });
    } else {
      navigator.clipboard.writeText(text);
      window.open(`https://web.whatsapp.com/`, "_blank");
      toast.info(`WhatsApp Alert Copied for ${res.name}`, {
        description: "Text copied to clipboard. Opening WhatsApp Web...",
      });
    }
  };

  const sendEmailNotification = (res: ResourceItem, contextNote?: string) => {
    const subject = `[Resource Pulse] Sprint Telemetry: ${res.project}`;
    const body =
      `Hello ${res.name},\n\n` +
      (contextNote ? `Notice: ${contextNote}\n\n` : "") +
      `Here is your latest sprint telemetry from Resource Pulse:\n\n` +
      `• Assigned Deliverable: ${res.project}\n` +
      `• Weekly Available Capacity: ${res.weeklyHours || 40} hours\n` +
      `• Current Workload: ${res.utilization}%\n` +
      `• Milestone Status: ${res.status}\n` +
      `• Delivery Risk: ${res.risk}\n\n` +
      `Please ensure upcoming milestones are on track or flag blockers in the team workspace.\n\n` +
      `Best regards,\nResource Pulse Operations`;

    if (res.email) {
      window.location.href = `mailto:${res.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      toast.success(`Email client opened for ${res.name}`);
    } else {
      navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
      toast.info("Email briefing copied to clipboard!", {
        description: `No email address saved for ${res.name}. Text copied to clipboard.`,
      });
    }
  };

  const downloadSampleCSV = () => {
    const csvContent =
      "Name,Role,Workload,WeeklyHours,Deliverable,Skills,Email,Phone\n" +
      "Kailash,Team Lead,55,40,Academic Research & Lab Milestone,Leadership; Python; Cloud,kailash@university.edu,+919876543210\n" +
      "Priya Sharma,Data Scientist,65,40,ML Model Evaluation & Pipeline,PyTorch; NumPy; SQL,priya@university.edu,+919876543211\n" +
      "Rohan Verma,Backend Engineer,50,40,Supabase & TRPC API Integration,TypeScript; Node.js; Docker,rohan@university.edu,+919876543212\n" +
      "Ananya Iyer,UI/UX Researcher,45,35,User Journey & Usability Testing,Figma; React; Wireframing,ananya@university.edu,+919876543213\n";

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "resourcepulse_team_roster_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV Template Downloaded", {
      description: "Fill this template in Excel/Sheets and re-upload here.",
    });
  };

  const downloadSampleJSON = () => {
    const sampleData = [
      {
        name: "Kailash",
        role: "Team Lead",
        utilization: 55,
        weeklyHours: 40,
        project: "Academic Research & Lab Milestone",
        skills: ["Leadership", "Python", "Cloud"],
        email: "kailash@university.edu",
        phone: "+919876543210"
      },
      {
        name: "Priya Sharma",
        role: "Data Scientist",
        utilization: 65,
        weeklyHours: 40,
        project: "ML Model Evaluation & Pipeline",
        skills: ["PyTorch", "NumPy", "SQL"],
        email: "priya@university.edu",
        phone: "+919876543211"
      }
    ];

    const blob = new Blob([JSON.stringify(sampleData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "resourcepulse_team_roster_template.json");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("JSON Template Downloaded");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) return;

        let parsedItems: ResourceItem[] = [];

        if (file.name.endsWith(".json")) {
          const json = JSON.parse(text);
          if (Array.isArray(json)) {
            parsedItems = json.map((item: any, idx: number) => {
              const util = Number(item.utilization || item.workload || 50);
              const weekly = Number(item.weeklyHours || item.capacity || 40);
              const initials = (item.name || "TM")
                .split(" ")
                .map((n: string) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2);
              return {
                id: item.id || `MEM-IMPORT-${idx + 1}-${Date.now().toString().slice(-4)}`,
                name: String(item.name || `Teammate ${idx + 1}`),
                role: String(item.role || "Specialist"),
                type: String(item.type || (idx === 0 && resources.length === 0 ? "Team Lead" : "Core Member")),
                status: (util > 85 ? "High Load" : "Available") as any,
                utilization: util,
                weeklyHours: weekly,
                project: String(item.project || item.deliverable || item.task || "Assigned Deliverable"),
                skills: Array.isArray(item.skills)
                  ? item.skills
                  : typeof item.skills === "string"
                  ? item.skills.split(/[;,]/).map((s: string) => s.trim()).filter(Boolean)
                  : ["Operations"],
                costRate: "Internal Resource",
                risk: util > 85 ? "High" : util > 70 ? "Medium" : "Low",
                avatarText: initials || "TM",
                avatarBg: util > 80 ? "from-amber-600 to-rose-600" : "from-sky-600 to-indigo-600",
                upcoming: `${item.project || "Deliverable"} on schedule`,
                constraints: item.constraints || "Standard availability",
                email: item.email || undefined,
                phone: item.phone || undefined,
              };
            });
          }
        } else {
          // CSV Parser
          const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
          if (lines.length > 1) {
            const rawHeaders = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/[^a-z0-9]/g, ""));
            parsedItems = lines.slice(1).map((line, idx) => {
              const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
              const row: Record<string, string> = {};
              rawHeaders.forEach((header, colIdx) => {
                row[header] = cols[colIdx] || "";
              });

              const name = row.name || `Teammate ${idx + 1}`;
              const role = row.role || "Specialist";
              const util = Number(row.workload || row.utilization || 50);
              const weekly = Number(row.weeklyhours || row.capacity || 40);
              const project = row.deliverable || row.project || row.task || "Sprint Deliverable";
              const skills = (row.skills || "Collaboration")
                .split(/[;]/)
                .map((s) => s.trim())
                .filter(Boolean);
              const email = row.email || undefined;
              const phone = row.phone || row.whatsapp || undefined;

              const initials = name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2);

              return {
                id: `MEM-CSV-${idx + 1}-${Date.now().toString().slice(-4)}`,
                name,
                role,
                type: idx === 0 && resources.length === 0 ? "Team Lead" : "Core Member",
                status: util > 85 ? "High Load" : "Available",
                utilization: util,
                weeklyHours: weekly,
                project,
                skills: skills.length > 0 ? skills : ["Operations"],
                costRate: "Internal Resource",
                risk: util > 85 ? "High" : util > 70 ? "Medium" : "Low",
                avatarText: initials || "TM",
                avatarBg: util > 80 ? "from-amber-600 to-rose-600" : "from-sky-600 to-indigo-600",
                upcoming: `${project} on schedule`,
                constraints: "Standard availability",
                email,
                phone,
              };
            });
          }
        }

        if (parsedItems.length === 0) {
          toast.error("Could not parse file", {
            description: "Please check your CSV/JSON format or download our template.",
          });
          return;
        }

        setPreviewImportItems(parsedItems);
        toast.info(`Found ${parsedItems.length} members`, {
          description: "Review preview and confirm import.",
        });
      } catch (err: any) {
        toast.error("Import failed", { description: err.message });
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = () => {
    if (previewImportItems.length === 0) return;

    if (importMode === "replace") {
      setResources(previewImportItems);
    } else {
      setResources((prev) => {
        const existingNames = new Set(prev.map((p) => p.name.toLowerCase()));
        const uniqueNew = previewImportItems.filter((p) => !existingNames.has(p.name.toLowerCase()));
        return [...prev, ...uniqueNew];
      });
    }

    // Sync to Supabase in background
    previewImportItems.forEach((item) => {
      void recordTeamMember({
        id: item.id,
        name: item.name,
        role: item.role,
        project: item.project,
        weeklyHours: item.weeklyHours,
        utilization: item.utilization,
        status: item.status,
      });
    });

    toast.success(`Successfully imported ${previewImportItems.length} teammates!`, {
      description: "Workload telemetry and deliverable tracking are active.",
    });

    setPreviewImportItems([]);
    setIsImportModalOpen(false);
  };

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
    const team = localStorage.getItem("resourcepulse_team_name") || "Operations Team";
    const initials = user.name
      ? user.name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2)
      : "ME";

    const newMember: ResourceItem = {
      id: `MEM-${Date.now().toString().slice(-4)}`,
      name: user.name || "Team Member",
      role: roleTitle,
      type: "Team Lead",
      status: "Available",
      utilization: 50,
      weeklyHours: 40,
      project: "Project Scope & Execution",
      skills: [roleTitle],
      costRate: "Internal Resource",
      risk: "Low",
      avatarText: initials || "TL",
      avatarBg: "from-blue-600 to-cyan-500",
      upcoming: "Project architecture & sprint kickoff",
      constraints: "Full availability",
    };

    setResources((prev) => [newMember, ...prev.filter((r) => r.name !== newMember.name)]);
    toast.success(`Added ${newMember.name} to Roster!`);
  };

  const openAddModal = () => {
    setEditingId(null);
    setModalTab("invite");
    setFormName("");
    setFormRole("Lead Engineer / Specialist");
    setFormType("Core Member");
    setFormStatus("Available");
    setFormUtilization(60);
    setFormWeeklyHours(40);
    setFormProject("");
    setFormSkills("");
    setFormConstraints("");
    setFormEmail("");
    setFormPhone("");
    setIsFormOpen(true);
  };

  const openEditModal = (res: ResourceItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingId(res.id);
    setModalTab("manual");
    setFormName(res.name);
    setFormRole(res.role);
    setFormType(res.type);
    setFormStatus(res.status);
    setFormUtilization(res.utilization);
    setFormWeeklyHours(res.weeklyHours || 40);
    setFormProject(res.project);
    setFormSkills(res.skills.join(", "));
    setFormConstraints(res.constraints);
    setFormEmail(res.email || "");
    setFormPhone(res.phone || "");
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
                project: formProject.trim() || "Project Deliverable",
                skills: skillsArray.length > 0 ? skillsArray : ["Specialist"],
                constraints: formConstraints.trim() || "Standard availability",
                risk: riskVal,
                avatarText: initials || "TM",
                email: formEmail.trim() || undefined,
                phone: formPhone.trim() || undefined,
              }
            : item
        )
      );
      void recordTeamMember({
        id: editingId,
        name: formName.trim(),
        role: formRole.trim(),
        project: formProject.trim() || "Project Deliverable",
        weeklyHours: formWeeklyHours,
        utilization: formUtilization,
        status: formStatus,
      });
      toast.success("Teammate Updated", {
        description: `${formName}’s workload details saved.`,
      });
    } else {
      const newTeammate: ResourceItem = {
        id: `MEM-${Date.now().toString().slice(-4)}`,
        name: formName.trim(),
        role: formRole.trim(),
        type: formType,
        status: formStatus,
        utilization: formUtilization,
        weeklyHours: formWeeklyHours,
        project: formProject.trim() || "Project Deliverable",
        skills: skillsArray.length > 0 ? skillsArray : ["Specialist", "Operations"],
        costRate: "Internal Resource",
        risk: riskVal,
        avatarText: initials || "TM",
        avatarBg:
          formType === "Team Lead"
            ? "from-blue-600 to-cyan-500"
            : formUtilization > 80
            ? "from-amber-600 to-rose-600"
            : "from-sky-600 to-indigo-600",
        upcoming: `${formProject.trim() || "Assigned task"} milestone deliverable`,
        constraints: formConstraints.trim() || "Standard availability",
        email: formEmail.trim() || undefined,
        phone: formPhone.trim() || undefined,
      };

      setResources((prev) => [newTeammate, ...prev]);
      void recordTeamMember({
        id: newTeammate.id,
        name: newTeammate.name,
        role: newTeammate.role,
        project: newTeammate.project,
        weeklyHours: newTeammate.weeklyHours,
        utilization: newTeammate.utilization,
        status: newTeammate.status,
      });
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
        costImpact: "$0 (Internal Rebalance)",
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
              <Users size={13} /> Active Team Roster
            </span>
            <span className="text-xs text-slate-400">· {resources.length} active members</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Team & Resource Allocation</h1>
          <p className="text-sm text-slate-400 max-w-2xl">
            Input team members, track deliverables, monitor weekly available hours, and prevent burnout before milestone deadlines.
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
            className="secondary-button text-xs flex items-center gap-1.5 border-sky-500/30 hover:border-sky-400/60"
            onClick={() => setIsImportModalOpen(true)}
            title="Import Organization Roster from CSV or JSON file"
          >
            <Upload size={14} className="text-sky-400" />
            <span>Import CSV / JSON</span>
          </button>
          <button
            className="primary-button text-xs flex items-center gap-1.5"
            onClick={openAddModal}
          >
            <Plus size={14} />
            <span>+ Add Team Member</span>
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
          {["All", "Team Lead", "Core Member", "Collaborator", "Specialist"].map((type) => (
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
                        ? "Add your team members and their deliverables to begin tracking capacity, workload splits, and deadline risks."
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
                        <span>+ Add Team Member</span>
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
                        className="p-1.5 rounded-lg text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40 transition-colors"
                        title="Send WhatsApp Operations Briefing"
                        onClick={(e) => {
                          e.stopPropagation();
                          sendWhatsAppNotification(item);
                        }}
                      >
                        <MessageCircle size={14} />
                      </button>
                      <button
                        className="p-1.5 rounded-lg text-sky-400 hover:text-sky-300 hover:bg-sky-950/40 transition-colors"
                        title="Send Email Telemetry Alert"
                        onClick={(e) => {
                          e.stopPropagation();
                          sendEmailNotification(item);
                        }}
                      >
                        <Mail size={14} />
                      </button>
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
                    {editingId ? "Edit Team Member" : "Add Team Member"}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Team member credentials and workload allocation
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

            {/* Modal Tabs: Invite Link / Team Code vs Manual Entry */}
            {!editingId && (
              <div className="grid grid-cols-2 p-1 bg-slate-950/80 rounded-xl border border-slate-800 mb-5">
                <button
                  type="button"
                  onClick={() => setModalTab("invite")}
                  className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    modalTab === "invite"
                      ? "bg-sky-500/20 text-sky-300 border border-sky-400/30 shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <LinkIcon size={13} />
                  <span>1. Invite Link & Team Code</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModalTab("manual")}
                  className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    modalTab === "manual"
                      ? "bg-sky-500/20 text-sky-300 border border-sky-400/30 shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Users size={13} />
                  <span>2. Add Manually</span>
                </button>
              </div>
            )}

            {modalTab === "invite" && !editingId ? (
              <div className="space-y-4">
                {/* Team Code Card */}
                <div className="p-4 rounded-xl bg-slate-950/90 border border-sky-500/30 flex items-center justify-between shadow-lg">
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block font-bold">
                      Team Workspace Code
                    </span>
                    <strong className="text-2xl font-mono text-sky-400 tracking-wider">
                      {teamCode}
                    </strong>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      Share this code with teammates to join "{currentTeamName}"
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(teamCode);
                      toast.success("Team Code Copied!", {
                        description: `Code ${teamCode} copied to clipboard.`,
                      });
                    }}
                    className="px-3.5 py-2 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-400/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Copy size={14} />
                    <span>Copy Code</span>
                  </button>
                </div>

                {/* Invite Link Card */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono uppercase font-bold text-slate-300 block">
                    Shareable Direct Invite Link
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={inviteLink}
                      className="flex-1 bg-slate-950/90 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-sky-300 font-mono select-all outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(inviteLink);
                        toast.success("Invite Link Copied!", {
                          description: "Teammates can click this link to register directly into your team.",
                        });
                      }}
                      className="primary-button text-xs px-4 py-2 font-bold flex items-center gap-1.5 shrink-0 cursor-pointer"
                    >
                      <LinkIcon size={14} />
                      <span>Copy Link</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    When teammates open this link, your workspace name and code are automatically configured.
                  </p>
                </div>

                {/* Share Announcement Text */}
                <button
                  type="button"
                  onClick={() => {
                    const msg = `Hey! Join our "${currentTeamName}" workspace on ResourcePulse:\nInvite Link: ${inviteLink}\nTeam Code: ${teamCode}`;
                    navigator.clipboard.writeText(msg);
                    toast.success("Invitation Message Copied!", {
                      description: "Paste into WhatsApp, Teams, Slack, or Email to invite your team.",
                    });
                  }}
                  className="w-full py-3 rounded-xl bg-slate-950/80 hover:bg-slate-950 border border-slate-700 hover:border-sky-400/50 text-xs font-semibold text-slate-300 hover:text-white flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Share2 size={15} className="text-sky-400" />
                  <span>Copy Full Message (for WhatsApp / Slack / Email)</span>
                </button>

                <div className="pt-3 border-t border-sky-900/30 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setModalTab("manual")}
                    className="text-xs text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Or add teammate profile manually →</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="secondary-button text-xs px-4 py-2"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
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
                    <option value="Team Lead">Team Lead</option>
                    <option value="Core Member">Core Member</option>
                    <option value="Collaborator">Collaborator</option>
                    <option value="Specialist">Specialist</option>
                    <option value="Shared / Lab Resource">Shared / Lab Resource</option>
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
                  Availability Notes & Constraints
                </label>
                <input
                  type="text"
                  placeholder="e.g. Focus on backend APIs; unavailable Friday afternoon"
                  className="w-full bg-slate-950/80 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  value={formConstraints}
                  onChange={(e) => setFormConstraints(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
                    <Mail size={12} className="text-sky-400" /> Work Email (Optional)
                  </label>
                  <input
                    type="email"
                    placeholder="teammate@company.com"
                    className="w-full bg-slate-950/80 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
                    <MessageCircle size={12} className="text-emerald-400" /> WhatsApp / Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    placeholder="+919876543210"
                    className="w-full bg-slate-950/80 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                  />
                </div>
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
            )}
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

              {/* Automated Operations Telemetry & Alerts */}
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-700/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <strong className="text-xs font-bold text-white flex items-center gap-1.5">
                    <MessageCircle size={14} className="text-emerald-400" /> Automated Telemetry & Alerts
                  </strong>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Active
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Send instant AI operations briefings directly to {selectedResource.name} for newly assigned deliverables, work shifts, or upcoming deadlines.
                </p>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    className="secondary-button text-xs py-2 flex items-center justify-center gap-1.5 border-emerald-500/30 hover:border-emerald-400 hover:bg-emerald-950/20 text-emerald-300 font-semibold"
                    onClick={() => sendWhatsAppNotification(selectedResource)}
                    title="Open WhatsApp with AI operations briefing"
                  >
                    <MessageCircle size={13} className="text-emerald-400" />
                    <span>WhatsApp Alert</span>
                  </button>
                  <button
                    className="secondary-button text-xs py-2 flex items-center justify-center gap-1.5 border-sky-500/30 hover:border-sky-400 hover:bg-sky-950/20 text-sky-300 font-semibold"
                    onClick={() => sendEmailNotification(selectedResource)}
                    title="Open Email client with prefilled milestone telemetry"
                  >
                    <Mail size={13} className="text-sky-400" />
                    <span>Email Alert</span>
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-800">
                <strong className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                  <AlertTriangle size={14} className="text-amber-400" /> Operational & Schedule Constraints
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

      {/* Batch Import Organization Data Modal */}
      {isImportModalOpen && (
        <div className="modal-overlay" onClick={() => setIsImportModalOpen(false)}>
          <div className="modal-box max-w-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-sky-900/30">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400">
                  <Upload size={16} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Import Organization Data</h3>
                  <p className="text-[11px] text-slate-400">Upload CSV or JSON roster with tasks, capacity & contact info</p>
                </div>
              </div>
              <button
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                onClick={() => setIsImportModalOpen(false)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="py-4 space-y-4">
              {/* Template download row */}
              <div className="p-3 rounded-lg bg-sky-950/30 border border-sky-800/40 flex items-center justify-between">
                <div>
                  <strong className="text-xs text-white block">Need a template to get started?</strong>
                  <span className="text-[11px] text-slate-400">Download sample structure with Name, Role, Workload, Deliverable, Email, Phone</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={downloadSampleCSV}
                    className="secondary-button text-[11px] py-1.5 px-2.5 flex items-center gap-1 font-semibold"
                  >
                    <Download size={12} className="text-sky-400" />
                    <span>Sample CSV</span>
                  </button>
                  <button
                    onClick={downloadSampleJSON}
                    className="secondary-button text-[11px] py-1.5 px-2.5 flex items-center gap-1 font-semibold"
                  >
                    <Download size={12} className="text-sky-400" />
                    <span>Sample JSON</span>
                  </button>
                </div>
              </div>

              {/* File upload drag drop zone */}
              <label className="border-2 border-dashed border-slate-700 hover:border-sky-500/60 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-950/40">
                <FileSpreadsheet size={32} className="text-sky-400 mb-2" />
                <span className="text-xs font-semibold text-white">Click or drag & drop CSV or JSON file here</span>
                <span className="text-[11px] text-slate-400 mt-1">Supports UTF-8 .csv or .json files</span>
                <input
                  type="file"
                  accept=".csv,.json,text/csv,application/json"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>

              {/* Preview table if parsed */}
              {previewImportItems.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 size={13} /> {previewImportItems.length} Teammates parsed successfully
                    </span>
                    <div className="flex items-center gap-3 text-xs">
                      <label className="flex items-center gap-1 text-slate-300 cursor-pointer">
                        <input
                          type="radio"
                          name="importMode"
                          checked={importMode === "append"}
                          onChange={() => setImportMode("append")}
                        />
                        <span>Append to roster</span>
                      </label>
                      <label className="flex items-center gap-1 text-slate-300 cursor-pointer">
                        <input
                          type="radio"
                          name="importMode"
                          checked={importMode === "replace"}
                          onChange={() => setImportMode("replace")}
                        />
                        <span>Replace roster</span>
                      </label>
                    </div>
                  </div>

                  <div className="max-h-48 overflow-y-auto border border-slate-800 rounded-lg text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 sticky top-0">
                        <tr>
                          <th className="p-2">Name</th>
                          <th className="p-2">Role</th>
                          <th className="p-2">Load</th>
                          <th className="p-2">Deliverable</th>
                          <th className="p-2">Contact</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {previewImportItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/30">
                            <td className="p-2 text-white font-medium">{item.name}</td>
                            <td className="p-2 text-slate-300">{item.role}</td>
                            <td className="p-2 font-mono text-sky-400">{item.utilization}%</td>
                            <td className="p-2 text-slate-300 truncate max-w-xs">{item.project}</td>
                            <td className="p-2 text-slate-400 text-[10px]">
                              {item.phone || item.email || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-sky-900/30">
              <button
                type="button"
                className="secondary-button text-xs px-4 py-2"
                onClick={() => {
                  setPreviewImportItems([]);
                  setIsImportModalOpen(false);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={previewImportItems.length === 0}
                className="primary-button text-xs px-5 py-2 font-bold disabled:opacity-50"
                onClick={handleConfirmImport}
              >
                Import {previewImportItems.length > 0 ? `${previewImportItems.length} Members` : "Data"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ResourcesView;

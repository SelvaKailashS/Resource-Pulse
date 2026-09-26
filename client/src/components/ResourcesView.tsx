import { useState, useMemo } from "react";
import { Search, Filter, Users, Cpu, Box, DollarSign, Layers, ShieldAlert, CheckCircle2, AlertTriangle, ExternalLink, X, Calendar, Briefcase, Award } from "lucide-react";
import { toast } from "sonner";

export interface ResourceItem {
  id: string;
  name: string;
  role: string;
  type: "People" | "Equipment" | "Materials" | "Budget" | "Shared";
  status: "Available" | "High Load" | "Overallocated" | "Unavailable";
  utilization: number;
  project: string;
  skills: string[];
  costRate: string;
  risk: "Low" | "Medium" | "High";
  avatarText: string;
  avatarBg: string;
  upcoming: string;
  constraints: string;
}

const initialResources: ResourceItem[] = [
  {
    id: "RES-01",
    name: "Arjun Rao",
    role: "Senior QA Automation Engineer",
    type: "People",
    status: "Unavailable",
    utilization: 96,
    project: "Support Pod",
    skills: ["Mobile QA", "Appium", "Jest", "CI/CD"],
    costRate: "$85/h",
    risk: "High",
    avatarText: "AR",
    avatarBg: "from-blue-600 to-cyan-500",
    upcoming: "Mobile Release Train Test Cycle (Proposed)",
    constraints: "Max 40h/week, PTO scheduled next Thursday",
  },
  {
    id: "RES-02",
    name: "Priya Sharma",
    role: "Staff Backend Engineer",
    type: "People",
    status: "High Load",
    utilization: 88,
    project: "Northstar Core API",
    skills: ["Go", "gRPC", "PostgreSQL", "Kafka"],
    costRate: "$110/h",
    risk: "Medium",
    avatarText: "PS",
    avatarBg: "from-indigo-600 to-blue-500",
    upcoming: "Payment Gateway Refactor",
    constraints: "Core database lock-in until Sprint 44 freeze",
  },
  {
    id: "RES-03",
    name: "Marcus Vance",
    role: "Cloud DevOps Architect",
    type: "People",
    status: "Available",
    utilization: 64,
    project: "Northstar Onboarding",
    skills: ["Kubernetes", "AWS EKS", "Terraform", "ArgoCD"],
    costRate: "$105/h",
    risk: "Low",
    avatarText: "MV",
    avatarBg: "from-sky-600 to-blue-600",
    upcoming: "Production Cluster Autoscaling Tuning",
    constraints: "On-call primary rotation starts Friday",
  },
  {
    id: "RES-04",
    name: "Elena Rostova",
    role: "Senior UI/UX Specialist",
    type: "People",
    status: "Available",
    utilization: 70,
    project: "Design System 2.0",
    skills: ["Figma", "React", "Tailwind CSS", "Design Tokens"],
    costRate: "$90/h",
    risk: "Low",
    avatarText: "ER",
    avatarBg: "from-purple-600 to-indigo-500",
    upcoming: "Command Center Accessibility Audit",
    constraints: "Split 50% between Design Systems and Web App",
  },
  {
    id: "RES-05",
    name: "GPU Cluster Alpha (4x H100)",
    role: "High-Performance ML Training Pool",
    type: "Equipment",
    status: "Overallocated",
    utilization: 98,
    project: "Forecasting AI Engine",
    skills: ["PyTorch", "vLLM", "CUDA 12", "Distributed Training"],
    costRate: "$24/h",
    risk: "High",
    avatarText: "GPU",
    avatarBg: "from-amber-600 to-rose-600",
    upcoming: "Nightly Predictive Weight Retraining",
    constraints: "Requires thermal maintenance window every 72h",
  },
  {
    id: "RES-06",
    name: "Test Lab Alpha (Device Farm)",
    role: "Automated Device Matrix",
    type: "Equipment",
    status: "Available",
    utilization: 52,
    project: "Mobile Release Train",
    skills: ["iOS 18", "Android 15", "Real-Device Harness"],
    costRate: "$15/h",
    risk: "Low",
    avatarText: "LAB",
    avatarBg: "from-cyan-600 to-blue-500",
    upcoming: "Regression Benchmark Run",
    constraints: "Max concurrent sessions: 32 devices",
  },
  {
    id: "RES-07",
    name: "Sprint Contingency Reserve",
    role: "Discretionary Overtime / Cloud Pool",
    type: "Budget",
    status: "Available",
    utilization: 42,
    project: "Q3 Release Buffer",
    skills: ["Overtime Budget", "SaaS Burst Capacity"],
    costRate: "$1,200 total",
    risk: "Low",
    avatarText: "RES",
    avatarBg: "from-emerald-600 to-teal-500",
    upcoming: "Allocation for QA recovery plan ($1.2k)",
    constraints: "Requires VP approval if total exceeds $5,000",
  },
  {
    id: "RES-08",
    name: "Shared Redis Cache Cluster",
    role: "In-Memory Session & Telemetry Layer",
    type: "Shared",
    status: "High Load",
    utilization: 84,
    project: "Platform Infra Pool",
    skills: ["Redis 7", "Memory Clustering", "Eviction Monitoring"],
    costRate: "$8/h",
    risk: "Medium",
    avatarText: "RED",
    avatarBg: "from-blue-600 to-sky-400",
    upcoming: "Cache TTL optimization rollout",
    constraints: "Memory usage ceiling alert triggered at 85%",
  },
];

export function ResourcesView({
  onAssignTask,
}: {
  onAssignTask?: (resourceName: string, taskName: string) => void;
}) {
  const [resources, setResources] = useState<ResourceItem[]>(initialResources);
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<string>("All");
  const [selectedResource, setSelectedResource] = useState<ResourceItem | null>(null);

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

  const handleSimulateAbsence = (res: ResourceItem) => {
    toast.warning(`Simulating absence for ${res.name}`, {
      description: "Downstream impact analyzed: 3 tasks triggered potential delay.",
    });
    setSelectedResource(null);
  };

  const handleReallocate = (res: ResourceItem) => {
    if (onAssignTask) {
      onAssignTask(res.name, "Mobile Release Train Test Cycle");
    } else {
      toast.success(`Reallocation proposal generated for ${res.name}`, {
        description: "Added to Pending Approvals queue with 94% confidence.",
      });
    }
    setSelectedResource(null);
  };

  return (
    <div className="resources-container">
      <div className="module-header">
        <div>
          <h1>Enterprise Resource Management</h1>
          <p>
            Track real-time capacity, skill profiles, and allocation constraints across {resources.length} active assets.
          </p>
        </div>
        <button
          className="primary-button"
          onClick={() =>
            toast.info("Add Resource", {
              description: "Resource onboarding form will connect to enterprise directory.",
            })
          }
        >
          Add New Resource
        </button>
      </div>

      <div className="resources-controls">
        <div className="search-box">
          <Search size={16} className="text-sky-400" />
          <input
            type="text"
            placeholder="Search by name, role, skill, or project..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-tabs">
          {["All", "People", "Equipment", "Budget", "Shared"].map((type) => (
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
              <th>Resource & Role</th>
              <th>Type</th>
              <th>Status</th>
              <th style={{ width: "160px" }}>Capacity / Load</th>
              <th>Current Project</th>
              <th>Key Skills & Capabilities</th>
              <th>Rate / Cost</th>
              <th>Risk</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center">
                  <div className="flex flex-col items-center justify-center p-6 text-slate-400">
                    <Search size={36} className="text-sky-400/60 mb-3" />
                    <strong className="text-base text-white block mb-1">No Matching Resources Found</strong>
                    <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
                      {search ? `No active resources match "${search}".` : `No resources found in category "${selectedType}".`} Try adjusting your filters.
                    </p>
                    <button
                      className="secondary-button text-xs px-3 py-1.5"
                      onClick={() => {
                        setSearch("");
                        setSelectedType("All");
                      }}
                    >
                      Clear Search & Reset Filters
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((item) => (
              <tr key={item.id} onClick={() => setSelectedResource(item)}>
                <td>
                  <div className="resource-id-col">
                    <div className={`res-avatar bg-gradient-to-br ${item.avatarBg} text-white`}>
                      {item.avatarText}
                    </div>
                    <div className="res-info">
                      <strong>{item.name}</strong>
                      <span>{item.role}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <span className="mono text-slate-400">{item.type}</span>
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
                          item.utilization > 90
                            ? "fill-critical"
                            : item.utilization > 75
                            ? "fill-warning"
                            : "fill-normal"
                        }`}
                        style={{ width: `${item.utilization}%` }}
                      />
                    </div>
                    <span className="mono text-[10px] font-semibold text-slate-300">
                      {item.utilization}%
                    </span>
                  </div>
                </td>
                <td>
                  <span className="font-semibold text-slate-200">{item.project}</span>
                </td>
                <td>
                  <div className="flex flex-wrap gap-1">
                    {item.skills.slice(0, 3).map((skill) => (
                      <span key={skill} className="skill-badge">
                        {skill}
                      </span>
                    ))}
                    {item.skills.length > 3 && (
                      <span className="skill-badge">+{item.skills.length - 3}</span>
                    )}
                  </div>
                </td>
                <td>
                  <span className="mono text-sky-400 font-semibold">{item.costRate}</span>
                </td>
                <td>
                  <span
                    className={`mono text-[10px] font-bold ${
                      item.risk === "High"
                        ? "text-rose-400"
                        : item.risk === "Medium"
                        ? "text-amber-400"
                        : "text-sky-400"
                    }`}
                  >
                    {item.risk}
                  </span>
                </td>
              </tr>
            ))
            )}
          </tbody>
        </table>
      </div>

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
                  <h3 className="text-lg font-bold text-white">{selectedResource.name}</h3>
                  <p className="text-xs text-slate-400">{selectedResource.role} • {selectedResource.type}</p>
                </div>
              </div>
              <button
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                onClick={() => setSelectedResource(null)}
              >
                <X size={18} />
              </button>
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
                      selectedResource.utilization > 90 ? "bg-rose-500" : "bg-sky-400"
                    }`}
                    style={{ width: `${selectedResource.utilization}%` }}
                  />
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-900/60 border border-sky-900/20">
                <span className="text-[10px] uppercase font-mono text-slate-400">Assigned Project</span>
                <div className="text-sm font-bold text-white mt-1">{selectedResource.project}</div>
                <span className="text-xs text-slate-400">Standard rate: {selectedResource.costRate}</span>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <strong className="block text-slate-300 font-semibold mb-2">Verified Skills & Capabilities</strong>
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
                  <Briefcase size={14} /> Upcoming / Proposed Task Allocation
                </strong>
                <p className="text-slate-300">{selectedResource.upcoming}</p>
              </div>

              <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-800">
                <strong className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                  <AlertTriangle size={14} className="text-amber-400" /> Operational Constraints
                </strong>
                <p className="text-slate-400">{selectedResource.constraints}</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-sky-900/30">
              <button
                className="secondary-button"
                onClick={() => handleSimulateAbsence(selectedResource)}
              >
                Simulate Absence
              </button>
              <button
                className="primary-button"
                onClick={() => handleReallocate(selectedResource)}
              >
                Reallocate to Release Train
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ResourcesView;

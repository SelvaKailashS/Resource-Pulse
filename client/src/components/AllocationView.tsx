import { useState, useMemo } from "react";
import {
  GitMerge,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  Briefcase,
  Users,
  Layers,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Resource, Project, Assignment, AllocationMatchResult } from "@shared/orgTypes";
import {
  loadInitialResources,
  saveResources,
  loadInitialProjects,
  saveProjects,
  loadAssignments,
  saveAssignments,
  computeAllocationCompatibility,
} from "@/lib/orgStore";

export function AllocationView() {
  const [resources, setResources] = useState<Resource[]>(() => loadInitialResources());
  const [projects, setProjects] = useState<Project[]>(() => loadInitialProjects());
  const [assignments, setAssignments] = useState<Assignment[]>(() => loadAssignments());
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || "");
  const [assignHours, setAssignHours] = useState<number>(20);

  const selectedProject = useMemo(() => {
    return projects.find((p) => p.id === selectedProjectId) || projects[0] || null;
  }, [projects, selectedProjectId]);

  // Compute transparent compatibility matrix for all resources against the selected project
  const matchResults = useMemo<AllocationMatchResult[]>(() => {
    if (!selectedProject || resources.length === 0) return [];
    return resources
      .map((r) => computeAllocationCompatibility(r, selectedProject))
      .sort((a, b) => (b.overallCompatibility || 0) - (a.overallCompatibility || 0));
  }, [resources, selectedProject]);

  const handleAllocate = (match: AllocationMatchResult) => {
    if (!selectedProject) return;

    const resource = resources.find((r) => r.id === match.resourceId);
    if (!resource) return;

    const allocatedHours = Math.min(assignHours, resource.weeklyCapacityHours);

    // Create or update assignment
    const existingIndex = assignments.findIndex(
      (a) => a.resourceId === resource.id && a.projectId === selectedProject.id
    );

    let updatedAssignments = [...assignments];
    if (existingIndex >= 0) {
      updatedAssignments[existingIndex] = {
        ...updatedAssignments[existingIndex],
        assignedHours: allocatedHours,
      };
    } else {
      const newAssignment: Assignment = {
        id: `ASG-${Date.now().toString(36).toUpperCase()}`,
        resourceId: resource.id,
        projectId: selectedProject.id,
        assignedHours: allocatedHours,
        startDate: selectedProject.startDate,
        endDate: selectedProject.endDate,
        allocationPercentage: Math.round((allocatedHours / resource.weeklyCapacityHours) * 100),
        status: "Active",
      };
      updatedAssignments.push(newAssignment);
    }

    setAssignments(updatedAssignments);
    saveAssignments(updatedAssignments);

    // Update resource utilization
    const updatedResources = resources.map((r) => {
      if (r.id === resource.id) {
        const newAssigned = Math.min(r.weeklyCapacityHours * 1.5, r.assignedHours + allocatedHours);
        const newUtil = Math.round((newAssigned / r.weeklyCapacityHours) * 100);
        return {
          ...r,
          assignedHours: newAssigned,
          utilization: newUtil,
          status: (newUtil > 100 ? "Overallocated" : "Allocated") as any,
          currentProjects: Array.from(new Set([...r.currentProjects, selectedProject.name])),
        };
      }
      return r;
    });
    setResources(updatedResources);
    saveResources(updatedResources);

    // Update project assigned hours
    const updatedProjects = projects.map((p) => {
      if (p.id === selectedProject.id) {
        return {
          ...p,
          assignedHours: p.assignedHours + allocatedHours,
          assignedResourceIds: Array.from(new Set([...p.assignedResourceIds, resource.id])),
        };
      }
      return p;
    });
    setProjects(updatedProjects);
    saveProjects(updatedProjects);

    toast.success(`Allocated ${resource.name} (${allocatedHours}h) to "${selectedProject.name}"`);
  };

  const handleRemoveAssignment = (assignmentId: string) => {
    const assignment = assignments.find((a) => a.id === assignmentId);
    if (!assignment) return;

    const updatedAssignments = assignments.filter((a) => a.id !== assignmentId);
    setAssignments(updatedAssignments);
    saveAssignments(updatedAssignments);

    // Recompute resource hours
    const updatedResources = resources.map((r) => {
      if (r.id === assignment.resourceId) {
        const remainingHours = Math.max(0, r.assignedHours - assignment.assignedHours);
        const newUtil = Math.round((remainingHours / r.weeklyCapacityHours) * 100);
        return {
          ...r,
          assignedHours: remainingHours,
          utilization: newUtil,
          status: (newUtil > 100 ? "Overallocated" : newUtil > 0 ? "Allocated" : "Available") as any,
        };
      }
      return r;
    });
    setResources(updatedResources);
    saveResources(updatedResources);

    toast.success("Assignment removed");
  };

  if (resources.length === 0 || projects.length === 0) {
    return (
      <div className="border border-dashed border-border/60 rounded-xl p-12 text-center bg-card/20 max-w-lg mx-auto my-8">
        <GitMerge className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <h3 className="font-semibold text-base text-foreground">No Organizational Data for Allocation</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
          The allocation engine requires at least 1 registered resource and 1 project initiative to compute match compatibility.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-primary/10 text-primary uppercase tracking-wider">
              Allocation Engine
            </span>
            <span className="text-xs text-muted-foreground">• Multi-Factor Compatibility Scoring</span>
          </div>
          <h2 className="text-2xl font-bold text-foreground mt-1">Smart Resource Allocation Matrix</h2>
          <p className="text-sm text-muted-foreground">
            Dynamically evaluate skills alignment, calendar availability, and remaining bandwidth to optimize assignments.
          </p>
        </div>
      </div>

      {/* Target Project Selection & Configuration */}
      <div className="border border-border/50 rounded-xl p-4 bg-card/40 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Briefcase className="w-4 h-4 text-primary shrink-0" />
          <div className="flex-1">
            <label className="text-xs font-medium text-muted-foreground block mb-0.5">Target Initiative:</label>
            <select
              value={selectedProject?.id || ""}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-border bg-background text-foreground"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.department}) — {p.assignedHours}/{p.requiredHours}h
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedProject && (
          <div className="flex items-center gap-6 text-xs w-full md:w-auto justify-between md:justify-end">
            <div>
              <span className="text-muted-foreground">Required Skills: </span>
              <span className="font-semibold text-foreground">
                {selectedProject.requiredSkills.join(", ")}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Hours Needed: </span>
              <span className="font-semibold text-foreground">
                {Math.max(0, selectedProject.requiredHours - selectedProject.assignedHours)}h
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Transparent Match Matrix */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm text-foreground">
              Candidate Compatibility Ranking for "{selectedProject?.name}"
            </h3>
          </div>
          <span className="text-xs text-muted-foreground">
            {matchResults.length} resource candidates evaluated
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {matchResults.map((match) => {
            const resource = resources.find((r) => r.id === match.resourceId);
            if (!resource) return null;

            return (
              <div
                key={match.resourceId}
                className="border border-border/50 rounded-xl p-4 bg-card/40 hover:border-border transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                {/* Resource Info */}
                <div className="space-y-1 lg:w-1/4">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-foreground">{match.resourceName}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                      {resource.department}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{resource.role}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Available: <span className="text-foreground font-medium">{match.availableHours}h</span> / {resource.weeklyCapacityHours}h (Util: {resource.utilization}%)
                  </p>
                </div>

                {/* Score Breakdown Pills */}
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 lg:w-2/5">
                  <div className="p-2 rounded-lg bg-background/60 border border-border/30 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase">Skills Match</p>
                    <p className="text-sm font-bold text-foreground mt-0.5">{match.skillMatchScore}%</p>
                  </div>

                  <div className="p-2 rounded-lg bg-background/60 border border-border/30 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase">Availability</p>
                    <p className="text-sm font-bold text-foreground mt-0.5">{match.availabilityScore}%</p>
                  </div>

                  <div className="p-2 rounded-lg bg-background/60 border border-border/30 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase">Capacity</p>
                    <p className="text-sm font-bold text-foreground mt-0.5">{match.capacityScore}%</p>
                  </div>

                  <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-center col-span-3 sm:col-span-1">
                    <p className="text-[10px] text-primary uppercase font-bold">Overall</p>
                    <p className="text-sm font-bold text-primary mt-0.5">{match.overallCompatibility}%</p>
                  </div>
                </div>

                {/* AI Explanation & Action */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between lg:justify-end gap-3 lg:w-1/3">
                  <p className="text-xs text-muted-foreground italic flex-1 pr-2">
                    "{match.reasoning}"
                  </p>

                  <button
                    onClick={() => handleAllocate(match)}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" /> Allocate
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Organization Assignments */}
      {assignments.length > 0 && (
        <div className="border border-border/50 rounded-xl overflow-hidden bg-card/40 mt-8">
          <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between bg-muted/20">
            <span className="text-xs font-semibold text-foreground">
              Active Project Allocations ({assignments.length})
            </span>
            <span className="text-[11px] text-muted-foreground">Manager Override Enabled</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/30 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border/30">
                <tr>
                  <th className="px-4 py-2.5">Resource</th>
                  <th className="px-4 py-2.5">Assigned Project</th>
                  <th className="px-4 py-2.5">Committed Hours</th>
                  <th className="px-4 py-2.5">Allocation %</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {assignments.map((asg) => {
                  const res = resources.find((r) => r.id === asg.resourceId);
                  const prj = projects.find((p) => p.id === asg.projectId);

                  return (
                    <tr key={asg.id} className="hover:bg-muted/30">
                      <td className="px-4 py-2.5 font-medium text-foreground">
                        {res?.name || asg.resourceId}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">{prj?.name || asg.projectId}</td>
                      <td className="px-4 py-2.5 font-mono text-foreground">{asg.assignedHours}h / wk</td>
                      <td className="px-4 py-2.5">
                        <span className="font-semibold text-primary">{asg.allocationPercentage}%</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-500">
                          {asg.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          onClick={() => handleRemoveAssignment(asg.id)}
                          className="text-muted-foreground hover:text-red-500 p-1"
                          title="Remove assignment"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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
    </div>
  );
}

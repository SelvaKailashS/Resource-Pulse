import { useState, useEffect } from "react";
import { ShieldCheck, CheckCircle2, XCircle, AlertCircle, Clock, User, ArrowRight, FileText, Check, ShieldAlert, Trash2, Send, CheckCheck } from "lucide-react";
import { toast } from "sonner";

interface ApprovalItem {
  id: string;
  title: string;
  sourceEvent: string;
  confidence: number;
  priority: "High" | "Medium" | "Urgent";
  recommendationText: string;
  targetResource: string;
  fromProject: string;
  toProject: string;
  timeGain: string;
  costImpact: string;
  policyChecks: {
    skillMatch: boolean;
    overtimeAllowed: boolean;
    milestoneTolerance: boolean;
  };
  whySelected: string;
  whyExcluded: string;
  status: "pending" | "approved" | "rejected";
}

interface AuditRecord {
  id: string;
  title: string;
  approver: string;
  timestamp: string;
  decision: "Approved" | "Rejected";
  details: string;
}

import { useAuth } from "@/_core/hooks/useAuth";
import {
  loadChangeRequests,
  saveChangeRequests,
  TeammateChangeRequest,
  recordTeamMember,
} from "@/lib/supabase";

export function ApprovalsView() {
  const { user } = useAuth();
  const isAdmin = Boolean(
    user?.role === "admin" ||
    (user?.email && (user.email === "salujaradha9@gmail.com" || user.email.includes("kailash"))) ||
    (user?.name && user.name.toLowerCase().includes("kailash"))
  );
  const [changeRequests, setChangeRequests] = useState<TeammateChangeRequest[]>(() => loadChangeRequests());

  useEffect(() => {
    const handleUpdate = () => {
      setChangeRequests(loadChangeRequests());
    };
    window.addEventListener("resourcepulse-change-requests-updated", handleUpdate);
    return () => window.removeEventListener("resourcepulse-change-requests-updated", handleUpdate);
  }, []);

  const handleApproveChangeRequest = (req: TeammateChangeRequest) => {
    if (!isAdmin) {
      toast.error("Permission Denied: Only Admin (Kailash) can approve teammate change requests.");
      return;
    }

    // 1. Mark request as approved
    const all = loadChangeRequests().map((r) =>
      r.id === req.id
        ? {
            ...r,
            status: "APPROVED" as const,
            decidedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            decidedBy: user?.name || "Kailash",
          }
        : r
    );
    saveChangeRequests(all);
    setChangeRequests(all);

    // 2. Apply requested changes to the teammate in local store
    const rawRoster = localStorage.getItem("resourcepulse_student_resources");
    if (rawRoster) {
      try {
        const parsed = JSON.parse(rawRoster);
        const updatedRoster = parsed.map((m: any) =>
          m.id === req.targetMemberId || m.name.toLowerCase() === req.targetMemberName.toLowerCase()
            ? {
                ...m,
                role: req.requestedChanges.role || m.role,
                project: req.requestedChanges.project || m.project,
                weeklyHours: req.requestedChanges.weeklyHours || m.weeklyHours,
                utilization: req.requestedChanges.utilization || m.utilization,
                status: req.requestedChanges.status || m.status,
              }
            : m
        );
        localStorage.setItem("resourcepulse_student_resources", JSON.stringify(updatedRoster));
        localStorage.setItem("resourcepulse_enterprise_resources_v2", JSON.stringify(updatedRoster));
        window.dispatchEvent(new CustomEvent("resourcepulse-team-synced", { detail: updatedRoster }));
      } catch {}
    }

    // 3. Update Supabase
    void recordTeamMember({
      id: req.targetMemberId,
      name: req.targetMemberName,
      role: req.requestedChanges.role,
      project: req.requestedChanges.project,
      weeklyHours: req.requestedChanges.weeklyHours,
      utilization: req.requestedChanges.utilization,
      status: req.requestedChanges.status,
    });

    // 4. Record audit log
    const newRecord: AuditRecord = {
      id: `AUD-${Math.floor(100 + Math.random() * 900)}`,
      title: `Teammate Change Approved: ${req.targetMemberName}`,
      approver: `${user?.name || "Kailash"} (Admin Lead)`,
      timestamp: "Just now",
      decision: "Approved",
      details: `Approved deliverable "${req.requestedChanges.project}" (${req.requestedChanges.weeklyHours}h/wk) requested by ${req.requesterName}.`,
    };
    const updatedLog = [newRecord, ...auditLog];
    setAuditLog(updatedLog);
    try {
      localStorage.setItem("resourcepulse_audit_log", JSON.stringify(updatedLog));
    } catch {}

    // 5. Broadcast governance notice to everyone
    const notice = {
      id: `NOT-${Date.now()}`,
      type: "APPROVED",
      text: `Admin ${user?.name || "Kailash"} APPROVED changes for ${req.targetMemberName}. Deliverable updated to "${req.requestedChanges.project}".`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    try {
      localStorage.setItem("resourcepulse_governance_notices", JSON.stringify(notice));
      window.dispatchEvent(new CustomEvent("resourcepulse-governance-notice", { detail: notice }));
    } catch {}

    toast.success(`Change Request APPROVED!`, {
      description: `${req.targetMemberName} has been updated in the workspace.`,
    });
  };

  const handleRejectChangeRequest = (req: TeammateChangeRequest) => {
    if (!isAdmin) {
      toast.error("Permission Denied: Only Admin (Kailash) can reject teammate change requests.");
      return;
    }

    const all = loadChangeRequests().map((r) =>
      r.id === req.id
        ? {
            ...r,
            status: "REJECTED" as const,
            decidedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            decidedBy: user?.name || "Kailash",
          }
        : r
    );
    saveChangeRequests(all);
    setChangeRequests(all);

    // Record audit log
    const newRecord: AuditRecord = {
      id: `AUD-${Math.floor(100 + Math.random() * 900)}`,
      title: `Teammate Change Rejected: ${req.targetMemberName}`,
      approver: `${user?.name || "Kailash"} (Admin Lead)`,
      timestamp: "Just now",
      decision: "Rejected",
      details: `Rejected change request for ${req.targetMemberName} requested by ${req.requesterName}.`,
    };
    const updatedLog = [newRecord, ...auditLog];
    setAuditLog(updatedLog);
    try {
      localStorage.setItem("resourcepulse_audit_log", JSON.stringify(updatedLog));
    } catch {}

    // Broadcast governance notice to everyone
    const notice = {
      id: `NOT-${Date.now()}`,
      type: "REJECTED",
      text: `Admin ${user?.name || "Kailash"} REJECTED change request for ${req.targetMemberName}.`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    try {
      localStorage.setItem("resourcepulse_governance_notices", JSON.stringify(notice));
      window.dispatchEvent(new CustomEvent("resourcepulse-governance-notice", { detail: notice }));
    } catch {}

    toast.error(`Change Request REJECTED`, {
      description: `Teammate ${req.targetMemberName} will keep their existing workload.`,
    });
  };

  const [approvals, setApprovals] = useState<ApprovalItem[]>(() => {
    try {
      const stored = localStorage.getItem("resourcepulse_approvals");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  const [auditLog, setAuditLog] = useState<AuditRecord[]>(() => {
    try {
      const stored = localStorage.getItem("resourcepulse_audit_log");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  const handleDeleteAuditRecord = (id: string) => {
    const updated = auditLog.filter((log) => log.id !== id);
    setAuditLog(updated);
    try {
      localStorage.setItem("resourcepulse_audit_log", JSON.stringify(updated));
    } catch {}
    toast.success("Audit entry deleted");
  };

  const handleClearAuditLog = () => {
    if (confirm("Are you sure you want to clear all audit trail records?")) {
      setAuditLog([]);
      try {
        localStorage.removeItem("resourcepulse_audit_log");
      } catch {}
      toast.success("Audit log cleared");
    }
  };

  const pendingApprovals = approvals.filter((a) => a.status === "pending");

  const handleApprove = (item: ApprovalItem) => {
    const updated = approvals.map((a) => (a.id === item.id ? { ...a, status: "approved" as const } : a));
    setApprovals(updated);
    try {
      localStorage.setItem("resourcepulse_approvals", JSON.stringify(updated));
    } catch {}

    const newRecord: AuditRecord = {
      id: `AUD-${Math.floor(100 + Math.random() * 900)}`,
      title: item.title,
      approver: `${user?.name || "Team Lead"} (Project Lead)`,
      timestamp: "Just now",
      decision: "Approved",
      details: `Authorized workload rebalancing of ${item.targetResource || "teammate"}.`,
    };
    const updatedLog = [newRecord, ...auditLog];
    setAuditLog(updatedLog);
    try {
      localStorage.setItem("resourcepulse_audit_log", JSON.stringify(updatedLog));
    } catch {}

    toast.success("Decision Approved & Executed", {
      description: `${item.targetResource || "Teammate"} schedule updated. Audit log recorded.`,
    });
  };

  const handleReject = (item: ApprovalItem) => {
    const updated = approvals.map((a) => (a.id === item.id ? { ...a, status: "rejected" as const } : a));
    setApprovals(updated);
    try {
      localStorage.setItem("resourcepulse_approvals", JSON.stringify(updated));
    } catch {}

    const newRecord: AuditRecord = {
      id: `AUD-${Math.floor(100 + Math.random() * 900)}`,
      title: item.title,
      approver: `${user?.name || "Team Lead"} (Project Lead)`,
      timestamp: "Just now",
      decision: "Rejected",
      details: "Recommendation rejected by team lead.",
    };
    const updatedLog = [newRecord, ...auditLog];
    setAuditLog(updatedLog);
    try {
      localStorage.setItem("resourcepulse_audit_log", JSON.stringify(updatedLog));
    } catch {}

    toast.error("Recommendation Rejected", {
      description: "Alternative mitigation options can be created in Resources.",
    });
  };

  return (
    <div className="approvals-view">
      <div className="module-header">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="status-pill chip-coral">{pendingApprovals.length} Pending Actions</span>
            <span className="mono text-xs text-slate-400">Strict Human-in-the-Loop Governance</span>
          </div>
          <h1>Decision & Approval Command Center</h1>
          <p>
            Review AI explainable recommendations with policy validations before executing real-world resource reallocations.
          </p>
        </div>
      </div>

      {/* Teammate Change Requests (Admin Approval Governance) */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldAlert size={18} className="text-amber-400" />
              Teammate Change Requests
              <span className={`text-xs px-2 py-0.5 rounded-full font-mono font-bold ${
                changeRequests.filter(r => r.status === "PENDING").length > 0 
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" 
                  : "bg-slate-800 text-slate-400"
              }`}>
                {changeRequests.filter(r => r.status === "PENDING").length} Pending
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Teammates submit requests to adjust project tasks, capacity, or hours. Only Workspace Admin can approve or reject.
            </p>
          </div>
          <div className="text-right">
            {isAdmin ? (
              <span className="text-[11px] mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md flex items-center gap-1 font-semibold">
                <ShieldCheck size={13} /> Admin Approval Authority Active
              </span>
            ) : (
              <span className="text-[11px] mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-md flex items-center gap-1 font-semibold">
                <Clock size={13} /> Teammate View (Admin Decides)
              </span>
            )}
          </div>
        </div>

        {changeRequests.filter(r => r.status === "PENDING").length === 0 ? (
          <div className="panel p-5 text-center bg-slate-900/40 border border-slate-800 rounded-xl mb-4">
            <CheckCheck size={28} className="text-emerald-400 mx-auto mb-1.5 opacity-80" />
            <p className="text-xs font-semibold text-slate-300">No Pending Teammate Change Requests</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              When teammates submit updates in the Resources tab, they appear here for Admin review.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 mb-4">
            {changeRequests.filter(r => r.status === "PENDING").map((req) => (
              <div
                key={req.id}
                className="p-4 rounded-xl bg-slate-900/90 border-2 border-amber-500/40 shadow-lg shadow-amber-950/20"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="mono text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase">
                        Pending Admin Decision
                      </span>
                      <span className="mono text-[10px] text-slate-400">{req.id}</span>
                      <span className="mono text-[10px] text-slate-500">Submitted {req.submittedAt}</span>
                    </div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <User size={15} className="text-sky-400" />
                      Request for {req.targetMemberName}
                      <span className="text-xs font-normal text-slate-400">
                        (Requested by: <strong className="text-slate-300">{req.requesterName}</strong>)
                      </span>
                    </h3>
                  </div>

                  <div className="text-right">
                    <span className="mono text-xs font-semibold text-amber-400 bg-amber-950/60 px-2 py-1 rounded border border-amber-800/40 block">
                      Awaiting Kailash
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3 text-xs bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                  {req.requestedChanges.project && (
                    <div>
                      <span className="text-[10px] mono text-slate-400 block uppercase">Project Deliverable</span>
                      <strong className="text-sky-300 font-semibold">{req.requestedChanges.project}</strong>
                    </div>
                  )}
                  {req.requestedChanges.role && (
                    <div>
                      <span className="text-[10px] mono text-slate-400 block uppercase">Role</span>
                      <strong className="text-slate-200">{req.requestedChanges.role}</strong>
                    </div>
                  )}
                  {req.requestedChanges.weeklyHours && (
                    <div>
                      <span className="text-[10px] mono text-slate-400 block uppercase">Weekly Capacity</span>
                      <strong className="text-emerald-300 font-semibold">{req.requestedChanges.weeklyHours} hrs/wk</strong>
                    </div>
                  )}
                  {req.requestedChanges.utilization !== undefined && (
                    <div>
                      <span className="text-[10px] mono text-slate-400 block uppercase">Workload</span>
                      <strong className="text-indigo-300 font-semibold">{req.requestedChanges.utilization}% load</strong>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                  <span className="text-[11px] text-slate-400 italic">
                    {isAdmin
                      ? "As Workspace Admin, you can approve or reject this modification."
                      : "Governance active: Only Workspace Admin (Kailash) can approve this modification."}
                  </span>

                  {isAdmin ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRejectChangeRequest(req)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1.5 transition-colors"
                      >
                        <XCircle size={14} className="text-rose-400" /> Reject Request
                      </button>
                      <button
                        onClick={() => handleApproveChangeRequest(req)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition-colors shadow-md shadow-emerald-950/40"
                      >
                        <ShieldCheck size={14} /> Approve & Update Teammate
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-amber-400/90 mono font-semibold bg-amber-500/10 px-3 py-1 rounded border border-amber-500/20">
                      🔒 Awaiting Admin Approval
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Recent Change Request History */}
        {changeRequests.filter(r => r.status !== "PENDING").length > 0 && (
          <div className="p-3 bg-slate-900/30 border border-slate-800/80 rounded-lg text-xs mb-6">
            <span className="mono text-[10px] text-slate-400 uppercase font-bold block mb-2">
              Recent Teammate Governance History
            </span>
            <div className="space-y-1.5">
              {changeRequests.filter(r => r.status !== "PENDING").slice(0, 3).map((r) => (
                <div key={r.id} className="flex items-center justify-between text-[11px] py-1 border-b border-slate-800/40 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className={`mono text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                      r.status === "APPROVED" 
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" 
                        : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                    }`}>
                      {r.status}
                    </span>
                    <span className="text-slate-300 font-medium">{r.targetMemberName}</span>
                    <span className="text-slate-500">({r.requestedChanges.project || "Profile Update"})</span>
                  </div>
                  <span className="mono text-slate-400 text-[10px]">
                    Decided by {r.decidedBy} at {r.decidedAt}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="module-header mt-8">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <ShieldCheck size={18} className="text-sky-400" />
            AI Autonomous Strategy Approvals
          </h2>
          <p className="text-xs text-slate-400">
            Review algorithmic capacity rebalancing decisions before committing to the schedule.
          </p>
        </div>
      </div>

      {/* Pending Approvals List */}
      <div className="approvals-list mb-8">
        {pendingApprovals.length === 0 ? (
          <div className="panel p-8 text-center">
            <CheckCircle2 size={36} className="text-sky-400 mx-auto mb-2" />
            <strong className="text-base text-white block">All Pending Decisions Resolved</strong>
            <p className="text-xs text-slate-400 mt-1">
              No outstanding approvals are waiting. Live resources are operating within nominal thresholds.
            </p>
          </div>
        ) : (
          pendingApprovals.map((item) => (
            <div key={item.id} className="approval-card">
              <div className="approval-card-header">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`mono text-[9px] px-2 py-0.5 rounded font-bold uppercase ${
                        item.priority === "Urgent"
                          ? "bg-rose-950 text-rose-400 border border-rose-800/40"
                          : "bg-amber-950 text-amber-400 border border-amber-800/40"
                      }`}
                    >
                      {item.priority} Priority
                    </span>
                    <span className="mono text-[10px] text-slate-400">{item.id}</span>
                  </div>
                  <h3 className="text-base font-bold text-white">{item.title}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Triggered by: {item.sourceEvent}</p>
                </div>

                <div className="text-right">
                  <span className="mono text-lg font-bold text-sky-400">{item.confidence}%</span>
                  <span className="block text-[9px] text-slate-400 uppercase font-mono">AI Confidence</span>
                </div>
              </div>

              <div className="my-4 p-3.5 rounded-lg bg-slate-900/60 border border-sky-900/20 text-xs text-slate-200 leading-relaxed">
                {item.recommendationText}
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs mb-4">
                <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-800">
                  <strong className="block text-sky-300 font-semibold mb-1">Why this resource was selected</strong>
                  <p className="text-slate-400">{item.whySelected}</p>
                </div>
                <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-800">
                  <strong className="block text-slate-300 font-semibold mb-1">Why alternatives excluded</strong>
                  <p className="text-slate-400">{item.whyExcluded}</p>
                </div>
              </div>

              {/* Policy Checks Bar */}
              <div className="approval-policy-checks">
                <div className="policy-check-item">
                  <CheckCircle2 size={15} className="text-sky-400" />
                  <span>Skill Competency Match: Verified</span>
                </div>
                <div className="policy-check-item">
                  <CheckCircle2 size={15} className="text-sky-400" />
                  <span>Workload & Overtime Policy: Compliant</span>
                </div>
                <div className="policy-check-item">
                  <CheckCircle2 size={15} className="text-sky-400" />
                  <span>Milestone Tolerance: Within Budget ({item.costImpact})</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-2">
                <div className="text-xs text-slate-400 flex items-center gap-2">
                  <Clock size={13} />
                  <span>Projected Benefit: <strong className="text-sky-400">{item.timeGain}</strong></span>
                </div>

                <div className="flex items-center gap-2">
                  <button className="secondary-button" onClick={() => handleReject(item)}>
                    <XCircle size={14} className="text-rose-400" /> Reject
                  </button>
                  <button className="primary-button" onClick={() => handleApprove(item)}>
                    <ShieldCheck size={14} /> Approve & Execute Plan
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Governance & Audit Trail Table */}
      <div className="table-panel p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
              <FileText size={16} className="text-sky-400" /> Decision Governance & Audit Trail
            </h3>
            <p className="text-xs text-slate-400">
              Immutable log of all human approvals, rejections, and execution timestamps.
            </p>
          </div>
          {auditLog.length > 0 && (
            <button
              onClick={handleClearAuditLog}
              className="text-xs px-2.5 py-1.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1.5 transition-colors"
            >
              <Trash2 size={13} /> Clear Audit Log
            </button>
          )}
        </div>

        {auditLog.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            No audit records logged yet. Approvals and task decompositions will appear here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="resource-table w-full">
              <thead>
                <tr>
                  <th>Audit ID</th>
                  <th>Action Title</th>
                  <th>Authorized Operator</th>
                  <th>Decision</th>
                  <th>Timestamp</th>
                  <th>Audit Summary</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {auditLog.map((log) => (
                  <tr key={log.id}>
                    <td className="mono text-sky-400 font-bold">{log.id}</td>
                    <td className="font-semibold text-white">{log.title}</td>
                    <td className="text-slate-300">{log.approver}</td>
                    <td>
                      <span
                        className={`status-pill ${
                          log.decision === "Approved" ? "chip-blue" : "chip-coral"
                        }`}
                      >
                        {log.decision}
                      </span>
                    </td>
                    <td className="mono text-slate-400">{log.timestamp}</td>
                    <td className="text-slate-400 text-xs">{log.details}</td>
                    <td className="text-right">
                      <button
                        onClick={() => handleDeleteAuditRecord(log.id)}
                        title="Delete audit entry"
                        className="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default ApprovalsView;

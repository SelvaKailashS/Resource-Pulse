import { useState } from "react";
import { ShieldCheck, CheckCircle2, XCircle, AlertCircle, Clock, User, ArrowRight, FileText, Check, ShieldAlert } from "lucide-react";
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

const initialApprovals: ApprovalItem[] = [
  {
    id: "APR-101",
    title: "Reallocate Arjun Rao to Mobile Release Train",
    sourceEvent: "QA Automated Testing Deficit (9h horizon)",
    confidence: 94,
    priority: "Urgent",
    recommendationText:
      "Move Arjun Rao from Support pod to the mobile release train for one test cycle. This is the highest-confidence recovery path that protects the milestone without adding external capacity.",
    targetResource: "Arjun Rao",
    fromProject: "Support Pod",
    toProject: "Mobile Release Train",
    timeGain: "+2.4 days recovered",
    costImpact: "$1,200",
    policyChecks: {
      skillMatch: true,
      overtimeAllowed: true,
      milestoneTolerance: true,
    },
    whySelected: "Arjun possesses exact matching skills (Appium, Jest, CI/CD) and has 6.5h available tomorrow.",
    whyExcluded: "Priya Sharma excluded because database migration requires her direct commit access.",
    status: "pending",
  },
  {
    id: "APR-102",
    title: "Temporary DevOps Support for Northstar Onboarding",
    sourceEvent: "Infrastructure Cluster Utilization above 82%",
    confidence: 89,
    priority: "High",
    recommendationText:
      "Grant Marcus Vance access to configure automated scaling group thresholds on EKS staging cluster to absorb anticipated onboarding spike.",
    targetResource: "Marcus Vance",
    fromProject: "Cloud Architecture",
    toProject: "Northstar Onboarding",
    timeGain: "+1.5 days recovered",
    costImpact: "$650",
    policyChecks: {
      skillMatch: true,
      overtimeAllowed: true,
      milestoneTolerance: true,
    },
    whySelected: "Marcus holds primary AWS cloud permissions and is familiar with the onboarding Helm charts.",
    whyExcluded: "External cloud contractor excluded due to security clearance requirements.",
    status: "pending",
  },
  {
    id: "APR-103",
    title: "Device Lab Alpha Burst Allocation",
    sourceEvent: "Regression Benchmark Queue Congestion",
    confidence: 91,
    priority: "Medium",
    recommendationText:
      "Shift 12 Android test devices from Nightly Sandbox to Mobile Release Train for parallel test execution.",
    targetResource: "Device Lab Alpha",
    fromProject: "Nightly Sandbox",
    toProject: "Mobile Release Train",
    timeGain: "+0.8 days recovered",
    costImpact: "$150",
    policyChecks: {
      skillMatch: true,
      overtimeAllowed: true,
      milestoneTolerance: true,
    },
    whySelected: "Device firmware matches production target matrix.",
    whyExcluded: "Cloud emulator grid excluded due to biometric sensor simulation limitation.",
    status: "pending",
  },
];

const initialAuditLog: AuditRecord[] = [
  {
    id: "AUD-801",
    title: "Backend API Migration Overtime Authorization",
    approver: "Maya Chen (Lead)",
    timestamp: "Today at 08:30 AM",
    decision: "Approved",
    details: "Authorized 4.0h contingency overtime for Kafka schema validation.",
  },
  {
    id: "AUD-800",
    title: "External Contractor Sourcing Proposal",
    approver: "Maya Chen (Lead)",
    timestamp: "Yesterday at 04:15 PM",
    decision: "Rejected",
    details: "Rejected in favor of internal balanced reallocation.",
  },
];

export function ApprovalsView() {
  const [approvals, setApprovals] = useState<ApprovalItem[]>(initialApprovals);
  const [auditLog, setAuditLog] = useState<AuditRecord[]>(initialAuditLog);

  const pendingApprovals = approvals.filter((a) => a.status === "pending");

  const handleApprove = (item: ApprovalItem) => {
    setApprovals((prev) =>
      prev.map((a) => (a.id === item.id ? { ...a, status: "approved" } : a))
    );

    const newRecord: AuditRecord = {
      id: `AUD-${Math.floor(100 + Math.random() * 900)}`,
      title: item.title,
      approver: "Maya Chen (Operations Lead)",
      timestamp: "Just now",
      decision: "Approved",
      details: `Reallocated ${item.targetResource} from ${item.fromProject} to ${item.toProject}.`,
    };
    setAuditLog((prev) => [newRecord, ...prev]);

    toast.success("Decision Approved & Queued", {
      description: `${item.targetResource} is now scheduled for ${item.toProject}. Audit record logged.`,
    });
  };

  const handleReject = (item: ApprovalItem) => {
    setApprovals((prev) =>
      prev.map((a) => (a.id === item.id ? { ...a, status: "rejected" } : a))
    );

    const newRecord: AuditRecord = {
      id: `AUD-${Math.floor(100 + Math.random() * 900)}`,
      title: item.title,
      approver: "Maya Chen (Operations Lead)",
      timestamp: "Just now",
      decision: "Rejected",
      details: "Recommendation rejected by operator.",
    };
    setAuditLog((prev) => [newRecord, ...prev]);

    toast.error("Recommendation Rejected", {
      description: "Alternative mitigation scenarios will be synthesized by the AI agent.",
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
        <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
          <FileText size={16} className="text-sky-400" /> Decision Governance & Audit Trail
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          Immutable log of all human approvals, rejections, and execution timestamps.
        </p>

        <table className="resource-table">
          <thead>
            <tr>
              <th>Audit ID</th>
              <th>Action Title</th>
              <th>Authorized Operator</th>
              <th>Decision</th>
              <th>Timestamp</th>
              <th>Audit Summary</th>
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ApprovalsView;

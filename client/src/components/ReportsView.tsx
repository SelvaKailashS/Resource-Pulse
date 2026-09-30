import { useState, useMemo } from "react";
import {
  FileText,
  Download,
  Printer,
  Table,
  CheckCircle2,
  Calendar,
  Layers,
  DollarSign,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { Resource, Project, ThresholdSettings } from "@shared/orgTypes";
import { loadInitialResources, loadInitialProjects, loadThresholds, computeOrgMetrics } from "@/lib/orgStore";

export function ReportsView() {
  const [resources] = useState<Resource[]>(() => loadInitialResources());
  const [projects] = useState<Project[]>(() => loadInitialProjects());
  const [thresholds] = useState<ThresholdSettings>(() => loadThresholds());
  const [activeReport, setActiveReport] = useState<"utilization" | "projects" | "capacity" | "executive">(
    "executive"
  );

  const metrics = useMemo(() => {
    return computeOrgMetrics(resources, projects, thresholds);
  }, [resources, projects, thresholds]);

  const handleExportCSV = () => {
    let filename = `resourcepulse_${activeReport}_report.csv`;
    let csvContent = "";

    if (activeReport === "utilization") {
      csvContent = "Name,Role,Department,Weekly Capacity,Assigned Hours,Utilization %,Hourly Rate,Status\n";
      resources.forEach((r) => {
        csvContent += `"${r.name}","${r.role}","${r.department}",${r.weeklyCapacityHours},${r.assignedHours},${r.utilization}%,$${r.costPerHour},"${r.status}"\n`;
      });
    } else if (activeReport === "projects") {
      csvContent = "Project Name,Department,Status,Priority,Required Hours,Assigned Hours,Budget,Expenditure,End Date\n";
      projects.forEach((p) => {
        csvContent += `"${p.name}","${p.department}","${p.status}","${p.priority}",${p.requiredHours},${p.assignedHours},$${p.budget || p.allocatedBudget || 0},$${p.actualExpenditure},"${p.endDate}"\n`;
      });
    } else if (activeReport === "capacity") {
      csvContent = "Department,Resource Count,Available Capacity Hours,Committed Hours,Utilization %,Weekly Cost\n";
      metrics.departments.forEach((d) => {
        csvContent += `"${d.name}",${d.resourceCount},${d.capacityHours},${d.assignedHours},${d.utilization}%,$${d.weeklyCost}\n`;
      });
    } else {
      csvContent =
        "Executive Metric,Value\n" +
        `Total Active Resources,${metrics.totalResources}\n` +
        `Total Projects,${metrics.totalProjects}\n` +
        `Average Utilization,${metrics.avgUtilization}%\n` +
        `Overallocated Resources,${metrics.overallocatedCount}\n` +
        `Available Capacity (Hours),${metrics.availableCapacityHours}\n` +
        `Total Assigned Hours,${metrics.totalAssignedHours}\n` +
        `Capacity Gap (Hours),${metrics.capacityGapHours}\n` +
        `Total Weekly Expenditure,$${metrics.totalWeeklyCost}\n`;
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${filename}`);
  };

  const handlePrint = () => {
    window.print();
  };

  if (resources.length === 0 && projects.length === 0) {
    return (
      <div className="border border-dashed border-border/60 rounded-xl p-12 text-center bg-card/20 max-w-lg mx-auto my-8">
        <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <h3 className="font-semibold text-base text-foreground">No Report Data</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
          Exportable operational and financial reports will be generated automatically once workforce data or project deliverables are ingested.
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
              Governance & Compliance
            </span>
            <span className="text-xs text-muted-foreground">• Verifiable Operational Audits</span>
          </div>
          <h2 className="text-2xl font-bold text-foreground mt-1">Enterprise Executive Reports</h2>
          <p className="text-sm text-muted-foreground">
            Generate, preview, and export comprehensive resource utilization, project delivery, and financial audit reports.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-border bg-card hover:bg-accent text-foreground transition-all shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" /> Print / PDF
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xs"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
      </div>

      {/* Report Selector Tabs */}
      <div className="flex items-center gap-2 border-b border-border/40 pb-2 overflow-x-auto">
        {[
          { id: "executive", label: "Executive Summary" },
          { id: "utilization", label: "Resource Utilization" },
          { id: "projects", label: "Project Portfolio" },
          { id: "capacity", label: "Department Capacity Breakdown" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveReport(tab.id as any)}
            className={`px-3.5 py-2 text-xs rounded-lg font-semibold transition-all whitespace-nowrap ${
              activeReport === tab.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted/40 hover:bg-muted text-muted-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Report Table Content */}
      <div className="border border-border/50 rounded-xl overflow-hidden bg-card/40">
        {activeReport === "executive" && (
          <div className="p-6 space-y-6">
            <div>
              <h3 className="font-bold text-base text-foreground">Executive Operations Summary</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Snapshot generated on {new Date().toLocaleDateString("en-US", { dateStyle: "long" })}
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl border border-border/40 bg-background/50">
                <p className="text-xs text-muted-foreground">Active Headcount</p>
                <p className="text-2xl font-bold text-foreground mt-1">{metrics.totalResources}</p>
                <p className="text-[11px] text-emerald-500 mt-1">{metrics.optimalCount} in optimal band</p>
              </div>

              <div className="p-4 rounded-xl border border-border/40 bg-background/50">
                <p className="text-xs text-muted-foreground">Average Utilization</p>
                <p className="text-2xl font-bold text-foreground mt-1">{metrics.avgUtilization}%</p>
                <p className="text-[11px] text-muted-foreground mt-1">Target range: 70-85%</p>
              </div>

              <div className="p-4 rounded-xl border border-border/40 bg-background/50">
                <p className="text-xs text-muted-foreground">Project Initiatives</p>
                <p className="text-2xl font-bold text-foreground mt-1">{metrics.totalProjects}</p>
                <p className="text-[11px] text-muted-foreground mt-1">{metrics.activeProjects} active</p>
              </div>

              <div className="p-4 rounded-xl border border-border/40 bg-background/50">
                <p className="text-xs text-muted-foreground">Estimated Weekly Spend</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  ${metrics.totalWeeklyCost.toLocaleString()}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">All departments</p>
              </div>
            </div>

            <div className="border-t border-border/30 pt-4">
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
                Operational Telemetry Summary
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                The organization has {metrics.availableCapacityHours} hours of available weekly capacity against {metrics.totalAssignedHours} hours of committed demand.{" "}
                {metrics.capacityGapHours > 0
                  ? `An unstaffed gap of ${metrics.capacityGapHours} hours requires resource rebalancing or additional headcount.`
                  : "Workload distribution is within safe operating margins with 0 critical project bottlenecks."}
              </p>
            </div>
          </div>
        )}

        {activeReport === "utilization" && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/30 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border/30">
                <tr>
                  <th className="px-4 py-3">Resource Name</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Weekly Hours</th>
                  <th className="px-4 py-3">Committed</th>
                  <th className="px-4 py-3">Load %</th>
                  <th className="px-4 py-3">Hourly Rate</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {resources.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/30">
                    <td className="px-4 py-2.5 font-medium text-foreground">{r.name}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{r.role}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{r.department}</td>
                    <td className="px-4 py-2.5 font-mono">{r.weeklyCapacityHours}h</td>
                    <td className="px-4 py-2.5 font-mono">{r.assignedHours}h</td>
                    <td className="px-4 py-2.5 font-bold text-primary">{r.utilization}%</td>
                    <td className="px-4 py-2.5 font-mono">${r.costPerHour}/hr</td>
                    <td className="px-4 py-2.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-muted text-muted-foreground">
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeReport === "projects" && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/30 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border/30">
                <tr>
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Hours (Assigned/Req)</th>
                  <th className="px-4 py-3">Budget</th>
                  <th className="px-4 py-3">Spend</th>
                  <th className="px-4 py-3">End Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {projects.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/30">
                    <td className="px-4 py-2.5 font-medium text-foreground">{p.name}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{p.department}</td>
                    <td className="px-4 py-2.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-muted text-muted-foreground">
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-medium">{p.priority}</td>
                    <td className="px-4 py-2.5 font-mono">
                      {p.assignedHours}h / {p.requiredHours}h
                    </td>
                    <td className="px-4 py-2.5 font-mono">${(p.budget || p.allocatedBudget || 0).toLocaleString()}</td>
                    <td className="px-4 py-2.5 font-mono">${p.actualExpenditure.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{p.endDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeReport === "capacity" && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/30 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border/30">
                <tr>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Headcount</th>
                  <th className="px-4 py-3">Capacity Hours</th>
                  <th className="px-4 py-3">Committed Hours</th>
                  <th className="px-4 py-3">Load %</th>
                  <th className="px-4 py-3">Est. Weekly Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {metrics.departments.map((d) => (
                  <tr key={d.name} className="hover:bg-muted/30">
                    <td className="px-4 py-2.5 font-semibold text-foreground">{d.name}</td>
                    <td className="px-4 py-2.5 font-mono">{d.resourceCount}</td>
                    <td className="px-4 py-2.5 font-mono">{d.capacityHours}h</td>
                    <td className="px-4 py-2.5 font-mono">{d.assignedHours}h</td>
                    <td className="px-4 py-2.5 font-bold text-primary">{d.utilization}%</td>
                    <td className="px-4 py-2.5 font-mono">${d.weeklyCost.toLocaleString()}</td>
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

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
  Receipt,
  Building2,
  Send,
  Sparkles,
  CreditCard,
  Copy,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { Resource, Project, ThresholdSettings } from "@shared/orgTypes";
import { loadInitialResources, loadInitialProjects, loadThresholds, computeOrgMetrics } from "@/lib/orgStore";

export function ReportsView() {
  const [resources] = useState<Resource[]>(() => loadInitialResources());
  const [projects] = useState<Project[]>(() => loadInitialProjects());
  const [thresholds] = useState<ThresholdSettings>(() => loadThresholds());
  const [activeReport, setActiveReport] = useState<
    "invoicing" | "executive" | "utilization" | "projects" | "capacity"
  >("invoicing");

  const teamName = localStorage.getItem("resourcepulse_team_name") || "Operations Team Alpha";

  // Invoicing Customization State
  const [invoiceData, setInvoiceData] = useState({
    invoiceNumber: "INV-2026-0042",
    clientName: "Enterprise Client Corp",
    clientEmail: "billing@clientcorp.com",
    clientAddress: "100 Innovation Way, Suite 400, New York, NY",
    issueDate: new Date().toISOString().split("T")[0],
    dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
    taxRate: 8.5,
    notes: "Payment due within 30 days of invoice date. Thank you for your partnership!",
  });

  const [copiedLink, setCopiedLink] = useState(false);

  const metrics = useMemo(() => {
    return computeOrgMetrics(resources, projects, thresholds);
  }, [resources, projects, thresholds]);

  // Dynamic invoice line items derived from projects and resource capacity
  const invoiceLineItems = useMemo(() => {
    if (projects.length > 0) {
      return projects.map((p, idx) => {
        const assignedHours = p.assignedHours || Math.max(16, (p.requiredHours || 40) / 2);
        const rate = 85;
        const total = assignedHours * rate;
        return {
          id: `ITEM-${idx + 1}`,
          description: `${p.name} — Technical Deliverable & Milestone Execution`,
          department: p.department || "Engineering",
          hours: assignedHours,
          rate,
          amount: total,
        };
      });
    }

    // Fallback if no projects yet
    return [
      {
        id: "ITEM-1",
        description: "Enterprise System Architecture, API Integration & Delivery",
        department: "Engineering",
        hours: 40,
        rate: 85,
        amount: 3400,
      },
      {
        id: "ITEM-2",
        description: "Resource Telemetry & Capacity Forecasting Sprint",
        department: "Operations",
        hours: 32,
        rate: 75,
        amount: 2400,
      },
    ];
  }, [projects]);

  const invoiceSubtotal = useMemo(() => {
    return invoiceLineItems.reduce((acc, item) => acc + item.amount, 0);
  }, [invoiceLineItems]);

  const invoiceTaxAmount = useMemo(() => {
    return (invoiceSubtotal * (invoiceData.taxRate || 0)) / 100;
  }, [invoiceSubtotal, invoiceData.taxRate]);

  const invoiceTotalDue = useMemo(() => {
    return invoiceSubtotal + invoiceTaxAmount;
  }, [invoiceSubtotal, invoiceTaxAmount]);

  const handleExportCSV = () => {
    let filename = `resourcepulse_${activeReport}_report.csv`;
    let csvContent = "";

    if (activeReport === "invoicing") {
      filename = `resourcepulse_invoice_${invoiceData.invoiceNumber}.csv`;
      csvContent =
        `Invoice Number,${invoiceData.invoiceNumber}\n` +
        `Client,${invoiceData.clientName}\n` +
        `Issue Date,${invoiceData.issueDate}\n` +
        `Due Date,${invoiceData.dueDate}\n\n` +
        "Line Item Description,Hours,Hourly Rate,Amount\n";
      invoiceLineItems.forEach((item) => {
        csvContent += `"${item.description}",${item.hours},$${item.rate},$${item.amount}\n`;
      });
      csvContent += `\nSubtotal,,,$${invoiceSubtotal.toFixed(2)}\n`;
      csvContent += `Tax (${invoiceData.taxRate}%),,,$${invoiceTaxAmount.toFixed(2)}\n`;
      csvContent += `Total Amount Due,,,$${invoiceTotalDue.toFixed(2)}\n`;
    } else if (activeReport === "utilization") {
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

  const handleCopyInvoiceLink = () => {
    navigator.clipboard.writeText(
      `${window.location.origin}/portal/invoice?inv=${encodeURIComponent(invoiceData.invoiceNumber)}`
    );
    setCopiedLink(true);
    toast.success("Client Invoice Portal Link Copied");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-emerald-500/10 text-emerald-400 uppercase tracking-wider font-mono">
              Enterprise Billing & Governance
            </span>
            <span className="text-xs text-muted-foreground">• Verifiable Operational Audits & Invoicing</span>
          </div>
          <h2 className="text-2xl font-bold text-foreground mt-1">Exportable Reports & Client Invoicing</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            1-click export of utilization reports, project portfolio budgets, and professional client billing invoices to PDF/Excel.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeReport === "invoicing" && (
            <button
              onClick={handleCopyInvoiceLink}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border border-border bg-card hover:bg-muted text-foreground transition-all shadow-xs cursor-pointer"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? "Link Copied" : "Copy Portal Link"}</span>
            </button>
          )}

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-xl border border-border bg-card hover:bg-muted text-foreground transition-all shadow-xs cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print to PDF</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white transition-all shadow-md shadow-sky-500/20 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV / Excel</span>
          </button>
        </div>
      </div>

      {/* Report Selector Tabs */}
      <div className="flex items-center gap-2 border-b border-border/40 pb-2 overflow-x-auto">
        {[
          { id: "invoicing", label: "Client Invoicing & Billing", badge: "New" },
          { id: "executive", label: "Executive Operations Summary" },
          { id: "utilization", label: "Resource Utilization Audit" },
          { id: "projects", label: "Project Portfolio & Spend" },
          { id: "capacity", label: "Department Capacity Breakdown" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveReport(tab.id as any)}
            className={`px-3.5 py-2 text-xs rounded-xl font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeReport === tab.id
                ? "bg-[#c7ff65] text-[#11140e] shadow-md shadow-emerald-500/20 font-bold"
                : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>{tab.label}</span>
            {tab.badge && (
              <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* TAB 1: CLIENT INVOICING & BILLING */}
      {activeReport === "invoicing" && (
        <div className="space-y-6">
          {/* Quick Invoice Editor Pill Bar */}
          <div className="p-4 rounded-2xl border border-border/50 bg-card/60 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-mono text-muted-foreground font-semibold">Client Name</label>
              <input
                type="text"
                value={invoiceData.clientName}
                onChange={(e) => setInvoiceData({ ...invoiceData, clientName: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg bg-background border border-border text-foreground font-medium outline-none font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-mono text-muted-foreground font-semibold">Invoice Number</label>
              <input
                type="text"
                value={invoiceData.invoiceNumber}
                onChange={(e) => setInvoiceData({ ...invoiceData, invoiceNumber: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg bg-background border border-border text-foreground font-medium outline-none font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-mono text-muted-foreground font-semibold">Payment Due Date</label>
              <input
                type="date"
                value={invoiceData.dueDate}
                onChange={(e) => setInvoiceData({ ...invoiceData, dueDate: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg bg-background border border-border text-foreground font-medium outline-none font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-mono text-muted-foreground font-semibold">Tax Rate (%)</label>
              <input
                type="number"
                step="0.1"
                value={invoiceData.taxRate}
                onChange={(e) => setInvoiceData({ ...invoiceData, taxRate: Number(e.target.value) })}
                className="w-full px-3 py-1.5 rounded-lg bg-background border border-border text-foreground font-medium outline-none font-mono"
              />
            </div>
          </div>

          {/* Printable Invoice Document Card */}
          <div className="border border-border/60 rounded-3xl p-8 bg-card/90 shadow-2xl backdrop-blur-xl space-y-8 max-w-4xl mx-auto font-sans print:border-none print:shadow-none print:p-0">
            {/* Header: Company & Invoice Badges */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/40 pb-6">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center font-mono border border-emerald-500/30">
                    RP
                  </div>
                  <h3 className="text-xl font-extrabold text-foreground font-mono tracking-tight">
                    {teamName.toUpperCase()}
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground font-mono mt-1">
                  ResourcePulse Universal Telemetry & Operations Core
                </p>
              </div>

              <div className="text-right sm:text-right">
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Official Client Invoice
                </span>
                <div className="text-lg font-bold font-mono text-foreground mt-2">{invoiceData.invoiceNumber}</div>
              </div>
            </div>

            {/* Bill To & Metadata Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground font-bold block">
                  Billed To
                </span>
                <strong className="text-sm font-bold text-foreground block">{invoiceData.clientName}</strong>
                <p className="text-muted-foreground">{invoiceData.clientEmail}</p>
                <p className="text-muted-foreground">{invoiceData.clientAddress}</p>
              </div>

              <div className="space-y-1.5 sm:text-right">
                <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground font-bold block">
                  Invoice Details
                </span>
                <p className="text-muted-foreground font-mono">
                  <strong>Issued Date:</strong> {invoiceData.issueDate}
                </p>
                <p className="text-muted-foreground font-mono">
                  <strong>Payment Due:</strong> {invoiceData.dueDate} (Net 30)
                </p>
                <p className="text-muted-foreground font-mono">
                  <strong>Currency:</strong> USD ($)
                </p>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="border border-border/40 rounded-2xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px] font-mono tracking-wider border-b border-border/30">
                  <tr>
                    <th className="px-5 py-3.5">Service / Milestone Description</th>
                    <th className="px-5 py-3.5 text-right">Hours</th>
                    <th className="px-5 py-3.5 text-right">Rate</th>
                    <th className="px-5 py-3.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {invoiceLineItems.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/20">
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-foreground">{item.description}</div>
                        <div className="text-[11px] text-muted-foreground font-mono">{item.department} Delivery Unit</div>
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-muted-foreground">{item.hours}h</td>
                      <td className="px-5 py-3.5 text-right font-mono text-muted-foreground">${item.rate}/h</td>
                      <td className="px-5 py-3.5 text-right font-mono font-bold text-foreground">
                        ${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals Calculation */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-4 border-t border-border/40">
              <div className="max-w-md text-xs text-muted-foreground space-y-1">
                <strong>Remittance Instructions:</strong>
                <p className="text-[11px]">
                  Direct ACH / Wire Transfer: Routing 021000021 · Account 8839201948 · Swift: RPULSEUS33
                </p>
                <p className="text-[11px] italic">{invoiceData.notes}</p>
              </div>

              <div className="w-full sm:w-64 space-y-2 text-xs font-mono">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal:</span>
                  <span>${invoiceSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax ({invoiceData.taxRate}%):</span>
                  <span>${invoiceTaxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-foreground pt-2 border-t border-border/40">
                  <span>Total Due:</span>
                  <span className="text-sky-400 text-base">
                    ${invoiceTotalDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: EXECUTIVE SUMMARY */}
      {activeReport === "executive" && (
        <div className="border border-border/50 rounded-2xl p-6 space-y-6 bg-card/40">
          <div>
            <h3 className="font-bold text-base text-foreground">Executive Operations Summary</h3>
            <p className="text-xs text-muted-foreground mt-0.5 font-mono">
              Snapshot generated on {new Date().toLocaleDateString("en-US", { dateStyle: "long" })}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-border/40 bg-background/50">
              <p className="text-xs text-muted-foreground">Active Headcount</p>
              <p className="text-2xl font-bold font-mono text-foreground mt-1">{metrics.totalResources}</p>
              <p className="text-[11px] text-emerald-400 mt-1">{metrics.optimalCount} in optimal band</p>
            </div>

            <div className="p-4 rounded-xl border border-border/40 bg-background/50">
              <p className="text-xs text-muted-foreground">Average Utilization</p>
              <p className="text-2xl font-bold font-mono text-foreground mt-1">{metrics.avgUtilization}%</p>
              <p className="text-[11px] text-muted-foreground mt-1">Target range: 70-85%</p>
            </div>

            <div className="p-4 rounded-xl border border-border/40 bg-background/50">
              <p className="text-xs text-muted-foreground">Project Initiatives</p>
              <p className="text-2xl font-bold font-mono text-foreground mt-1">{metrics.totalProjects}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{metrics.activeProjects} active</p>
            </div>

            <div className="p-4 rounded-xl border border-border/40 bg-background/50">
              <p className="text-xs text-muted-foreground">Estimated Weekly Spend</p>
              <p className="text-2xl font-bold font-mono text-foreground mt-1">
                ${metrics.totalWeeklyCost.toLocaleString()}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">All departments</p>
            </div>
          </div>

          <div className="border-t border-border/30 pt-4">
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2 font-mono">
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

      {/* TAB 3: UTILIZATION AUDIT */}
      {activeReport === "utilization" && (
        <div className="border border-border/50 rounded-2xl overflow-hidden bg-card/40">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/30 text-muted-foreground uppercase text-[10px] font-mono tracking-wider border-b border-border/30">
                <tr>
                  <th className="px-4 py-3">Resource Name</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3 text-right">Weekly Capacity</th>
                  <th className="px-4 py-3 text-right">Assigned Hours</th>
                  <th className="px-4 py-3 text-right">Load %</th>
                  <th className="px-4 py-3 text-right">Hourly Rate</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {resources.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/30">
                    <td className="px-4 py-2.5 font-medium text-foreground">{r.name}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{r.role}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{r.department}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{r.weeklyCapacityHours}h</td>
                    <td className="px-4 py-2.5 text-right font-mono">{r.assignedHours}h</td>
                    <td className="px-4 py-2.5 text-right font-bold text-sky-400 font-mono">{r.utilization}%</td>
                    <td className="px-4 py-2.5 text-right font-mono">${r.costPerHour}/hr</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold font-mono bg-muted text-muted-foreground">
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: PROJECT PORTFOLIO */}
      {activeReport === "projects" && (
        <div className="border border-border/50 rounded-2xl overflow-hidden bg-card/40">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/30 text-muted-foreground uppercase text-[10px] font-mono tracking-wider border-b border-border/30">
                <tr>
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Priority</th>
                  <th className="px-4 py-3 text-right">Hours (Assigned/Req)</th>
                  <th className="px-4 py-3 text-right">Budget</th>
                  <th className="px-4 py-3 text-right">Spend</th>
                  <th className="px-4 py-3 text-right">End Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {projects.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/30">
                    <td className="px-4 py-2.5 font-medium text-foreground">{p.name}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{p.department}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400">
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center font-mono">{p.priority}</td>
                    <td className="px-4 py-2.5 text-right font-mono">
                      {p.assignedHours} / {p.requiredHours}h
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono">${(p.budget || 0).toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold text-foreground">
                      ${(p.actualExpenditure || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">{p.endDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: DEPARTMENT CAPACITY */}
      {activeReport === "capacity" && (
        <div className="border border-border/50 rounded-2xl overflow-hidden bg-card/40">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/30 text-muted-foreground uppercase text-[10px] font-mono tracking-wider border-b border-border/30">
                <tr>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3 text-right">Resource Count</th>
                  <th className="px-4 py-3 text-right">Available Capacity</th>
                  <th className="px-4 py-3 text-right">Committed Hours</th>
                  <th className="px-4 py-3 text-right">Utilization %</th>
                  <th className="px-4 py-3 text-right">Weekly Expenditure</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {metrics.departments.map((d) => (
                  <tr key={d.name} className="hover:bg-muted/30">
                    <td className="px-4 py-2.5 font-medium text-foreground">{d.name}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{d.resourceCount}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{d.capacityHours}h</td>
                    <td className="px-4 py-2.5 text-right font-mono">{d.assignedHours}h</td>
                    <td className="px-4 py-2.5 text-right font-bold text-sky-400 font-mono">{d.utilization}%</td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold text-foreground">
                      ${d.weeklyCost.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReportsView;

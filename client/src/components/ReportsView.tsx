import { useState, useMemo } from "react";
import {
  FileText,
  Download,
  Printer,
  Table as TableIcon,
  CheckCircle2,
  Calendar,
  Layers3,
  DollarSign,
  TrendingUp,
  Receipt,
  Building2,
  Send,
  Sparkles,
  CreditCard,
  Copy,
  Check,
  Search,
  Plus,
  Trash2,
  Clock3,
  Maximize2,
  Minimize2,
  LayoutGrid,
  Filter,
  ArrowUpRight,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { Resource, Project, ThresholdSettings } from "@shared/orgTypes";
import {
  loadInitialResources,
  loadInitialProjects,
  loadThresholds,
  computeOrgMetrics,
} from "@/lib/orgStore";

interface InvoiceLineItem {
  id: string;
  description: string;
  department: string;
  hours: number;
  rate: number;
  amount: number;
}

export function ReportsView() {
  const [resources] = useState<Resource[]>(() => loadInitialResources());
  const [projects] = useState<Project[]>(() => loadInitialProjects());
  const [thresholds] = useState<ThresholdSettings>(() => loadThresholds());
  const [activeReport, setActiveReport] = useState<
    "invoicing" | "executive" | "utilization" | "projects" | "capacity"
  >("invoicing");

  const [teamName] = useState(
    () => localStorage.getItem("resourcepulse_team_name") || "Operations Team Alpha"
  );

  // Invoicing Customization State
  const [invoiceData, setInvoiceData] = useState({
    invoiceNumber: "INV-2026-0042",
    clientName: "Enterprise Client Corp",
    clientEmail: "billing@clientcorp.com",
    clientAddress: "100 Innovation Way, Suite 400, New York, NY",
    issueDate: new Date().toISOString().split("T")[0],
    dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
    taxRate: 8.5,
    currency: "USD ($)",
    paymentTerms: "Net 30 Days",
    notes: "Payment due within 30 days of invoice date. Thank you for your partnership!",
  });

  const [copiedLink, setCopiedLink] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const metrics = useMemo(() => {
    return computeOrgMetrics(resources, projects, thresholds);
  }, [resources, projects, thresholds]);

  // Load timesheet entries if present
  const timesheetEntries = useMemo(() => {
    try {
      const raw = localStorage.getItem("resourcepulse_timesheet_entries");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  }, []);

  // Invoice Data Source: "projects" vs "timesheets"
  const [billingDataSource, setBillingDataSource] = useState<"projects" | "timesheets">("projects");

  // Editable dynamic invoice line items
  const [customLineItems, setCustomLineItems] = useState<InvoiceLineItem[] | null>(null);

  const initialLineItems = useMemo((): InvoiceLineItem[] => {
    if (billingDataSource === "timesheets" && timesheetEntries.length > 0) {
      return timesheetEntries.map((ts, idx) => ({
        id: `TS-ITEM-${idx + 1}`,
        description: `${ts.taskName} — ${ts.projectName} (${ts.resourceName})`,
        department: "Core Operations",
        hours: Number(ts.actualHours) || 8,
        rate: Number(ts.hourlyRate) || 85,
        amount: (Number(ts.actualHours) || 8) * (Number(ts.hourlyRate) || 85),
      }));
    }

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

    // Default seed
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
  }, [billingDataSource, timesheetEntries, projects]);

  const invoiceLineItems = customLineItems || initialLineItems;

  const invoiceSubtotal = useMemo(() => {
    return invoiceLineItems.reduce((acc, item) => acc + item.amount, 0);
  }, [invoiceLineItems]);

  const totalBillableHours = useMemo(() => {
    return invoiceLineItems.reduce((acc, item) => acc + item.hours, 0);
  }, [invoiceLineItems]);

  const averageHourlyRate = useMemo(() => {
    return totalBillableHours > 0 ? Math.round(invoiceSubtotal / totalBillableHours) : 85;
  }, [invoiceSubtotal, totalBillableHours]);

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
        "Line Item Description,Department,Hours,Hourly Rate,Amount\n";
      invoiceLineItems.forEach((item) => {
        csvContent += `"${item.description}","${item.department}",${item.hours},$${item.rate},$${item.amount}\n`;
      });
      csvContent += `\nSubtotal,,,${invoiceSubtotal.toFixed(2)}\n`;
      csvContent += `Tax (${invoiceData.taxRate}%),,,${invoiceTaxAmount.toFixed(2)}\n`;
      csvContent += `Total Amount Due,,,${invoiceTotalDue.toFixed(2)}\n`;
    } else if (activeReport === "utilization") {
      csvContent =
        "Name,Role,Department,Weekly Capacity,Assigned Hours,Utilization %,Hourly Rate,Status\n";
      resources.forEach((r) => {
        csvContent += `"${r.name}","${r.role}","${r.department}",${r.weeklyCapacityHours},${r.assignedHours},${r.utilization}%,$${r.costPerHour},"${r.status}"\n`;
      });
    } else if (activeReport === "projects") {
      csvContent =
        "Project Name,Department,Status,Priority,Required Hours,Assigned Hours,Budget,Expenditure,End Date\n";
      projects.forEach((p) => {
        csvContent += `"${p.name}","${p.department}","${p.status}","${p.priority}",${p.requiredHours},${
          p.assignedHours
        },$${p.budget || p.allocatedBudget || 0},$${p.actualExpenditure},"${p.endDate}"\n`;
      });
    } else if (activeReport === "capacity") {
      csvContent =
        "Department,Resource Count,Available Capacity Hours,Committed Hours,Utilization %,Weekly Cost\n";
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
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(
        `${window.location.origin}/portal/invoice?inv=${encodeURIComponent(invoiceData.invoiceNumber)}`
      );
      setCopiedLink(true);
      toast.success("Client Invoice Portal Link Copied");
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleAddLineItem = () => {
    const newItem: InvoiceLineItem = {
      id: `ITEM-${Date.now()}`,
      description: "Additional Technical Consulting & Operational Execution",
      department: "Delivery",
      hours: 10,
      rate: 85,
      amount: 850,
    };
    setCustomLineItems([...invoiceLineItems, newItem]);
    toast.success("Line Item Added");
  };

  const handleDeleteLineItem = (id: string) => {
    if (invoiceLineItems.length <= 1) {
      toast.error("Invoice must have at least one line item");
      return;
    }
    setCustomLineItems(invoiceLineItems.filter((it) => it.id !== id));
    toast.info("Line Item Removed");
  };

  return (
    <div className="w-full max-w-full space-y-6 overflow-x-hidden">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-sky-500/10 text-sky-400 uppercase tracking-wider font-mono">
              Enterprise Billing & Governance
            </span>
            <span className="text-xs text-muted-foreground">• Verifiable Operational Audits</span>
          </div>
          <h2 className="text-2xl font-bold text-foreground mt-1 tracking-tight">
            Reports & Invoicing
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Audit utilization, project portfolio budgets, and generate professional client invoices with 1-click export to PDF and CSV.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeReport === "invoicing" && (
            <button
              onClick={handleCopyInvoiceLink}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border border-border bg-card hover:bg-muted text-foreground transition-all shadow-xs cursor-pointer"
            >
              {copiedLink ? (
                <Check className="w-3.5 h-3.5 text-sky-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
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
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Primary Report Selector Tabs */}
      <div className="flex items-center gap-2 border-b border-border/40 pb-3 overflow-x-auto w-full scrollbar-none">
        {[
          { id: "invoicing", label: "Client Invoicing & Billing", badge: "Live" },
          { id: "executive", label: "Executive Operations Summary" },
          { id: "utilization", label: "Resource Utilization Audit" },
          { id: "projects", label: "Project Portfolio & Spend" },
          { id: "capacity", label: "Department Capacity Breakdown" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveReport(tab.id as any);
              setSearchQuery("");
            }}
            className={`px-3.5 py-2 text-xs rounded-xl font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeReport === tab.id
                ? "bg-sky-600 text-white shadow-md shadow-sky-600/30 font-bold"
                : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>{tab.label}</span>
            {tab.badge && (
              <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-sky-500/20 text-sky-300 border border-sky-500/40 font-mono">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: CLIENT INVOICING & BILLING */}
      {/* ========================================================================= */}
      {activeReport === "invoicing" && (
        <div className="space-y-6 w-full">
          {/* Executive Invoice KPI Cards Banner */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
            <div className="p-4 rounded-2xl border border-sky-500/30 bg-card/80 backdrop-blur-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/10 rounded-full blur-xl -mr-6 -mt-6 pointer-events-none" />
              <p className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">
                Total Amount Due
              </p>
              <p className="text-2xl font-bold font-mono text-sky-400 mt-1">
                ${invoiceTotalDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Incl. {invoiceData.taxRate}% tax (${invoiceTaxAmount.toFixed(2)})
              </p>
            </div>

            <div className="p-4 rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm">
              <p className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">
                Total Billable Hours
              </p>
              <p className="text-2xl font-bold font-mono text-foreground mt-1">
                {totalBillableHours.toFixed(1)}h
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Across {invoiceLineItems.length} deliverable item(s)
              </p>
            </div>

            <div className="p-4 rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm">
              <p className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">
                Blended Hourly Yield
              </p>
              <p className="text-2xl font-bold font-mono text-foreground mt-1">
                ${averageHourlyRate}/h
              </p>
              <p className="text-[11px] text-sky-400 mt-1">Subtotal: ${invoiceSubtotal.toLocaleString()}</p>
            </div>

            <div className="p-4 rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm">
              <p className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">
                Payment Terms & Due
              </p>
              <p className="text-lg font-bold font-mono text-foreground mt-1 truncate">
                {invoiceData.dueDate}
              </p>
              <p className="text-[11px] text-emerald-400 mt-1 font-mono">
                {invoiceData.paymentTerms} (Active)
              </p>
            </div>
          </div>

          {/* Controls Bar: Data Source & View Mode Switcher */}
          <div className="p-3.5 rounded-2xl border border-border/50 bg-card/50 flex flex-wrap items-center justify-between gap-3 text-xs w-full">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-semibold">Data Source:</span>
              <button
                onClick={() => {
                  setBillingDataSource("projects");
                  setCustomLineItems(null);
                }}
                className={`px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer ${
                  billingDataSource === "projects"
                    ? "bg-sky-500/20 text-sky-400 border border-sky-500/40 font-bold"
                    : "bg-muted/30 text-muted-foreground hover:text-foreground"
                }`}
              >
                Project Allocations ({projects.length})
              </button>
              {timesheetEntries.length > 0 && (
                <button
                  onClick={() => {
                    setBillingDataSource("timesheets");
                    setCustomLineItems(null);
                  }}
                  className={`px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer ${
                    billingDataSource === "timesheets"
                      ? "bg-sky-500/20 text-sky-400 border border-sky-500/40 font-bold"
                      : "bg-muted/30 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Timesheets Telemetry ({timesheetEntries.length})
                </button>
              )}
            </div>

          </div>

          {/* MAIN RESPONSIVE INVOICE CANVAS (Fits screen on all devices) */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start w-full max-w-full">
            {/* LEFT COLUMN: Controls & Metadata Configuration (4 cols) */}
            <div className="xl:col-span-4 space-y-4 w-full">
                <div className="p-5 rounded-2xl border border-border/50 bg-card/70 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-border/30 pb-3">
                    <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-sky-400" />
                      <span>Invoice Metadata</span>
                    </h3>
                    <span className="text-[10px] font-mono text-sky-400 px-2 py-0.5 rounded bg-sky-500/10">
                      Editable
                    </span>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="text-[10px] uppercase font-mono text-muted-foreground font-semibold block mb-1">
                        Client Business Name
                      </label>
                      <input
                        type="text"
                        value={invoiceData.clientName}
                        onChange={(e) => setInvoiceData({ ...invoiceData, clientName: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground font-medium outline-none focus:border-sky-500 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] uppercase font-mono text-muted-foreground font-semibold block mb-1">
                        Client Billing Email
                      </label>
                      <input
                        type="email"
                        value={invoiceData.clientEmail}
                        onChange={(e) => setInvoiceData({ ...invoiceData, clientEmail: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground font-medium outline-none focus:border-sky-500 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] uppercase font-mono text-muted-foreground font-semibold block mb-1">
                        Client Address
                      </label>
                      <input
                        type="text"
                        value={invoiceData.clientAddress}
                        onChange={(e) => setInvoiceData({ ...invoiceData, clientAddress: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground font-medium outline-none focus:border-sky-500 transition-colors"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] uppercase font-mono text-muted-foreground font-semibold block mb-1">
                          Invoice Number
                        </label>
                        <input
                          type="text"
                          value={invoiceData.invoiceNumber}
                          onChange={(e) => setInvoiceData({ ...invoiceData, invoiceNumber: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground font-mono font-medium outline-none focus:border-sky-500 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-mono text-muted-foreground font-semibold block mb-1">
                          Tax Rate (%)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={invoiceData.taxRate}
                          onChange={(e) => setInvoiceData({ ...invoiceData, taxRate: Number(e.target.value) })}
                          className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground font-mono font-medium outline-none focus:border-sky-500 transition-colors"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] uppercase font-mono text-muted-foreground font-semibold block mb-1">
                          Issue Date
                        </label>
                        <input
                          type="date"
                          value={invoiceData.issueDate}
                          onChange={(e) => setInvoiceData({ ...invoiceData, issueDate: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground font-mono font-medium outline-none focus:border-sky-500 transition-colors text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-mono text-muted-foreground font-semibold block mb-1">
                          Payment Due
                        </label>
                        <input
                          type="date"
                          value={invoiceData.dueDate}
                          onChange={(e) => setInvoiceData({ ...invoiceData, dueDate: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground font-mono font-medium outline-none focus:border-sky-500 transition-colors text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] uppercase font-mono text-muted-foreground font-semibold block mb-1">
                        Invoice Terms & Notes
                      </label>
                      <textarea
                        rows={2}
                        value={invoiceData.notes}
                        onChange={(e) => setInvoiceData({ ...invoiceData, notes: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground font-medium outline-none focus:border-sky-500 transition-colors text-xs resize-none"
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border/30 flex items-center justify-between">
                    <button
                      onClick={handleAddLineItem}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 border border-sky-500/30 transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Line Item</span>
                    </button>

                    <button
                      onClick={() => setCustomLineItems(null)}
                      className="text-[11px] text-muted-foreground hover:text-foreground underline cursor-pointer"
                    >
                      Reset Items
                    </button>
                  </div>
                </div>

                {/* Banking & Remittance Instructions Card */}
                <div className="p-4 rounded-2xl border border-border/40 bg-card/50 space-y-2 text-xs">
                  <span className="text-[10px] uppercase font-mono text-muted-foreground font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Verified Wire & Direct Deposit</span>
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    Routing: <span className="font-mono text-foreground font-semibold">021000021</span> · Account:{" "}
                    <span className="font-mono text-foreground font-semibold">8839201948</span> · SWIFT:{" "}
                    <span className="font-mono text-foreground font-semibold">RPULSEUS33</span>
                  </p>
                </div>
              </div>

              {/* RIGHT COLUMN: Official Live Invoice Document Preview (8 cols) */}
              <div className="xl:col-span-8 w-full max-w-full overflow-hidden">
                <div className="border border-border/60 rounded-3xl p-6 sm:p-8 bg-card/95 shadow-xl backdrop-blur-xl space-y-8 w-full font-sans print:border-none print:shadow-none print:p-0">
                  {/* Header: Company & Invoice Badges */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/40 pb-6">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500/20 to-blue-600/30 text-sky-400 font-extrabold flex items-center justify-center font-mono border border-sky-500/40 text-sm shadow-xs">
                          RP
                        </div>
                        <div>
                          <h3 className="text-xl font-extrabold text-foreground font-mono tracking-tight leading-none">
                            {teamName.toUpperCase()}
                          </h3>
                          <p className="text-[11px] text-muted-foreground font-mono mt-1">
                            ResourcePulse Universal Operations Core
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="sm:text-right">
                      <span className="px-3 py-1 rounded-full text-xs font-mono font-bold uppercase bg-sky-500/10 text-sky-400 border border-sky-500/30">
                        Official Client Invoice
                      </span>
                      <div className="text-lg font-bold font-mono text-foreground mt-2">
                        {invoiceData.invoiceNumber}
                      </div>
                    </div>
                  </div>

                  {/* Bill To & Metadata Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground font-bold block">
                        Billed To
                      </span>
                      <strong className="text-sm font-bold text-foreground block">
                        {invoiceData.clientName}
                      </strong>
                      <p className="text-muted-foreground font-mono">{invoiceData.clientEmail}</p>
                      <p className="text-muted-foreground">{invoiceData.clientAddress}</p>
                    </div>

                    <div className="space-y-1 sm:text-right">
                      <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground font-bold block">
                        Invoice Details
                      </span>
                      <p className="text-muted-foreground font-mono">
                        <strong className="text-foreground">Issue Date:</strong> {invoiceData.issueDate}
                      </p>
                      <p className="text-muted-foreground font-mono">
                        <strong className="text-foreground">Due Date:</strong> {invoiceData.dueDate} ({invoiceData.paymentTerms})
                      </p>
                      <p className="text-muted-foreground font-mono">
                        <strong className="text-foreground">Currency:</strong> {invoiceData.currency}
                      </p>
                    </div>
                  </div>

                  {/* Line Items Table with horizontal overflow guard */}
                  <div className="border border-border/40 rounded-2xl overflow-hidden bg-background/40">
                    <div className="overflow-x-auto w-full">
                      <table className="w-full text-xs text-left min-w-[500px]">
                        <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px] font-mono tracking-wider border-b border-border/30">
                          <tr>
                            <th className="px-4 py-3">Service / Milestone Description</th>
                            <th className="px-4 py-3 text-right">Hours</th>
                            <th className="px-4 py-3 text-right">Rate</th>
                            <th className="px-4 py-3 text-right">Amount</th>
                            <th className="px-2 py-3 text-center w-8"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/20">
                          {invoiceLineItems.map((item) => (
                            <tr key={item.id} className="hover:bg-muted/20 transition-colors group">
                              <td className="px-4 py-3">
                                <div className="font-semibold text-foreground">{item.description}</div>
                                <div className="text-[11px] text-muted-foreground font-mono">
                                  {item.department} Delivery Unit
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                                {item.hours.toFixed(1)}h
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                                ${item.rate}/h
                              </td>
                              <td className="px-4 py-3 text-right font-mono font-bold text-foreground">
                                ${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-2 py-3 text-center">
                                <button
                                  onClick={() => handleDeleteLineItem(item.id)}
                                  className="text-muted-foreground/40 hover:text-rose-400 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                  title="Remove item"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Totals & Remittance Calculation */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 pt-4 border-t border-border/40">
                    <div className="max-w-md text-xs text-muted-foreground space-y-1">
                      <strong className="text-foreground">Payment Instructions:</strong>
                      <p className="text-[11px]">
                        Direct ACH / Wire Transfer: Routing 021000021 · Account 8839201948 · Swift: RPULSEUS33
                      </p>
                      <p className="text-[11px] italic text-sky-400/80">{invoiceData.notes}</p>
                    </div>

                    <div className="w-full sm:w-64 space-y-2 text-xs font-mono ml-auto">
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
            </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: EXECUTIVE SUMMARY */}
      {/* ========================================================================= */}
      {activeReport === "executive" && (
        <div className="border border-border/50 rounded-2xl p-6 space-y-6 bg-card/60 w-full shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/30 pb-4">
            <div>
              <h3 className="font-bold text-base text-foreground">Executive Operations Summary</h3>
              <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                Real-time operational telemetry snapshot generated on{" "}
                {new Date().toLocaleDateString("en-US", { dateStyle: "long" })}
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/30 w-fit">
              99.9% Nominal Telemetry
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
            <div className="p-4 rounded-xl border border-border/40 bg-background/50">
              <p className="text-xs text-muted-foreground">Active Headcount</p>
              <p className="text-2xl font-bold font-mono text-foreground mt-1">{metrics.totalResources}</p>
              <p className="text-[11px] text-sky-400 mt-1">{metrics.optimalCount} in optimal band</p>
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

          <div className="border-t border-border/30 pt-4 space-y-3">
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider font-mono">
              Operational Telemetry Analysis
            </h4>
            <div className="p-4 rounded-xl border border-border/40 bg-background/40 text-xs text-muted-foreground leading-relaxed space-y-2">
              <p>
                The organization has{" "}
                <strong className="text-foreground font-mono">{metrics.availableCapacityHours}h</strong>{" "}
                of available weekly capacity against{" "}
                <strong className="text-foreground font-mono">{metrics.totalAssignedHours}h</strong> of
                committed project demand.
              </p>
              <p>
                {metrics.capacityGapHours > 0 ? (
                  <span className="text-amber-400">
                    ⚠ An unstaffed gap of {metrics.capacityGapHours} hours requires resource rebalancing or
                    contractor burst allocation.
                  </span>
                ) : (
                  <span className="text-emerald-400">
                    ✓ Workload distribution is within safe operating margins with 0 critical project
                    bottlenecks.
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: UTILIZATION AUDIT */}
      {/* ========================================================================= */}
      {activeReport === "utilization" && (
        <div className="border border-border/50 rounded-2xl overflow-hidden bg-card/60 w-full shadow-sm">
          <div className="p-4 border-b border-border/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="font-bold text-sm text-foreground">Resource Utilization Audit</h4>
              <p className="text-xs text-muted-foreground font-mono">
                {resources.length} registered team members tracked across workspace
              </p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search member or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-xs text-left min-w-[700px]">
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
                {resources
                  .filter(
                    (r) =>
                      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      r.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      r.department.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((r) => (
                    <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2.5 font-medium text-foreground">{r.name}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{r.role}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{r.department}</td>
                      <td className="px-4 py-2.5 text-right font-mono">{r.weeklyCapacityHours}h</td>
                      <td className="px-4 py-2.5 text-right font-mono">{r.assignedHours}h</td>
                      <td className="px-4 py-2.5 text-right font-bold text-sky-400 font-mono">
                        {r.utilization}%
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono">${r.costPerHour}/hr</td>
                      <td className="px-4 py-2.5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold font-mono ${
                            r.utilization > 100
                              ? "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                              : r.utilization >= 70
                              ? "bg-sky-500/10 text-sky-400 border border-sky-500/30"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
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

      {/* ========================================================================= */}
      {/* TAB 4: PROJECT PORTFOLIO */}
      {/* ========================================================================= */}
      {activeReport === "projects" && (
        <div className="border border-border/50 rounded-2xl overflow-hidden bg-card/60 w-full shadow-sm">
          <div className="p-4 border-b border-border/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="font-bold text-sm text-foreground">Project Portfolio & Spend</h4>
              <p className="text-xs text-muted-foreground font-mono">
                {projects.length} planned & active initiatives
              </p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-xs text-left min-w-[750px]">
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
                {projects
                  .filter(
                    (p) =>
                      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      p.department.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((p) => (
                    <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2.5 font-medium text-foreground">{p.name}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{p.department}</td>
                      <td className="px-4 py-2.5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                            p.status === "At Risk"
                              ? "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                              : "bg-sky-500/10 text-sky-400 border border-sky-500/30"
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-center font-mono">{p.priority}</td>
                      <td className="px-4 py-2.5 text-right font-mono">
                        {p.assignedHours} / {p.requiredHours}h
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono">
                        ${(p.budget || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold text-foreground">
                        ${(p.actualExpenditure || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">
                        {p.endDate}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: DEPARTMENT CAPACITY */}
      {/* ========================================================================= */}
      {activeReport === "capacity" && (
        <div className="border border-border/50 rounded-2xl overflow-hidden bg-card/60 w-full shadow-sm">
          <div className="p-4 border-b border-border/30">
            <h4 className="font-bold text-sm text-foreground">Department Capacity Breakdown</h4>
            <p className="text-xs text-muted-foreground font-mono">
              Committed workload and financial expenditure by operating unit
            </p>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-xs text-left min-w-[650px]">
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
                  <tr key={d.name} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5 font-medium text-foreground">{d.name}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{d.resourceCount}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{d.capacityHours}h</td>
                    <td className="px-4 py-2.5 text-right font-mono">{d.assignedHours}h</td>
                    <td className="px-4 py-2.5 text-right font-bold text-sky-400 font-mono">
                      {d.utilization}%
                    </td>
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

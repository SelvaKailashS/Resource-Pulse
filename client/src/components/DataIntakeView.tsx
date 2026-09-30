import { useState, useRef } from "react";
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Download,
  Trash2,
  RefreshCw,
  Plus,
  ArrowRight,
  Database,
  ShieldCheck,
  Table,
} from "lucide-react";
import { toast } from "sonner";
import { Resource, DataQualityReport, Project } from "@shared/orgTypes";
import {
  evaluateRawDataQuality,
  saveResources,
  loadInitialResources,
  saveProjects,
  loadInitialProjects,
} from "@/lib/orgStore";

interface DataIntakeViewProps {
  onImportComplete?: () => void;
  onNavigateToResources?: () => void;
}

export function DataIntakeView({ onImportComplete, onNavigateToResources }: DataIntakeViewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<"upload" | "manual">("upload");
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rawRows, setRawRows] = useState<any[]>([]);
  const [detectedColumns, setDetectedColumns] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<{
    name: string;
    role: string;
    department: string;
    weeklyCapacityHours: string;
    costPerHour: string;
    skills: string;
    currentProjects: string;
    email: string;
  }>({
    name: "",
    role: "",
    department: "",
    weeklyCapacityHours: "",
    costPerHour: "",
    skills: "",
    currentProjects: "",
    email: "",
  });

  const [qualityReport, setQualityReport] = useState<DataQualityReport | null>(null);
  const [importMode, setImportMode] = useState<"append" | "replace">("append");
  const [isProcessing, setIsProcessing] = useState(false);

  // Manual entry states
  const [manualName, setManualName] = useState("");
  const [manualRole, setManualRole] = useState("Software Engineer");
  const [manualDept, setManualDept] = useState("Engineering");
  const [manualHours, setManualHours] = useState(40);
  const [manualCost, setManualCost] = useState(65);
  const [manualSkills, setManualSkills] = useState("TypeScript, React, Python");
  const [manualProject, setManualProject] = useState("Core Platform");
  const [manualEmail, setManualEmail] = useState("");

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const parseFileContent = (content: string, name: string) => {
    try {
      if (name.endsWith(".json")) {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed) && parsed.length > 0) {
          processParsedData(parsed, name);
          return;
        } else {
          toast.error("JSON file must contain an array of resource records");
          return;
        }
      }

      // CSV or plain text parsing
      const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length < 2) {
        toast.error("File contains insufficient data (header and at least one row required)");
        return;
      }

      const headers = lines[0].split(",").map((h) => h.trim().replace(/^["']|["']$/g, ""));
      const rows: any[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        // Basic CSV split respecting quotes
        const values: string[] = [];
        let current = "";
        let inQuotes = false;
        for (let c = 0; c < line.length; c++) {
          const char = line[c];
          if (char === '"' || char === "'") {
            inQuotes = !inQuotes;
          } else if (char === "," && !inQuotes) {
            values.push(current.trim().replace(/^["']|["']$/g, ""));
            current = "";
          } else {
            current += char;
          }
        }
        values.push(current.trim().replace(/^["']|["']$/g, ""));

        const rowObj: any = {};
        headers.forEach((h, idx) => {
          rowObj[h] = values[idx] !== undefined ? values[idx] : "";
        });
        rows.push(rowObj);
      }

      processParsedData(rows, name, headers);
    } catch (err: any) {
      toast.error(`Failed to parse file: ${err.message || "Invalid syntax"}`);
    }
  };

  const processParsedData = (rows: any[], name: string, headers?: string[]) => {
    setFileName(name);
    setRawRows(rows);

    const detected = headers || Object.keys(rows[0] || {});
    setDetectedColumns(detected);

    // Auto-detect mappings
    const mapping = {
      name: detected.find((c) => /name|full_name|employee|member/i.test(c)) || detected[0] || "",
      role: detected.find((c) => /role|title|position|designation/i.test(c)) || "",
      department: detected.find((c) => /dept|department|team|division/i.test(c)) || "",
      weeklyCapacityHours: detected.find((c) => /capacity|hours|weekly_hours|max_hours/i.test(c)) || "",
      costPerHour: detected.find((c) => /rate|cost|hourly_rate|salary/i.test(c)) || "",
      skills: detected.find((c) => /skill|technologies|expertise/i.test(c)) || "",
      currentProjects: detected.find((c) => /project|deliverable|assignment/i.test(c)) || "",
      email: detected.find((c) => /email|mail/i.test(c)) || "",
    };
    setColumnMapping(mapping);

    // Evaluate Quality
    const quality = evaluateRawDataQuality(rows, mapping);
    setQualityReport(quality);
    toast.success(`Loaded ${rows.length} rows from ${name}`);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        parseFileContent(text, file.name);
      };
      reader.readAsText(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        parseFileContent(text, file.name);
      };
      reader.readAsText(file);
    }
  };

  const handleDownloadSample = () => {
    const csvContent =
      "Full Name,Role,Department,Weekly Capacity,Hourly Rate,Skills,Current Project,Email\n" +
      "Devon Vance,Senior Full-Stack Engineer,Platform Core,40,75,\"TypeScript, React, Node.js, PostgreSQL\",Payment Gateway v2,devon@organization.internal\n" +
      "Amara Okafor,Lead Cloud Architect,Infrastructure,40,95,\"AWS, Terraform, Kubernetes, Docker\",Cluster Reliability,amara@organization.internal\n" +
      "Liam Chen,Mobile QA Specialist,Quality Engineering,35,60,\"Appium, Jest, iOS, Android\",Mobile Release,liam@organization.internal\n" +
      "Sophia Martinez,Data & ML Engineer,Analytics,40,85,\"Python, PyTorch, SQL, Snowflake\",Forecasting Model,sophia@organization.internal\n";

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "resourcepulse_enterprise_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Sample template downloaded");
  };

  const handleExecuteImport = () => {
    if (rawRows.length === 0) {
      toast.error("No records loaded to import");
      return;
    }
    if (!columnMapping.name) {
      toast.error("Please map the 'Name' column before importing");
      return;
    }

    setIsProcessing(true);

    try {
      const existing = importMode === "append" ? loadInitialResources() : [];
      const newResources: Resource[] = rawRows
        .filter((r) => r[columnMapping.name] && String(r[columnMapping.name]).trim().length > 0)
        .map((r, idx) => {
          const rawHours = parseFloat(r[columnMapping.weeklyCapacityHours]);
          const capacityHours = !isNaN(rawHours) && rawHours > 0 ? rawHours : 40;
          const rawCost = parseFloat(String(r[columnMapping.costPerHour]).replace(/[^0-9.]/g, ""));
          const costPerHour = !isNaN(rawCost) && rawCost > 0 ? rawCost : 50;

          const rawSkills = r[columnMapping.skills];
          const skillsList =
            typeof rawSkills === "string"
              ? rawSkills.split(/[,;|]/).map((s) => s.trim()).filter((s) => s.length > 0)
              : Array.isArray(rawSkills)
              ? rawSkills
              : ["General Operations"];

          const proj = r[columnMapping.currentProjects] ? String(r[columnMapping.currentProjects]).trim() : "";
          const assignedHours = proj ? Math.round(capacityHours * 0.75) : 0;
          const utilization = Math.round((assignedHours / capacityHours) * 100);

          return {
            id: `RES-${Date.now().toString(36).toUpperCase()}-${String(idx + 1).padStart(3, "0")}`,
            name: String(r[columnMapping.name]).trim(),
            role: r[columnMapping.role] ? String(r[columnMapping.role]).trim() : "Team Specialist",
            department: r[columnMapping.department] ? String(r[columnMapping.department]).trim() : "Operations",
            team: "Core Team",
            weeklyCapacityHours: capacityHours,
            assignedHours,
            utilization,
            costPerHour,
            skills: skillsList.length > 0 ? skillsList : ["Operations"],
            experienceYears: 3,
            location: "HQ / Remote",
            employmentType: "Full-Time",
            status: utilization > 100 ? "Overallocated" : utilization > 0 ? "Allocated" : "Available",
            currentProjects: proj ? [proj] : [],
            email: r[columnMapping.email] ? String(r[columnMapping.email]).trim() : undefined,
          };
        });

      const combined = [...existing, ...newResources];
      saveResources(combined);

      // Auto-register any new projects found in import
      const existingProjects = loadInitialProjects();
      const projectNames = Array.from(
        new Set(newResources.flatMap((r) => r.currentProjects).filter((p) => p && p.length > 0))
      );
      const newProjects: Project[] = [];
      projectNames.forEach((pName, pIdx) => {
        if (!existingProjects.some((ep) => ep.name.toLowerCase() === pName.toLowerCase())) {
          newProjects.push({
            id: `PRJ-${Date.now().toString(36).toUpperCase()}-${pIdx + 1}`,
            name: pName,
            department: "Delivery",
            status: "In Progress",
            priority: "High",
            startDate: new Date().toISOString().slice(0, 10),
            endDate: new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10),
            requiredHours: 120,
            assignedHours: 80,
            budget: 25000,
            allocatedBudget: 25000,
            actualExpenditure: 8500,
            requiredSkills: ["Operations", "Delivery"],
            assignedResourceIds: [],
            milestones: [
              { id: "M1", title: "Milestone 1 - Initial Phase", dueDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10), completed: false },
              { id: "M2", title: "Milestone 2 - Integration & Testing", dueDate: new Date(Date.now() + 35 * 86400000).toISOString().slice(0, 10), completed: false },
            ],
          });
        }
      });
      if (newProjects.length > 0) {
        saveProjects([...existingProjects, ...newProjects]);
      }

      toast.success(`Successfully imported ${newResources.length} records into ResourcePulse!`);
      setIsProcessing(false);
      if (onImportComplete) onImportComplete();
      if (onNavigateToResources) onNavigateToResources();
    } catch (err: any) {
      toast.error(`Import failed: ${err.message}`);
      setIsProcessing(false);
    }
  };

  const handleAddManualResource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim()) {
      toast.error("Please enter a name");
      return;
    }

    const existing = loadInitialResources();
    const skillsList = manualSkills
      .split(/[,;|]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const newRes: Resource = {
      id: `RES-${Date.now().toString(36).toUpperCase()}-001`,
      name: manualName.trim(),
      role: manualRole.trim(),
      department: manualDept.trim(),
      team: "Core Operations",
      weeklyCapacityHours: Number(manualHours) || 40,
      assignedHours: manualProject ? Math.round(Number(manualHours) * 0.7) : 0,
      utilization: manualProject ? 70 : 0,
      costPerHour: Number(manualCost) || 50,
      skills: skillsList.length > 0 ? skillsList : ["Operations"],
      experienceYears: 3,
      location: "HQ / Remote",
      employmentType: "Full-Time",
      status: manualProject ? "Allocated" : "Available",
      currentProjects: manualProject ? [manualProject.trim()] : [],
      email: manualEmail.trim() || undefined,
    };

    saveResources([...existing, newRes]);
    toast.success(`Added ${newRes.name} to organization!`);

    // Reset form
    setManualName("");
    setManualEmail("");
    if (onImportComplete) onImportComplete();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-primary/10 text-primary uppercase tracking-wider">
              Universal Intake Engine
            </span>
            <span className="text-xs text-muted-foreground">• CSV, JSON, TXT, Manual Entry</span>
          </div>
          <h2 className="text-2xl font-bold text-foreground mt-1">Data Ingestion & Quality Engine</h2>
          <p className="text-sm text-muted-foreground">
            Import your workforce, projects, and skills with automatic column detection and data quality validation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadSample}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border border-border bg-card/60 hover:bg-accent text-foreground transition-all shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            Download Sample CSV
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/40 gap-4">
        <button
          onClick={() => setActiveTab("upload")}
          className={`pb-2.5 text-sm font-semibold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === "upload"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          File Upload (CSV / JSON)
        </button>
        <button
          onClick={() => setActiveTab("manual")}
          className={`pb-2.5 text-sm font-semibold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === "manual"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Plus className="w-4 h-4" />
          Manual Resource Entry
        </button>
      </div>

      {activeTab === "upload" ? (
        <div className="space-y-6">
          {/* Drag & Drop Area */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              dragActive
                ? "border-primary bg-primary/5 scale-[1.005]"
                : fileName
                ? "border-emerald-500/50 bg-emerald-500/5"
                : "border-border/60 hover:border-border hover:bg-muted/30"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.json,.txt"
              className="hidden"
              onChange={handleFileChange}
            />
            <div className="flex flex-col items-center justify-center gap-3">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  fileName ? "bg-emerald-500/10 text-emerald-500" : "bg-primary/10 text-primary"
                }`}
              >
                {fileName ? <CheckCircle2 className="w-6 h-6" /> : <UploadCloud className="w-6 h-6" />}
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">
                  {fileName ? `Loaded: ${fileName}` : "Click to browse or drag & drop resource data file"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Supports CSV, JSON, and Tabular TXT with automated schema mapping
                </p>
              </div>
              {fileName && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 font-medium">
                    {rawRows.length} rows detected
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFileName(null);
                      setRawRows([]);
                      setQualityReport(null);
                    }}
                    className="text-xs text-muted-foreground hover:text-red-500 flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Clear
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mapping & Quality Section (Visible when file is loaded) */}
          {rawRows.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Column Mapping (2 cols) */}
              <div className="lg:col-span-2 border border-border/50 rounded-xl p-5 bg-card/40 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Table className="w-4 h-4 text-primary" />
                    <h3 className="font-semibold text-sm text-foreground">Column Mapping</h3>
                  </div>
                  <span className="text-xs text-muted-foreground">Verify mapped attributes</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-foreground block mb-1">
                      Resource Name <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={columnMapping.name}
                      onChange={(e) => {
                        const updated = { ...columnMapping, name: e.target.value };
                        setColumnMapping(updated);
                        setQualityReport(evaluateRawDataQuality(rawRows, updated));
                      }}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                    >
                      <option value="">-- Select column --</option>
                      {detectedColumns.map((col) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-foreground block mb-1">Role / Title</label>
                    <select
                      value={columnMapping.role}
                      onChange={(e) => {
                        const updated = { ...columnMapping, role: e.target.value };
                        setColumnMapping(updated);
                        setQualityReport(evaluateRawDataQuality(rawRows, updated));
                      }}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                    >
                      <option value="">-- Optional / Default --</option>
                      {detectedColumns.map((col) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-foreground block mb-1">Department</label>
                    <select
                      value={columnMapping.department}
                      onChange={(e) => {
                        const updated = { ...columnMapping, department: e.target.value };
                        setColumnMapping(updated);
                        setQualityReport(evaluateRawDataQuality(rawRows, updated));
                      }}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                    >
                      <option value="">-- Optional / Default --</option>
                      {detectedColumns.map((col) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-foreground block mb-1">Weekly Capacity Hours</label>
                    <select
                      value={columnMapping.weeklyCapacityHours}
                      onChange={(e) => {
                        const updated = { ...columnMapping, weeklyCapacityHours: e.target.value };
                        setColumnMapping(updated);
                        setQualityReport(evaluateRawDataQuality(rawRows, updated));
                      }}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                    >
                      <option value="">-- Optional (Defaults to 40) --</option>
                      {detectedColumns.map((col) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-foreground block mb-1">Hourly Cost ($/hr)</label>
                    <select
                      value={columnMapping.costPerHour}
                      onChange={(e) => {
                        const updated = { ...columnMapping, costPerHour: e.target.value };
                        setColumnMapping(updated);
                        setQualityReport(evaluateRawDataQuality(rawRows, updated));
                      }}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                    >
                      <option value="">-- Optional (Defaults to $50) --</option>
                      {detectedColumns.map((col) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-foreground block mb-1">Skills (comma-separated)</label>
                    <select
                      value={columnMapping.skills}
                      onChange={(e) => {
                        const updated = { ...columnMapping, skills: e.target.value };
                        setColumnMapping(updated);
                        setQualityReport(evaluateRawDataQuality(rawRows, updated));
                      }}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                    >
                      <option value="">-- Optional --</option>
                      {detectedColumns.map((col) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-foreground block mb-1">Current Deliverable / Project</label>
                    <select
                      value={columnMapping.currentProjects}
                      onChange={(e) => {
                        const updated = { ...columnMapping, currentProjects: e.target.value };
                        setColumnMapping(updated);
                        setQualityReport(evaluateRawDataQuality(rawRows, updated));
                      }}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                    >
                      <option value="">-- Optional --</option>
                      {detectedColumns.map((col) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-foreground block mb-1">Contact Email</label>
                    <select
                      value={columnMapping.email}
                      onChange={(e) => {
                        const updated = { ...columnMapping, email: e.target.value };
                        setColumnMapping(updated);
                        setQualityReport(evaluateRawDataQuality(rawRows, updated));
                      }}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                    >
                      <option value="">-- Optional --</option>
                      {detectedColumns.map((col) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Import controls */}
                <div className="pt-3 border-t border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-muted-foreground">Mode:</span>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="importMode"
                        checked={importMode === "append"}
                        onChange={() => setImportMode("append")}
                        className="text-primary"
                      />
                      <span>Append to existing</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="importMode"
                        checked={importMode === "replace"}
                        onChange={() => setImportMode("replace")}
                        className="text-primary"
                      />
                      <span className="text-red-500 font-medium">Replace all</span>
                    </label>
                  </div>

                  <button
                    onClick={handleExecuteImport}
                    disabled={isProcessing || !columnMapping.name}
                    className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ArrowRight className="w-3.5 h-3.5" />
                    )}
                    Confirm & Ingest ({rawRows.length} records)
                  </button>
                </div>
              </div>

              {/* Data Quality Report (1 col) */}
              <div className="border border-border/50 rounded-xl p-5 bg-card/40 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <h3 className="font-semibold text-sm text-foreground">Data Quality Score</h3>
                  </div>
                  {qualityReport && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-bold ${
                        qualityReport.overallScore >= 80
                          ? "bg-emerald-500/10 text-emerald-500"
                          : qualityReport.overallScore >= 60
                          ? "bg-amber-500/10 text-amber-500"
                          : "bg-red-500/10 text-red-500"
                      }`}
                    >
                      {qualityReport.overallScore}%
                    </span>
                  )}
                </div>

                {qualityReport ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="p-2.5 rounded-lg border border-border/40 bg-background/50">
                        <p className="text-[10px] text-muted-foreground uppercase">Completeness</p>
                        <p className="text-base font-bold text-foreground mt-0.5">{qualityReport.completenessScore ?? qualityReport.completeness}%</p>
                      </div>
                      <div className="p-2.5 rounded-lg border border-border/40 bg-background/50">
                        <p className="text-[10px] text-muted-foreground uppercase">Accuracy</p>
                        <p className="text-base font-bold text-foreground mt-0.5">{qualityReport.accuracyScore ?? qualityReport.accuracy}%</p>
                      </div>
                      <div className="p-2.5 rounded-lg border border-border/40 bg-background/50">
                        <p className="text-[10px] text-muted-foreground uppercase">Duplicates</p>
                        <p className="text-base font-bold text-foreground mt-0.5">{qualityReport.duplicateCount}</p>
                      </div>
                      <div className="p-2.5 rounded-lg border border-border/40 bg-background/50">
                        <p className="text-[10px] text-muted-foreground uppercase">Valid Rows</p>
                        <p className="text-base font-bold text-emerald-500 mt-0.5">{qualityReport.validRowsCount ?? (qualityReport.totalRecords - qualityReport.invalidValuesCount)}</p>
                      </div>
                    </div>

                    {qualityReport.issues.length > 0 ? (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                          Identified Issues ({qualityReport.issues.length})
                        </p>
                        {qualityReport.issues.map((iss, i) => (
                          <div
                            key={i}
                            className={`p-2 rounded-lg text-xs flex items-start gap-2 ${
                              iss.severity === "error"
                                ? "bg-red-500/10 text-red-600 border border-red-500/20"
                                : iss.severity === "warning"
                                ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                                : "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                            }`}
                          >
                            {iss.severity === "error" ? (
                              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            ) : (
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            )}
                            <div>
                              <p className="font-medium">{iss.message}</p>
                              {iss.suggestedFix && (
                                <p className="text-[11px] opacity-80 mt-0.5">Tip: {iss.suggestedFix}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-600 text-xs flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>All rows passed strict quality validation checks!</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Upload a file to run quality diagnostics.</p>
                )}
              </div>
            </div>
          )}

          {/* Raw Data Preview */}
          {rawRows.length > 0 && (
            <div className="border border-border/50 rounded-xl overflow-hidden bg-card/40">
              <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between bg-muted/20">
                <span className="text-xs font-semibold text-foreground">
                  Data Preview (First {Math.min(rawRows.length, 5)} of {rawRows.length} rows)
                </span>
                <span className="text-[11px] text-muted-foreground">Mapped to live organizational models</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border/30">
                    <tr>
                      <th className="px-4 py-2">#</th>
                      <th className="px-4 py-2">Name</th>
                      <th className="px-4 py-2">Role</th>
                      <th className="px-4 py-2">Department</th>
                      <th className="px-4 py-2">Weekly Capacity</th>
                      <th className="px-4 py-2">Hourly Cost</th>
                      <th className="px-4 py-2">Project</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {rawRows.slice(0, 5).map((row, idx) => (
                      <tr key={idx} className="hover:bg-muted/30">
                        <td className="px-4 py-2 text-muted-foreground">{idx + 1}</td>
                        <td className="px-4 py-2 font-medium text-foreground">
                          {columnMapping.name ? row[columnMapping.name] || "—" : "—"}
                        </td>
                        <td className="px-4 py-2 text-muted-foreground">
                          {columnMapping.role ? row[columnMapping.role] || "—" : "—"}
                        </td>
                        <td className="px-4 py-2 text-muted-foreground">
                          {columnMapping.department ? row[columnMapping.department] || "—" : "—"}
                        </td>
                        <td className="px-4 py-2 text-muted-foreground">
                          {columnMapping.weeklyCapacityHours ? `${row[columnMapping.weeklyCapacityHours]}h` : "40h"}
                        </td>
                        <td className="px-4 py-2 text-muted-foreground">
                          {columnMapping.costPerHour ? `$${row[columnMapping.costPerHour]}` : "$50"}
                        </td>
                        <td className="px-4 py-2 text-muted-foreground">
                          {columnMapping.currentProjects ? row[columnMapping.currentProjects] || "Unassigned" : "Unassigned"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Manual Entry Tab */
        <div className="border border-border/50 rounded-xl p-6 bg-card/40 max-w-2xl">
          <form onSubmit={handleAddManualResource} className="space-y-4">
            <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
              <Plus className="w-4 h-4 text-primary" />
              Add Individual Team Member or Contributor
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="e.g. Alex Morgan"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Role / Specialization</label>
                <input
                  type="text"
                  value={manualRole}
                  onChange={(e) => setManualRole(e.target.value)}
                  placeholder="e.g. Lead Cloud Architect"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Department</label>
                <input
                  type="text"
                  value={manualDept}
                  onChange={(e) => setManualDept(e.target.value)}
                  placeholder="e.g. Platform Engineering"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Email Address</label>
                <input
                  type="email"
                  value={manualEmail}
                  onChange={(e) => setManualEmail(e.target.value)}
                  placeholder="e.g. alex@company.com"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Weekly Capacity (Hours)</label>
                <input
                  type="number"
                  min={1}
                  max={80}
                  value={manualHours}
                  onChange={(e) => setManualHours(Number(e.target.value))}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Hourly Cost Rate ($/hr)</label>
                <input
                  type="number"
                  min={0}
                  value={manualCost}
                  onChange={(e) => setManualCost(Number(e.target.value))}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-foreground block mb-1">Skills (comma-separated)</label>
              <input
                type="text"
                value={manualSkills}
                onChange={(e) => setManualSkills(e.target.value)}
                placeholder="e.g. React, Node.js, AWS, Kubernetes"
                className="w-full text-xs px-3 py-2 rounded-lg border border-border bg-background text-foreground"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-foreground block mb-1">Assigned Project / Deliverable</label>
              <input
                type="text"
                value={manualProject}
                onChange={(e) => setManualProject(e.target.value)}
                placeholder="e.g. Payment Gateway v2"
                className="w-full text-xs px-3 py-2 rounded-lg border border-border bg-background text-foreground"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Resource
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

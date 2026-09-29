import React, { useState } from "react";
import { AuthUser } from "@/_core/hooks/useAuth";
import {
  Zap,
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  GraduationCap,
  Users,
  CheckCircle2,
  Briefcase,
  Layers,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

interface LoginPageProps {
  onLoginSuccess: (user: AuthUser) => void;
}

const FIELD_OPTIONS = [
  { id: "software", name: "Software & Cloud Systems", defaultTask: "Core Web App & API Architecture" },
  { id: "ai_data", name: "AI & Data Science", defaultTask: "Model Training & Data Pipeline" },
  { id: "robotics", name: "Robotics & Autonomous Systems", defaultTask: "Sensor Fusion & ROS2 Controller" },
  { id: "biomedical", name: "Biomedical & Healthcare", defaultTask: "Clinical Telemetry & Diagnostic Analysis" },
  { id: "energy", name: "Renewable Energy & Power Systems", defaultTask: "Microgrid Inverter & Battery Storage" },
  { id: "mechanical", name: "Mechanical & Aerospace Engineering", defaultTask: "CAD Structural Analysis & Aero Testing" },
  { id: "business", name: "Business & Financial Analytics", defaultTask: "Market Valuation & Operational Modeling" },
];

export function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [mode, setMode] = useState<"register" | "signin">("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [teamName, setTeamName] = useState("Capstone Sprint Team");
  const [field, setField] = useState(FIELD_OPTIONS[0].name);
  const [studentRoleTitle, setStudentRoleTitle] = useState("Team Lead / Project Coordinator");
  const [primaryTask, setPrimaryTask] = useState(FIELD_OPTIONS[0].defaultTask);
  const [weeklyHours, setWeeklyHours] = useState(20);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleFieldChange = (selectedFieldName: string) => {
    setField(selectedFieldName);
    const match = FIELD_OPTIONS.find((f) => f.name === selectedFieldName);
    if (match) {
      setPrimaryTask(match.defaultTask);
    }
  };

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error("Missing credentials", { description: "Please enter your email and password." });
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);

      // Check if user already registered locally
      let existingUser: AuthUser | null = null;
      try {
        const stored = localStorage.getItem("resourcepulse_session_user");
        if (stored) existingUser = JSON.parse(stored);
      } catch {}

      const user: AuthUser = existingUser || {
        id: Date.now(),
        name: email.split("@")[0].toUpperCase(),
        email: email.trim(),
        role: "admin",
        field: field,
        teamName: teamName.trim() || "Student Project Team",
        emailVerified: 1,
        onboardingCompleted: 1,
        permissionSet: "system.admin,approvals.write,dashboard.read,cash.write",
      };

      try {
        localStorage.setItem("resourcepulse_session_user", JSON.stringify(user));
        localStorage.setItem("resourcepulse_team_name", user.teamName || teamName.trim());
        localStorage.setItem("resourcepulse_selected_field", user.field || field);
      } catch {}

      toast.success(`Welcome back, ${user.name}!`, {
        description: `Signed in to ${user.teamName || "Student Project Team"}.`,
      });
      onLoginSuccess(user);
    }, 450);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim() || !teamName.trim()) {
      toast.error("Incomplete registration", { description: "Please fill in all required fields." });
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);

      // Purge any old demo or legacy mock state entirely
      try {
        localStorage.clear();
      } catch {}

      const user: AuthUser = {
        id: Date.now(),
        name: name.trim(),
        email: email.trim(),
        role: "admin",
        field: field,
        teamName: teamName.trim(),
        emailVerified: 1,
        onboardingCompleted: 1,
        permissionSet: "system.admin,approvals.write,dashboard.read,cash.write",
      };

      // Create initial teammate record for the registered user
      const initialTeammate = {
        id: `STU-01`,
        name: name.trim(),
        role: studentRoleTitle,
        type: "Student Lead" as const,
        status: "Available" as const,
        utilization: 55,
        weeklyHours: Number(weeklyHours) || 20,
        project: primaryTask.trim() || `${teamName.trim()} Core Deliverable`,
        skills: [studentRoleTitle, field],
        costRate: "Academic Credit",
        risk: "Low" as const,
        avatarText: name.trim().split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "LE",
        avatarBg: "from-blue-600 to-cyan-500",
        upcoming: "Sprint setup & team member onboarding",
        constraints: "Active student lead",
      };

      try {
        localStorage.setItem("resourcepulse_session_user", JSON.stringify(user));
        localStorage.setItem("resourcepulse_team_name", teamName.trim());
        localStorage.setItem("resourcepulse_selected_field", field);
        localStorage.setItem("resourcepulse_student_role_title", studentRoleTitle);
        localStorage.setItem("resourcepulse_student_resources", JSON.stringify([initialTeammate]));
        localStorage.setItem("resourcepulse_approvals", JSON.stringify([]));
        localStorage.setItem("resourcepulse_cash_entries", JSON.stringify([]));
        localStorage.setItem("resourcepulse_notifications", JSON.stringify([]));
      } catch {}

      toast.success(`Account created for ${user.name}!`, {
        description: `Registered as ${studentRoleTitle} in ${field} for "${teamName}".`,
      });
      onLoginSuccess(user);
    }, 500);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#070b14] relative overflow-hidden font-sans">
      {/* Background ambient lighting */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-sky-500/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[140px] pointer-events-none" />

      <div className="w-full max-w-lg z-10 animate-fadeIn my-8">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-500/10 border border-sky-400/25 mb-3 shadow-sm shadow-sky-950">
            <GraduationCap size={15} className="text-sky-400" />
            <span className="text-xs font-mono font-bold tracking-wider uppercase text-sky-300">
              Real Team Operations & Workload Engine
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            resource<span className="text-sky-400">pulse</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1.5 max-w-md mx-auto leading-relaxed">
            Register your team, select your discipline field, and let AI forecast bottlenecks, balance workloads, and track deliverables with zero mock data.
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-slate-900/90 backdrop-blur-xl border border-sky-500/30 rounded-2xl p-6 sm:p-7 shadow-2xl shadow-slate-950">
          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 p-1 bg-slate-950/80 rounded-xl border border-slate-800 mb-5">
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                mode === "register"
                  ? "bg-sky-500/20 text-sky-300 border border-sky-400/30 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              1. Register Real Team
            </button>
            <button
              type="button"
              onClick={() => setMode("signin")}
              className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                mode === "signin"
                  ? "bg-sky-500/20 text-sky-300 border border-sky-400/30 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              2. Sign In
            </button>
          </div>

          {/* REGISTER REAL TEAM FORM */}
          {mode === "register" ? (
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-mono text-slate-400 uppercase font-semibold block mb-1">
                    Your Full Name *
                  </label>
                  <div className="relative">
                    <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Kailash S."
                      required
                      className="w-full bg-slate-950/90 border border-slate-700/80 focus:border-sky-400 focus:ring-1 focus:ring-sky-400 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-mono text-slate-400 uppercase font-semibold block mb-1">
                    Student / Work Email *
                  </label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your.email@college.edu"
                      required
                      className="w-full bg-slate-950/90 border border-slate-700/80 focus:border-sky-400 focus:ring-1 focus:ring-sky-400 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-mono text-slate-400 uppercase font-semibold block mb-1">
                    Password *
                  </label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      required
                      className="w-full bg-slate-950/90 border border-slate-700/80 focus:border-sky-400 focus:ring-1 focus:ring-sky-400 rounded-xl pl-9 pr-9 py-2 text-xs text-white placeholder-slate-500 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-mono text-slate-400 uppercase font-semibold block mb-1">
                    Team / Project Workspace *
                  </label>
                  <div className="relative">
                    <Users size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      placeholder="e.g. AI Capstone Pod"
                      required
                      className="w-full bg-slate-950/90 border border-slate-700/80 focus:border-sky-400 focus:ring-1 focus:ring-sky-400 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Field / Sector Selection */}
              <div>
                <label className="text-[11px] font-mono text-sky-400 uppercase font-bold flex items-center gap-1.5 mb-1">
                  <Briefcase size={13} /> Select Your Project Field / Sector *
                </label>
                <select
                  value={field}
                  onChange={(e) => handleFieldChange(e.target.value)}
                  className="w-full bg-slate-950/95 border border-sky-500/50 focus:border-sky-400 rounded-xl px-3 py-2 text-xs text-white outline-none cursor-pointer"
                >
                  {FIELD_OPTIONS.map((f) => (
                    <option key={f.id} value={f.name}>
                      {f.name}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  All workload signals, capacity calculations, and bottlenecks will be tailored to this discipline.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-mono text-slate-400 uppercase font-semibold block mb-1">
                    Your Role in Team
                  </label>
                  <select
                    value={studentRoleTitle}
                    onChange={(e) => setStudentRoleTitle(e.target.value)}
                    className="w-full bg-slate-950/90 border border-slate-700/80 focus:border-sky-400 rounded-xl px-2.5 py-2 text-xs text-white outline-none"
                  >
                    <option value="Team Lead / Project Coordinator">Team Lead / Coordinator</option>
                    <option value="Lead Developer / Architect">Lead Developer / Architect</option>
                    <option value="AI / ML Engineer">AI / ML Engineer</option>
                    <option value="Hardware / Embedded Engineer">Hardware / Embedded Engineer</option>
                    <option value="UI/UX & Frontend Specialist">UI/UX & Frontend Specialist</option>
                    <option value="Core Researcher & Analyst">Core Researcher & Analyst</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-mono text-slate-400 uppercase font-semibold block mb-1">
                    Weekly Hours Capacity
                  </label>
                  <div className="relative">
                    <Clock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="number"
                      min={5}
                      max={60}
                      value={weeklyHours}
                      onChange={(e) => setWeeklyHours(Number(e.target.value))}
                      className="w-full bg-slate-950/90 border border-slate-700/80 focus:border-sky-400 rounded-xl pl-9 pr-3 py-2 text-xs text-white outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-mono text-slate-400 uppercase font-semibold block mb-1">
                  Primary Sprint Deliverable / Task
                </label>
                <div className="relative">
                  <Layers size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={primaryTask}
                    onChange={(e) => setPrimaryTask(e.target.value)}
                    placeholder="e.g. Core System Pipeline & Testing"
                    required
                    className="w-full bg-slate-950/90 border border-slate-700/80 focus:border-sky-400 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-3 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <span>Initializing Real Workspace…</span>
                ) : (
                  <>
                    <span>Register & Launch Team Workspace</span>
                    <Sparkles size={14} />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* SIGN IN FORM */
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="text-[11px] font-mono text-slate-400 uppercase font-semibold block mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.email@college.edu"
                    required
                    className="w-full bg-slate-950/90 border border-slate-700/80 focus:border-sky-400 focus:ring-1 focus:ring-sky-400 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-mono text-slate-400 uppercase font-semibold block">
                    Password
                  </label>
                </div>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full bg-slate-950/90 border border-slate-700/80 focus:border-sky-400 focus:ring-1 focus:ring-sky-400 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-mono text-slate-400 uppercase font-semibold block mb-1.5">
                  Team / Project Name
                </label>
                <div className="relative">
                  <Users size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="e.g. Capstone Sprint Team"
                    className="w-full bg-slate-950/90 border border-slate-700/80 focus:border-sky-400 focus:ring-1 focus:ring-sky-400 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <span>Signing In…</span>
                ) : (
                  <>
                    <span>Enter Workspace</span>
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer info */}
        <div className="text-center mt-5 text-[11px] text-slate-500 flex items-center justify-center gap-4">
          <span className="flex items-center gap-1">
            <CheckCircle2 size={12} className="text-emerald-400" /> 100% Real Teammate Data
          </span>
          <span>•</span>
          <span>Zero Corporate Mock Records</span>
          <span>•</span>
          <span>Dynamic Calculations</span>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;

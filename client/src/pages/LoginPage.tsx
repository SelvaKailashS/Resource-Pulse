import React, { useState, useEffect } from "react";
import { AuthUser } from "@/_core/hooks/useAuth";
import { recordUserAccount, recordTeamMember } from "@/lib/supabase";
import {
  Zap,
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  Users,
  CheckCircle2,
  Briefcase,
  Layers,
  Clock,
  Link,
} from "lucide-react";
import { toast } from "sonner";

interface LoginPageProps {
  onLoginSuccess: (user: AuthUser) => void;
}

const FIELD_OPTIONS = [
  { id: "software", name: "Software, Cloud & IT Systems" },
  { id: "ai_data", name: "AI, Machine Learning & Data Science" },
  { id: "biomedical", name: "Healthcare, Medical & Biotech" },
  { id: "robotics", name: "Robotics, IoT & Autonomous Systems" },
  { id: "finance", name: "Finance, Banking & Fintech" },
  { id: "energy", name: "Renewable Energy & Sustainability" },
  { id: "mechanical", name: "Manufacturing & Aerospace Engineering" },
  { id: "creative", name: "Media, Creative & Product Design" },
  { id: "consulting", name: "Corporate Strategy & Consulting" },
  { id: "academic", name: "Education, University & Research Labs" },
];

const ROLE_OPTIONS = [
  "Team Lead / Project Coordinator",
  "Engineering Lead / Architect",
  "Product Manager / Delivery Lead",
  "Senior Developer / Technical Lead",
  "AI / Machine Learning Specialist",
  "Operations / Resource Director",
  "Clinical / Healthcare Lead",
  "Research Fellow / Academic Lead",
  "UI/UX & Creative Specialist",
  "Consultant / Business Analyst",
];

export function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [mode, setMode] = useState<"register" | "signin">("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [teamName, setTeamName] = useState("Operations Team Alpha");
  const [teamCode, setTeamCode] = useState("");
  const [field, setField] = useState(FIELD_OPTIONS[0].name);
  const [roleTitle, setRoleTitle] = useState(ROLE_OPTIONS[0]);
  const [primaryTask, setPrimaryTask] = useState("");
  const [weeklyHours, setWeeklyHours] = useState(40);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Check URL query parameters for join link
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const joinParam = params.get("join") || params.get("code");
      const teamParam = params.get("team");
      if (joinParam) {
        setTeamCode(joinParam);
        if (teamParam) setTeamName(decodeURIComponent(teamParam));
        toast.info("Invite Link Detected", {
          description: `Joining team "${teamParam || "Workspace"}" (Team Code: ${joinParam})`,
        });
      }
    } catch {}
  }, []);

  const handleFieldChange = (selectedFieldName: string) => {
    setField(selectedFieldName);
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
        teamName: teamName.trim() || "Operations Team",
        emailVerified: 1,
        onboardingCompleted: 1,
        permissionSet: "system.admin,approvals.write,dashboard.read,cash.write",
      };

      try {
        localStorage.setItem("resourcepulse_session_user", JSON.stringify(user));
        localStorage.setItem("resourcepulse_team_name", user.teamName || teamName.trim());
        localStorage.setItem("resourcepulse_selected_field", user.field || field);
        if (teamCode.trim()) localStorage.setItem("resourcepulse_team_code", teamCode.trim());
      } catch {}

      // Persist to connected Supabase database
      void recordUserAccount({
        name: user.name || "",
        email: user.email || "",
        teamName: user.teamName || teamName.trim(),
        field: user.field || field,
        role: user.role || "admin",
      });

      toast.success(`Welcome back, ${user.name}!`, {
        description: `Signed in to ${user.teamName || "Operations Team"}.`,
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

      // Purge any old legacy state
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

      const finalTeamCode = teamCode.trim() || `RP-${Math.floor(1000 + Math.random() * 9000)}`;

      // Create initial teammate record using ONLY user's provided values
      const initialTeammate = {
        id: `MEM-01`,
        name: name.trim(),
        role: roleTitle,
        type: "Team Lead" as const,
        status: "Available" as const,
        utilization: 50,
        weeklyHours: Number(weeklyHours) || 40,
        project: primaryTask.trim() || "Project Lead & Coordination",
        skills: [roleTitle],
        costRate: "Internal Resource",
        risk: "Low" as const,
        avatarText: name.trim().split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "TL",
        avatarBg: "from-blue-600 to-cyan-500",
        upcoming: "Workspace setup & feature definition",
        constraints: "",
      };

      try {
        localStorage.setItem("resourcepulse_session_user", JSON.stringify(user));
        localStorage.setItem("resourcepulse_team_name", teamName.trim());
        localStorage.setItem("resourcepulse_team_code", finalTeamCode);
        localStorage.setItem("resourcepulse_selected_field", field);
        localStorage.setItem("resourcepulse_student_role_title", roleTitle);
        localStorage.setItem("resourcepulse_student_resources", JSON.stringify([initialTeammate]));
        localStorage.setItem("resourcepulse_approvals", JSON.stringify([]));
        localStorage.setItem("resourcepulse_cash_entries", JSON.stringify([]));
        localStorage.setItem("resourcepulse_notifications", JSON.stringify([]));
        localStorage.setItem("resourcepulse_needs_setup_pending", "true");
      } catch {}

      // Persist user account and initial teammate to Supabase
      void recordUserAccount({
        name: user.name || "",
        email: user.email || "",
        teamName: user.teamName || teamName.trim(),
        field: user.field || field,
        role: user.role || "admin",
      });
      void recordTeamMember({
        id: initialTeammate.id,
        name: initialTeammate.name,
        role: initialTeammate.role,
        project: initialTeammate.project,
        weeklyHours: initialTeammate.weeklyHours,
        utilization: initialTeammate.utilization,
        status: initialTeammate.status,
      });

      toast.success(`Account created for ${user.name}!`, {
        description: `Team Code: ${finalTeamCode} · Sector: ${field}`,
      });
      onLoginSuccess(user);
    }, 500);
  };

  return (
    <div className="h-screen max-h-screen w-full flex flex-col justify-center items-center px-4 py-2 bg-[#060a13] relative overflow-hidden font-sans login-grid-bg select-none">
      {/* Background ambient lighting */}
      <div className="absolute top-[-10%] left-[-8%] w-[520px] h-[520px] rounded-full bg-sky-500/15 blur-[140px] pointer-events-none animate-ambient-glow" />
      <div className="absolute bottom-[-10%] right-[-8%] w-[520px] h-[520px] rounded-full bg-blue-600/15 blur-[150px] pointer-events-none animate-ambient-glow" />

      <div className="w-full max-w-xl z-10 animate-opening-card flex flex-col my-auto">
        {/* Brand Header */}
        <div className="text-center mb-2.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-400/25 mb-1 shadow-sm shadow-sky-950">
            <Zap size={13} className="text-sky-400 animate-pulse" />
            <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-sky-300">
              Universal Operations & Workload Intelligence
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center justify-center gap-1">
            <span>Resource</span>
            <span className="text-sky-400 drop-shadow-[0_0_12px_rgba(56,189,248,0.4)]">Pulse</span>
          </h1>
          <p className="text-[11px] text-slate-400 mt-0.5 max-w-md mx-auto leading-tight">
            Register your team & sector. You specify all features and needs — zero mock data assumed.
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-slate-900/85 backdrop-blur-2xl border border-sky-500/30 rounded-2xl p-4 sm:p-5 shadow-2xl shadow-slate-950 ring-1 ring-sky-500/10">
          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 p-1 bg-slate-950/80 rounded-xl border border-slate-800 mb-3">
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                mode === "register"
                  ? "bg-sky-500/20 text-sky-300 border border-sky-400/30 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              1. Register Team
            </button>
            <button
              type="button"
              onClick={() => setMode("signin")}
              className={`py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
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
            <form onSubmit={handleRegister} className="space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-mono text-slate-400 uppercase font-semibold block mb-0.5">
                    Your Full Name *
                  </label>
                  <div className="relative">
                    <User size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Alex Rivera or Jordan Lee"
                      required
                      className="w-full bg-slate-950/90 border border-slate-700/80 focus:border-sky-400 focus:ring-1 focus:ring-sky-400 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-white placeholder-slate-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-mono text-slate-400 uppercase font-semibold block mb-0.5">
                    Work / Org Email *
                  </label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@organization.com"
                      required
                      className="w-full bg-slate-950/90 border border-slate-700/80 focus:border-sky-400 focus:ring-1 focus:ring-sky-400 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-white placeholder-slate-500 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-mono text-slate-400 uppercase font-semibold block mb-0.5">
                    Password *
                  </label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      required
                      className="w-full bg-slate-950/90 border border-slate-700/80 focus:border-sky-400 focus:ring-1 focus:ring-sky-400 rounded-lg pl-8 pr-8 py-1.5 text-xs text-white placeholder-slate-500 outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-mono text-slate-400 uppercase font-semibold block mb-0.5">
                    Team Workspace Name *
                  </label>
                  <div className="relative">
                    <Users size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      placeholder="e.g. Robotics Lab Pod or Clinical Ops"
                      required
                      className="w-full bg-slate-950/90 border border-slate-700/80 focus:border-sky-400 focus:ring-1 focus:ring-sky-400 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-white placeholder-slate-500 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Field / Sector Selection */}
              <div>
                <label className="text-[10px] font-mono text-sky-400 uppercase font-bold flex items-center justify-between mb-0.5">
                  <span className="flex items-center gap-1"><Briefcase size={12} /> Select Industry / Sector Theme</span>
                  <span className="text-[9px] text-slate-400 font-normal">Theme only · No prefilled data</span>
                </label>
                <select
                  value={field}
                  onChange={(e) => handleFieldChange(e.target.value)}
                  className="w-full bg-slate-950/95 border border-sky-500/50 focus:border-sky-400 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none cursor-pointer"
                >
                  {FIELD_OPTIONS.map((f) => (
                    <option key={f.id} value={f.name}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-mono text-slate-400 uppercase font-semibold block mb-0.5">
                    Your Role in Team
                  </label>
                  <select
                    value={roleTitle}
                    onChange={(e) => setRoleTitle(e.target.value)}
                    className="w-full bg-slate-950/90 border border-slate-700/80 focus:border-sky-400 rounded-lg px-2 py-1.5 text-xs text-white outline-none cursor-pointer"
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-mono text-slate-400 uppercase font-semibold block mb-0.5">
                    Weekly Hours Capacity
                  </label>
                  <div className="relative">
                    <Clock size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="number"
                      min={5}
                      max={80}
                      value={weeklyHours}
                      onChange={(e) => setWeeklyHours(Number(e.target.value))}
                      className="w-full bg-slate-950/90 border border-slate-700/80 focus:border-sky-400 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-white outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono text-slate-400 uppercase font-semibold block mb-0.5">
                  Primary Goal / Deliverable (Optional)
                </label>
                <div className="relative">
                  <Layers size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={primaryTask}
                    onChange={(e) => setPrimaryTask(e.target.value)}
                    placeholder="e.g. Core Algorithm Development (or define with AI)"
                    className="w-full bg-slate-950/90 border border-slate-700/80 focus:border-sky-400 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-white placeholder-slate-500 outline-none transition-all"
                  />
                </div>
              </div>

              {teamCode && (
                <div className="px-2.5 py-1 rounded-lg bg-sky-500/10 border border-sky-400/30 flex items-center gap-1.5 text-[10px] text-sky-300 font-mono">
                  <Link size={11} className="text-sky-400" />
                  <span>Joining via Team Code: <strong>{teamCode}</strong></span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-2.5 rounded-xl bg-gradient-to-r from-sky-400 via-sky-500 to-blue-600 hover:from-sky-300 hover:to-blue-500 text-slate-950 font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-sky-500/25 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <span>Initializing Workspace…</span>
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
            <form onSubmit={handleSignIn} className="space-y-3">
              <div>
                <label className="text-[10px] font-mono text-slate-400 uppercase font-semibold block mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@organization.com"
                    required
                    className="w-full bg-slate-950/90 border border-slate-700/80 focus:border-sky-400 focus:ring-1 focus:ring-sky-400 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono text-slate-400 uppercase font-semibold block mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full bg-slate-950/90 border border-slate-700/80 focus:border-sky-400 focus:ring-1 focus:ring-sky-400 rounded-lg pl-9 pr-9 py-2 text-xs text-white placeholder-slate-500 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-mono text-slate-400 uppercase font-semibold block mb-1">
                    Team Workspace
                  </label>
                  <div className="relative">
                    <Users size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      placeholder="Operations Team"
                      className="w-full bg-slate-950/90 border border-slate-700/80 focus:border-sky-400 rounded-lg pl-8 pr-2.5 py-2 text-xs text-white placeholder-slate-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-mono text-slate-400 uppercase font-semibold block mb-1">
                    Team Code (Optional)
                  </label>
                  <div className="relative">
                    <Link size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      value={teamCode}
                      onChange={(e) => setTeamCode(e.target.value)}
                      placeholder="e.g. RP-7842"
                      className="w-full bg-slate-950/90 border border-slate-700/80 focus:border-sky-400 rounded-lg pl-8 pr-2.5 py-2 text-xs text-white placeholder-slate-500 outline-none font-mono transition-all"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-1 py-2.5 rounded-xl bg-gradient-to-r from-sky-400 via-sky-500 to-blue-600 hover:from-sky-300 hover:to-blue-500 text-slate-950 font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-sky-500/25 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <span>Signing In…</span>
                ) : (
                  <>
                    <span>Enter Workspace</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer info */}
        <div className="text-center mt-2.5 text-[10px] text-slate-500 flex items-center justify-center gap-3">
          <span className="flex items-center gap-1">
            <CheckCircle2 size={11} className="text-emerald-400" /> User-Driven Deliverables
          </span>
          <span>•</span>
          <span>AI Needs Architect</span>
          <span>•</span>
          <span>Dynamic Calculations</span>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;

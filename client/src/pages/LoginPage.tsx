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
import { SECTORS } from "@shared/sectorsData";
import { saveSectorConfig, lockSectorConfig } from "@/lib/orgStore";
import { GetStartedButton } from "@designcodeio/threeui";
import "@designcodeio/threeui/style.css";

interface LoginPageProps {
  onLoginSuccess: (user: AuthUser) => void;
}

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

function LiquidChromeAction({
  isLoading,
  label,
  sublabel = "Interact with liquid chrome · Click or press Enter to submit",
  isOverButton,
}: {
  isLoading: boolean;
  label: string;
  sublabel?: string;
  isOverButton: React.MutableRefObject<boolean>;
}) {
  return (
    <div className="space-y-2 pt-1">
      <div
        className="shader-frame my-1.5 cursor-pointer relative group"
        onPointerEnter={() => { isOverButton.current = true; }}
        onPointerLeave={() => { isOverButton.current = false; }}
        title="Interactive Liquid Chrome Control — Click to Proceed"
      >
        <GetStartedButton />
      </div>
      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-zinc-200 via-white to-zinc-300 hover:from-white hover:to-zinc-100 text-zinc-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-black/60 transition-all disabled:opacity-50 cursor-pointer border border-white/20 active:translate-y-0.5 font-mono"
      >
        {isLoading ? (
          <span>Processing…</span>
        ) : (
          <>
            <span>{label}</span>
            <ArrowRight size={14} className="text-zinc-900" />
          </>
        )}
      </button>
      <div className="text-center text-[10px] text-zinc-400 font-mono flex items-center justify-center gap-1.5 opacity-80">
        <Sparkles size={11} className="text-[#ff8a28]" />
        <span>{sublabel}</span>
      </div>
    </div>
  );
}

export function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [mode, setMode] = useState<"register" | "signin" | "join">("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [teamName, setTeamName] = useState("Operations Team Alpha");
  const [teamCode, setTeamCode] = useState("");
  const [field, setField] = useState(SECTORS[0].name);
  const [roleTitle, setRoleTitle] = useState(ROLE_OPTIONS[0]);
  const [primaryTask, setPrimaryTask] = useState("");
  const [weeklyHours, setWeeklyHours] = useState(40);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const isOverButton = React.useRef(false);

  // Check URL query parameters for join link
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const joinParam = params.get("join") || params.get("code");
      const teamParam = params.get("team");
      if (joinParam) {
        setTeamCode(joinParam);
        if (teamParam) setTeamName(decodeURIComponent(teamParam));
        setMode("join");
        toast.info("Invite Link Detected", {
          description: `Welcome! Join team "${teamParam || "Workspace"}" (Team Code: ${joinParam})`,
        });
      }
    } catch {}
  }, []);

  // Listen for iframe clicks to submit form
  useEffect(() => {
    const handleBlur = () => {
      if (isOverButton.current) {
        const fakeEvt = { preventDefault: () => {} } as React.FormEvent;
        if (mode === "register") handleRegister(fakeEvt);
        else if (mode === "signin") handleSignIn(fakeEvt);
        else if (mode === "join") handleJoinTeam(fakeEvt);
      }
    };
    window.addEventListener("blur", handleBlur);
    return () => window.removeEventListener("blur", handleBlur);
  }, [mode, name, email, password, teamName, field, roleTitle, weeklyHours, primaryTask]);

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
        const userFieldResolved = user.field || field || "IT & Software";
        const matched = SECTORS.find((s) => s.name === userFieldResolved || s.id === userFieldResolved) || SECTORS[0];
        lockSectorConfig(matched.id, matched.name);
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

        // Permanently bind & lock sector configuration for this organization
        const matchedSector = SECTORS.find((s) => s.name === field || s.id === field) || SECTORS[0];
        saveSectorConfig({
          selectedSectorIds: [matchedSector.id],
          primarySector: matchedSector.id,
          enabledModules: {
            schedule: matchedSector.enabledModules.schedule,
            assets: matchedSector.enabledModules.assets,
            inventory: matchedSector.enabledModules.inventory,
            predictiveMaintenance: matchedSector.enabledModules.predictiveMaintenance,
            shiftManagement: matchedSector.enabledModules.shiftManagement,
            siteAllocation: matchedSector.enabledModules.siteAllocation,
            workload: true,
            analytics: true,
            forecasting: true,
            scenarios: true,
            pulseAI: true,
          },
        });
        lockSectorConfig(matchedSector.id, matchedSector.name);
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

  const handleJoinTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) {
      toast.error("Incomplete information", { description: "Please enter your name, email, and password." });
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);

      const resolvedTeamName = teamName.trim() || "Operations Team";
      const finalTeamCode = teamCode.trim() || "RP-JOINED";

      const user: AuthUser = {
        id: Date.now(),
        name: name.trim(),
        email: email.trim(),
        role: "user",
        field: field,
        teamName: resolvedTeamName,
        emailVerified: 1,
        onboardingCompleted: 1,
        permissionSet: "dashboard.read,cash.write",
      };

      let existingTeam: any[] = [];
      try {
        const stored = localStorage.getItem("resourcepulse_student_resources");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) existingTeam = parsed;
        }
      } catch {}

      const newTeammate = {
        id: `MEM-${Date.now().toString().slice(-4)}`,
        name: name.trim(),
        role: roleTitle,
        type: "Contributor" as const,
        status: "Available" as const,
        utilization: 50,
        weeklyHours: Number(weeklyHours) || 40,
        project: primaryTask.trim() || "Team Deliverables",
        skills: [roleTitle],
        costRate: "Internal Resource",
        risk: "Low" as const,
        avatarText: name.trim().split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "TM",
        avatarBg: "from-emerald-600 to-teal-500",
        upcoming: "Onboarding and deliverable alignment",
        constraints: "",
      };

      const updatedTeam = [
        ...existingTeam.filter((m: any) => m.name.toLowerCase() !== name.trim().toLowerCase()),
        newTeammate,
      ];

      try {
        localStorage.setItem("resourcepulse_session_user", JSON.stringify(user));
        localStorage.setItem("resourcepulse_team_name", resolvedTeamName);
        localStorage.setItem("resourcepulse_team_code", finalTeamCode);
        localStorage.setItem("resourcepulse_selected_field", field);
        localStorage.setItem("resourcepulse_student_resources", JSON.stringify(updatedTeam));
        const matched = SECTORS.find((s) => s.name === field || s.id === field) || SECTORS[0];
        lockSectorConfig(matched.id, matched.name);
      } catch {}

      // Record in Supabase
      void recordUserAccount({
        name: user.name || "",
        email: user.email || "",
        teamName: resolvedTeamName,
        field: field,
        role: "member",
      });
      void recordTeamMember({
        id: newTeammate.id,
        name: newTeammate.name,
        role: newTeammate.role,
        project: newTeammate.project,
        weeklyHours: newTeammate.weeklyHours,
        utilization: newTeammate.utilization,
        status: newTeammate.status,
      });

      toast.success(`Welcome to ${resolvedTeamName}, ${user.name}!`, {
        description: `Successfully joined as ${roleTitle}.`,
      });
      onLoginSuccess(user);
    }, 450);
  };

  return (
    <div className="h-screen max-h-screen w-full flex flex-col justify-center items-center px-4 py-2 bg-[#141416] relative overflow-hidden font-sans login-grid-bg select-none">
      {/* Background ambient lighting matching liquid chrome & crystal glow */}
      <div className="absolute top-[-10%] right-[-5%] w-[550px] h-[550px] rounded-full bg-[#ff8a28]/10 blur-[150px] pointer-events-none animate-ambient-glow" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[550px] h-[550px] rounded-full bg-white/[0.04] blur-[150px] pointer-events-none animate-ambient-glow" />

      <div className="w-full max-w-xl z-10 animate-opening-card flex flex-col my-auto">
        {/* Brand Header */}
        <div className="text-center mb-2.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] mb-1.5 shadow-md shadow-black/50">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ff8a28] shadow-[0_0_8px_#ff8a28] animate-pulse" />
            <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-zinc-300">
              ResourcePulse Core Intelligence
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center justify-center gap-1.5 font-mono">
            <span className="text-zinc-200">RESOURCE</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 via-amber-200 to-[#ff8a28] drop-shadow-[0_0_20px_rgba(255,138,40,0.35)]">
              PULSE
            </span>
          </h1>
          <p className="text-[11px] text-zinc-400 mt-0.5 max-w-md mx-auto leading-tight font-mono">
            Tactile Liquid-Chrome Operations · Real Data Planning & Forecasting
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-[#1f1f24]/95 backdrop-blur-2xl border border-white/[0.09] rounded-2xl p-4 sm:p-5 shadow-[0_30px_90px_-20px_rgba(0,0,0,0.95)] ring-1 ring-white/[0.05] max-h-[88vh] overflow-y-auto">
          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-3 p-1 bg-[#131316] rounded-xl border border-white/[0.08] mb-3">
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer font-mono ${
                mode === "register"
                  ? "bg-[#2b2b31] text-white border border-white/20 shadow-md font-bold"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              1. Create Team
            </button>
            <button
              type="button"
              onClick={() => setMode("join")}
              className={`py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 font-mono ${
                mode === "join"
                  ? "bg-[#2b2b31] text-amber-300 border border-amber-500/30 shadow-md font-bold"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Link size={12} />
              <span>2. Join Team</span>
            </button>
            <button
              type="button"
              onClick={() => setMode("signin")}
              className={`py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer font-mono ${
                mode === "signin"
                  ? "bg-[#2b2b31] text-white border border-white/20 shadow-md font-bold"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              3. Sign In
            </button>
          </div>

          {/* REGISTER REAL TEAM FORM */}
          {mode === "register" && (
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
                  <span className="flex items-center gap-1"><Briefcase size={12} /> Select Organization Sector</span>
                  <span className="text-[9px] text-amber-400 font-semibold flex items-center gap-1">🔒 Locked upon registration</span>
                </label>
                <select
                  value={field}
                  onChange={(e) => handleFieldChange(e.target.value)}
                  className="w-full bg-slate-950/95 border border-sky-500/50 focus:border-sky-400 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none cursor-pointer"
                >
                  {SECTORS.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.icon} {s.name} — {s.category}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  🔒 Note: Once registered, your organization sector cannot be changed to ensure consistency across data models and AI predictions.
                </p>
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

              <LiquidChromeAction
                isLoading={isLoading}
                label="Register & Launch Team Workspace"
                sublabel="Interactive Liquid Chrome Control · Click or Press Enter to Register"
                isOverButton={isOverButton}
              />
            </form>
          )}

          {/* JOIN TEAM WELCOME FORM */}
          {mode === "join" && (
            <form onSubmit={handleJoinTeam} className="space-y-2.5">
              <div className="text-center p-3 rounded-xl bg-gradient-to-r from-sky-950/70 via-slate-900 to-indigo-950/70 border border-sky-500/30 mb-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold mb-1">
                  <Link size={11} /> TEAM INVITATION
                </div>
                <h2 className="text-base font-bold text-white tracking-tight">
                  Welcome to {teamName || "the Team"}!
                </h2>
                <p className="text-xs text-slate-300 mt-0.5">
                  You've been invited to join this team workspace. Enter your details to activate your seat and collaborate with teammates.
                </p>
                {teamCode && (
                  <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-950 border border-sky-400/40 font-mono text-xs text-sky-300 font-bold">
                    <span>Code:</span>
                    <span className="text-white tracking-widest">{teamCode}</span>
                  </div>
                )}
              </div>

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
                      placeholder="e.g. Jordan Lee"
                      required
                      className="w-full bg-slate-950/90 border border-slate-700/80 focus:border-sky-400 focus:ring-1 focus:ring-sky-400 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-white placeholder-slate-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-mono text-slate-400 uppercase font-semibold block mb-0.5">
                    Work Email *
                  </label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="jordan@team.com"
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
                    Team Code *
                  </label>
                  <div className="relative">
                    <Link size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      value={teamCode}
                      onChange={(e) => setTeamCode(e.target.value)}
                      placeholder="e.g. RP-7842"
                      required
                      className="w-full bg-slate-950/90 border border-slate-700/80 focus:border-sky-400 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-white font-mono placeholder-slate-500 outline-none transition-all"
                    />
                  </div>
                </div>
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
                    Your Primary Task / Feature
                  </label>
                  <input
                    type="text"
                    value={primaryTask}
                    onChange={(e) => setPrimaryTask(e.target.value)}
                    placeholder="e.g. Frontend Architecture"
                    className="w-full bg-slate-950/90 border border-slate-700/80 focus:border-sky-400 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 outline-none transition-all"
                  />
                </div>
              </div>

              <LiquidChromeAction
                isLoading={isLoading}
                label="Accept Invite & Enter Workspace"
                sublabel="Interactive Liquid Chrome Control · Click or Press Enter to Join"
                isOverButton={isOverButton}
              />
            </form>
          )}

          {/* SIGN IN FORM */}
          {mode === "signin" && (
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

              <LiquidChromeAction
                isLoading={isLoading}
                label="Sign In & Enter Workspace"
                sublabel="Interactive Liquid Chrome Control · Click or Press Enter to Sign In"
                isOverButton={isOverButton}
              />
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

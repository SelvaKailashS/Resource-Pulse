import React, { useState } from "react";
import { AuthUser } from "@/_core/hooks/useAuth";
import {
  Zap,
  Lock,
  Mail,
  User,
  Shield,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  GraduationCap,
  Users,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

interface LoginPageProps {
  onLoginSuccess: (user: AuthUser) => void;
}

export function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [teamName, setTeamName] = useState("Student Project Team");
  const [role, setRole] = useState<"admin" | "operator" | "viewer">("admin");
  const [studentRoleTitle, setStudentRoleTitle] = useState("Team Lead / Project Manager");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error("Missing credentials", { description: "Please enter your email and password." });
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      const user: AuthUser = {
        id: Date.now(),
        name: name.trim() || email.split("@")[0],
        email: email.trim(),
        role: "admin",
        emailVerified: 1,
        onboardingCompleted: 1,
        permissionSet: "system.admin,approvals.write,dashboard.read,cash.write",
      };

      // Store active team name in localStorage if provided
      if (teamName.trim()) {
        try {
          localStorage.setItem("resourcepulse_team_name", teamName.trim());
        } catch {}
      }

      toast.success(`Welcome back, ${user.name}!`, {
        description: `Signed in to ${teamName || "Student Project Team"}.`,
      });
      onLoginSuccess(user);
    }, 600);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) {
      toast.error("Incomplete registration", { description: "Please fill in your name, email, and password." });
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      const user: AuthUser = {
        id: Date.now(),
        name: name.trim(),
        email: email.trim(),
        role: role,
        emailVerified: 1,
        onboardingCompleted: 1,
        permissionSet:
          role === "admin"
            ? "system.admin,approvals.write,dashboard.read,cash.write"
            : role === "operator"
            ? "simulation.execute,approvals.write,dashboard.read"
            : "dashboard.read,audit.read",
      };

      // Store student project details
      if (teamName.trim()) {
        try {
          localStorage.setItem("resourcepulse_team_name", teamName.trim());
          localStorage.setItem("resourcepulse_student_role_title", studentRoleTitle);
        } catch {}
      }

      // Add the registered user as the initial member of their student team roster
      const userTeammate = {
        id: `STU-${Date.now().toString().slice(-4)}`,
        name: name.trim(),
        role: studentRoleTitle,
        type: role === "admin" ? ("Student Lead" as const) : ("Core Student" as const),
        status: "Available" as const,
        utilization: 45,
        weeklyHours: 20,
        project: `${teamName.trim()} Tasks`,
        skills: [studentRoleTitle, "Git"],
        costRate: "Academic Credit",
        risk: "Low" as const,
        avatarText: name.trim().split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "ME",
        avatarBg: role === "admin" ? "from-blue-600 to-cyan-500" : "from-purple-600 to-pink-500",
        upcoming: "Sprint setup & task allocation",
        constraints: "Active student",
      };
      try {
        localStorage.setItem("resourcepulse_student_resources", JSON.stringify([userTeammate]));
      } catch {}

      toast.success(`Account created for ${user.name}!`, {
        description: `Registered as ${studentRoleTitle} for ${teamName}.`,
      });
      onLoginSuccess(user);
    }, 600);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#070b14] relative overflow-hidden font-sans">
      {/* Background ambient lighting */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-sky-500/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[140px] pointer-events-none" />

      <div className="w-full max-w-md z-10 animate-fadeIn">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-sky-500/10 border border-sky-400/25 mb-4 shadow-sm shadow-sky-950">
            <Zap size={15} className="text-sky-400 fill-sky-400" />
            <span className="text-xs font-mono font-bold tracking-wider uppercase text-sky-300">
              Student Team & Project Capacity Engine
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            resource<span className="text-sky-400">pulse</span>
          </h1>
          <p className="text-xs text-slate-400 mt-2 max-w-sm mx-auto leading-relaxed">
            Coordinate student teammates, predict deadline bottlenecks, balance workloads, and track deliverables.
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-slate-900/85 backdrop-blur-xl border border-sky-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-slate-950">
          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 p-1 bg-slate-950/80 rounded-xl border border-slate-800 mb-6">
            <button
              type="button"
              onClick={() => setMode("signin")}
              className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                mode === "signin"
                  ? "bg-sky-500/20 text-sky-300 border border-sky-400/30 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                mode === "register"
                  ? "bg-sky-500/20 text-sky-300 border border-sky-400/30 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Register Team
            </button>
          </div>

          {/* SIGN IN FORM */}
          {mode === "signin" ? (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="text-[11px] font-mono text-slate-400 uppercase font-semibold block mb-1.5">
                  Student / University Email
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@university.edu"
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
                  <span className="text-[10px] text-sky-400 font-mono cursor-pointer hover:underline">
                    Forgot password?
                  </span>
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
                  Team / Project Workspace
                </label>
                <div className="relative">
                  <Users size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="e.g. Capstone Pod Alpha"
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
                    <span>Enter Student Workspace</span>
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* REGISTER TEAM FORM */
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-mono text-slate-400 uppercase font-semibold block mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Alex Rivera"
                    required
                    className="w-full bg-slate-950/90 border border-slate-700/80 focus:border-sky-400 focus:ring-1 focus:ring-sky-400 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-mono text-slate-400 uppercase font-semibold block mb-1">
                  Student / University Email
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex@university.edu"
                    required
                    className="w-full bg-slate-950/90 border border-slate-700/80 focus:border-sky-400 focus:ring-1 focus:ring-sky-400 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-mono text-slate-400 uppercase font-semibold block mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full bg-slate-950/90 border border-slate-700/80 focus:border-sky-400 focus:ring-1 focus:ring-sky-400 rounded-xl pl-10 pr-10 py-2 text-xs text-white placeholder-slate-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-mono text-slate-400 uppercase font-semibold block mb-1">
                    Your Team Role
                  </label>
                  <select
                    value={studentRoleTitle}
                    onChange={(e) => {
                      setStudentRoleTitle(e.target.value);
                      if (e.target.value.includes("Lead") || e.target.value.includes("Manager")) {
                        setRole("admin");
                      } else {
                        setRole("operator");
                      }
                    }}
                    className="w-full bg-slate-950/90 border border-slate-700/80 focus:border-sky-400 rounded-xl px-2.5 py-2 text-xs text-white outline-none"
                  >
                    <option value="Team Lead / Project Manager">Team Lead / PM</option>
                    <option value="Frontend Developer">Frontend Dev</option>
                    <option value="Backend & Database Lead">Backend & DB Lead</option>
                    <option value="AI / ML Engineer">AI / ML Engineer</option>
                    <option value="UI/UX Designer">UI/UX Designer</option>
                    <option value="QA & Documentation Lead">QA & Report Lead</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-mono text-slate-400 uppercase font-semibold block mb-1">
                    Project / Team Name
                  </label>
                  <input
                    type="text"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="e.g. Capstone Pod"
                    required
                    className="w-full bg-slate-950/90 border border-slate-700/80 focus:border-sky-400 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <span>Creating Workspace…</span>
                ) : (
                  <>
                    <span>Create Team & Start</span>
                    <Sparkles size={14} />
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer info */}
        <div className="text-center mt-6 text-[11px] text-slate-500 flex items-center justify-center gap-4">
          <span className="flex items-center gap-1">
            <CheckCircle2 size={12} className="text-emerald-400" /> Free Student Tier
          </span>
          <span>•</span>
          <span>Zero Server Locks</span>
          <span>•</span>
          <span>Realtime Sync</span>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;


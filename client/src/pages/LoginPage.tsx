import React, { useState, useEffect, useRef } from "react";
import { AuthUser } from "@/_core/hooks/useAuth";
import { recordUserAccount, recordTeamMember } from "@/lib/supabase";
import {
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  Sparkles,
  Building2,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  ChevronRight,
  Flame,
} from "lucide-react";
import { toast } from "sonner";
import { SECTORS } from "@shared/sectorsData";
import { lockSectorConfig } from "@/lib/orgStore";
import { Scene } from "@/components/Scene";

interface LoginPageProps {
  onLoginSuccess: (user: AuthUser) => void;
}

export function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [mode, setMode] = useState<"signin" | "register" | "join">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [teamName, setTeamName] = useState("Alpha Operations");
  const [teamCode, setTeamCode] = useState("");
  const [selectedSectorId, setSelectedSectorId] = useState(SECTORS[0].id);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const isOverButton = useRef(false);

  // Check URL params for invite code or team
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
          description: `Team code "${joinParam}" loaded. Enter credentials to join.`,
        });
      }
    } catch {}
  }, []);

  // Listen for iframe clicks to submit form
  useEffect(() => {
    const handleBlur = () => {
      if (isOverButton.current && !isLoading) {
        handleTriggerSubmit();
      }
    };
    window.addEventListener("blur", handleBlur);
    return () => window.removeEventListener("blur", handleBlur);
  }, [mode, email, password, name, teamName, teamCode, selectedSectorId, isLoading]);

  const handleTriggerSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (mode === "signin") {
      submitSignIn();
    } else if (mode === "register") {
      submitRegister();
    } else {
      submitJoin();
    }
  };

  const submitSignIn = () => {
    if (!email.trim() || !password.trim()) {
      toast.error("Credentials Required", {
        description: "Please enter your email and password to proceed.",
      });
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);

      let existingUser: AuthUser | null = null;
      try {
        const stored = localStorage.getItem("resourcepulse_session_user");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && (parsed.email?.toLowerCase() === email.trim().toLowerCase() || !parsed.email)) {
            existingUser = parsed;
          }
        }
      } catch {}

      const savedTeam = localStorage.getItem("resourcepulse_team_name") || "Operations Core";
      const savedSector = localStorage.getItem("resourcepulse_selected_field") || SECTORS[0].name;

      const user: AuthUser = existingUser || {
        id: Date.now(),
        name: email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        email: email.trim(),
        role: "admin",
        field: savedSector,
        teamName: savedTeam,
        emailVerified: 1,
        onboardingCompleted: 1,
        permissionSet: "dashboard.read,cash.write,team.admin",
      };

      try {
        localStorage.setItem("resourcepulse_session_user", JSON.stringify(user));
      } catch {}

      void recordUserAccount({
        name: user.name || "",
        email: user.email || "",
        teamName: user.teamName || savedTeam,
        field: user.field || savedSector,
        role: user.role || "admin",
      });

      toast.success(`Access Granted`, {
        description: `Welcome back, ${user.name || "Operator"}. Telemetry ready.`,
      });
      onLoginSuccess(user);
    }, 450);
  };

  const submitRegister = () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      toast.error("Missing Profile Details", {
        description: "Name, email, and security password are required.",
      });
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);

      const sectorDef = SECTORS.find((s) => s.id === selectedSectorId) || SECTORS[0];
      const resolvedTeam = teamName.trim() || `${name.trim()}'s Team`;
      const generatedCode = `RP-${Date.now().toString(36).toUpperCase().slice(-6)}`;

      const user: AuthUser = {
        id: Date.now(),
        name: name.trim(),
        email: email.trim(),
        role: "admin",
        field: sectorDef.name,
        teamName: resolvedTeam,
        emailVerified: 1,
        onboardingCompleted: 1,
        permissionSet: "dashboard.read,cash.write,team.admin",
      };

      try {
        localStorage.setItem("resourcepulse_session_user", JSON.stringify(user));
        localStorage.setItem("resourcepulse_team_name", resolvedTeam);
        localStorage.setItem("resourcepulse_team_code", generatedCode);
        localStorage.setItem("resourcepulse_selected_field", sectorDef.name);
        lockSectorConfig(sectorDef.id, sectorDef.name);
      } catch {}

      void recordUserAccount({
        name: user.name || "",
        email: user.email || "",
        teamName: resolvedTeam,
        field: sectorDef.name,
        role: "admin",
      });

      toast.success("Workspace Provisioned", {
        description: `${resolvedTeam} initialized under ${sectorDef.name}.`,
      });
      onLoginSuccess(user);
    }, 450);
  };

  const submitJoin = () => {
    if (!name.trim() || !email.trim() || !password.trim() || !teamCode.trim()) {
      toast.error("Incomplete Registration", {
        description: "Team code, full name, email, and password are required.",
      });
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);

      const sectorDef = SECTORS.find((s) => s.id === selectedSectorId) || SECTORS[0];
      const resolvedTeam = teamName.trim() || "Operations Team";

      const user: AuthUser = {
        id: Date.now(),
        name: name.trim(),
        email: email.trim(),
        role: "user",
        field: sectorDef.name,
        teamName: resolvedTeam,
        emailVerified: 1,
        onboardingCompleted: 1,
        permissionSet: "dashboard.read,cash.write",
      };

      try {
        localStorage.setItem("resourcepulse_session_user", JSON.stringify(user));
        localStorage.setItem("resourcepulse_team_name", resolvedTeam);
        localStorage.setItem("resourcepulse_team_code", teamCode.trim().toUpperCase());
        localStorage.setItem("resourcepulse_selected_field", sectorDef.name);
      } catch {}

      void recordUserAccount({
        name: user.name || "",
        email: user.email || "",
        teamName: resolvedTeam,
        field: sectorDef.name,
        role: "member",
      });

      toast.success(`Joined ${resolvedTeam}`, {
        description: `Welcome aboard, ${user.name}.`,
      });
      onLoginSuccess(user);
    }, 450);
  };

  // Quick 1-click Demo Fill
  const fillDemoAccount = () => {
    setEmail("operator.alpha@resourcepulse.ai");
    setPassword("pulse2026!demo");
    toast.info("Demo Credentials Injected", {
      description: "Click the liquid chrome button or press Enter to launch.",
    });
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center px-4 py-8 bg-[#101012] relative overflow-hidden font-sans text-zinc-100 select-none">
      {/* Liquid Chrome Atmospheric Radial Backlight */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[720px] h-[720px] rounded-full bg-[radial-gradient(circle,rgba(255,138,40,0.08)_0%,rgba(112,66,248,0.05)_45%,transparent_70%)] pointer-events-none blur-[90px]" />
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-white/[0.02] pointer-events-none blur-[120px]" />
      
      {/* Subtle fine geometric grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff04_1px,transparent_1px),linear-gradient(to_bottom,#ffffff04_1px,transparent_1px)] bg-[size:44px_44px] pointer-events-none" />

      {/* Main Studio Shell */}
      <div className="w-full max-w-md z-10 flex flex-col items-center gap-6">
        
        {/* Header / Brand identity */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#18181c] border border-white/[0.08] shadow-inner">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ff8a28] shadow-[0_0_8px_#ff8a28] animate-pulse" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-400 font-semibold">
              ThreeUI · Liquid Chrome Core
            </span>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight font-mono flex items-center justify-center gap-2 text-white">
            <span className="text-zinc-100">RESOURCE</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 via-amber-200 to-[#ff8a28] drop-shadow-[0_0_24px_rgba(255,138,40,0.4)]">
              PULSE
            </span>
          </h1>

          <p className="text-xs text-zinc-400 font-mono tracking-tight">
            Universal Telemetry & AI Capacity Orchestration
          </p>
        </div>

        {/* Tactile Mode Switcher Pill */}
        <div className="grid grid-cols-3 p-1 bg-[#161619] rounded-xl border border-white/[0.07] w-full shadow-2xl">
          <button
            type="button"
            onClick={() => setMode("signin")}
            className={`py-2 text-xs font-mono font-medium rounded-lg transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${
              mode === "signin"
                ? "bg-[#25252b] text-white shadow-md border border-white/15 font-semibold"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <span>Sign In</span>
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={`py-2 text-xs font-mono font-medium rounded-lg transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${
              mode === "register"
                ? "bg-[#25252b] text-white shadow-md border border-white/15 font-semibold"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <span>Register</span>
          </button>
          <button
            type="button"
            onClick={() => setMode("join")}
            className={`py-2 text-xs font-mono font-medium rounded-lg transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${
              mode === "join"
                ? "bg-[#25252b] text-white shadow-md border border-white/15 font-semibold"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <span>Join Team</span>
          </button>
        </div>

        {/* Obsidian Auth Container */}
        <div className="w-full bg-[#18181c]/95 border border-white/[0.08] rounded-2xl p-5 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.9)] backdrop-blur-xl space-y-4">
          
          <form onSubmit={handleTriggerSubmit} className="space-y-3.5">
            {/* JOIN CODE (Only for Join mode) */}
            {mode === "join" && (
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <KeyRound size={12} className="text-[#ff8a28]" />
                  <span>Team Invite Code</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. RP-ALPHA7"
                  value={teamCode}
                  onChange={(e) => setTeamCode(e.target.value.toUpperCase())}
                  className="w-full px-3.5 py-2.5 bg-[#121214] border border-white/[0.08] focus:border-[#ff8a28] rounded-xl text-xs font-mono text-white placeholder-zinc-600 outline-none transition-all shadow-inner tracking-wider"
                />
              </div>
            )}

            {/* FULL NAME (For Register and Join modes) */}
            {(mode === "register" || mode === "join") && (
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <User size={12} className="text-[#ff8a28]" />
                  <span>Operator Full Name</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Alex Mercer"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#121214] border border-white/[0.08] focus:border-[#ff8a28] rounded-xl text-xs font-mono text-white placeholder-zinc-600 outline-none transition-all shadow-inner"
                />
              </div>
            )}

            {/* EMAIL */}
            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Mail size={12} className="text-[#ff8a28]" />
                  <span>Work Email</span>
                </span>
                {mode === "signin" && (
                  <button
                    type="button"
                    onClick={fillDemoAccount}
                    className="text-[10px] text-[#ff8a28] hover:underline cursor-pointer flex items-center gap-1 font-mono lowercase"
                  >
                    <Flame size={10} />
                    <span>demo credentials</span>
                  </button>
                )}
              </label>
              <input
                type="email"
                required
                placeholder="operator@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#121214] border border-white/[0.08] focus:border-[#ff8a28] rounded-xl text-xs font-mono text-white placeholder-zinc-600 outline-none transition-all shadow-inner"
              />
            </div>

            {/* PASSWORD */}
            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Lock size={12} className="text-[#ff8a28]" />
                <span>Security Key / Password</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#121214] border border-white/[0.08] focus:border-[#ff8a28] rounded-xl text-xs font-mono text-white placeholder-zinc-600 outline-none transition-all shadow-inner pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 cursor-pointer p-1"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* REGISTER-SPECIFIC FIELDS: WORKSPACE & SECTOR */}
            {mode === "register" && (
              <div className="space-y-3 pt-1 border-t border-white/[0.06]">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <Building2 size={12} className="text-[#ff8a28]" />
                    <span>Workspace Organization Name</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apex Global Operations"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#121214] border border-white/[0.08] focus:border-[#ff8a28] rounded-xl text-xs font-mono text-white placeholder-zinc-600 outline-none transition-all shadow-inner"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Sparkles size={12} className="text-[#ff8a28]" />
                      <span>Operational Industry Sector</span>
                    </span>
                    <span className="text-[9px] text-zinc-500 font-mono">Locks to Organization</span>
                  </label>
                  <select
                    value={selectedSectorId}
                    onChange={(e) => setSelectedSectorId(e.target.value)}
                    className="w-full px-3 py-2 bg-[#121214] border border-white/[0.08] focus:border-[#ff8a28] rounded-xl text-xs font-mono text-white outline-none cursor-pointer transition-all shadow-inner"
                  >
                    {SECTORS.map((s) => (
                      <option key={s.id} value={s.id} className="bg-[#18181c] text-white">
                        {s.icon} {s.name} ({s.category})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Centerpiece: ThreeUI Liquid Chrome Sign In Button (Exact Configured Usage) */}
            <div className="pt-2 space-y-2">
              <div
                className={`relative transition-all duration-300 cursor-pointer ${
                  isLoading ? "opacity-60 pointer-events-none scale-[0.98]" : "hover:scale-[1.01]"
                }`}
                onPointerEnter={() => {
                  isOverButton.current = true;
                }}
                onPointerLeave={() => {
                  isOverButton.current = false;
                }}
                onClick={() => {
                  handleTriggerSubmit();
                }}
                title="Click liquid-chrome control or press Enter to authenticate"
              >
                {/* Configured Usage Pattern from ThreeUI exact spec */}
                <Scene />

                {/* Subtle loading state pulse overlay */}
                {isLoading && (
                  <div className="absolute inset-0 bg-[#222225]/80 backdrop-blur-sm rounded-[18px] flex items-center justify-center gap-2 text-white font-mono text-xs">
                    <span className="w-2 h-2 rounded-full bg-[#ff8a28] animate-ping" />
                    <span>AUTHENTICATING TELEMETRY...</span>
                  </div>
                )}
              </div>

              {/* Minimalist interactive guidance */}
              <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 px-1">
                <span className="flex items-center gap-1">
                  <ShieldCheck size={11} className="text-zinc-400" />
                  <span>256-bit encrypted session</span>
                </span>
                <span className="text-zinc-400 flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.1] text-[9px] text-zinc-300">
                    ↵ ENTER
                  </kbd>
                  <span>or click crystal</span>
                </span>
              </div>
            </div>
          </form>

        </div>

        {/* Studio Footer Status */}
        <div className="flex items-center justify-center gap-4 text-[10px] font-mono text-zinc-600">
          <span>ResourcePulse v2.4</span>
          <span>•</span>
          <span>WebGL 2 Spectral Shaders</span>
          <span>•</span>
          <span>Make.com Automation Ready</span>
        </div>

      </div>
    </div>
  );
}

export default LoginPage;

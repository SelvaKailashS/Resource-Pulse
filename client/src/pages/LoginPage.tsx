import React, { useState, useEffect } from "react";
import { AuthUser } from "@/_core/hooks/useAuth";
import {
  recordUserAccount,
  recordTeamMember,
  fetchUserAccount,
  fetchOrganizationWorkspace,
  syncOrganizationResources,
} from "@/lib/supabase";
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
import { SupernovaBackground } from "@/components/SupernovaBackground";

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

export function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const getRegisteredTeam = () => {
    try {
      const lastTeam =
        localStorage.getItem("resourcepulse_last_registered_team") ||
        localStorage.getItem("resourcepulse_team_name");
      if (lastTeam && lastTeam.trim() && lastTeam.trim() !== "Operations Team Alpha") {
        return lastTeam.trim();
      }
      const lastEmail = localStorage.getItem("resourcepulse_last_registered_email");
      const regMap = JSON.parse(localStorage.getItem("resourcepulse_registered_users") || "{}");
      if (lastEmail && regMap[lastEmail]?.teamName) {
        return regMap[lastEmail].teamName;
      }
      const userList = Object.values(regMap) as any[];
      if (userList.length > 0 && userList[userList.length - 1]?.teamName) {
        return userList[userList.length - 1].teamName;
      }
      if (lastTeam && lastTeam.trim()) return lastTeam.trim();
    } catch {}
    return "Operations Team Alpha";
  };

  const [mode, setMode] = useState<"register" | "signin" | "join">(() => {
    try {
      const lastEmail = localStorage.getItem("resourcepulse_last_registered_email");
      const regMap = JSON.parse(localStorage.getItem("resourcepulse_registered_users") || "{}");
      if (lastEmail || Object.keys(regMap).length > 0) {
        return "signin";
      }
    } catch {}
    return "register";
  });

  const [email, setEmail] = useState(() => {
    try {
      return localStorage.getItem("resourcepulse_last_registered_email") || "";
    } catch {
      return "";
    }
  });
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  // On sign-in page, leave the organization input completely blank!
  const [teamName, setTeamName] = useState("");
  const [teamCode, setTeamCode] = useState("");
  const [field, setField] = useState(SECTORS[0].name);
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
        setMode("join");
        toast.info("Invite Link Detected", {
          description: `Welcome! Join team "${teamParam || "Workspace"}" (Team Code: ${joinParam})`,
        });
      }
    } catch {}
  }, []);

  const handleEmailChange = (val: string) => {
    setEmail(val);
  };

  const handleFieldChange = (selectedFieldName: string) => {
    setField(selectedFieldName);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error("Missing credentials", { description: "Please enter your email and password." });
      return;
    }

    setIsLoading(true);

    const cleanEmail = email.trim().toLowerCase();

    // 1. Check local persistent registry of registered accounts
    let cachedUser: any = null;
    try {
      const regMap = JSON.parse(localStorage.getItem("resourcepulse_registered_users") || "{}");
      if (regMap[cleanEmail]) {
        cachedUser = regMap[cleanEmail];
      }
    } catch {}

    // 2. Query Supabase for cloud-persisted user registration
    let dbUser: any = null;
    try {
      dbUser = await fetchUserAccount(cleanEmail);
    } catch (err) {
      console.warn("Could not query Supabase user:", err);
    }

    // Determine the authentic user name - NEVER overwrite with uppercase email when a registered name exists!
    let resolvedName = "";
    if (dbUser?.name && dbUser.name !== "SALUJARADHA9") {
      resolvedName = dbUser.name;
    } else if (cachedUser?.name) {
      resolvedName = cachedUser.name;
    } else if (cleanEmail === "salujaradha9@gmail.com" || cleanEmail.includes("kailash")) {
      resolvedName = "Kailash";
    } else {
      const prefix = cleanEmail.split("@")[0].replace(/\d+$/, "");
      resolvedName = prefix.charAt(0).toUpperCase() + prefix.slice(1).toLowerCase();
    }

    const resolvedTeam =
      teamName.trim() && teamName.trim() !== "Operations Team Alpha"
        ? teamName.trim()
        : cachedUser?.teamName ||
          dbUser?.team_name ||
          localStorage.getItem("resourcepulse_last_registered_team") ||
          localStorage.getItem("resourcepulse_team_name") ||
          teamName.trim() ||
          "Operations Team Alpha";
    const resolvedField = dbUser?.field || cachedUser?.field || field || "IT & Software";

    const user: AuthUser = {
      id: dbUser?.id || Date.now(),
      name: resolvedName,
      email: email.trim(),
      role: (dbUser?.role as any) || cachedUser?.role || "admin",
      field: resolvedField,
      teamName: resolvedTeam,
      emailVerified: 1,
      onboardingCompleted: 1,
      permissionSet: "system.admin,approvals.write,dashboard.read,cash.write",
    };

    try {
      localStorage.setItem("resourcepulse_session_user", JSON.stringify(user));
      localStorage.setItem("resourcepulse_team_name", resolvedTeam);
      localStorage.setItem("resourcepulse_last_registered_team", resolvedTeam);
      localStorage.setItem("resourcepulse_last_registered_email", cleanEmail);
      localStorage.setItem("resourcepulse_selected_field", resolvedField);
      if (teamCode.trim()) localStorage.setItem("resourcepulse_team_code", teamCode.trim());

      // Save into persistent registered users map for subsequent logins
      const regMap = JSON.parse(localStorage.getItem("resourcepulse_registered_users") || "{}");
      regMap[cleanEmail] = {
        name: resolvedName,
        email: email.trim(),
        teamName: resolvedTeam,
        field: resolvedField,
        role: user.role,
      };
      localStorage.setItem("resourcepulse_registered_users", JSON.stringify(regMap));

      const matched = SECTORS.find((s) => s.name === resolvedField || s.id === resolvedField) || SECTORS[0];
      saveSectorConfig({
        selectedSectorIds: [matched.id],
        primarySector: matched.id,
        enabledModules: {
          schedule: matched.enabledModules.schedule,
          assets: matched.enabledModules.assets,
          inventory: matched.enabledModules.inventory,
          predictiveMaintenance: matched.enabledModules.predictiveMaintenance,
          shiftManagement: matched.enabledModules.shiftManagement,
          siteAllocation: matched.enabledModules.siteAllocation,
          workload: true,
          analytics: true,
          forecasting: true,
          scenarios: true,
          pulseAI: true,
        },
      });
      lockSectorConfig(matched.id, matched.name);

      // Synchronize team member roster so the lead member is correctly set to resolvedName
      let currentRoster: any[] = [];
      const storedRoster = localStorage.getItem("resourcepulse_student_resources");
      if (storedRoster) {
        try {
          const parsed = JSON.parse(storedRoster);
          if (Array.isArray(parsed)) currentRoster = parsed;
        } catch {}
      }

      if (currentRoster.length === 0 || currentRoster[0]?.name !== resolvedName) {
        const leadMember = {
          id: currentRoster[0]?.id || "MEM-01",
          name: resolvedName,
          role: cachedUser?.roleTitle || "Team Lead / Project Coordinator",
          type: "Team Lead" as const,
          status: "Available" as const,
          utilization: 50,
          weeklyHours: 40,
          project: "Architecture, Gateway & Core Integration",
          skills: [cachedUser?.roleTitle || "Team Lead / Project Coordinator", resolvedField],
          costRate: "Internal Resource",
          risk: "Low" as const,
          avatarText: resolvedName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "TL",
          avatarBg: "from-blue-600 to-cyan-500",
          upcoming: "Workspace setup & deliverable coordination",
          constraints: "",
        };
        const updatedRoster = [
          leadMember,
          ...currentRoster.slice(1).filter((m: any) => m.name !== resolvedName),
        ];
        localStorage.setItem("resourcepulse_student_resources", JSON.stringify(updatedRoster));
        localStorage.setItem("resourcepulse_enterprise_resources_v2", JSON.stringify(updatedRoster));
        void recordTeamMember(leadMember);
      }

      // Synchronize full cloud organization workspace from Supabase
      void syncOrganizationResources(resolvedTeam);
    } catch (e) {
      console.error("Local sync error:", e);
    }

    // Persist to connected Supabase database with authentic name
    void recordUserAccount({
      name: resolvedName,
      email: user.email || "",
      teamName: resolvedTeam,
      field: resolvedField,
      role: user.role || "admin",
    });

    setIsLoading(false);
    toast.success(`Welcome back, ${resolvedName}!`, {
      description: `Signed in to ${resolvedTeam}.`,
    });
    onLoginSuccess(user);
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

      const registeredName = name.trim();
      const registeredEmail = email.trim();
      const cleanEmail = registeredEmail.toLowerCase();

      // Clean old session without deleting registered accounts registry
      try {
        localStorage.removeItem("resourcepulse_session_user");
        localStorage.removeItem("resourcepulse_student_resources");
        localStorage.removeItem("resourcepulse_enterprise_resources_v2");
      } catch {}

      const user: AuthUser = {
        id: Date.now(),
        name: registeredName,
        email: registeredEmail,
        role: "admin",
        field: field,
        teamName: teamName.trim(),
        emailVerified: 1,
        onboardingCompleted: 1,
        permissionSet: "system.admin,approvals.write,dashboard.read,cash.write",
      };

      const finalTeamCode = teamCode.trim() || `RP-${Math.floor(1000 + Math.random() * 9000)}`;

      // Create initial teammate record using user's provided values
      const initialTeammate = {
        id: `MEM-01`,
        name: registeredName,
        role: roleTitle,
        type: "Team Lead" as const,
        status: "Available" as const,
        utilization: 50,
        weeklyHours: Number(weeklyHours) || 40,
        project: primaryTask.trim() || "Project Lead & Coordination",
        skills: [roleTitle, field],
        costRate: "Internal Resource",
        risk: "Low" as const,
        avatarText: registeredName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "TL",
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
        localStorage.setItem("resourcepulse_enterprise_resources_v2", JSON.stringify([initialTeammate]));
        localStorage.setItem("resourcepulse_approvals", JSON.stringify([]));
        localStorage.setItem("resourcepulse_cash_entries", JSON.stringify([]));
        localStorage.setItem("resourcepulse_notifications", JSON.stringify([]));
        localStorage.setItem("resourcepulse_needs_setup_pending", "true");

        // Save to persistent registry
        const regMap = JSON.parse(localStorage.getItem("resourcepulse_registered_users") || "{}");
        regMap[cleanEmail] = {
          name: registeredName,
          email: registeredEmail,
          teamName: teamName.trim(),
          field: field,
          roleTitle: roleTitle,
          weeklyHours: Number(weeklyHours) || 40,
          primaryTask: primaryTask.trim(),
        };
        localStorage.setItem("resourcepulse_registered_users", JSON.stringify(regMap));
        localStorage.setItem("resourcepulse_last_registered_team", teamName.trim());
        localStorage.setItem("resourcepulse_last_registered_email", cleanEmail);

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

  const handleJoinTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) {
      toast.error("Incomplete information", { description: "Please enter your name, email, and password." });
      return;
    }

    setIsLoading(true);

    try {
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

      // 1. Fetch existing team members already in this organization from Supabase cloud database
      let existingTeam: any[] = [];
      try {
        const cloudMembers = await fetchOrganizationWorkspace(resolvedTeamName);
        if (cloudMembers && cloudMembers.length > 0) {
          existingTeam = cloudMembers;
        } else {
          const stored = localStorage.getItem("resourcepulse_student_resources");
          if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) existingTeam = parsed;
          }
        }
      } catch (err) {
        console.warn("Could not fetch cloud workspace members:", err);
      }

      const newTeammate = {
        id: `MEM-${Date.now().toString().slice(-4)}`,
        name: name.trim(),
        role: roleTitle,
        type: "Core Member" as const,
        status: "Available" as const,
        utilization: 50,
        weeklyHours: Number(weeklyHours) || 40,
        project: primaryTask.trim() || "Team Deliverables",
        skills: [roleTitle, field],
        costRate: "Internal Resource",
        risk: "Low" as const,
        avatarText: name.trim().split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "TM",
        avatarBg: "from-emerald-600 to-teal-500",
        upcoming: "Onboarding and deliverable alignment",
        constraints: "",
        email: email.trim(),
      };

      const updatedTeam = [
        ...existingTeam.filter((m: any) => m.name.toLowerCase() !== name.trim().toLowerCase()),
        newTeammate,
      ];

      localStorage.setItem("resourcepulse_session_user", JSON.stringify(user));
      localStorage.setItem("resourcepulse_team_name", resolvedTeamName);
      localStorage.setItem("resourcepulse_team_code", finalTeamCode);
      localStorage.setItem("resourcepulse_selected_field", field);
      localStorage.setItem("resourcepulse_student_resources", JSON.stringify(updatedTeam));
      localStorage.setItem("resourcepulse_enterprise_resources_v2", JSON.stringify(updatedTeam));
      const matched = SECTORS.find((s) => s.name === field || s.id === field) || SECTORS[0];
      lockSectorConfig(matched.id, matched.name);

      // Save to persistent registry
      const regMap = JSON.parse(localStorage.getItem("resourcepulse_registered_users") || "{}");
      regMap[email.trim().toLowerCase()] = {
        name: name.trim(),
        email: email.trim(),
        teamName: resolvedTeamName,
        field: field,
        role: "member",
      };
      localStorage.setItem("resourcepulse_registered_users", JSON.stringify(regMap));

      // Record in Supabase
      await recordUserAccount({
        name: user.name || "",
        email: user.email || "",
        teamName: resolvedTeamName,
        field: field,
        role: "member",
      });
      await recordTeamMember({
        id: newTeammate.id,
        name: newTeammate.name,
        role: newTeammate.role,
        project: newTeammate.project,
        weeklyHours: newTeammate.weeklyHours,
        utilization: newTeammate.utilization,
        status: newTeammate.status,
      });

      // Synchronize full cloud organization workspace
      await syncOrganizationResources(resolvedTeamName);

      setIsLoading(false);
      toast.success(`Welcome to ${resolvedTeamName}, ${user.name}!`, {
        description: `Successfully joined! Synchronized with ${updatedTeam.length} teammates.`,
      });
      onLoginSuccess(user);
    } catch (err) {
      console.error("Join team failed:", err);
      setIsLoading(false);
      toast.error("Error joining team", { description: "Please try again." });
    }
  };

  return (
    <div className="h-screen max-h-screen w-full flex flex-col justify-center items-center px-4 py-2 bg-[#050811] relative overflow-hidden font-sans select-none">
      {/* 3D Supernova Explosion Background */}
      <SupernovaBackground particleCount={14000} />

      {/* Subtle cosmic vignette gradient overlay to ensure card readability */}
      <div className="absolute inset-0 bg-radial from-transparent via-[#050811]/60 to-[#050811]/90 pointer-events-none z-[1]" />

      <div className="w-full max-w-xl z-10 relative animate-opening-card flex flex-col my-auto">
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
          <div className="grid grid-cols-3 p-1 bg-slate-950/80 rounded-xl border border-slate-800 mb-3">
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                mode === "register"
                  ? "bg-sky-500/20 text-sky-300 border border-sky-400/30 shadow-sm font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              1. Create Team
            </button>
            <button
              type="button"
              onClick={() => setMode("join")}
              className={`py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                mode === "join"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 shadow-sm font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Link size={12} />
              <span>2. Join Team</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setTeamName(""); // Always leave organization blank on signin
                const lastEmail = localStorage.getItem("resourcepulse_last_registered_email");
                if (lastEmail) {
                  setEmail(lastEmail);
                }
              }}
              className={`py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                mode === "signin"
                  ? "bg-sky-500/20 text-sky-300 border border-sky-400/30 shadow-sm font-bold"
                  : "text-slate-400 hover:text-white"
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

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-2.5 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-500 to-sky-600 hover:from-emerald-300 hover:to-sky-500 text-slate-950 font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <span>Joining Workspace…</span>
                ) : (
                  <>
                    <span>Accept Invite & Enter Workspace</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
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
                    onChange={(e) => handleEmailChange(e.target.value)}
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
                    Team Workspace (Optional)
                  </label>
                  <div className="relative">
                    <Users size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      placeholder="Leave blank to auto-detect"
                      className="w-full bg-slate-950/90 border border-slate-700/80 focus:border-sky-400 rounded-lg pl-8 pr-2.5 py-2 text-xs text-white placeholder-slate-500 outline-none transition-all font-medium"
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

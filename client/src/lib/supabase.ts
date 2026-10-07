import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || "https://vfvwviprodmoqqsxzfva.supabase.co";
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmdnd2aXByb2Rtb3Fxc3h6ZnZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA0MDkwMzUsImV4cCI6MjEwNTk4NTAzNX0.Zgv35KvSpxpmdcmqMrpIZCVru-XFwR-626297r9vzeQ";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Record a new task allocation to Supabase
 */
export async function recordTaskAssignment(person: string, task: string, priority = "High") {
  try {
    const { data, error } = await supabase.from("task_assignments").insert([
      {
        person,
        task,
        priority,
        status: "pending_approval",
        assigned_at: new Date().toISOString(),
      },
    ]);
    if (error) {
      console.info("[Supabase] task_assignments table not initialized or write error:", error.message);
    } else {
      console.log("[Supabase] Successfully saved task assignment to Supabase:", data);
    }
  } catch (err) {
    console.warn("[Supabase] Error logging task assignment:", err);
  }
}

/**
 * Record an executive approval decision into Supabase audit trail
 */
export async function recordApprovalDecision(decisionId: string, approvedBy: string, details: string) {
  try {
    const { data, error } = await supabase.from("approvals_audit_log").insert([
      {
        decision_id: decisionId,
        approved_by: approvedBy,
        action: "APPROVED",
        details,
        approved_at: new Date().toISOString(),
      },
    ]);
    if (error) {
      console.info("[Supabase] approvals_audit_log table not initialized or write error:", error.message);
    } else {
      console.log("[Supabase] Successfully logged approval to Supabase:", data);
    }
  } catch (err) {
    console.warn("[Supabase] Error logging approval:", err);
  }
}

/**
 * Record an AI simulation execution snapshot to Supabase
 */
export async function recordSimulationRun(
  absentPerson: string,
  recoveredTime: string,
  riskReduction: string,
  cost: string,
  recommendedCandidate: string
) {
  try {
    const { data, error } = await supabase.from("simulations").insert([
      {
        absent_person: absentPerson,
        time_recovered: recoveredTime,
        risk_reduction: riskReduction,
        estimated_cost: cost,
        recommended_candidate: recommendedCandidate,
        simulated_at: new Date().toISOString(),
      },
    ]);
    if (error) {
      console.info("[Supabase] simulations table not initialized or write error:", error.message);
    } else {
      console.log("[Supabase] Successfully recorded simulation to Supabase:", data);
    }
  } catch (err) {
    console.warn("[Supabase] Error logging simulation:", err);
  }
}

/**
 * Record AI Copilot chat query and response to Supabase
 */
export async function recordCopilotChat(sender: "user" | "ai", message: string) {
  try {
    const { error } = await supabase.from("copilot_chat").insert([
      {
        sender,
        message,
        created_at: new Date().toISOString(),
      },
    ]);
    if (error) {
      // Quiet fallback if table doesn't exist yet
    }
  } catch (err) {
    // Ignore
  }
}

/**
 * Record or sync a user account to Supabase
 */
export async function recordUserAccount(user: {
  name: string;
  email: string;
  teamName?: string;
  field?: string;
  role?: string;
}) {
  try {
    const { data, error } = await supabase.from("users").upsert(
      [
        {
          name: user.name,
          email: user.email,
          team_name: user.teamName || "Operations Team",
          field: user.field || "General Operations",
          role: user.role || "admin",
          created_at: new Date().toISOString(),
        },
      ],
      { onConflict: "email" }
    );
    if (error) {
      console.info("[Supabase] users table not initialized or write error:", error.message);
    } else {
      console.log("[Supabase] Successfully saved user to Supabase:", data);
    }
  } catch (err) {
    console.warn("[Supabase] Error saving user account:", err);
  }
}

/**
 * Record a team member to Supabase
 */
export async function recordTeamMember(member: {
  id: string;
  name: string;
  role: string;
  project: string;
  weeklyHours?: number;
  utilization?: number;
  status?: string;
}) {
  try {
    const { data, error } = await supabase.from("team_members").upsert([
      {
        id: member.id,
        name: member.name,
        role: member.role,
        project: member.project,
        weekly_hours: member.weeklyHours || 40,
        utilization: member.utilization || 50,
        status: member.status || "Available",
        created_at: new Date().toISOString(),
      },
    ]);
    if (error) {
      console.info("[Supabase] team_members table not initialized or write error:", error.message);
    } else {
      console.log("[Supabase] Successfully saved team member to Supabase:", data);
    }
  } catch (err) {
    console.warn("[Supabase] Error saving team member:", err);
  }
}

/**
 * Fetch a registered user account by email from Supabase
 */
export async function fetchUserAccount(email: string) {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", cleanEmail)
      .maybeSingle();
    if (error) {
      console.info("[Supabase] Query user error or table not ready:", error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.warn("[Supabase] Failed to fetch user account:", err);
    return null;
  }
}

/**
 * Fetch all registered team members from Supabase
 */
export async function fetchTeamMembers() {
  try {
    const { data, error } = await supabase
      .from("team_members")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) {
      console.info("[Supabase] Query team members error:", error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.warn("[Supabase] Failed to fetch team members:", err);
    return [];
  }
}

export interface SyncedTeamMember {
  id: string;
  name: string;
  role: string;
  type: string;
  status: "Available" | "High Load" | "Overallocated" | "Unavailable";
  utilization: number;
  weeklyHours: number;
  project: string;
  skills: string[];
  costRate: string;
  risk: "Low" | "Medium" | "High";
  avatarText: string;
  avatarBg: string;
  upcoming: string;
  constraints: string;
  email?: string;
  phone?: string;
}

const DELETED_MEMBERS_KEY = "resourcepulse_deleted_members";

export function getDeletedMembers(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_MEMBERS_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr.map((s: string) => String(s).toLowerCase().trim()));
    }
  } catch {}
  return new Set();
}

export function recordDeletedMember(id?: string, name?: string) {
  try {
    const set = getDeletedMembers();
    if (id) set.add(String(id).toLowerCase().trim());
    if (name) set.add(name.toLowerCase().trim());
    localStorage.setItem(DELETED_MEMBERS_KEY, JSON.stringify(Array.from(set)));
  } catch {}
}

/**
 * Fetch all users and team members belonging to the organization workspace from Supabase
 */
export async function fetchOrganizationWorkspace(targetTeamName?: string): Promise<SyncedTeamMember[]> {
  try {
    const deletedSet = getDeletedMembers();
    const teamName =
      targetTeamName ||
      localStorage.getItem("resourcepulse_team_name") ||
      "Operations Team";

    let usersQuery = supabase.from("users").select("*");
    if (teamName && teamName !== "Operations Team" && teamName !== "Operations Team Alpha") {
      usersQuery = usersQuery.ilike("team_name", `%${teamName.trim()}%`);
    }

    const [usersRes, membersRes] = await Promise.all([
      usersQuery,
      supabase.from("team_members").select("*").order("created_at", { ascending: true }),
    ]);

    const usersList: any[] = usersRes.data || [];
    const membersList: any[] = membersRes.data || [];

    const memberMapByName = new Map<string, any>();
    membersList.forEach((m) => {
      if (m.name) memberMapByName.set(m.name.trim().toLowerCase(), m);
    });

    const roster: SyncedTeamMember[] = [];
    const seenNames = new Set<string>();

    // 1. Process all registered users for this team
    for (const u of usersList) {
      const lowerName = (u.name || "").trim().toLowerCase();
      if (!lowerName || seenNames.has(lowerName)) continue;
      // Skip if member has been deleted
      if (deletedSet.has(lowerName) || (u.id && deletedSet.has(String(u.id).toLowerCase()))) continue;
      seenNames.add(lowerName);

      const matchedMember = memberMapByName.get(lowerName);
      const isAdminLead = u.role === "admin" || lowerName === "kailash";
      const resolvedRole = matchedMember?.role || (isAdminLead ? "Team Lead / Project Coordinator" : "Engineering Specialist");
      const resolvedProject = matchedMember?.project || (isAdminLead ? "Architecture, Gateway & Core Integration" : "Team Deliverables");

      roster.push({
        id: matchedMember?.id || `MEM-${u.id || Math.floor(1000 + Math.random() * 9000)}`,
        name: u.name,
        role: resolvedRole,
        type: isAdminLead ? "Team Lead" : "Core Member",
        status: (matchedMember?.status as any) || "Available",
        utilization: Number(matchedMember?.utilization) || 50,
        weeklyHours: Number(matchedMember?.weekly_hours) || 40,
        project: resolvedProject,
        skills: matchedMember?.skills || [resolvedRole, u.field || "IT & Software"],
        costRate: "Internal Resource",
        risk: "Low",
        avatarText: (u.name || "TM")
          .split(" ")
          .map((n: string) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2),
        avatarBg: isAdminLead ? "from-blue-600 to-cyan-500" : "from-emerald-600 to-teal-500",
        upcoming: "Workspace setup & deliverable execution",
        constraints: "",
        email: u.email,
      });
    }

    // 2. Also include any remaining team_members if users table doesn't have them yet
    for (const m of membersList) {
      const lowerName = (m.name || "").trim().toLowerCase();
      if (!lowerName || seenNames.has(lowerName)) continue;
      // Skip if member has been deleted
      if (deletedSet.has(lowerName) || (m.id && deletedSet.has(String(m.id).toLowerCase()))) continue;
      seenNames.add(lowerName);

      const isAdminLead = lowerName === "kailash";
      roster.push({
        id: m.id || `MEM-${Math.floor(1000 + Math.random() * 9000)}`,
        name: m.name,
        role: m.role || "Core Member",
        type: isAdminLead ? "Team Lead" : "Core Member",
        status: (m.status as any) || "Available",
        utilization: Number(m.utilization) || 50,
        weeklyHours: Number(m.weekly_hours) || 40,
        project: m.project || "Team Deliverables",
        skills: [m.role || "Core Contributor"],
        costRate: "Internal Resource",
        risk: "Low",
        avatarText: (m.name || "TM")
          .split(" ")
          .map((n: string) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2),
        avatarBg: isAdminLead ? "from-blue-600 to-cyan-500" : "from-teal-600 to-emerald-500",
        upcoming: "Sprint deliverable coordination",
        constraints: "",
      });
    }

    // Sort to keep Admin / Team Lead first
    roster.sort((a, b) => (a.type === "Team Lead" ? -1 : b.type === "Team Lead" ? 1 : 0));

    return roster;
  } catch (err) {
    console.warn("[Supabase] Failed to fetch organization workspace:", err);
    return [];
  }
}

/**
 * Delete a team member from Supabase (Admin only)
 */
export async function deleteTeamMember(id: string, name?: string) {
  try {
    recordDeletedMember(id, name);

    // Clean from registered users cache in localStorage
    try {
      const reg = JSON.parse(localStorage.getItem("resourcepulse_registered_users") || "{}");
      let changed = false;
      for (const email of Object.keys(reg)) {
        if (
          (name && reg[email]?.name?.toLowerCase().trim() === name.toLowerCase().trim()) ||
          (id && String(reg[email]?.id).toLowerCase() === id.toLowerCase())
        ) {
          delete reg[email];
          changed = true;
        }
      }
      if (changed) {
        localStorage.setItem("resourcepulse_registered_users", JSON.stringify(reg));
      }
    } catch {}

    // Clean from local student resources
    try {
      const raw = localStorage.getItem("resourcepulse_student_resources");
      if (raw) {
        const arr = JSON.parse(raw);
        const filtered = arr.filter((m: any) => 
          m.id !== id && (!name || m.name?.toLowerCase().trim() !== name.toLowerCase().trim())
        );
        localStorage.setItem("resourcepulse_student_resources", JSON.stringify(filtered));
        localStorage.setItem("resourcepulse_enterprise_resources_v2", JSON.stringify(filtered));
        window.dispatchEvent(new CustomEvent("resourcepulse-team-synced", { detail: filtered }));
      }
    } catch {}

    // Delete in Supabase
    if (id) {
      await supabase.from("team_members").delete().eq("id", id);
    }
    if (name) {
      await supabase.from("team_members").delete().ilike("name", name.trim());
      await supabase.from("users").delete().ilike("name", name.trim());
    }
    console.log(`[Supabase] Successfully deleted team member ${name || id}`);
  } catch (err) {
    console.warn("[Supabase] Failed to delete team member:", err);
  }
}

export interface TeammateChangeRequest {
  id: string;
  requesterName: string;
  requesterEmail?: string;
  targetMemberId: string;
  targetMemberName: string;
  currentValues: {
    role: string;
    project: string;
    weeklyHours: number;
    utilization: number;
    status: string;
  };
  requestedChanges: {
    role: string;
    project: string;
    weeklyHours: number;
    utilization: number;
    status: string;
  };
  status: "PENDING" | "APPROVED" | "REJECTED";
  submittedAt: string;
  decidedAt?: string;
  decidedBy?: string;
  decisionNote?: string;
}

const CR_STORAGE_KEY = "resourcepulse_teammate_change_requests";

export function loadChangeRequests(): TeammateChangeRequest[] {
  try {
    const raw = localStorage.getItem(CR_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export function saveChangeRequests(requests: TeammateChangeRequest[]) {
  try {
    localStorage.setItem(CR_STORAGE_KEY, JSON.stringify(requests));
    window.dispatchEvent(new CustomEvent("resourcepulse-change-requests-updated", { detail: requests }));
  } catch {}
}

export async function submitTeammateChangeRequest(req: Omit<TeammateChangeRequest, "id" | "status" | "submittedAt">): Promise<TeammateChangeRequest> {
  const newReq: TeammateChangeRequest = {
    ...req,
    id: `CR-${Date.now()}`,
    status: "PENDING",
    submittedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  };
  const existing = loadChangeRequests();
  const updated = [newReq, ...existing];
  saveChangeRequests(updated);

  // Record audit log
  void recordApprovalDecision(
    newReq.id,
    newReq.requesterName,
    `Change request submitted for ${newReq.targetMemberName}: Change deliverable to "${newReq.requestedChanges.project}" (${newReq.requestedChanges.weeklyHours}h/wk)`
  );

  return newReq;
}


/**
 * Synchronize local storage and UI events with Supabase organization workspace
 */
export async function syncOrganizationResources(targetTeamName?: string): Promise<SyncedTeamMember[]> {
  const roster = await fetchOrganizationWorkspace(targetTeamName);
  if (roster.length > 0) {
    try {
      localStorage.setItem("resourcepulse_student_resources", JSON.stringify(roster));
      const enterprise = roster.map((r) => ({
        id: r.id,
        name: r.name,
        role: r.role,
        department: r.type || "Engineering",
        type: "People",
        skills: r.skills || [],
        status: r.status === "Overallocated" ? "Overallocated" : r.status === "Unavailable" ? "On Leave" : "Available",
        weeklyCapacityHours: r.weeklyHours || 40,
        assignedHours: Math.round(((r.weeklyHours || 40) * (r.utilization || 50)) / 100),
        utilization: r.utilization || 50,
        costPerHour: 50,
        currentProjects: r.project ? [r.project] : [],
        employmentType: "Full-Time",
      }));
      localStorage.setItem("resourcepulse_enterprise_resources_v2", JSON.stringify(enterprise));
      window.dispatchEvent(new CustomEvent("resourcepulse-team-synced", { detail: roster }));
    } catch (e) {
      console.warn("Error updating local store during sync:", e);
    }
  }
  return roster;
}

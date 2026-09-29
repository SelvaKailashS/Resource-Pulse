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

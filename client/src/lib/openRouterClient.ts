import { resolveQueryKnowledgeBase, SITE_KNOWLEDGE_BASE } from "@shared/aiKnowledgeBase";

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || "";

export async function askLiveCopilot(query: string): Promise<{
  answer: string;
  suggestedAction?: string;
  actionPayload?: any;
}> {
  const q = query.trim().toLowerCase();

  let team: any[] = [];
  try {
    const raw = localStorage.getItem("resourcepulse_student_resources");
    if (raw) team = JSON.parse(raw);
  } catch {}
  const teamName = localStorage.getItem("resourcepulse_team_name") || "Operations Team";
  const field = localStorage.getItem("resourcepulse_selected_field") || "Operations & Cloud Systems";

  // Handle direct navigation and actions first
  if (
    q.includes("assign task") ||
    q.includes("allocate task")
  ) {
    const person = team[0]?.name || "Team Member";
    const task = team[0]?.project || "Core Project Deliverable";
    return {
      answer:
        `(New Task) Task assigned! ${person} has been allocated to ${task} with High Priority. The recovery package has been dispatched to Admin and Team Lead for sign-off.`,
      suggestedAction: "assign_task",
      actionPayload: { person, task },
    };
  }

  if (q === "approve" || q === "approve plan" || q === "confirm plan") {
    return {
      answer:
        "Plan approved! The team workload reallocation has been verified and logged into the audit trail for execution.",
      suggestedAction: "approve_plan",
    };
  }

  if (q === "run simulation" || q === "simulate" || q === "start simulation") {
    return {
      answer:
        "Opening the 5-second live simulation screen now. Rebalancing workload recovers velocity and protects project milestones.",
      suggestedAction: "run_simulation",
    };
  }

  // 1. Try serverless backend API (which securely uses OPENROUTER_API_KEY in Vercel/server environment)
  try {
    const resp = await fetch("/api/trpc/simulation.ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ json: { query } }),
    });
    if (resp.ok) {
      const data = await resp.json();
      const payload = data?.result?.data?.json;
      if (payload?.answer) {
        return {
          answer: payload.answer,
          suggestedAction: payload.suggestedAction,
          actionPayload: payload.actionPayload,
        };
      }
    }
  } catch {
    // Backend offline / static mode
  }

  // 2. Direct browser OpenRouter call if VITE_OPENROUTER_API_KEY is configured
  if (OPENROUTER_API_KEY) {
    try {
      const now = new Date();
      const dateStr = now.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      const promptContext = `You are Alex, an interactive, friendly, and expert AI Operations Assistant for Resource Pulse.
Live team context:
- Today's date: ${dateStr}. Current time: ${timeStr}.
- Team workspace: ${teamName}. Discipline / Field: ${field}.
- Active team members:
  ${team.length > 0 ? team.map((m: any, i: number) => `${i + 1}. ${m.name} (${m.role}, ${m.utilization}% load, deliverable: "${m.project}")`).join("\n  ") : "No members added yet"}

Instructions:
1. Answer the user's specific question naturally and conversationally in 1-3 sentences based on their real team data.
2. If they ask about today's date or time, answer with the exact date/time above.
3. If they ask about team members or capacity, summarize the active team members above.
4. Keep answers engaging, helpful, and concise.`;

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://resource-pulse-pied.vercel.app",
          "X-Title": "Resource Pulse",
        },
        body: JSON.stringify({
          model: "openrouter/auto",
          messages: [
            { role: "system", content: promptContext },
            { role: "user", content: query },
          ],
          max_tokens: 250,
          temperature: 0.7,
        }),
      });

      if (response.ok) {
        const data = (await response.json()) as any;
        const text = data?.choices?.[0]?.message?.content?.trim();
        if (text && text.length > 5) {
          let suggestedAction: string | undefined = undefined;
          let actionPayload: any = undefined;

          if (q.includes("simulation") || q.includes("simulate")) {
            suggestedAction = "run_simulation";
          } else if (q.includes("impact") || q.includes("risk") || q.includes("cascade")) {
            suggestedAction = "open_impact";
          } else if (q.includes("scenario") || q.includes("tradeoff")) {
            suggestedAction = "open_scenarios";
          } else if (q.includes("resource") || q.includes("worker") || q.includes("who is")) {
            suggestedAction = "open_resources";
          } else if (q.includes("approval") || q.includes("lead") || q.includes("decision")) {
            suggestedAction = "open_approvals";
          }

          return { answer: text, suggestedAction, actionPayload };
        }
      }
    } catch (e) {
      console.warn("[Copilot] OpenRouter client fetch skipped:", e);
    }
  }

  // 3. Resilient edge knowledge base fallback with dynamic date, time, workers, and resources
  return resolveQueryKnowledgeBase(query);
}

import { resolveQueryKnowledgeBase, SITE_KNOWLEDGE_BASE } from "@shared/aiKnowledgeBase";

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || "";

export async function askLiveCopilot(query: string): Promise<{
  answer: string;
  suggestedAction?: string;
  actionPayload?: any;
}> {
  const q = query.trim().toLowerCase();

  // Handle direct navigation and actions first
  if (
    q.includes("assign task") ||
    q.includes("allocate task") ||
    q.includes("assign to arjun")
  ) {
    return {
      answer:
        "(New Task) Task assigned! Arjun Rao has been allocated to Mobile Core E2E Automated Testing with High Priority. The recovery package has been dispatched to Admin and Team Lead for sign-off.",
      suggestedAction: "assign_task",
      actionPayload: { person: "Arjun Rao", task: "Mobile Core E2E Automated Testing" },
    };
  }

  if (q === "approve" || q === "approve plan" || q === "confirm plan") {
    return {
      answer:
        "Plan approved! The reallocation of Arjun Rao has been verified against skill and budget constraints, and logged into the audit trail for execution.",
      suggestedAction: "approve_plan",
    };
  }

  if (q === "run simulation" || q === "simulate" || q === "start simulation") {
    return {
      answer:
        "Opening the 5-second live simulation screen now. Reallocating Arjun Rao recovers 2.4 days with 94% confidence.",
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

      const promptContext = `You are Alex, an interactive, friendly, and expert AI Operations Director for Resource Pulse.
Live context:
- Today's date: ${dateStr}. Current time: ${timeStr}.
- System Health: ${SITE_KNOWLEDGE_BASE.organization.systemHealth}, Uptime: ${SITE_KNOWLEDGE_BASE.organization.uptime}.
- At-risk capacity: 12.6h in Mobile testing.
- 4 human engineers:
  1. Arjun Rao (Senior QA, $85/h, 96% load, 6.5h open tomorrow, 94% match for Mobile testing).
  2. Priya Sharma (Staff Backend, $110/h, 88% load, Go/gRPC, owns Northstar API & Payment Gateway).
  3. Marcus Vance (Cloud DevOps, $105/h, 64% load, on-call Friday, DO NOT swap due to EKS cluster downtime risk).
  4. Elena Rostova (Senior UI/UX, $90/h, 70% load, 4h open tomorrow, Figma/Design System 2.0).
- 4 infra/budget pools: GPU Cluster Alpha (4x H100s, 98% load, 72h maintenance cycle), Test Lab Alpha (32 devices, 16 free), Sprint Reserve ($1,200 total, $696 buffer open), Redis Cache (84% load).
- Downstream risk: QA drop delays Mobile Core E2E (+18h) -> delays Payment Gateway (+32h) -> slips Sprint 44 RC freeze (+3.8d, $4.2k overtime).

Instructions:
1. Answer the user's specific question naturally and conversationally in 1-3 sentences.
2. If they ask about today's date or time, answer with the exact date/time above.
3. If they ask about workers/people, explain the 4 human engineers and their workloads.
4. Keep answers engaging and dynamic. Never repeat a robotic boilerplate.`;

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

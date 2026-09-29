import React, { useState } from "react";
import {
  Sparkles,
  Bot,
  Layers,
  Check,
  Plus,
  Trash2,
  Clock,
  Briefcase,
  Users,
  X,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { recordTeamMember, recordTaskAssignment } from "@/lib/supabase";

interface AINeedsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPlanApplied?: () => void;
}

interface DeliverableItem {
  id: string;
  title: string;
  role: string;
  weeklyHours: number;
  priority: "High" | "Medium" | "Low";
}

export function AINeedsModal({ open, onOpenChange, onPlanApplied }: AINeedsModalProps) {
  const [projectGoal, setProjectGoal] = useState("");
  const [requestedFeatures, setRequestedFeatures] = useState("");
  const [teamCapacityNotes, setTeamCapacityNotes] = useState("");
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<DeliverableItem[] | null>(null);

  const teamName = localStorage.getItem("resourcepulse_team_name") || "Operations Team";
  const fieldName = localStorage.getItem("resourcepulse_selected_field") || "Universal Operations";

  if (!open) return null;

  const handleSynthesize = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectGoal.trim() && !requestedFeatures.trim()) {
      toast.error("Please enter your need", {
        description: "Tell the AI what your project is doing or what features you want to track.",
      });
      return;
    }

    setIsSynthesizing(true);

    setTimeout(() => {
      setIsSynthesizing(false);

      // Parse user's features from their text
      let rawFeatures = requestedFeatures
        .split(/[\n,;]+/)
        .map((s) => s.replace(/^\d+[\.\)]\s*/, "").trim())
        .filter((s) => s.length > 2);

      // If user only filled project goal, create deliverable items from their goal
      if (rawFeatures.length === 0 && projectGoal.trim()) {
        rawFeatures = [
          `${projectGoal.trim().slice(0, 45)} Architecture`,
          `${projectGoal.trim().slice(0, 45)} Implementation`,
          `${projectGoal.trim().slice(0, 45)} Testing & Delivery`,
        ];
      }

      // Parse capacity if mentioned
      const capacityMatch = teamCapacityNotes.match(/(\d+)\s*(h|hrs|hours)/i);
      const defaultHours = capacityMatch ? parseInt(capacityMatch[1], 10) : 20;

      const roles = [
        "Team Lead / Architect",
        "Lead Developer / Specialist",
        "Research & QA Specialist",
        "Implementation Engineer",
      ];

      const deliverables: DeliverableItem[] = rawFeatures.map((feat, idx) => ({
        id: `feat-${Date.now()}-${idx}`,
        title: feat,
        role: roles[idx % roles.length],
        weeklyHours: defaultHours,
        priority: idx === 0 ? "High" : idx === 1 ? "High" : "Medium",
      }));

      setGeneratedPlan(deliverables);
      toast.success("AI synthesized your project need!", {
        description: `Generated ${deliverables.length} custom deliverables from your exact input.`,
      });
    }, 600);
  };

  const handleApplyToWorkspace = () => {
    if (!generatedPlan || generatedPlan.length === 0) return;

    try {
      // Get current resources or initialize
      const stored = localStorage.getItem("resourcepulse_student_resources");
      let existingResources: any[] = [];
      if (stored) {
        try {
          existingResources = JSON.parse(stored);
        } catch {}
      }

      const teamCode = localStorage.getItem("resourcepulse_team_code") || `RP-${Math.floor(1000 + Math.random() * 9000)}`;

      // Build updated teammate roster based strictly on user's deliverables
      const updatedRoster: any[] = generatedPlan.map((item, idx) => {
        const existing = existingResources[idx];
        const memberName = existing?.name || (idx === 0 ? (localStorage.getItem("resourcepulse_session_user") ? JSON.parse(localStorage.getItem("resourcepulse_session_user")!).name : "Team Lead") : `Teammate ${idx + 1}`);

        return {
          id: existing?.id || `MEM-0${idx + 1}`,
          name: memberName,
          role: item.role,
          type: idx === 0 ? "Team Lead" : "Core Member",
          status: "Available",
          utilization: Math.min(95, Math.round((item.weeklyHours / 40) * 100)),
          weeklyHours: item.weeklyHours,
          project: item.title,
          skills: [item.role, fieldName],
          costRate: "Internal Resource",
          risk: item.priority === "High" ? "Low" : "Low",
          avatarText: memberName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "TM",
          avatarBg: idx === 0 ? "from-blue-600 to-cyan-500" : "from-sky-600 to-indigo-500",
          upcoming: `Milestone deliverable: ${item.title}`,
          constraints: teamCapacityNotes.trim() || "Active project contributor",
        };
      });

      localStorage.setItem("resourcepulse_student_resources", JSON.stringify(updatedRoster));
      localStorage.setItem("resourcepulse_project_objective", projectGoal.trim());
      localStorage.removeItem("resourcepulse_needs_setup_pending");

      // Record to Supabase
      updatedRoster.forEach((m) => {
        void recordTeamMember({
          id: m.id,
          name: m.name,
          role: m.role,
          project: m.project,
          weeklyHours: m.weeklyHours,
          utilization: m.utilization,
          status: m.status,
        });
        void recordTaskAssignment(m.name, m.project);
      });

      toast.success("Workspace Configured!", {
        description: `Configured ${updatedRoster.length} real deliverables from your instructions.`,
      });

      onPlanApplied?.();
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to apply plan", { description: "Please try again." });
    }
  };

  const handleUpdateDeliverable = (index: number, newTitle: string) => {
    if (!generatedPlan) return;
    const updated = [...generatedPlan];
    updated[index].title = newTitle;
    setGeneratedPlan(updated);
  };

  const handleDeleteDeliverable = (index: number) => {
    if (!generatedPlan) return;
    const updated = generatedPlan.filter((_, i) => i !== index);
    setGeneratedPlan(updated);
  };

  const handleAddDeliverable = () => {
    if (!generatedPlan) return;
    setGeneratedPlan([
      ...generatedPlan,
      {
        id: `feat-${Date.now()}`,
        title: "New Custom Feature Deliverable",
        role: "Core Developer",
        weeklyHours: 20,
        priority: "Medium",
      },
    ]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="w-full max-w-2xl bg-slate-900 border border-sky-500/40 rounded-2xl shadow-2xl p-6 sm:p-7 relative overflow-hidden animate-fadeIn max-h-[92vh] flex flex-col">
        {/* Ambient backdrop glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-sky-500/10 blur-[100px] pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-sky-900/30 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500/20 to-blue-600/30 border border-sky-400/40 flex items-center justify-center text-sky-400 shrink-0">
              <Bot size={22} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-400/30">
                  AI Needs & Scope Architect
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {fieldName} · {teamName}
                </span>
              </div>
              <h2 className="text-xl font-bold text-white mt-1">
                What’s your project or team need?
              </h2>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-xs text-slate-300 mb-5 leading-relaxed bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
          <strong className="text-sky-300 font-semibold">"{fieldName}"</strong> is only your chosen sector theme. Zero mock data is assumed. Tell the AI what you want to build, what features or milestones you need, and the AI will configure your exact deliverables directly from your answers.
        </p>

        {/* STEP 1: Enter Needs */}
        {!generatedPlan ? (
          <form onSubmit={handleSynthesize} className="space-y-4 overflow-y-auto pr-1 flex-1">
            <div>
              <label className="text-xs font-mono uppercase font-bold text-sky-300 block mb-1.5 flex items-center gap-1.5">
                <Briefcase size={14} /> 1. What do you want to accomplish or build? *
              </label>
              <textarea
                required
                rows={2}
                value={projectGoal}
                onChange={(e) => setProjectGoal(e.target.value)}
                placeholder="e.g. We are building an autonomous drone path planning system to detect crop irrigation issues and publishing our research paper."
                className="w-full bg-slate-950/90 border border-slate-700/80 focus:border-sky-400 focus:ring-1 focus:ring-sky-400 rounded-xl p-3 text-xs text-white placeholder-slate-500 outline-none leading-relaxed transition-all resize-none"
              />
            </div>

            <div>
              <label className="text-xs font-mono uppercase font-bold text-sky-300 block mb-1.5 flex items-center gap-1.5">
                <Layers size={14} /> 2. What specific features or deliverables do you want to track? *
              </label>
              <textarea
                required
                rows={3}
                value={requestedFeatures}
                onChange={(e) => setRequestedFeatures(e.target.value)}
                placeholder="Enter each feature or deliverable (separated by commas or new lines):&#10;e.g.&#10;1. Multispectral camera calibration&#10;2. Computer vision weed segmentation model&#10;3. Real-time telemetry web portal&#10;4. Final benchmark results & report"
                className="w-full bg-slate-950/90 border border-slate-700/80 focus:border-sky-400 focus:ring-1 focus:ring-sky-400 rounded-xl p-3 text-xs text-white placeholder-slate-500 outline-none leading-relaxed transition-all resize-none font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-mono uppercase font-bold text-slate-300 block mb-1.5 flex items-center gap-1.5">
                <Clock size={14} /> 3. Team capacity & delivery timeline (Optional)
              </label>
              <input
                type="text"
                value={teamCapacityNotes}
                onChange={(e) => setTeamCapacityNotes(e.target.value)}
                placeholder="e.g. 4 team members, 20 hours/week each, sprint delivery in 4 weeks"
                className="w-full bg-slate-950/90 border border-slate-700/80 focus:border-sky-400 focus:ring-1 focus:ring-sky-400 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none transition-all"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="secondary-button text-xs px-4 py-2.5"
              >
                Skip / Set Later
              </button>
              <button
                type="submit"
                disabled={isSynthesizing}
                className="primary-button text-xs px-5 py-2.5 flex items-center gap-2 font-bold cursor-pointer"
              >
                {isSynthesizing ? (
                  <span>Synthesizing Your Needs…</span>
                ) : (
                  <>
                    <span>Generate Workspace From My Needs</span>
                    <Sparkles size={14} />
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* STEP 2: Review & Apply Generated Plan */
          <div className="space-y-4 flex-1 overflow-y-auto pr-1">
            <div className="flex items-center justify-between bg-sky-950/40 p-3 rounded-xl border border-sky-400/30">
              <div>
                <strong className="text-xs text-sky-200 block font-bold">
                  Generated Workspace Modules ({generatedPlan.length} deliverables)
                </strong>
                <span className="text-[11px] text-slate-400">
                  Review and edit deliverable titles before applying them to your live workspace.
                </span>
              </div>
              <button
                type="button"
                onClick={handleAddDeliverable}
                className="px-2.5 py-1 text-xs rounded-lg bg-sky-500/20 text-sky-300 border border-sky-400/30 hover:bg-sky-500/30 flex items-center gap-1 cursor-pointer"
              >
                <Plus size={13} /> Add Deliverable
              </button>
            </div>

            <div className="space-y-2 max-h-[38vh] overflow-y-auto pr-1">
              {generatedPlan.map((item, idx) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-3"
                >
                  <span className="w-6 h-6 rounded-lg bg-sky-500/20 text-sky-400 font-mono text-xs flex items-center justify-center font-bold shrink-0">
                    {idx + 1}
                  </span>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={item.title}
                      onChange={(e) => handleUpdateDeliverable(idx, e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-sky-400 outline-none font-medium"
                    />
                    <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-400 font-mono">
                      <span>Assigned Role: <strong className="text-slate-300">{item.role}</strong></span>
                      <span>·</span>
                      <span>Capacity: <strong className="text-sky-300">{item.weeklyHours}h/wk</strong></span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteDeliverable(idx)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-900"
                    title="Remove deliverable"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setGeneratedPlan(null)}
                className="text-xs text-slate-400 hover:text-white"
              >
                ← Back to Edit Needs
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="secondary-button text-xs px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyToWorkspace}
                  className="primary-button text-xs px-5 py-2 flex items-center gap-2 font-bold cursor-pointer"
                >
                  <span>Apply to Workspace</span>
                  <CheckCircle2 size={15} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AINeedsModal;

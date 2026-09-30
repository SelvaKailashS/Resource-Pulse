import { useState, useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  MessageSquare,
  X,
  Send,
  Sparkles,
  Bot,
  User,
  Zap,
  CheckCircle2,
  BellRing,
  ArrowRight,
  Play,
  Layers3,
  GitBranch,
  Users,
  ShieldCheck,
  Activity,
  Sliders,
  Settings2,
  RotateCcw,
  Square,
  HelpCircle,
  Wrench,
  Boxes,
} from "lucide-react";
import { toast } from "sonner";
import { askLiveCopilot } from "@/lib/openRouterClient";
import { recordCopilotChat } from "@/lib/supabase";
import {
  loadInitialResources,
  loadInitialProjects,
  loadInitialAssets,
  loadInitialInventory,
} from "@/lib/orgStore";

interface Props {
  activeNav: string;
  onNavigate: (view: string) => void;
  onLaunchSimulation: () => void;
  onApprovePlan: () => void;
  onAssignTask: (resourceName: string, taskName: string) => void;
}

export interface AIExplanation {
  finding: string;
  evidence: string;
  impact: string;
  recommendation: string;
  confidence?: number;
}

interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
  explanation?: AIExplanation;
  actionTaken?: string;
  actionPayload?: any;
  quickActions?: { label: string; action: () => void; icon?: any }[];
}

export function VoiceAssistantCopilot({
  activeNav,
  onNavigate,
  onLaunchSimulation,
  onApprovePlan,
  onAssignTask,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [transcript, setTranscript] = useState("");
  const [inputMessage, setInputMessage] = useState("");

  // Voice Customization State
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>(() => {
    return localStorage.getItem("rp_voice_uri") || "";
  });
  const [voicePitch, setVoicePitch] = useState<number>(() => {
    return parseFloat(localStorage.getItem("rp_voice_pitch") || "1.0");
  });
  const [voiceRate, setVoiceRate] = useState<number>(() => {
    return parseFloat(localStorage.getItem("rp_voice_rate") || "1.05");
  });

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const currentTeam = typeof window !== "undefined" ? localStorage.getItem("resourcepulse_team_name") || "your organization" : "your organization";
    return [
      {
        id: "1",
        sender: "ai",
        text: `Hello! I'm Pulse AI, your Universal Resource Intelligence & Operations Copilot for ${currentTeam}. Ask me anything about workload equilibrium, available capacity, machine maintenance, or simulation scenarios!`,
        timestamp: "Just now",
        quickActions: [
          { label: "Which resources are overloaded?", action: () => handleDirectQuery("Which resources are overloaded?"), icon: Activity },
          { label: "Where do we have unused capacity?", action: () => handleDirectQuery("Where do we have unused capacity?"), icon: Users },
          { label: "Show projects at risk", action: () => handleDirectQuery("Show me projects at risk"), icon: Play },
          { label: "Which machine needs maintenance?", action: () => handleDirectQuery("Which machine needs maintenance?"), icon: Wrench },
        ],
      },
    ];
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Soft tone generator for mic feedback
  const playTone = (freq = 440, type: OscillatorType = "sine", duration = 0.1) => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") void ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Audio context may require user gesture on some browsers
    }
  };

  // Load available speech synthesis voices
  useEffect(() => {
    const updateVoices = () => {
      if (!("speechSynthesis" in window)) return;
      const allVoices = window.speechSynthesis.getVoices();
      
      // Specifically target Samantha as default AI voice
      const samantha = allVoices.find((v) => v.name.toLowerCase().includes("samantha"));
      const fallback = allVoices.find(
        (v) =>
          v.lang.startsWith("en") &&
          (v.name.toLowerCase().includes("zira") ||
           v.name.toLowerCase().includes("jenny") ||
           v.name.toLowerCase().includes("female") ||
           v.name.toLowerCase().includes("natural"))
      );

      const samanthaVoice = samantha || fallback || allVoices[0];
      if (samanthaVoice) {
        setAvailableVoices([samanthaVoice]);
        setSelectedVoiceURI(samanthaVoice.voiceURI);
        localStorage.setItem("rp_voice_uri", samanthaVoice.voiceURI);
      }
    };

    updateVoices();
    if ("speechSynthesis" in window) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  // Speech Synthesis: speak text aloud with chosen voice settings
  const speak = (text: string) => {
    if (!voiceEnabled || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel(); // cancel any ongoing speech

    // Clean text for speech
    const cleanText = text.replace(/[*_#`]/g, "");
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = voiceRate;
    utterance.pitch = voicePitch;

    // Pick selected voice
    if (selectedVoiceURI) {
      const voice = availableVoices.find((v) => v.voiceURI === selectedVoiceURI);
      if (voice) utterance.voice = voice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  // Test selected voice
  const handleTestVoice = () => {
    speak(
      "Hello! This is how my voice sounds. I'm ready to assist you with Resource Pulse operations."
    );
  };

  // Set preset voice profile
  const applyVoicePreset = (preset: "male" | "female" | "executive") => {
    if (preset === "male") {
      setVoicePitch(0.85);
      setVoiceRate(1.0);
      const maleVoice = availableVoices.find(
        (v) =>
          v.name.toLowerCase().includes("david") ||
          v.name.toLowerCase().includes("mark") ||
          v.name.toLowerCase().includes("male")
      );
      if (maleVoice) {
        setSelectedVoiceURI(maleVoice.voiceURI);
        localStorage.setItem("rp_voice_uri", maleVoice.voiceURI);
      }
      localStorage.setItem("rp_voice_pitch", "0.85");
      localStorage.setItem("rp_voice_rate", "1.0");
      toast.success("Applied Voice: Alex (Male)");
    } else if (preset === "female") {
      setVoicePitch(1.08);
      setVoiceRate(1.05);
      const femaleVoice = availableVoices.find(
        (v) =>
          v.name.toLowerCase().includes("samantha") ||
          v.name.toLowerCase().includes("zira") ||
          v.name.toLowerCase().includes("female")
      );
      if (femaleVoice) {
        setSelectedVoiceURI(femaleVoice.voiceURI);
        localStorage.setItem("rp_voice_uri", femaleVoice.voiceURI);
      }
      localStorage.setItem("rp_voice_pitch", "1.08");
      localStorage.setItem("rp_voice_rate", "1.05");
      toast.success("Applied Voice: Samantha / Maya (Female)");
    } else {
      setVoicePitch(1.0);
      setVoiceRate(1.2);
      localStorage.setItem("rp_voice_pitch", "1.0");
      localStorage.setItem("rp_voice_rate", "1.2");
      toast.success("Applied Voice: Crisp Executive (Fast)");
    }
  };

  // Initialize Web Speech Recognition
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
        playTone(520, "sine", 0.08); // startup chime
      };

      recognition.onresult = (event: any) => {
        const current = event.resultIndex;
        const resultTranscript = event.results[current][0].transcript;
        setTranscript(resultTranscript);

        if (event.results[current].isFinal) {
          playTone(660, "sine", 0.08); // finish chime
          handleVoiceCommand(resultTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  // Single Tap to Toggle Listening (Push-to-Talk)
  const toggleListening = () => {
    if (!recognitionRef.current) {
      toast.error("Speech Recognition Not Supported", {
        description: "Your browser does not support Web Speech API. Please use Google Chrome or Microsoft Edge.",
      });
      return;
    }

    if (isListening) {
      // Tap again to stop and immediately send transcript if present
      recognitionRef.current.stop();
      setIsListening(false);
      if (transcript.trim()) {
        playTone(660, "sine", 0.08);
        handleVoiceCommand(transcript);
      }
    } else {
      // Tap once to start listening
      setTranscript("");
      try {
        recognitionRef.current.start();
      } catch (e) {
        recognitionRef.current.stop();
        setTimeout(() => recognitionRef.current.start(), 150);
      }
    }
  };

  const handleDirectQuery = (text: string) => {
    handleVoiceCommand(text);
  };

  // Process voice commands or chat text dynamically
  const handleVoiceCommand = async (commandText: string) => {
    const text = commandText.trim();
    if (!text) return;

    // Add user message to thread
    const userMsg: ChatMessage = {
      id: String(Date.now()),
      sender: "user",
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, userMsg]);
    setTranscript("");
    void recordCopilotChat("user", text);

    const lower = text.toLowerCase();

    // 1. Direct explicit navigation triggers
    if (
      lower.startsWith("go to resources") ||
      lower.startsWith("open resources") ||
      lower.startsWith("view resources") ||
      lower === "resources"
    ) {
      onNavigate("Resources");
      handleAIResponse("Navigated to the Resources directory. Displaying all 8 team members and infrastructure nodes.", "open_resources");
      return;
    }

    if (
      lower.startsWith("go to impact") ||
      lower.startsWith("open impact") ||
      lower.startsWith("view impact") ||
      lower === "impact graph"
    ) {
      onNavigate("Impact graph");
      handleAIResponse("Switched to Cascading Impact Analysis. Tracing 5 stages from QA deficit to release delay.", "open_impact");
      return;
    }

    if (
      lower.startsWith("go to scenarios") ||
      lower.startsWith("open scenarios") ||
      lower.startsWith("view scenarios") ||
      lower === "scenarios"
    ) {
      onNavigate("Scenarios");
      handleAIResponse("Switched to Scenarios view. You can compare Balanced, Deadline Protection, and Cost Minimization plans.", "open_scenarios");
      return;
    }

    if (
      lower.startsWith("go to approvals") ||
      lower.startsWith("open approvals") ||
      lower.startsWith("view approvals") ||
      lower === "approvals"
    ) {
      onNavigate("Approvals");
      handleAIResponse("Opened the Approval Center. Reviewing pending human authorization decisions.", "open_approvals");
      return;
    }

    if (
      lower.startsWith("go to automation") ||
      lower.startsWith("open automation") ||
      lower.startsWith("view automation") ||
      lower.includes("automation center") ||
      lower === "automations" ||
      lower === "automation" ||
      lower.includes("make webhook") ||
      lower.includes("make.com")
    ) {
      onNavigate("Automation Center");
      handleAIResponse("Opened the Automation Center. Monitoring universal event triggers, Make.com webhook dispatches, and deadline monitoring.", "open_automations");
      return;
    }

    if (
      lower.startsWith("go home") ||
      lower.startsWith("open command center") ||
      lower === "home" ||
      lower === "command center"
    ) {
      onNavigate("Command center");
      handleAIResponse("Navigated back to the Command Center overview.", "open_home");
      return;
    }

    // 2. Today's date and time queries
    if (lower.includes("today") || lower.includes("date") || lower.includes("time") || lower.includes("clock")) {
      const now = new Date();
      const dateStr = now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
      const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const currentTeam = localStorage.getItem("resourcepulse_team_name") || "your organization";
      handleAIResponse(`Today is ${dateStr}, and the current time is ${timeStr}. Monitoring live operations for ${currentTeam}.`);
      return;
    }

    const curResources = loadInitialResources();
    const curProjects = loadInitialProjects();
    const curAssets = loadInitialAssets();
    const curInventory = loadInitialInventory();
    const isDataEmpty = curResources.length === 0 && curProjects.length === 0 && curAssets.length === 0;

    // 1. Which resources are overloaded? (Section 28)
    if (
      lower.includes("which resources are overloaded") ||
      lower.includes("overloaded resources") ||
      lower.includes("who is overloaded") ||
      lower.includes("workload overload")
    ) {
      if (isDataEmpty) {
        handleAIResponse(
          "There isn't enough data to generate a reliable analysis. Welcome to ResourcePulse. Your workspace doesn't contain any resource data yet. Please import data or register resources.",
          "open_home",
          undefined,
          {
            finding: "Workspace contains zero active resource records.",
            evidence: "0 resources, 0 projects recorded in telemetry.",
            impact: "Cannot evaluate capacity overload without real organizational data.",
            recommendation: "Import a dataset or click '+ Add Resource' to begin tracking.",
            confidence: 100,
          }
        );
        return;
      }

      const overloaded = curResources.filter((r) => r.utilization > 85);
      if (overloaded.length > 0) {
        const names = overloaded.map((r) => `${r.name} (${r.utilization}% load, ${r.assignedHours}h/${r.weeklyCapacityHours}h)`).join(", ");
        handleAIResponse(
          `${overloaded.length} resource(s) are currently operating above their configured safe capacity threshold: ${names}.`,
          "open_resources",
          undefined,
          {
            finding: `${overloaded.length} team members exceed 85% capacity threshold.`,
            evidence: names,
            impact: "High risk of delivery bottlenecking, missed sprint milestones, and burnout.",
            recommendation: "Rebalance tasks in Allocation or trigger 5-second recovery simulation.",
            confidence: 96,
          }
        );
      } else {
        handleAIResponse(
          "All active team members are operating within healthy capacity thresholds (<85% utilization). No resource overload detected.",
          "open_resources",
          undefined,
          {
            finding: "Zero resources in overloaded state.",
            evidence: `Tracked ${curResources.length} active resources. Highest utilization is ${Math.max(...curResources.map((r) => r.utilization), 0)}%.`,
            impact: "Operating risk is minimal. Safe capacity equilibrium maintained.",
            recommendation: "Maintain current delivery pace or absorb backlog items.",
            confidence: 98,
          }
        );
      }
      return;
    }

    // 2. Where do we have unused capacity? (Section 28)
    if (
      lower.includes("where do we have unused capacity") ||
      lower.includes("unused capacity") ||
      lower.includes("available capacity") ||
      lower.includes("who is free") ||
      lower.includes("available resources")
    ) {
      if (isDataEmpty) {
        handleAIResponse(
          "There isn't enough data to generate a reliable analysis. Please import data or add team members to measure available capacity.",
          "open_home"
        );
        return;
      }

      const available = curResources.filter((r) => r.utilization < 80);
      const totalUnusedHours = curResources.reduce((s, r) => s + Math.max(0, r.weeklyCapacityHours - r.assignedHours), 0);
      const list = available.map((r) => `${r.name} (${Math.max(0, r.weeklyCapacityHours - r.assignedHours)}h available, ${r.utilization}% load)`).join(", ");

      handleAIResponse(
        `You have ${totalUnusedHours} hours of available weekly capacity across your team. Key available resources: ${list || "none"}.`,
        "open_resources",
        undefined,
        {
          finding: `${totalUnusedHours} hours of unallocated weekly capacity available.`,
          evidence: `${available.length} of ${curResources.length} members have available capacity.`,
          impact: "Opportunity to absorb secondary project milestones without external contractor costs.",
          recommendation: "Assign pending deliverables to available team members in Allocation.",
          confidence: 94,
        }
      );
      return;
    }

    // 3. What will we need next month? (Section 28)
    if (
      lower.includes("what will we need next month") ||
      lower.includes("next month") ||
      lower.includes("future resource requirements") ||
      lower.includes("what resources will we need")
    ) {
      if (isDataEmpty) {
        handleAIResponse(
          "There isn't enough data to generate a reliable analysis. Ingest your project backlog to compute monthly capacity forecasts.",
          "open_home"
        );
        return;
      }

      const remainingDemandHours = curProjects.reduce((s, p) => s + Math.max(0, p.requiredHours - p.assignedHours), 0);
      const monthlyCapacityHours = curResources.reduce((s, r) => s + r.weeklyCapacityHours * 4, 0);
      const balance = monthlyCapacityHours - remainingDemandHours;

      handleAIResponse(
        `For the upcoming month, your initiatives require ~${remainingDemandHours} hours of deliverable effort against a projected team capacity of ${monthlyCapacityHours} hours (${balance >= 0 ? `+${balance}h surplus buffer` : `${Math.abs(balance)}h capacity deficit`}).`,
        "open_scenarios",
        undefined,
        {
          finding: `Monthly project demand: ${remainingDemandHours}h vs capacity: ${monthlyCapacityHours}h.`,
          evidence: `Computed across ${curProjects.length} projects and ${curResources.length} active resources.`,
          impact: balance >= 0 ? "All milestones protected within current velocity." : "At-risk delivery deadline without scope adjustments.",
          recommendation: balance >= 0 ? "Proceed with planned sprint milestones." : "Consider onboarding temporary contractors or shifting secondary scope in Scenarios.",
          confidence: 90,
        }
      );
      return;
    }

    // 4. Why is utilization increasing? (Section 28)
    if (
      lower.includes("why is utilization increasing") ||
      lower.includes("utilization increasing") ||
      lower.includes("why utilization is rising") ||
      lower.includes("utilization trend")
    ) {
      if (isDataEmpty) {
        handleAIResponse(
          "There isn't enough data to generate a reliable analysis. Telemetry begins once project assignments are recorded.",
          "open_home"
        );
        return;
      }

      const activeProjects = curProjects.filter((p) => p.status === "In Progress" || p.status === "At Risk");
      const totalAssigned = curProjects.reduce((s, p) => s + p.assignedHours, 0);

      handleAIResponse(
        `Utilization is increasing due to concentrated deliverable commitments across ${activeProjects.length} active initiatives totaling ${totalAssigned} assigned hours.`,
        "open_home",
        undefined,
        {
          finding: "Capacity absorption driven by concurrent project deadlines.",
          evidence: `${totalAssigned} hours currently committed across active project portfolio.`,
          impact: "Decreasing idle capacity buffer increases vulnerability to unexpected blockers.",
          recommendation: "Ensure critical path tasks are distributed evenly across team members.",
          confidence: 92,
        }
      );
      return;
    }

    // 5. Show me projects at risk (Section 28)
    if (
      lower.includes("show me projects at risk") ||
      lower.includes("projects at risk") ||
      lower.includes("which projects are at risk") ||
      lower.includes("project at risk")
    ) {
      if (isDataEmpty) {
        handleAIResponse(
          "There isn't enough data to generate a reliable analysis. Create or import projects to begin risk monitoring.",
          "open_projects"
        );
        return;
      }

      const atRisk = curProjects.filter((p) => p.status === "At Risk" || p.assignedHours < p.requiredHours * 0.4);
      if (atRisk.length > 0) {
        const names = atRisk.map((p) => `"${p.name}" (${p.assignedHours}h/${p.requiredHours}h, due ${p.endDate})`).join(", ");
        handleAIResponse(
          `${atRisk.length} project(s) are currently flagged with delivery risk: ${names}.`,
          "open_projects",
          undefined,
          {
            finding: `${atRisk.length} project initiative(s) exhibit schedule or resource deficits.`,
            evidence: names,
            impact: "Milestone delivery window compression; potential cascading delays.",
            recommendation: "Allocate additional team members in Allocation or rebalance scope in Scenarios.",
            confidence: 95,
          }
        );
      } else {
        handleAIResponse(
          `All ${curProjects.length} project initiatives are currently on track and within schedule tolerances. Zero delivery risks detected.`,
          "open_projects",
          undefined,
          {
            finding: "All tracked projects are on schedule.",
            evidence: `${curProjects.length} projects analyzed with balanced milestone completion.`,
            impact: "Milestones are protected.",
            recommendation: "Continue standard sprint execution.",
            confidence: 97,
          }
        );
      }
      return;
    }

    // 6. What happens if we add 5 developers? (Section 28)
    if (
      lower.includes("add 5 developers") ||
      lower.includes("add 10 employees") ||
      lower.includes("add 5 employees") ||
      lower.includes("add developers") ||
      lower.includes("add headcount")
    ) {
      const curAvg = curResources.length > 0
        ? Math.round(curResources.reduce((s, r) => s + r.utilization, 0) / curResources.length)
        : 50;
      const count = lower.includes("10") ? 10 : 5;
      const addedHours = count * 40;
      const newTotalCapacity = curResources.reduce((s, r) => s + r.weeklyCapacityHours, 0) + addedHours;
      const totalAssigned = curResources.reduce((s, r) => s + r.assignedHours, 0);
      const newAvg = Math.round((totalAssigned / (newTotalCapacity || 1)) * 100);

      handleAIResponse(
        `Adding ${count} contributors adds +${addedHours} hours/week of capacity. Team average utilization drops from ${curAvg}% to ${newAvg}%, eliminating milestone compression.`,
        "open_scenarios",
        undefined,
        {
          finding: `Simulated impact of +${count} contributors: +${addedHours}h weekly capacity.`,
          evidence: `Calculated from ${totalAssigned}h current assigned work and baseline capacity.`,
          impact: "Eliminates all critical path bottlenecks; accelerates project completion by ~3.5 days.",
          recommendation: "Review the full cost/benefit tradeoff analysis in Scenarios view.",
          confidence: 92,
        }
      );
      return;
    }

    // 7. Which machine needs maintenance? (Section 28)
    if (
      lower.includes("which machine needs maintenance") ||
      lower.includes("machine maintenance") ||
      lower.includes("equipment maintenance") ||
      lower.includes("maintenance alert") ||
      lower.includes("which asset needs maintenance")
    ) {
      if (curAssets.length === 0) {
        handleAIResponse(
          "There are no physical assets or machinery registered yet. You can register machinery, vehicles, and equipment in the Assets tab to enable predictive maintenance.",
          "open_home",
          undefined,
          {
            finding: "0 physical assets registered in workspace.",
            evidence: "Asset store contains zero records.",
            impact: "Predictive maintenance engine is awaiting equipment registration.",
            recommendation: "Open Assets tab and click '+ Add Asset' to record operating hours.",
            confidence: 100,
          }
        );
        return;
      }

      const due = curAssets.filter((a) => a.operatingHours >= (a.maxHours || 500) * 0.8 || a.healthScore < 80);
      if (due.length > 0) {
        const names = due.map((a) => `${a.name} (${a.operatingHours}h logged, health: ${a.healthScore}%, service date: ${a.nextMaintenanceDate})`).join("; ");
        handleAIResponse(
          `${due.length} asset(s) are due for predictive maintenance: ${names}.`,
          "open_home",
          undefined,
          {
            finding: `${due.length} machine(s) have reached or exceeded 80% operating threshold.`,
            evidence: names,
            impact: "Increased risk of unplanned mechanical downtime and OEE degradation.",
            recommendation: "Schedule maintenance service window in Assets or Schedule view.",
            confidence: 96,
          }
        );
      } else {
        handleAIResponse(
          `All ${curAssets.length} registered assets and machines are in optimal operating condition with health scores above 80%. Zero maintenance alerts.`,
          "open_home",
          undefined,
          {
            finding: "All machinery operating within safe parameters.",
            evidence: `${curAssets.length} assets verified. Mean fleet health: 94%.`,
            impact: "OEE is maintained; no production line stoppages expected.",
            recommendation: "Maintain scheduled preventive inspection routines.",
            confidence: 98,
          }
        );
      }
      return;
    }

    // 3. Workers / Team headcount / Who is on the team queries
    if (
      lower.includes("how many workers") ||
      lower.includes("workers are working") ||
      lower.includes("who is working") ||
      lower.includes("how many people") ||
      lower.includes("team members") ||
      lower.includes("how many resources") ||
      lower.includes("who is on the team") ||
      lower.includes("who is on team") ||
      lower.includes("team roster") ||
      lower.includes("my team") ||
      lower.includes("show team")
    ) {
      let teamSummary = "There are no teammates registered yet. Add your teammates in the Resources tab or use the AI Project Setup.";
      try {
        const raw = localStorage.getItem("resourcepulse_student_resources");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const teamName = localStorage.getItem("resourcepulse_team_name") || "your team";
            teamSummary = `There are ${parsed.length} active member(s) in ${teamName}: ` +
              parsed.map((m: any) => `${m.name} (${m.role}, ${m.utilization}% load, working on: "${m.project}")`).join(", ") + ".";
          }
        }
      } catch {}
      handleAIResponse(teamSummary, "open_resources");
      return;
    }

    // Project capability queries
    if (
      lower.includes("can use this website") ||
      lower.includes("use this website") ||
      lower.includes("can i use") ||
      lower.includes("can we use") ||
      lower.includes("manage project")
    ) {
      let projCount = 0;
      try {
        const rawProj = localStorage.getItem("resourcepulse_enterprise_projects_v2");
        if (rawProj) {
          const parsed = JSON.parse(rawProj);
          if (Array.isArray(parsed)) projCount = parsed.length;
        }
      } catch {}

      handleAIResponse(
        `Yes, absolutely! ResourcePulse is built for enterprise project portfolio and deliverable management. You can create projects in the Projects tab, upload requirements (documents, PDFs, spreadsheets, images), decompose milestones with AI, allocate team members based on skills, and track capacity curves. You currently have ${projCount} project(s) configured.`,
        "open_projects"
      );
      return;
    }

    // Conversational queries like "say something"
    if (
      lower.includes("say something") ||
      lower.includes("tell me something") ||
      lower.includes("talk to me")
    ) {
      const currentTeam = localStorage.getItem("resourcepulse_team_name") || "your team";
      handleAIResponse(
        `Your ${currentTeam} workspace is operating in equilibrium. Live capacity tracking and milestone risk telemetry are active with 0 cascading bottlenecks detected. What deliverable or project would you like to explore?`,
        "open_home"
      );
      return;
    }

    // Greetings & What can you do (bounded)
    if (
      (/\b(hello|hi|hey|howdy|greetings)\b/i.test(lower) && lower.split(" ").length <= 4) ||
      lower.includes("what can you do") ||
      lower.includes("who are you")
    ) {
      const currentTeam = localStorage.getItem("resourcepulse_team_name") || "your team";
      handleAIResponse(
        `Hello! I'm Alex, your AI Operations Copilot for ${currentTeam}. I track your team members' workloads, identify capacity bottlenecks, run 5-second simulations, and assist with deliverable rebalancing. Ask me about who is on your team, project status, or tell me to run a simulation!`,
        "open_home"
      );
      return;
    }

    // 4. Split work / Balanced workload queries
    if (
      lower.includes("split") ||
      lower.includes("divide") ||
      lower.includes("workload split") ||
      lower.includes("equal") ||
      lower.includes("share work")
    ) {
      handleAIResponse(
        "I recommend an Intelligent Workload Split! Distributing deliverable tasks equally among active teammates maintains velocity, avoids single-person bottlenecks, and prevents pre-milestone burnout.",
        "split_work"
      );
      return;
    }

    // 5. Why reallocate queries
    if (lower.includes("why reallocate") || lower.includes("why is reallocate") || lower.includes("reallocate")) {
      handleAIResponse(
        "Workload reallocation is triggered when a teammate's capacity exceeds 80% or milestone deadlines are threatened. Rebalancing deliverables ensures all project components stay on schedule.",
        "open_resources"
      );
      return;
    }

    // 7. Direct simulation trigger
    if (
      lower === "run simulation" ||
      lower === "simulate" ||
      lower === "start simulation" ||
      lower.includes("simulate absence") ||
      lower.startsWith("run simulation now")
    ) {
      onLaunchSimulation();
      handleAIResponse("Launching live simulation! Opening executive 5-second recovery screen now.", "run_simulation");
      return;
    }

    // 3. Direct task assignment trigger
    if (
      lower.startsWith("assign task to") ||
      lower.startsWith("allocate task to") ||
      lower === "assign task" ||
      lower === "assign new task"
    ) {
      let team: any[] = [];
      try {
        const raw = localStorage.getItem("resourcepulse_student_resources");
        if (raw) team = JSON.parse(raw);
      } catch {}
      const person = team[0]?.name || "Team Member";
      const task = team[0]?.project || "Core Project Deliverable";

      onAssignTask(person, task);
      const reply = `(New Task) Task assigned! ${person} has been allocated to ${task} with High Priority. The recovery package has been dispatched to Admin and Team Lead for sign-off.`;
      handleAIResponse(reply, "assign_task", { person, task });
      return;
    }

    // 4. Direct approval trigger
    if (
      lower === "approve" ||
      lower === "approve plan" ||
      lower === "confirm plan" ||
      lower === "sign off"
    ) {
      onApprovePlan();
      handleAIResponse("Plan approved! Reallocation changes have been logged in the audit trail and scheduled for immediate execution.", "approve_plan");
      return;
    }

    // 5. Query OpenRouter / Edge Dynamic Engine
    setIsAnalyzing(true);
    try {
      const res = await askLiveCopilot(text);
      setIsAnalyzing(false);
      handleAIResponse(res.answer, res.suggestedAction, res.actionPayload);
    } catch (e) {
      setIsAnalyzing(false);
      handleAIResponse(
        "I'm tracking your team capacity and sprint deliverables. Workloads are operating within current capacity thresholds."
      );
    }
  };

  const handleAIResponse = (
    replyText: string,
    action?: string,
    actionPayload?: any,
    explanation?: AIExplanation
  ) => {
    void recordCopilotChat("ai", replyText);

    // Generate contextual interactive quick-action chips
    const quickActions: { label: string; action: () => void; icon?: any }[] = [];

    if (
      action === "open_resources" ||
      replyText.toLowerCase().includes("teammate") ||
      replyText.toLowerCase().includes("member") ||
      replyText.toLowerCase().includes("worker") ||
      replyText.toLowerCase().includes("capacity")
    ) {
      quickActions.push({
        label: "View in Resources",
        action: () => onNavigate("Resources"),
        icon: Users,
      });
    }

    if (
      action === "open_impact" ||
      replyText.toLowerCase().includes("risk") ||
      replyText.toLowerCase().includes("cascade") ||
      replyText.toLowerCase().includes("blocked")
    ) {
      quickActions.push({
        label: "Open Impact Graph",
        action: () => onNavigate("Impact graph"),
        icon: GitBranch,
      });
    }

    if (
      action === "open_scenarios" ||
      replyText.toLowerCase().includes("scenario") ||
      replyText.toLowerCase().includes("balanced")
    ) {
      quickActions.push({
        label: "Compare Scenarios",
        action: () => onNavigate("Scenarios"),
        icon: Layers3,
      });
    }

    if (
      action === "open_approvals" ||
      replyText.toLowerCase().includes("approval") ||
      replyText.toLowerCase().includes("lead") ||
      replyText.toLowerCase().includes("admin")
    ) {
      quickActions.push({
        label: "Review Approvals",
        action: () => onNavigate("Approvals"),
        icon: ShieldCheck,
      });
    }

    quickActions.push({
      label: "Run 5s Simulation",
      action: () => onLaunchSimulation(),
      icon: Play,
    });

    const aiMsg: ChatMessage = {
      id: String(Date.now() + 1),
      sender: "ai",
      text: replyText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      actionTaken: action,
      actionPayload,
      explanation,
      quickActions: quickActions.slice(0, 3),
    };

    setMessages((prev) => [...prev, aiMsg]);
    speak(replyText);

    // Execute background actions if suggested
    if (action === "run_simulation") {
      onLaunchSimulation();
    } else if (action === "assign_task") {
      const p = actionPayload?.person || "Team Member";
      const t = actionPayload?.task || "Sprint Deliverable";
      onAssignTask(p, t);
    } else if (action === "approve_plan") {
      onApprovePlan();
    }
  };

  const handleSendText = () => {
    if (!inputMessage.trim()) return;
    const text = inputMessage;
    setInputMessage("");
    void handleVoiceCommand(text);
  };

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  return (
    <>
      {/* Floating Toggle Buttons (Bottom-Right) */}
      <div className="fixed bottom-6 right-6 z-40 flex items-center gap-3">
        {/* One-Push Mic Button with Audio Wave Indicator */}
        <button
          onClick={toggleListening}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-2xl relative ${
            isListening
              ? "bg-rose-600 text-white animate-pulse scale-110 shadow-rose-500/60 ring-4 ring-rose-400/40"
              : isSpeaking
              ? "bg-sky-500 text-slate-950 scale-105 shadow-sky-500/60 ring-4 ring-sky-400/30"
              : "bg-sky-500 text-slate-950 hover:bg-sky-400 hover:scale-105 shadow-sky-500/30"
          }`}
          title={isListening ? "Listening... (Tap to finish early)" : "Tap once to speak"}
        >
          {isListening ? (
            <Mic size={24} className="animate-bounce" />
          ) : isSpeaking ? (
            <Volume2 size={24} className="animate-pulse" />
          ) : (
            <Mic size={24} />
          )}

          {/* Sound wave rings when speaking or listening */}
          {(isListening || isSpeaking) && (
            <span className="absolute -inset-1.5 rounded-full border-2 border-sky-400 animate-ping opacity-75 pointer-events-none" />
          )}
        </button>

        {/* Chat Drawer Toggle Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-14 h-14 rounded-full bg-slate-900 border border-sky-400/40 text-sky-400 hover:bg-slate-800 flex items-center justify-center shadow-2xl hover:scale-105 transition-all relative"
          title="Open AI Copilot Chat"
        >
          <MessageSquare size={22} />
          <span className="absolute top-1.5 right-1.5 w-3 h-3 rounded-full bg-sky-400 animate-ping" />
        </button>
      </div>

      {/* Live Voice Status Floating Pill */}
      {isListening && (
        <div className="fixed bottom-24 right-6 z-40 p-3.5 rounded-xl bg-slate-950/95 border border-rose-500/60 shadow-2xl flex items-center gap-3 max-w-sm backdrop-blur-md animate-bounce">
          <div className="w-3 h-3 rounded-full bg-rose-500 animate-ping shrink-0" />
          <div>
            <div className="text-[11px] font-mono font-bold text-rose-400 uppercase tracking-wider flex items-center justify-between gap-4">
              <span>Listening...</span>
              <span className="text-[10px] text-slate-400">Tap mic to send</span>
            </div>
            <p className="text-xs text-white italic mt-0.5 font-medium">
              {transcript || "Speak naturally: ask about dates, workers, bottlenecks, or scenarios..."}
            </p>
          </div>
        </div>
      )}

      {/* Expandable Chat Drawer */}
      {isOpen && (
        <div className="fixed bottom-22 right-3 sm:right-6 z-50 w-[410px] max-w-[calc(100vw-24px)] h-[calc(100vh-105px)] max-h-[580px] rounded-2xl bg-[#080e1a]/95 border border-sky-500/40 shadow-2xl flex flex-col overflow-hidden backdrop-blur-xl animate-fadeIn">
          {/* Header */}
          <div className="p-3.5 bg-slate-900/90 border-b border-sky-900/40 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-sky-500/20 border border-sky-400/50 flex items-center justify-center text-sky-400 shadow-inner">
                <Bot size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <strong className="text-sm font-bold text-white">Alex · AI Operations Lead</strong>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-950 border border-sky-800 text-sky-300">
                    Live
                  </span>
                </div>
                <span className="text-[10.5px] text-sky-400/80 flex items-center gap-1.5 mt-0.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${isSpeaking ? "bg-emerald-400 animate-ping" : "bg-sky-400 animate-pulse"}`} />
                  {isSpeaking ? "Speaking answer aloud..." : isAnalyzing ? "Thinking..." : "Ready to answer anything"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Stop Speaking / Listening Button (Section 29) */}
              {(isSpeaking || isListening) && (
                <button
                  onClick={() => {
                    window.speechSynthesis.cancel();
                    if (recognitionRef.current) recognitionRef.current.stop();
                    setIsSpeaking(false);
                    setIsListening(false);
                    toast.info("Audio & speech halted");
                  }}
                  className="px-2 py-1 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-semibold flex items-center gap-1 hover:bg-rose-500/30 transition-colors"
                  title="Stop Speaking (🔇)"
                >
                  <Square size={12} fill="currentColor" /> Stop
                </button>
              )}

              {/* Voice Settings Gear Button */}
              <button
                onClick={() => setShowVoiceSettings(!showVoiceSettings)}
                className={`p-1.5 rounded-lg border text-xs transition-colors ${
                  showVoiceSettings
                    ? "bg-sky-500 text-slate-950 border-sky-400"
                    : "bg-slate-800 border-slate-700 text-slate-300 hover:text-white"
                }`}
                title="Change Voice & Speech Settings"
              >
                <Sliders size={16} />
              </button>

              {/* Mute/Unmute Button */}
              <button
                onClick={() => {
                  setVoiceEnabled(!voiceEnabled);
                  if (voiceEnabled) window.speechSynthesis.cancel();
                  toast(voiceEnabled ? "Voice Output Muted" : "Voice Output Enabled");
                }}
                className={`p-1.5 rounded-lg border text-xs transition-colors ${
                  voiceEnabled
                    ? "bg-sky-950/60 border-sky-800/40 text-sky-300 hover:bg-sky-900/60"
                    : "bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-400"
                }`}
                title={voiceEnabled ? "Mute Voice Speech" : "Unmute Voice Speech"}
              >
                {voiceEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              </button>

              {/* Close Drawer Button */}
              <button
                onClick={() => {
                  window.speechSynthesis.cancel();
                  setIsOpen(false);
                }}
                className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white"
                title="Close Drawer"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Voice Customization Settings Drawer */}
          {showVoiceSettings && (
            <div className="p-3 bg-slate-950/95 border-b border-sky-900/40 text-xs animate-fadeIn space-y-2.5 shrink-0 max-h-[220px] overflow-y-auto">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sky-400 uppercase tracking-wider text-[11px] font-mono flex items-center gap-1.5">
                  <Sliders size={13} /> Change Voice & Speech Settings
                </span>
                <button
                  onClick={() => setShowVoiceSettings(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Samantha Dedicated Voice Display */}
              <div className="p-3 rounded-xl bg-sky-950/40 border border-sky-400/30 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
                    <Sparkles size={13} className="text-sky-400" /> Default AI Voice
                  </span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                    Active
                  </span>
                </div>
                <strong className="text-xs text-sky-300 block font-mono">Samantha (Default Voice)</strong>
                <p className="text-[10.5px] text-slate-300 leading-relaxed">
                  High-fidelity natural voice tuned for operations announcements and interactive briefing.
                </p>
              </div>

              {/* Pitch & Speed Sliders */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                    <span>Pitch</span>
                    <span className="font-mono text-sky-300">{voicePitch.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.7"
                    max="1.3"
                    step="0.05"
                    value={voicePitch}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setVoicePitch(val);
                      localStorage.setItem("rp_voice_pitch", String(val));
                    }}
                    className="w-full accent-sky-400 cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                    <span>Speed</span>
                    <span className="font-mono text-sky-300">{voiceRate.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.8"
                    max="1.3"
                    step="0.05"
                    value={voiceRate}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setVoiceRate(val);
                      localStorage.setItem("rp_voice_rate", String(val));
                    }}
                    className="w-full accent-sky-400 cursor-pointer"
                  />
                </div>
              </div>

              {/* Test Voice Button */}
              <button
                onClick={handleTestVoice}
                className="w-full py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Volume2 size={13} /> Test Voice Preview
              </button>
            </div>
          )}

          {/* Quick Prompts Bar */}
          <div className="px-3 py-1.5 bg-slate-950/70 border-b border-slate-800/80 flex gap-2 overflow-x-auto scrollbar-none shrink-0">
            {[
              "Today's date",
              "Who is on the team?",
              "Why split workload?",
              "Check team capacity",
              "Compare scenarios",
            ].map((prompt) => (
              <button
                key={prompt}
                onClick={() => handleVoiceCommand(prompt)}
                className="px-2.5 py-1 rounded-md text-[10.5px] whitespace-nowrap bg-sky-950/50 hover:bg-sky-900/60 border border-sky-800/40 text-sky-300 font-medium transition-colors hover:border-sky-400/50"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Messages Thread */}
          <div className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-3 text-xs">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.sender === "ai" && (
                  <div className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 mt-0.5 border border-sky-400/30">
                    <Sparkles size={12} />
                  </div>
                )}
                <div
                  className={`p-3.5 rounded-xl max-w-[85%] leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-sky-600 text-white rounded-br-xs shadow-md font-medium"
                      : "bg-slate-900/95 border border-sky-900/40 text-slate-200 rounded-bl-xs shadow-lg"
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.text}</p>

                  {/* Section 30: AI Explanation System (Finding, Evidence, Impact, Recommendation, Confidence) */}
                  {msg.explanation && (
                    <div className="mt-3 p-2.5 rounded-lg bg-slate-950/80 border border-sky-500/30 text-[11px] space-y-1.5 text-left">
                      <div className="flex items-center justify-between border-b border-sky-900/40 pb-1">
                        <span className="font-bold text-sky-400 uppercase tracking-wider text-[10px] flex items-center gap-1">
                          <HelpCircle size={11} /> Explainable AI Decision Breakdown
                        </span>
                        {msg.explanation.confidence && (
                          <span className="font-mono text-[10px] text-emerald-400 font-semibold px-1.5 py-0.2 rounded bg-emerald-500/10 border border-emerald-500/30">
                            {msg.explanation.confidence}% Confidence
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="text-slate-400 font-semibold">1. Finding: </span>
                        <span className="text-slate-200">{msg.explanation.finding}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-semibold">2. Evidence: </span>
                        <span className="text-slate-300 font-mono text-[10.5px]">{msg.explanation.evidence}</span>
                      </div>
                      <div>
                        <span className="text-rose-400 font-semibold">3. Impact: </span>
                        <span className="text-slate-200">{msg.explanation.impact}</span>
                      </div>
                      <div>
                        <span className="text-emerald-400 font-semibold">4. Recommendation: </span>
                        <span className="text-emerald-200">{msg.explanation.recommendation}</span>
                      </div>
                    </div>
                  )}

                  {/* Interactive Action Chips inside AI message */}
                  {msg.quickActions && msg.quickActions.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-sky-900/30 flex flex-wrap gap-1.5">
                      {msg.quickActions.map((qa, idx) => {
                        const Icon = qa.icon || ArrowRight;
                        return (
                          <button
                            key={idx}
                            onClick={qa.action}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10.5px] font-medium bg-sky-950/80 hover:bg-sky-800/60 border border-sky-700/50 text-sky-300 transition-all hover:scale-[1.02]"
                          >
                            <Icon size={12} className="text-sky-400" />
                            <span>{qa.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <span className="text-[9px] font-mono text-slate-400 block mt-2 text-right">
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            ))}

            {isAnalyzing && (
              <div className="flex gap-2.5 justify-start">
                <div className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 mt-0.5 border border-sky-400/30">
                  <Sparkles size={12} />
                </div>
                <div className="p-3 rounded-xl bg-slate-900/90 border border-sky-900/40 text-sky-300 text-xs flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                  <span>Alex is reasoning and fetching live data...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input & Push-to-Talk Mic Bar */}
          <div className="p-2.5 bg-slate-900/95 border-t border-sky-900/40 flex items-center gap-2 shrink-0">
            <button
              onClick={toggleListening}
              className={`p-2.5 rounded-xl transition-all ${
                isListening
                  ? "bg-rose-600 text-white animate-pulse shadow-lg shadow-rose-500/50"
                  : "bg-slate-800 text-sky-400 hover:bg-slate-700 border border-slate-700"
              }`}
              title={isListening ? "Tap to finish speaking" : "Tap once to speak"}
            >
              <Mic size={17} />
            </button>
            <input
              type="text"
              placeholder="Ask anything or tap mic once to speak..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendText()}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-sky-400 transition-colors"
            />
            <button
              onClick={handleSendText}
              disabled={!inputMessage.trim()}
              className="p-2.5 rounded-xl bg-sky-500 text-slate-950 hover:bg-sky-400 disabled:opacity-30 disabled:hover:bg-sky-500 transition-all font-bold"
              title="Send message"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default VoiceAssistantCopilot;

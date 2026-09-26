import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
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
} from "lucide-react";
import { toast } from "sonner";
import { resolveQueryKnowledgeBase } from "@shared/aiKnowledgeBase";

interface Props {
  activeNav: string;
  onNavigate: (view: string) => void;
  onLaunchSimulation: () => void;
  onApprovePlan: () => void;
  onAssignTask: (resourceName: string, taskName: string) => void;
}

interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
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
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [transcript, setTranscript] = useState("");
  const [inputMessage, setInputMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      sender: "ai",
      text: "Hello! I'm Alex, your interactive AI Operations Copilot. You can talk to me naturally or type. Ask me anything about our 8 resources, project bottlenecks, cascading delays, or scenarios!",
      timestamp: "Just now",
      quickActions: [
        { label: "Run 5s Simulation", action: () => onLaunchSimulation(), icon: Play },
        { label: "Why is release at risk?", action: () => handleDirectQuery("Why is the release at risk?"), icon: GitBranch },
        { label: "Who is Arjun Rao?", action: () => handleDirectQuery("Tell me about Arjun Rao"), icon: Users },
      ],
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const lastQueryRef = useRef<string>("");

  // Speech Synthesis: speak text aloud with human cadence
  const speak = (text: string) => {
    if (!voiceEnabled || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel(); // cancel any ongoing speech
    
    // Clean text for speech (remove markdown asterisks or special symbols)
    const cleanText = text.replace(/[*_#`]/g, "");
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const naturalVoice = voices.find(
      (v) =>
        v.lang.startsWith("en") &&
        (v.name.includes("Natural") ||
          v.name.includes("Google") ||
          v.name.includes("Samantha") ||
          v.name.includes("Jenny") ||
          v.name.includes("Zira"))
    );
    if (naturalVoice) utterance.voice = naturalVoice;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const askMutation = trpc.simulation.ask.useMutation({
    onSuccess: (data: any) => {
      handleAIResponse(data.answer, data.suggestedAction, data.actionPayload);
    },
    onError: (err) => {
      console.warn("API server unavailable, resolving seamlessly via edge knowledge base:", err);
      const fallback = resolveQueryKnowledgeBase(lastQueryRef.current || "overview");
      handleAIResponse(fallback.answer, fallback.suggestedAction, fallback.actionPayload);
    },
  });

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
      };

      recognition.onresult = (event: any) => {
        const current = event.resultIndex;
        const resultTranscript = event.results[current][0].transcript;
        setTranscript(resultTranscript);

        if (event.results[current].isFinal) {
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

  const toggleListening = () => {
    if (!recognitionRef.current) {
      toast.error("Speech Recognition Not Supported", {
        description: "Your browser does not support Web Speech API. Please use Google Chrome or Microsoft Edge.",
      });
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setTranscript("");
      try {
        recognitionRef.current.start();
      } catch (e) {
        recognitionRef.current.stop();
        setTimeout(() => recognitionRef.current.start(), 200);
      }
    }
  };

  const handleDirectQuery = (text: string) => {
    handleVoiceCommand(text);
  };

  // Process voice commands or chat text
  const handleVoiceCommand = (commandText: string) => {
    const text = commandText.trim();
    if (!text) return;

    // Add user message
    const userMsg: ChatMessage = {
      id: String(Date.now()),
      sender: "user",
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, userMsg]);
    setTranscript("");

    const lower = text.toLowerCase();

    // 1. Direct explicit navigation triggers (only if requested explicitly)
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
      lower.startsWith("go home") ||
      lower.startsWith("open command center") ||
      lower === "home" ||
      lower === "command center"
    ) {
      onNavigate("Command center");
      handleAIResponse("Navigated back to the Command Center overview.", "open_home");
      return;
    }

    // 2. Direct simulation trigger
    if (
      lower === "run simulation" ||
      lower === "simulate" ||
      lower === "start simulation" ||
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
      let person = "Arjun Rao";
      if (lower.includes("priya")) person = "Priya Sharma";
      else if (lower.includes("marcus")) person = "Marcus Vance";
      else if (lower.includes("elena")) person = "Elena Rostova";

      const task = "Mobile Core E2E Automated Testing";
      onAssignTask(person, task);
      const reply = `(New Task) Task assigned! ${person} has been allocated to ${task} with High Priority. The recovery package has been dispatched to Admin and Team Lead for sign-off.`;
      handleAIResponse(reply, "assign_task");
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

    // 5. Query OpenRouter / Semantic Knowledge Base for full, human-like answers
    lastQueryRef.current = text;
    askMutation.mutate({ query: text });
  };

  const handleAIResponse = (replyText: string, action?: string, actionPayload?: any) => {
    // Generate contextual interactive quick-action chips
    const quickActions: { label: string; action: () => void; icon?: any }[] = [];

    if (action === "open_resources" || replyText.toLowerCase().includes("arjun") || replyText.toLowerCase().includes("priya") || replyText.toLowerCase().includes("marcus")) {
      quickActions.push({
        label: "View in Resources",
        action: () => onNavigate("Resources"),
        icon: Users,
      });
    }

    if (action === "open_impact" || replyText.toLowerCase().includes("risk") || replyText.toLowerCase().includes("cascade")) {
      quickActions.push({
        label: "Open Impact Graph",
        action: () => onNavigate("Impact graph"),
        icon: GitBranch,
      });
    }

    if (action === "open_scenarios" || replyText.toLowerCase().includes("scenario") || replyText.toLowerCase().includes("balanced")) {
      quickActions.push({
        label: "Compare Scenarios",
        action: () => onNavigate("Scenarios"),
        icon: Layers3,
      });
    }

    if (action === "open_approvals" || replyText.toLowerCase().includes("approval") || replyText.toLowerCase().includes("lead") || replyText.toLowerCase().includes("admin")) {
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
      quickActions: quickActions.slice(0, 3),
    };

    setMessages((prev) => [...prev, aiMsg]);
    speak(replyText);

    // If an action was identified and the drawer is closed, execute it seamlessly
    if (action === "run_simulation") {
      onLaunchSimulation();
    } else if (action === "assign_task") {
      const p = actionPayload?.person || "Arjun Rao";
      const t = actionPayload?.task || "Mobile Core E2E Automated Testing";
      onAssignTask(p, t);
    } else if (action === "approve_plan") {
      onApprovePlan();
    }
  };

  const handleSendText = () => {
    if (!inputMessage.trim()) return;
    const text = inputMessage;
    setInputMessage("");
    handleVoiceCommand(text);
  };

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  return (
    <>
      {/* Floating Toggle Buttons (Bottom-Right) */}
      <div className="fixed bottom-6 right-6 z-40 flex items-center gap-3">
        {/* Quick Voice Mic Button with Audio Indicator */}
        <button
          onClick={toggleListening}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-2xl relative ${
            isListening
              ? "bg-rose-600 text-white animate-pulse scale-110 shadow-rose-500/50"
              : isSpeaking
              ? "bg-sky-500 text-slate-950 scale-105 shadow-sky-500/50"
              : "bg-sky-500 text-slate-950 hover:bg-sky-400 hover:scale-105 shadow-sky-500/30"
          }`}
          title={isListening ? "Listening... Speak your question" : "Click to speak with AI Copilot"}
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
            <span className="absolute -inset-1 rounded-full border-2 border-sky-400 animate-ping opacity-75 pointer-events-none" />
          )}
        </button>

        {/* Chat Drawer Toggle Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-14 h-14 rounded-full bg-slate-900 border border-sky-400/40 text-sky-400 hover:bg-slate-800 flex items-center justify-center shadow-2xl hover:scale-105 transition-all relative"
          title="Open ResourceFlow AI Copilot Chat"
        >
          <MessageSquare size={22} />
          <span className="absolute top-1.5 right-1.5 w-3 h-3 rounded-full bg-sky-400 animate-ping" />
        </button>
      </div>

      {/* Live Voice Status Floating Pill */}
      {isListening && (
        <div className="fixed bottom-24 right-6 z-40 p-3.5 rounded-xl bg-slate-950/95 border border-sky-400/60 shadow-2xl flex items-center gap-3 max-w-sm backdrop-blur-md animate-bounce">
          <div className="w-3 h-3 rounded-full bg-rose-500 animate-ping shrink-0" />
          <div>
            <div className="text-[11px] font-mono font-bold text-sky-400 uppercase tracking-wider">
              Listening to your question...
            </div>
            <p className="text-xs text-white italic mt-0.5 font-medium">
              {transcript || "Ask anything: 'Who is Arjun?', 'Why is release at risk?', 'What is our budget?'..."}
            </p>
          </div>
        </div>
      )}

      {/* Expandable Chat Drawer */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-[420px] max-w-[calc(100vw-32px)] h-[580px] rounded-2xl bg-[#080e1a]/95 border border-sky-500/40 shadow-2xl flex flex-col overflow-hidden backdrop-blur-xl animate-fadeIn">
          {/* Header */}
          <div className="p-4 bg-slate-900/90 border-b border-sky-900/40 flex items-center justify-between">
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
                  {isSpeaking ? "Speaking answer aloud..." : "Ready to answer anything on the site"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setVoiceEnabled(!voiceEnabled);
                  if (voiceEnabled) window.speechSynthesis.cancel();
                  toast(voiceEnabled ? "Voice Speech Muted" : "Voice Speech Enabled");
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

          {/* Quick Prompts Bar */}
          <div className="px-3 py-2 bg-slate-950/70 border-b border-slate-800/80 flex gap-2 overflow-x-auto scrollbar-none">
            {[
              "Why is the release at risk?",
              "Who is Arjun Rao?",
              "Who is Priya Sharma?",
              "What is Marcus's status?",
              "What is our budget reserve?",
              "Compare scenarios",
              "Where can this website be used?",
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
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
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

            {askMutation.isPending && (
              <div className="flex gap-2.5 justify-start">
                <div className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 mt-0.5 border border-sky-400/30">
                  <Sparkles size={12} />
                </div>
                <div className="p-3 rounded-xl bg-slate-900/90 border border-sky-900/40 text-sky-300 text-xs flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                  <span>Fetching site telemetry and reasoning...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input & Mic Bar */}
          <div className="p-3 bg-slate-900/95 border-t border-sky-900/40 flex items-center gap-2">
            <button
              onClick={toggleListening}
              className={`p-2.5 rounded-xl transition-all ${
                isListening
                  ? "bg-rose-600 text-white animate-pulse shadow-lg shadow-rose-500/40"
                  : "bg-slate-800 text-sky-400 hover:bg-slate-700 border border-slate-700"
              }`}
              title="Click to speak your question"
            >
              <Mic size={17} />
            </button>
            <input
              type="text"
              placeholder="Ask anything across the website or speak..."
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

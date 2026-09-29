import { useState, useEffect, useRef } from "react";
import { MessageSquare, Send, Hash, Users, Sparkles, Smile, Paperclip, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

interface ChatMessage {
  id: string;
  senderName: string;
  senderRole: string;
  channel: string;
  text: string;
  timestamp: string;
  isCurrentUser: boolean;
}

interface Props {
  currentUserName?: string | null;
  currentUserRole?: string | null;
}

export function TeamChatView({ currentUserName, currentUserRole }: Props) {
  const teamName = localStorage.getItem("resourcepulse_team_name") || "Operations Team";
  const user = currentUserName || localStorage.getItem("resourcepulse_user_name") || "Teammate";
  const role = currentUserRole || "Contributor";

  const [activeChannel, setActiveChannel] = useState<string>("general");
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const getInitialMessages = (): ChatMessage[] => {
    try {
      const stored = localStorage.getItem("resourcepulse_team_messages");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    return [
      {
        id: "msg-welcome-1",
        senderName: "Resource Pulse Bot",
        senderRole: "System Copilot",
        channel: "general",
        text: `Welcome to the ${teamName} organization chat! All teammates joining via your team code or invite link can message here in real time.`,
        timestamp: timeStr,
        isCurrentUser: false,
      },
      {
        id: "msg-welcome-2",
        senderName: user,
        senderRole: role,
        channel: "general",
        text: `Team workspace initialized for ${teamName}. Let's coordinate our deliverables and track milestones!`,
        timestamp: timeStr,
        isCurrentUser: true,
      },
    ];
  };

  const [messages, setMessages] = useState<ChatMessage[]>(getInitialMessages);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeChannel]);

  // Persist messages to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("resourcepulse_team_messages", JSON.stringify(messages));
    } catch {}
  }, [messages]);

  // Try fetching any synced messages from Supabase
  useEffect(() => {
    let isSubscribed = true;
    const fetchRemoteMessages = async () => {
      try {
        const { data, error } = await supabase
          .from("team_chat")
          .select("*")
          .eq("team_name", teamName)
          .order("created_at", { ascending: true })
          .limit(50);

        if (!error && data && data.length > 0 && isSubscribed) {
          const remoteMsgs: ChatMessage[] = data.map((d: any) => ({
            id: d.id || `msg-${Date.now()}-${Math.random()}`,
            senderName: d.sender_name || "Teammate",
            senderRole: d.sender_role || "Member",
            channel: d.channel || "general",
            text: d.content || d.text || "",
            timestamp: new Date(d.created_at || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            isCurrentUser: (d.sender_name || "").toLowerCase() === user.toLowerCase(),
          }));
          setMessages((prev) => {
            const ids = new Set(prev.map((m) => m.id));
            const fresh = remoteMsgs.filter((m) => !ids.has(m.id));
            return [...prev, ...fresh];
          });
        }
      } catch {}
    };

    void fetchRemoteMessages();
    return () => {
      isSubscribed = false;
    };
  }, [teamName, user]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    const textToSend = inputText.trim();
    setInputText("");

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderName: user,
      senderRole: role,
      channel: activeChannel,
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isCurrentUser: true,
    };

    setMessages((prev) => [...prev, newMsg]);

    // Send to Supabase asynchronously
    try {
      await supabase.from("team_chat").insert([
        {
          team_name: teamName,
          sender_name: user,
          sender_role: role,
          channel: activeChannel,
          content: textToSend,
          created_at: new Date().toISOString(),
        },
      ]);
    } catch {}
  };

  const channelMessages = messages.filter((m) => m.channel === activeChannel);

  const channels = [
    { id: "general", label: "general", desc: "General organization coordination" },
    { id: "deliverables", label: "deliverables", desc: "Milestones and feature tracking" },
    { id: "bottlenecks", label: "bottlenecks", desc: "Capacity bottlenecks and rebalancing" },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-160px)] min-h-[550px] bg-slate-950/80 rounded-2xl border border-sky-900/30 overflow-hidden shadow-2xl backdrop-blur-md">
      {/* Top Header */}
      <div className="px-6 py-4 border-b border-sky-900/30 bg-slate-900/60 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500/20 to-indigo-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <MessageSquare size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white tracking-tight">{teamName} Team Chat</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Live Organization
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Coordinate deliverables, resolve bottlenecks, and sync with your teammates.
            </p>
          </div>
        </div>

        {/* Channels Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900/80 border border-slate-800">
          {channels.map((ch) => (
            <button
              key={ch.id}
              onClick={() => setActiveChannel(ch.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                activeChannel === ch.id
                  ? "bg-sky-500 text-slate-950 font-bold shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              <Hash size={13} className={activeChannel === ch.id ? "text-slate-950" : "text-sky-400"} />
              <span>{ch.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <div className="text-center py-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-950/60 border border-sky-800/30 text-sky-300 text-xs font-mono">
            <Hash size={12} />
            <span>Channel: #{activeChannel} — {channels.find((c) => c.id === activeChannel)?.desc}</span>
          </div>
        </div>

        {channelMessages.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <MessageSquare size={32} className="mx-auto mb-2 text-slate-600 opacity-60" />
            <p className="text-sm font-medium">No messages in #{activeChannel} yet.</p>
            <p className="text-xs text-slate-500 mt-1">Start the conversation with your team!</p>
          </div>
        ) : (
          channelMessages.map((msg) => {
            const isMe = msg.isCurrentUser || msg.senderName.toLowerCase() === user.toLowerCase();
            const initials = msg.senderName
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();

            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-[85%] ${isMe ? "ml-auto flex-row-reverse" : "mr-auto"}`}
              >
                {/* Avatar */}
                <div
                  className={`w-9 h-9 rounded-xl shrink-0 flex items-center justify-center text-xs font-bold font-mono border ${
                    isMe
                      ? "bg-sky-500/20 text-sky-300 border-sky-500/40"
                      : "bg-slate-800 text-slate-300 border-slate-700"
                  }`}
                >
                  {initials}
                </div>

                {/* Message Bubble */}
                <div>
                  <div className={`flex items-center gap-2 mb-1 text-[11px] ${isMe ? "justify-end" : "justify-start"}`}>
                    <span className="font-semibold text-slate-200">{msg.senderName}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700/60">
                      {msg.senderRole}
                    </span>
                    <span className="text-slate-500 font-mono text-[10px]">{msg.timestamp}</span>
                  </div>

                  <div
                    className={`p-3.5 rounded-2xl text-sm leading-relaxed ${
                      isMe
                        ? "bg-gradient-to-r from-sky-600 to-cyan-600 text-white rounded-tr-none shadow-md shadow-sky-900/20"
                        : "bg-slate-900/90 text-slate-200 rounded-tl-none border border-slate-800/80 shadow-md"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Action Chips & Input Area */}
      <div className="p-4 bg-slate-900/90 border-t border-sky-900/30">
        <div className="flex items-center gap-2 mb-2 overflow-x-auto pb-1 text-xs">
          <span className="text-[11px] font-mono text-slate-400">Quick updates:</span>
          <button
            type="button"
            onClick={() => setInputText((prev) => prev + " Deliverable milestone updated: on schedule.")}
            className="px-2.5 py-1 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-[11px] border border-slate-700/60 transition-colors"
          >
            ✓ Milestone on schedule
          </button>
          <button
            type="button"
            onClick={() => setInputText((prev) => prev + " Requesting 50/50 peer split for active deliverable.")}
            className="px-2.5 py-1 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-[11px] border border-slate-700/60 transition-colors"
          >
            ⚡ Request peer split
          </button>
          <button
            type="button"
            onClick={() => setInputText((prev) => prev + " Need review on deliverable integration.")}
            className="px-2.5 py-1 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-[11px] border border-slate-700/60 transition-colors"
          >
            🔍 Need deliverable review
          </button>
        </div>

        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`Message #${activeChannel} as ${user}...`}
            className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-sm text-white placeholder-slate-500 transition-all outline-none"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 text-slate-950 font-bold text-sm flex items-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-sky-500/20"
          >
            <Send size={15} />
            <span>Send</span>
          </button>
        </form>
      </div>
    </div>
  );
}

export default TeamChatView;

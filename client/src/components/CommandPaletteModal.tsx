import { useState, useEffect } from "react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Gauge,
  Users,
  GitBranch,
  Layers3,
  ShieldCheck,
  Play,
  Sparkles,
  UserPlus,
  Activity,
  Boxes,
  Settings,
  MessageSquare,
} from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (view: string) => void;
  onRunSimulation?: () => void;
  onOpenAiNeeds?: () => void;
  onOpenAccount?: () => void;
  onOpenLiveFeed?: () => void;
  onOpenIntegrations?: () => void;
}

export function CommandPaletteModal({
  open,
  onOpenChange,
  onNavigate,
  onRunSimulation,
  onOpenAiNeeds,
  onOpenAccount,
  onOpenLiveFeed,
  onOpenIntegrations,
}: Props) {
  // Get team members for instant search
  const [teammates, setTeammates] = useState<any[]>([]);

  useEffect(() => {
    if (open) {
      try {
        const raw = localStorage.getItem("resourcepulse_student_resources");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) setTeammates(parsed);
        }
      } catch {}
    }
  }, [open]);

  const handleSelect = (callback: () => void) => {
    onOpenChange(false);
    callback();
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Type a command, view, or search team member..." />
      <CommandList className="max-h-[360px] overflow-y-auto">
        <CommandEmpty>No results found.</CommandEmpty>

        {/* Quick Operations Actions */}
        <CommandGroup heading="AI Actions & Tools">
          <CommandItem
            onSelect={() =>
              handleSelect(() => {
                if (onRunSimulation) onRunSimulation();
              })
            }
            className="flex items-center gap-2 cursor-pointer"
          >
            <Play size={15} className="text-sky-400" />
            <span>Run 5-Second Simulation</span>
            <span className="ml-auto text-[10px] font-mono text-slate-400">Simulate rebalance</span>
          </CommandItem>

          <CommandItem
            onSelect={() =>
              handleSelect(() => {
                if (onOpenAiNeeds) onOpenAiNeeds();
              })
            }
            className="flex items-center gap-2 cursor-pointer"
          >
            <Sparkles size={15} className="text-amber-400" />
            <span>AI Project Needs Setup</span>
            <span className="ml-auto text-[10px] font-mono text-slate-400">Custom features</span>
          </CommandItem>

          <CommandItem
            onSelect={() =>
              handleSelect(() => {
                onNavigate("Resources");
              })
            }
            className="flex items-center gap-2 cursor-pointer"
          >
            <UserPlus size={15} className="text-emerald-400" />
            <span>Manage Team & Invite Codes</span>
            <span className="ml-auto text-[10px] font-mono text-slate-400">Team Code</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Workspace Views */}
        <CommandGroup heading="Navigation">
          <CommandItem
            onSelect={() => handleSelect(() => onNavigate("Command center"))}
            className="flex items-center gap-2 cursor-pointer"
          >
            <Gauge size={15} className="text-sky-400" />
            <span>Command Center Overview</span>
          </CommandItem>

          <CommandItem
            onSelect={() => handleSelect(() => onNavigate("Resources"))}
            className="flex items-center gap-2 cursor-pointer"
          >
            <Users size={15} className="text-indigo-400" />
            <span>Resources & Capacity Roster</span>
          </CommandItem>

          <CommandItem
            onSelect={() => handleSelect(() => onNavigate("Team chat"))}
            className="flex items-center gap-2 cursor-pointer"
          >
            <MessageSquare size={15} className="text-cyan-400" />
            <span>Organization Team Chat</span>
          </CommandItem>

          <CommandItem
            onSelect={() => handleSelect(() => onNavigate("Impact graph"))}
            className="flex items-center gap-2 cursor-pointer"
          >
            <GitBranch size={15} className="text-amber-400" />
            <span>Cascading Impact Graph</span>
          </CommandItem>

          <CommandItem
            onSelect={() => handleSelect(() => onNavigate("Scenarios"))}
            className="flex items-center gap-2 cursor-pointer"
          >
            <Layers3 size={15} className="text-violet-400" />
            <span>Scenario Trade-off Matrix</span>
          </CommandItem>

          <CommandItem
            onSelect={() => handleSelect(() => onNavigate("Approvals"))}
            className="flex items-center gap-2 cursor-pointer"
          >
            <ShieldCheck size={15} className="text-emerald-400" />
            <span>Approvals & Governance</span>
          </CommandItem>

          <CommandItem
            onSelect={() =>
              handleSelect(() => {
                if (onOpenAccount) onOpenAccount();
              })
            }
            className="flex items-center gap-2 cursor-pointer"
          >
            <Settings size={15} className="text-slate-400" />
            <span>Account & Workspace Settings</span>
          </CommandItem>
        </CommandGroup>

        {/* Team Members List */}
        {teammates.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Team Members">
              {teammates.map((m: any) => (
                <CommandItem
                  key={m.id || m.name}
                  onSelect={() => handleSelect(() => onNavigate("Resources"))}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <div className="w-5 h-5 rounded-md bg-sky-500/20 text-sky-300 text-[10px] font-bold flex items-center justify-center">
                    {m.name?.[0] || "M"}
                  </div>
                  <span>{m.name}</span>
                  <span className="text-xs text-slate-400">({m.role || "Member"})</span>
                  <span className="ml-auto text-[10px] font-mono text-slate-500">
                    {m.utilization || 50}% load
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}

export default CommandPaletteModal;

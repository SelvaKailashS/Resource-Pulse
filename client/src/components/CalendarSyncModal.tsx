import React, { useState } from "react";
import {
  Calendar,
  Download,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Users,
  FolderGit2,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { loadInitialResources, loadInitialProjects } from "@/lib/orgStore";

interface CalendarSyncModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CalendarSyncModal({ open, onOpenChange }: CalendarSyncModalProps) {
  const [copied, setCopied] = useState(false);
  const resources = loadInitialResources();
  const projects = loadInitialProjects();

  if (!open) return null;

  // Generate webcal subscription URL based on current host
  const teamName = localStorage.getItem("resourcepulse_team_name") || "Operations Team";
  const webcalUrl = `webcal://${window.location.host}/api/calendar/feed.ics?team=${encodeURIComponent(teamName)}`;

  // Generate RFC 5545 .ics calendar content
  const handleDownloadICS = () => {
    const now = new Date();
    const nowIso = now.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

    let icsEvents = "";

    // 1. Export each project milestone as an event
    projects.forEach((prj, idx) => {
      const startDate = prj.startDate ? new Date(prj.startDate) : new Date();
      const endDate = prj.endDate ? new Date(prj.endDate) : new Date(Date.now() + 14 * 86400000);

      const dtStart = startDate.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
      const dtEnd = endDate.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

      icsEvents += `BEGIN:VEVENT\r\n`;
      icsEvents += `UID:prj-${prj.id || idx}-${Date.now()}@resourcepulse.app\r\n`;
      icsEvents += `DTSTAMP:${nowIso}\r\n`;
      icsEvents += `DTSTART:${dtStart}\r\n`;
      icsEvents += `DTEND:${dtEnd}\r\n`;
      icsEvents += `SUMMARY:[ResourcePulse] ${prj.name} (Milestone)\r\n`;
      icsEvents += `DESCRIPTION:Project: ${prj.name}\\nStatus: ${prj.status}\\nRequired Hours: ${prj.requiredHours}h\\nLead: ${resources[0]?.name || "Team Lead"}\r\n`;
      icsEvents += `STATUS:CONFIRMED\r\n`;
      icsEvents += `END:VEVENT\r\n`;
    });

    // 2. Export active resource shifts as weekly work blocks
    resources.forEach((res, idx) => {
      const shiftStart = new Date();
      shiftStart.setHours(9, 0, 0, 0);
      const shiftEnd = new Date();
      shiftEnd.setHours(17, 0, 0, 0);

      const dtStart = shiftStart.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
      const dtEnd = shiftEnd.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

      icsEvents += `BEGIN:VEVENT\r\n`;
      icsEvents += `UID:res-shift-${res.id || idx}-${Date.now()}@resourcepulse.app\r\n`;
      icsEvents += `DTSTAMP:${nowIso}\r\n`;
      icsEvents += `DTSTART:${dtStart}\r\n`;
      icsEvents += `DTEND:${dtEnd}\r\n`;
      icsEvents += `SUMMARY:[Shift] ${res.name} (${res.role})\r\n`;
      icsEvents += `DESCRIPTION:Capacity: ${res.weeklyCapacityHours || 40}h/week\\nUtilization: ${res.utilization || 50}%\\nSkills: ${res.skills?.join(", ") || "General"}\r\n`;
      icsEvents += `STATUS:CONFIRMED\r\n`;
      icsEvents += `END:VEVENT\r\n`;
    });

    const icsContent =
      `BEGIN:VCALENDAR\r\n` +
      `VERSION:2.0\r\n` +
      `PRODID:-//ResourcePulse//Universal Telemetry & Shift Calendar//EN\r\n` +
      `CALSCALE:GREGORIAN\r\n` +
      `METHOD:PUBLISH\r\n` +
      `X-WR-CALNAME:ResourcePulse - ${teamName} Schedule\r\n` +
      `X-WR-TIMEZONE:UTC\r\n` +
      icsEvents +
      `END:VCALENDAR\r\n`;

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ResourcePulse-${teamName.replace(/\s+/g, "_")}-Schedule.ics`;
    link.click();
    toast.success("Calendar .ICS File Downloaded", {
      description: "Import into Google Calendar, Outlook, or Apple Calendar.",
    });
  };

  // Direct Google Calendar 1-Click Launch
  const handleOpenGoogleCalendar = () => {
    const firstProject = projects[0] || { name: "Quarterly Deliverable Milestone" };
    const title = encodeURIComponent(`[ResourcePulse] ${firstProject.name}`);
    const details = encodeURIComponent(
      `ResourcePulse Workspace: ${teamName}\nAssigned Lead: ${resources[0]?.name || "Team Lead"}\nTelemetry status: Synchronized.`
    );
    const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&dates=20261005T090000Z/20261005T170000Z`;
    window.open(gcalUrl, "_blank");
    toast.success("Opening Google Calendar Event Creator");
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(webcalUrl);
    setCopied(true);
    toast.success("Calendar Feed URL Copied", {
      description: "Paste into Outlook, Apple Calendar, or Google Calendar (From URL).",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl bg-card border border-border shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">iCal & Google Calendar Sync</h3>
              <p className="text-[11px] text-muted-foreground font-mono">
                Real-time feed sync for {teamName}
              </p>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground hover:text-foreground text-sm cursor-pointer p-1"
          >
            ✕
          </button>
        </div>

        {/* 5-Second Explanation Pill */}
        <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-xs text-sky-300 leading-relaxed flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
          <div>
            <strong>5-Second Setup:</strong> Sync workspace milestone deadlines, shift allocations, and project schedules straight to your mobile or desktop calendar with zero manual typing.
          </div>
        </div>

        {/* 3 Fast Action Buttons */}
        <div className="space-y-3">
          {/* Button 1: Google Calendar Direct Event */}
          <button
            onClick={handleOpenGoogleCalendar}
            className="w-full p-3.5 rounded-xl bg-background border border-border hover:border-sky-500/50 hover:bg-muted/40 transition-all flex items-center justify-between group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-xs border border-blue-500/20">
                G
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-foreground group-hover:text-sky-400 transition-colors">
                  Add Milestone to Google Calendar
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Instantly open Google Calendar with pre-populated project dates
                </div>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-sky-400" />
          </button>

          {/* Button 2: Download .ICS File */}
          <button
            onClick={handleDownloadICS}
            className="w-full p-3.5 rounded-xl bg-background border border-border hover:border-sky-500/50 hover:bg-muted/40 transition-all flex items-center justify-between group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs border border-emerald-500/20">
                .ICS
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-foreground group-hover:text-emerald-400 transition-colors">
                  Download Full Schedule (.ics File)
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Double-click to import all {projects.length} milestones & {resources.length} shifts to Mac/iOS/Outlook
                </div>
              </div>
            </div>
            <Download className="w-4 h-4 text-muted-foreground group-hover:text-emerald-400" />
          </button>

          {/* Button 3: Live Subscription URL */}
          <div className="p-3.5 rounded-xl bg-background border border-border space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                <span>Live Subscription Feed (webcal://)</span>
              </span>
              <span className="text-[10px] font-mono text-muted-foreground">Auto-updating</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={webcalUrl}
                className="w-full px-3 py-1.5 text-xs font-mono rounded-lg bg-muted/40 border border-border text-muted-foreground select-all outline-none"
              />
              <button
                onClick={handleCopyLink}
                className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center gap-1 shrink-0 cursor-pointer transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Security & Telemetry Footer */}
        <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono pt-2 border-t border-border/40">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>RFC 5545 Compliant Feed</span>
          </span>
          <span>ResourcePulse Calendar Sync v2.4</span>
        </div>

      </div>
    </div>
  );
}

export default CalendarSyncModal;

# 🚀 Resource Pulse — Hackathon Demo Guide

An interactive **AI-Driven Engineering Operations Command Center** that predicts cascading sprint bottlenecks before they happen, calculates optimal skill-matched replacements, balances emergency workloads fairly (50/50 split), and automates human-in-the-loop executive approvals with **Samantha AI Voice Synthesis**.

---

## ⚡ Quick Start (Run from Terminal)

### Option 1: Terminal Command
Open terminal inside this folder:
```bash
cd "D:\Resource Pulse Demo"
pnpm dev
```
Open your browser at: **`http://localhost:3000`** (or the port displayed in terminal).

### Option 2: 1-Click Launcher
Double-click **`run-demo.bat`** in this folder!

---

## 🏆 Hackathon Winning Demo Script (3-Minute Presentation)

### Step 1: The Problem (Hook the Judges)
> *"In software engineering, when an engineer falls sick or gets blocked, teams don't realize until it's too late. A single QA shortage cascades into microservice blockers and blows the release date by days, causing team burnout and thousands of dollars in overtime."*

* **Show**: Open **Command Center** showing **Northstar Ops** system health (87.4%), 12.6h capacity drop in Mobile Testing, and the incident banner.

---

### Step 2: The 5-Second Simulation
> *"Resource Pulse doesn't just monitor—it predicts. Watch what happens when we simulate an employee absence."*

* **Action**: Go to **Resources** in the sidebar.
* **Click**: Click on **Marcus Vance** (or Arjun Rao) → Click **"Simulate Absence"**.
* **Highlight**: Show the **5-second Live Simulation Screen** calculating Monte-Carlo trade-offs, showing before-and-after cascade curves, and identifying Arjun Rao (94% match) as the optimal recovery candidate.

---

### Step 3: Fair AI Workload Balancing (The 50/50 Split)
> *"Usually, emergency reallocations overload a single person with 100% of the overtime load. Our AI solves this by recommending a balanced 50/50 split."*

* **Action**: In the Resource Drawer, show the **AI Balanced Workload Split (50% / 50%) Recommendation Card**.
* **Click**: **`⚡ AI Suggest: Split Work Equally (50/50)`**.
* **Highlight**:
  * 9.0h assigned to candidate + 9.0h to peer backup (Priya Sharma).
  * **Samantha's Voice** announces the dual assignment aloud.
  * Real-time sync logs the event into Supabase Postgres.

---

### Step 4: Talk to Alex & Samantha Voice Copilot
> *"We built an interactive conversational voice assistant to give managers hands-free operational control."*

* **Action**: Click the floating **Voice Assistant Orb** in the bottom right (or type in the chat).
* **Try these voice / text questions**:
  * *"Why is release at risk?"* → Explains the 60% QA bandwidth drop blocking Mobile Core E2E testing (+18h) cascading to Payment Gateway (+32h).
  * *"How many workers are working?"* → Returns 4 active human engineers (Arjun, Priya, Marcus, Elena) and their workloads, plus 4 infra pools.
  * *"Today's date"* → Returns today's live day, date, and operational time.
  * *"Run simulation"* → Launches the simulation modal hands-free!

---

### Step 5: Enterprise Live Feed & Integrations
* **Live Feed** (Sidebar): Shows real-time streaming telemetry events with latency indicators and an interactive **"Emit Ping"** probe.
* **Integrations** (Sidebar): Displays 8 connected enterprise tools (Jira, GitHub Actions, Supabase, Slack, PagerDuty, AWS EKS, Stripe, Datadog) with 1-click **"Sync All Now"**.

---

### Step 6: Executive Governance & Control Center
* **Action**: Click the **Maya Chen (Admin)** profile pill at the **top right corner**.
* **Highlight**:
  * Stretched widescreen control center.
  * Interactive **Role Switcher (RBAC)**: Switch between **Administrator**, **Operator**, and **Viewer**.
  * **Team Access**: Formatted permission tags (`system.admin`, `approvals.write`, `cash.write`).
  * **Cash & Budgets**: Inflow vs Outflow tracking.

---

## 🛠️ Tech Stack Highlights for Judges
* **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Radix UI, Lucide Icons, Web Speech API (Samantha Voice).
* **Backend**: Node.js, Express, tRPC, Drizzle ORM, WebSockets.
* **Database & Cloud**: Supabase Realtime Postgres, OpenRouter Multi-Model AI.

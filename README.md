# Resource Pulse (ResourceFlow AI) ⚡

> **Real-Time Engineering Operations Command Center & Predictive Capacity Reallocation Platform**

Resource Pulse is an intelligent operations platform designed for engineering leadership, CTOs, and technical managers. It detects engineer absences and capacity deficits in real time, models downstream cascading bottlenecks across complex dependency chains, synthesizes optimal skill-matched recovery allocations with calculated probability, and facilitates 1-click human-in-the-loop executive governance.

---

## 🚀 Key Features

### 1. 5-Second Executive Live Simulation
* **Instant Clarity**: Designed for executives and clients to understand system recovery in 5 seconds.
* **4 Core Metrics**: Displays Time Recovered (`+2.4 Days`), Risk Reduction (`−38%`), Financial Impact (`$1,200`), and AI Confidence (`94%`).
* **Before vs. After Split Screen**: Side-by-side comparison of unmitigated disaster vs. AI-mitigated recovery path.
* **Replacement Probability Matrix**: Live ranked candidate match probabilities (e.g. Arjun Rao 94%, Contractor QA Pod 81%, Elena Rostova 68%, Marcus Vance 42%).

### 2. Cascading Impact Graph (5 Stages)
* Visualizes the critical path dependency chain:
  1. **Deficit**: QA testing capacity drops 60%
  2. **Direct Blocker**: Mobile Core E2E Automated Test Suite stalls (+18h)
  3. **Dependent Task**: Payment Gateway v2.4 gRPC integration blocked (+32h)
  4. **Milestone Slip**: Sprint 44 Release Candidate freeze delayed by +3.8 calendar days
  5. **Business Impact**: Q3 App Store launch delayed, SLA penalty risk, $4,200 overtime cost
* Toggle between Direct and Indirect downstream effects.

### 3. Multi-Scenario Trade-Off Matrix
* Compare 4 dynamic recovery strategies:
  * **Balanced Recovery** *(AI Recommended)*: +2.4d recovered, $1,200 spend, −38% risk reduction.
  * **Protect Deadline**: +4.1d recovered, $3,800 spend, −61% risk reduction (external QA burst pod).
  * **Minimize Cost**: +1.2d recovered, $400 spend, −19% risk reduction.
  * **Utilization Leveling**: +2.0d recovered, $950 spend, −30% risk reduction.
* Interactive **What-If Sliders** (Buffer Days, Cost Ceiling, Max Overtime).

### 4. Human-in-the-Loop Governance & Audit Trail
* Automated policy compliance checks: Skill Match (100%), Overtime Limits (Pass), Budget Ceiling (Pass).
* 1-Click Approve / Reject workflow with full audit logging.

### 5. Interactive Voice Assistant & AI Copilot ("Alex")
* **Full Live Site Awareness**: Powered by OpenRouter LLM and an enterprise knowledge base. Answers *anything* regarding the 8 resources, tasks, metrics, budgets, and scenarios.
* **Hands-Free Voice Control**: Web Speech Recognition for voice queries and natural Speech Synthesis for spoken responses.
* **Audible Action Announcements**:
  * Voice-announced task assignments: `"(New Task) Task assigned! [Person] has been allocated to [Task]..."`
  * Voice-announced approvals: `"Plan approved by Maya Chen. Allocations updated in the audit trail."`
* **Interactive Action Chips**: Quick one-click execution buttons directly inside the chat thread.

---

## 🛠 Tech Stack

* **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide Icons, Sonner Toasts
* **Backend**: Node.js, Express, tRPC (Type-Safe RPC with SuperJSON)
* **AI & Inference**: OpenRouter Multi-Model API (`openrouter/auto`) with domain-specific heuristic fallback engine
* **Voice**: Web Speech Recognition & SpeechSynthesis APIs
* **Database & ORM**: PostgreSQL, Drizzle ORM
* **Build Tool**: Vite

---

## 📦 Getting Started

### Prerequisites
* [Node.js](https://nodejs.org/) (v18 or higher)
* [pnpm](https://pnpm.io/) (`npm install -g pnpm`)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/SelvaKailashS/Resource-Pulse.git
   cd Resource-Pulse
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Add your OpenRouter API key:
   ```env
   NODE_ENV=development
   PORT=3000
   OPENROUTER_API_KEY=your_openrouter_api_key_here
   ```

4. **Start the Development Server**:
   ```bash
   pnpm dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

5. **Build for Production**:
   ```bash
   pnpm build
   ```

---

## 📄 License
MIT License.

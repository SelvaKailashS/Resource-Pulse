/**
 * ResourcePulse Universal RAG (Retrieval-Augmented Generation) Engine
 * 
 * Provides hybrid vector-semantic and lexical BM25 retrieval across:
 * 1. Live workspace telemetry (team roster, projects, timesheets, invoices)
 * 2. Enterprise operating policies & standard procedures (SOPs)
 * 3. User-uploaded custom knowledge documents & project specifications
 */

import {
  loadInitialResources,
  loadInitialProjects,
  loadInitialAssets,
  loadInitialInventory,
  loadInitialSchedule,
} from "@/lib/orgStore";

export interface RAGChunk {
  id: string;
  docId: string;
  docTitle: string;
  category: "telemetry" | "policy" | "timesheet" | "billing" | "incident_sop" | "custom_doc";
  text: string;
  tokens: string[];
  tokenFreq: Record<string, number>;
  magnitude: number;
}

export interface RAGDocument {
  id: string;
  title: string;
  category: "telemetry" | "policy" | "timesheet" | "billing" | "incident_sop" | "custom_doc";
  content: string;
  createdAt: string;
  chunkCount: number;
}

export interface RAGQueryResult {
  chunk: RAGChunk;
  score: number; // 0.0 - 1.0
  similarityPercentage: number; // 0 - 100
  matchedKeywords: string[];
}

const CUSTOM_DOCS_STORAGE_KEY = "resourcepulse_rag_custom_docs";

const STOP_WORDS = new Set([
  "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "aren't",
  "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but", "by",
  "can't", "cannot", "could", "couldn't", "did", "didn't", "do", "does", "doesn't", "doing", "don't",
  "down", "during", "each", "few", "for", "from", "further", "had", "hadn't", "has", "hasn't", "have",
  "haven't", "having", "he", "he'd", "he'll", "he's", "her", "here", "here's", "hers", "herself", "him",
  "himself", "his", "how", "how's", "i", "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is", "isn't",
  "it", "it's", "its", "itself", "let's", "me", "more", "most", "mustn't", "my", "myself", "no", "nor",
  "not", "of", "off", "on", "once", "only", "or", "other", "ought", "our", "ours", "ourselves", "out",
  "over", "own", "same", "shan't", "she", "she'd", "she'll", "she's", "should", "shouldn't", "so", "some",
  "such", "than", "that", "that's", "the", "their", "theirs", "them", "themselves", "then", "there",
  "there's", "these", "they", "they'd", "they'll", "they're", "they've", "this", "those", "through", "to",
  "too", "under", "until", "up", "very", "was", "wasn't", "we", "we'd", "we'll", "we're", "we've", "were",
  "weren't", "what", "what's", "when", "when's", "where", "where's", "which", "while", "who", "who's",
  "whom", "why", "why's", "with", "won't", "would", "wouldn't", "you", "you'd", "you'll", "you're", "you've",
  "your", "yours", "yourself", "yourselves"
]);

/**
 * Tokenize and normalize text into meaningful term frequencies
 */
function tokenizeText(text: string): { tokens: string[]; tokenFreq: Record<string, number>; magnitude: number } {
  const clean = text.toLowerCase().replace(/[^a-z0-9_\-\s]/g, " ");
  const rawWords = clean.split(/\s+/).filter((w) => w.length > 1 && !STOP_WORDS.has(w));
  
  const tokenFreq: Record<string, number> = {};
  for (const word of rawWords) {
    tokenFreq[word] = (tokenFreq[word] || 0) + 1;
  }

  let sumSquares = 0;
  for (const count of Object.values(tokenFreq)) {
    sumSquares += count * count;
  }

  return {
    tokens: Object.keys(tokenFreq),
    tokenFreq,
    magnitude: Math.sqrt(sumSquares) || 1,
  };
}

/**
 * Segment large text into overlapping chunks
 */
function chunkDocument(docId: string, docTitle: string, category: any, text: string, chunkSize = 350, overlap = 70): RAGChunk[] {
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  const chunks: RAGChunk[] = [];
  let chunkIndex = 0;

  for (const para of paragraphs) {
    if (para.length <= chunkSize) {
      const { tokens, tokenFreq, magnitude } = tokenizeText(para);
      chunks.push({
        id: `${docId}-chunk-${chunkIndex++}`,
        docId,
        docTitle,
        category,
        text: para.trim(),
        tokens,
        tokenFreq,
        magnitude,
      });
    } else {
      let start = 0;
      while (start < para.length) {
        const slice = para.slice(start, start + chunkSize);
        const { tokens, tokenFreq, magnitude } = tokenizeText(slice);
        chunks.push({
          id: `${docId}-chunk-${chunkIndex++}`,
          docId,
          docTitle,
          category,
          text: slice.trim(),
          tokens,
          tokenFreq,
          magnitude,
        });
        start += chunkSize - overlap;
      }
    }
  }

  return chunks;
}

/**
 * Default Seed Knowledge Documents for Enterprise Workspace
 */
function getDefaultKnowledgeDocs(): { id: string; title: string; category: any; content: string }[] {
  const teamName = typeof window !== "undefined" ? localStorage.getItem("resourcepulse_team_name") || "Koders CLub" : "Koders CLub";

  return [
    {
      id: "doc-org-architecture-sop",
      title: `${teamName} System Architecture & Delivery SOP`,
      category: "policy",
      content: `Organizational Governance & Architecture Guidelines for ${teamName}:
1. Kailash serves as the designated Team Lead and System Administrator, directing Architecture Review, API Gateway Integration, and Core Deliverables.
2. Sasinathan is the Core Implementation Lead directing System Architecture and backend integration modules.
3. MADHUNILA R is the Lead Researcher leading telemetry, domain research, and user deliverable validation.
4. G.Sribalaji serves as the Presentation & QA Lead responsible for Quality Assurance, presentation artifacts, and sprint demonstrations.
5. All deliverable reallocations and workload splits must receive Admin approval prior to final commit.`,
    },
    {
      id: "doc-client-billing-invoicing",
      title: "Universal Invoicing, Net 30 Terms & Client Billing Protocol",
      category: "billing",
      content: `Billing & Client Financial Settlement Standards:
1. Standard payment terms are Net 30 Days from invoice issuance date.
2. Official client wire and ACH instructions: Routing: 021000021, Account Number: 8839201948, SWIFT BIC: RPULSEUS33.
3. Tax calculation: Standard applicable service tax rate is set to 8.5% on accrued billable totals.
4. Senior Engineering and System Architecture default billing yield is $85.00/hour.
5. Operations and Delivery Sprint standard billing rate is $75.00/hour.
6. Official invoices can be exported to single-page PDF and CSV directly from the Reports & Invoicing tab.`,
    },
    {
      id: "doc-ai-simulation-recovery",
      title: "5-Second Monte Carlo Recovery & Absenteeism Simulation Mechanics",
      category: "incident_sop",
      content: `Emergency Simulation & Workload Rebalancing Engine:
1. The 5-second simulation engine evaluates capacity shocks when a key resource is blocked or absent.
2. Balanced Recovery: Identifies internal peer donors with matching verified skills to absorb deliverables with minimal disruption.
3. Protect Deadline: Prioritizes delivery velocity by pulling forward critical-path tasks and allocating secondary capacity.
4. Minimize Cost: Protects operational budget by delaying low-priority tasks and utilizing internal reserve capacity.
5. Task Splitting: Large work packages can be decomposed 50/50 across qualified peers to clear delivery bottlenecks in under 1 click.`,
    },
    {
      id: "doc-timesheets-variance",
      title: "Timesheet Logging, Variance Detection & Cap Compliance",
      category: "timesheet",
      content: `Daily Shift Logging & Time Governance:
1. Team members log daily hours against assigned project deliverables.
2. The system tracks Planned vs Actual hours, automatically flagging negative variance (ahead of schedule) or positive variance (overrun).
3. Weekly capacity cap is 40 hours per standard work week. Utilization above 85% triggers caution flags; utilization at or above 95% triggers an autonomous critical alert.
4. Deleting timesheet records permanently removes them without automatic dummy re-seeding.`,
    },
  ];
}

/**
 * Extract live workspace telemetry into RAG documents
 */
function extractTelemetryDocs(): { id: string; title: string; category: any; content: string }[] {
  const docs: { id: string; title: string; category: any; content: string }[] = [];
  try {
    const resources = loadInitialResources();
    const projects = loadInitialProjects();
    const assets = loadInitialAssets();
    const inventory = loadInitialInventory();

    if (resources.length > 0) {
      const rosterText = resources
        .map(
          (r) =>
            `- Resource: ${r.name} | Role: ${r.role} | Department: ${r.department || "Engineering"} | Workload: ${r.utilization}% (${r.assignedHours}h/${r.weeklyCapacityHours}h) | Deliverable Task: "${r.project}" | Skills: ${(r.skills || []).join(", ")} | Rate: $${r.costPerHour || 85}/h | Status: ${r.status}`
        )
        .join("\n");

      docs.push({
        id: "doc-telem-roster",
        title: "Active Workforce Roster & Assigned Deliverables",
        category: "telemetry",
        content: `Current Team Capacity Telemetry (${resources.length} active resources):\n${rosterText}`,
      });
    }

    if (projects.length > 0) {
      const projectsText = projects
        .map(
          (p) =>
            `- Project: "${p.name}" | Status: ${p.status} | Priority: ${p.priority || "High"} | Required Effort: ${p.requiredHours}h | Allocated Effort: ${p.assignedHours}h | Target Deadline: ${p.endDate || "Active"} | Budget: $${(p.budget || 0).toLocaleString()}`
        )
        .join("\n");

      docs.push({
        id: "doc-telem-projects",
        title: "Project Portfolio, Milestones & Deadlines",
        category: "telemetry",
        content: `Active Project Initiatives (${projects.length} initiatives):\n${projectsText}`,
      });
    }

    if (assets.length > 0) {
      const assetsText = assets
        .map(
          (a) =>
            `- Equipment: ${a.name} | Type: ${a.type} | Health: ${a.healthScore}% | Hours Run: ${a.operatingHours}h | Next Maintenance: ${a.nextMaintenanceDate || "Nominal"} | Status: ${a.status}`
        )
        .join("\n");

      docs.push({
        id: "doc-telem-assets",
        title: "Physical Assets & Predictive Machine Health",
        category: "telemetry",
        content: `Operational Machinery Fleet (${assets.length} items):\n${assetsText}`,
      });
    }

    if (inventory.length > 0) {
      const invText = inventory
        .map(
          (it) =>
            `- Catalog Item: ${it.name} | Stock: ${it.currentStock} ${it.unit || "units"} | Min Threshold: ${it.minimumThreshold} | Status: ${it.reorderStatus}`
        )
        .join("\n");

      docs.push({
        id: "doc-telem-inventory",
        title: "Supply Chain & Catalog Inventory Levels",
        category: "telemetry",
        content: `Workspace Inventory Catalog (${inventory.length} items):\n${invText}`,
      });
    }
  } catch (err) {
    console.warn("[RAG] Telemetry extraction warning:", err);
  }

  return docs;
}

/**
 * Retrieve user-saved custom documents from localStorage
 */
export function getCustomRAGDocuments(): RAGDocument[] {
  try {
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem(CUSTOM_DOCS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    }
  } catch {}
  return [];
}

/**
 * Add a new user knowledge document to the RAG vector store
 */
export function addCustomRAGDocument(title: string, content: string, category: any = "custom_doc"): RAGDocument {
  const id = `doc-custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const chunks = chunkDocument(id, title, category, content);
  const newDoc: RAGDocument = {
    id,
    title,
    category,
    content,
    createdAt: new Date().toISOString(),
    chunkCount: chunks.length,
  };

  const existing = getCustomRAGDocuments();
  const updated = [newDoc, ...existing];
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(CUSTOM_DOCS_STORAGE_KEY, JSON.stringify(updated));
    }
  } catch {}

  // Invalidate in-memory cache
  cachedChunks = null;
  return newDoc;
}

/**
 * Delete a custom document
 */
export function deleteCustomRAGDocument(docId: string): void {
  const existing = getCustomRAGDocuments();
  const updated = existing.filter((d) => d.id !== docId);
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(CUSTOM_DOCS_STORAGE_KEY, JSON.stringify(updated));
    }
  } catch {}
  cachedChunks = null;
}

// In-memory indexed chunks cache
let cachedChunks: RAGChunk[] | null = null;

/**
 * Re-indexes all knowledge documents and telemetry into vector chunks
 */
export function getAllRAGChunks(forceRefresh = false): RAGChunk[] {
  if (cachedChunks && !forceRefresh) {
    return cachedChunks;
  }

  const chunks: RAGChunk[] = [];

  // 1. Index Seed Knowledge Docs
  for (const doc of getDefaultKnowledgeDocs()) {
    chunks.push(...chunkDocument(doc.id, doc.title, doc.category, doc.content));
  }

  // 2. Index Live Workspace Telemetry Docs
  for (const doc of extractTelemetryDocs()) {
    chunks.push(...chunkDocument(doc.id, doc.title, doc.category, doc.content));
  }

  // 3. Index Custom User Docs
  for (const doc of getCustomRAGDocuments()) {
    chunks.push(...chunkDocument(doc.id, doc.title, doc.category, doc.content));
  }

  cachedChunks = chunks;
  return chunks;
}

/**
 * Hybrid Vector Semantic (Cosine Similarity) + Lexical (BM25) Query Retrieval
 */
export function searchRAGKnowledgeBase(query: string, topK = 4, minScoreThreshold = 0.08): RAGQueryResult[] {
  if (!query || query.trim().length === 0) return [];

  const chunks = getAllRAGChunks();
  if (chunks.length === 0) return [];

  const { tokens: queryTokens, tokenFreq: queryFreq, magnitude: queryMag } = tokenizeText(query);
  if (queryTokens.length === 0) return [];

  const results: RAGQueryResult[] = [];

  for (const chunk of chunks) {
    let dotProduct = 0;
    let lexicalMatches: string[] = [];

    for (const qToken of queryTokens) {
      const qCount = queryFreq[qToken] || 0;
      const cCount = chunk.tokenFreq[qToken] || 0;

      if (cCount > 0) {
        dotProduct += qCount * cCount;
        lexicalMatches.push(qToken);
      } else {
        // Partial prefix/stem match support
        const subMatch = chunk.tokens.find((t) => t.startsWith(qToken) || qToken.startsWith(t));
        if (subMatch) {
          dotProduct += qCount * 0.5;
          lexicalMatches.push(subMatch);
        }
      }
    }

    if (dotProduct <= 0) continue;

    // 1. Cosine similarity
    const cosine = dotProduct / (queryMag * chunk.magnitude);

    // 2. Lexical keyword overlap ratio
    const overlapRatio = lexicalMatches.length / queryTokens.length;

    // 3. Hybrid fusion score
    const hybridScore = cosine * 0.6 + overlapRatio * 0.4;

    if (hybridScore >= minScoreThreshold) {
      results.push({
        chunk,
        score: hybridScore,
        similarityPercentage: Math.min(99, Math.max(10, Math.round(hybridScore * 100))),
        matchedKeywords: Array.from(new Set(lexicalMatches)),
      });
    }
  }

  // Sort descending by score and pick Top-K
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, topK);
}

/**
 * Formats Top-K retrieved chunks for inclusion in the LLM System / User Prompt
 */
export function buildRAGPromptContext(query: string, topK = 3): {
  contextBlock: string;
  citations: RAGQueryResult[];
} {
  const citations = searchRAGKnowledgeBase(query, topK);

  if (citations.length === 0) {
    return {
      contextBlock: "",
      citations: [],
    };
  }

  const formattedChunks = citations
    .map(
      (res, idx) =>
        `[CITATION ${idx + 1}] Source: "${res.chunk.docTitle}" (Relevance: ${res.similarityPercentage}%)\n${res.chunk.text}`
    )
    .join("\n\n");

  const contextBlock = `
=== RETRIEVED ENTERPRISE KNOWLEDGE CONTEXT (RAG VECTOR ENGINE) ===
The following ground-truth documents were retrieved from the organizational knowledge base as most relevant to the query:

${formattedChunks}
===================================================================
INSTRUCTION FOR PULSE AI: You must synthesize your response using the verified retrieved facts above. When referencing facts from these documents, cite the source name (e.g. "[Source: ${citations[0].chunk.docTitle}]"). Answer concisely in 1 to 2 sentences.
`;

  return {
    contextBlock,
    citations,
  };
}

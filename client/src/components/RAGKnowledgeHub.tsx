import { useState, useMemo } from "react";
import {
  Layers3,
  Search,
  BookOpen,
  Plus,
  RefreshCw,
  Trash2,
  FileText,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Cpu,
  Database,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import {
  getAllRAGChunks,
  searchRAGKnowledgeBase,
  getCustomRAGDocuments,
  addCustomRAGDocument,
  deleteCustomRAGDocument,
  type RAGQueryResult,
  type RAGDocument,
} from "@/lib/ragEngine";

export function RAGKnowledgeHub() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<RAGQueryResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [customDocs, setCustomDocs] = useState<RAGDocument[]>(() => getCustomRAGDocuments());

  // Form states for adding custom document
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<"policy" | "custom_doc" | "incident_sop">("policy");
  const [newContent, setNewContent] = useState("");

  const allChunks = useMemo(() => {
    return getAllRAGChunks();
  }, [customDocs]);

  const uniqueDocsCount = useMemo(() => {
    const ids = new Set(allChunks.map((c) => c.docId));
    return ids.size;
  }, [allChunks]);

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    const results = searchRAGKnowledgeBase(searchQuery, 6);
    setSearchResults(results);
    setIsSearching(false);
  };

  const handleAddDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) {
      toast.error("Please provide both document title and content");
      return;
    }

    addCustomRAGDocument(newTitle.trim(), newContent.trim(), newCategory);
    setCustomDocs(getCustomRAGDocuments());
    setShowAddModal(false);
    setNewTitle("");
    setNewContent("");
    toast.success("Document Vector-Indexed", {
      description: `"${newTitle}" is now chunked and live in the RAG knowledge store.`,
    });
  };

  const handleDeleteDoc = (docId: string, title: string) => {
    deleteCustomRAGDocument(docId);
    setCustomDocs(getCustomRAGDocuments());
    toast.info(`Deleted "${title}" from RAG index.`);
  };

  const handleReindex = () => {
    getAllRAGChunks(true);
    toast.success("RAG Knowledge Store Re-Indexed", {
      description: `Successfully synchronized ${allChunks.length} vector chunks across ${uniqueDocsCount} documents.`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-sky-950/70 to-slate-900 border border-sky-800/40 p-6 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1.5">
                <Layers3 size={12} />
                RAG KNOWLEDGE CORE v2.0
              </span>
              <span className="text-xs text-slate-400">• Hybrid Semantic Vector &amp; BM25 Retrieval</span>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              Retrieval-Augmented Generation (RAG) Hub
            </h1>
            <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Grounds Pulse AI in real-time workspace telemetry, engineering SOPs, client billing rules, and custom policies to eliminate hallucinations.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleReindex}
              className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 border border-slate-700 transition-all shadow-sm"
              title="Refresh and re-chunk workspace telemetry"
            >
              <RefreshCw size={14} className="text-sky-400" />
              <span>Re-Index Store</span>
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 text-slate-950 text-xs font-bold flex items-center gap-2 shadow-lg shadow-sky-500/20 transition-all hover:scale-[1.02]"
            >
              <Plus size={15} />
              <span>+ Add Knowledge Doc</span>
            </button>
          </div>
        </div>

        {/* Telemetry Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-sky-900/40">
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[10.5px] font-mono text-slate-400 uppercase block">Total Vector Chunks</span>
            <div className="text-lg font-black text-white font-mono mt-0.5">{allChunks.length} chunks</div>
            <span className="text-[10px] text-cyan-400">Indexed &amp; Token-Weighted</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[10.5px] font-mono text-slate-400 uppercase block">Grounded Documents</span>
            <div className="text-lg font-black text-white font-mono mt-0.5">{uniqueDocsCount} docs</div>
            <span className="text-[10px] text-emerald-400">Telemetry + Policies</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[10.5px] font-mono text-slate-400 uppercase block">Retrieval Engine</span>
            <div className="text-lg font-black text-sky-400 font-mono mt-0.5">Hybrid 60/40</div>
            <span className="text-[10px] text-slate-400">Cosine Vector + BM25 Lexical</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[10.5px] font-mono text-slate-400 uppercase block">AI Generation Safety</span>
            <div className="text-lg font-black text-emerald-400 font-mono mt-0.5">Hallucination-Proof</div>
            <span className="text-[10px] text-slate-400">Strict Source Citations</span>
          </div>
        </div>
      </div>

      {/* Semantic Search Sandbox */}
      <div className="rounded-2xl bg-slate-950/80 border border-sky-900/30 p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30">
              <Search size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Live Semantic Vector Search Sandbox</h2>
              <p className="text-[11px] text-slate-400">
                Test how the RAG engine retrieves ground-truth chunks for queries asked to Pulse AI.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Query knowledge base (e.g., 'What are Kailash's tasks?', 'payment terms', 'simulation recovery')..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-xs text-white placeholder-slate-500 outline-none transition-all"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-sky-500/20"
          >
            <Sparkles size={14} />
            <span>Search</span>
          </button>
        </form>

        {/* Preset quick test queries */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-[11px] font-mono text-slate-500 shrink-0">Try presets:</span>
          {[
            "Who is the Team Lead?",
            "What are our client payment terms?",
            "How does 5-second simulation work?",
            "What is the weekly capacity cap?",
          ].map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => {
                setSearchQuery(preset);
                const results = searchRAGKnowledgeBase(preset, 5);
                setSearchResults(results);
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-[11px] border border-slate-800 shrink-0 transition-colors"
            >
              {preset}
            </button>
          ))}
        </div>

        {/* Search Results Display */}
        {searchResults.length > 0 && (
          <div className="pt-2 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>Top {searchResults.length} Ground-Truth Chunks Retrieved:</span>
              <span className="text-cyan-400">Sorted by Hybrid Relevance</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {searchResults.map((res, i) => (
                <div
                  key={i}
                  className="p-3.5 rounded-xl bg-slate-900/90 border border-sky-900/40 space-y-2 hover:border-sky-500/50 transition-all shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-sky-300 truncate max-w-[240px]">
                      📄 {res.chunk.docTitle}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10.5px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {res.similarityPercentage}% Match
                    </span>
                  </div>

                  <p className="text-[11.5px] text-slate-300 leading-relaxed font-sans line-clamp-4">
                    "{res.chunk.text}"
                  </p>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[10px] text-slate-500 font-mono">
                    <span className="uppercase text-sky-400">{res.chunk.category}</span>
                    <span>
                      Keywords: {res.matchedKeywords.slice(0, 3).join(", ") || "semantic context"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Indexed Documents Directory */}
      <div className="rounded-2xl bg-slate-950/80 border border-sky-900/30 p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <BookOpen size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Active Knowledge Documents &amp; Policy Registry</h2>
              <p className="text-[11px] text-slate-400">
                Ground-truth corpus continuously feeding the RAG vector engine.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Default Core Documents */}
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-400" /> Organizational Architecture SOP
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                System Policy
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Defines Kailash as Team Lead, Sasinathan as Implementation Lead, MADHUNILA R as Lead Researcher, and G.Sribalaji as QA Lead.
            </p>
            <div className="text-[10px] font-mono text-slate-500 pt-1">
              Status: <span className="text-emerald-400 font-semibold">Active &amp; Grounded</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <FileText size={14} className="text-cyan-400" /> Client Invoicing &amp; Billing Protocol
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                Finance &amp; Terms
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Standard Net 30 payment terms, 8.5% tax calculations, $85/h architecture billing yields, and verified wire SWIFT routing.
            </p>
            <div className="text-[10px] font-mono text-slate-500 pt-1">
              Status: <span className="text-emerald-400 font-semibold">Active &amp; Grounded</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Cpu size={14} className="text-indigo-400" /> 5-Second Simulation &amp; Recovery Rules
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Incident SOP
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Balanced recovery heuristics, critical path acceleration, 50/50 peer split mechanics, and variance monitoring.
            </p>
            <div className="text-[10px] font-mono text-slate-500 pt-1">
              Status: <span className="text-emerald-400 font-semibold">Active &amp; Grounded</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Database size={14} className="text-amber-400" /> Live Operational Telemetry Store
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Real-Time Stream
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Continuously synchronized roster workloads, active project milestones, inventory stocks, and machine health telemetry.
            </p>
            <div className="text-[10px] font-mono text-slate-500 pt-1">
              Status: <span className="text-emerald-400 font-semibold">Dynamic Auto-Sync</span>
            </div>
          </div>

          {/* User-Added Custom Documents */}
          {customDocs.map((cd) => (
            <div
              key={cd.id}
              className="p-4 rounded-xl bg-slate-900/90 border border-sky-800/40 space-y-2 relative group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-sky-200 truncate max-w-[220px]">
                  📄 {cd.title}
                </span>
                <button
                  onClick={() => handleDeleteDoc(cd.id, cd.title)}
                  className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                  title="Delete Document"
                >
                  <Trash2 size={13} />
                </button>
              </div>
              <p className="text-[11px] text-slate-300 line-clamp-3 leading-relaxed">
                "{cd.content}"
              </p>
              <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-1 border-t border-slate-800">
                <span>{cd.chunkCount} vector chunks</span>
                <span className="text-cyan-400">Custom Grounding</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Document Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-sky-800/50 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-sky-900/30 pb-3">
              <div className="flex items-center gap-2 text-white font-bold text-base">
                <Plus size={18} className="text-sky-400" />
                <span>Add Ground-Truth Knowledge Document</span>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white text-xs font-mono"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleAddDocument} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Document Title *
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Q4 Sprint Deliverables Specification"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:border-sky-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Category *
                </label>
                <select
                  value={newCategory}
                  onChange={(e: any) => setNewCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:border-sky-500 outline-none"
                >
                  <option value="policy">Enterprise Policy / Guideline</option>
                  <option value="incident_sop">Standard Operating Procedure (SOP)</option>
                  <option value="custom_doc">Project Requirements &amp; Scope</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Document Content / Text *
                </label>
                <textarea
                  required
                  rows={5}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Paste rules, scope details, deadlines, contact protocols, or technical specs..."
                  className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:border-sky-500 outline-none leading-relaxed"
                />
                <span className="text-[10.5px] text-slate-500 mt-1 block">
                  The RAG engine will automatically chunk, tokenize, and generate semantic vectors for this content.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 text-slate-950 text-xs font-bold shadow-md shadow-sky-500/20"
                >
                  Chunk &amp; Index Document
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default RAGKnowledgeHub;

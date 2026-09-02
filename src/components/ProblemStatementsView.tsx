import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  Filter,
  Layers,
  Code,
  Cpu,
  Building2,
  Download,
  ArrowRight,
  Check,
  Copy,
  ExternalLink,
  Sparkles,
  HelpCircle,
  FileSpreadsheet
} from "lucide-react";
import { ProblemStatement } from "../types";

interface ProblemStatementsViewProps {
  problemStatements: ProblemStatement[];
  onSelectProblem?: (problemId: string) => void;
  onNavigateToRegister: (problemId?: string) => void;
  isDark?: boolean;
}

export default function ProblemStatementsView({
  problemStatements,
  onSelectProblem,
  onNavigateToRegister,
  isDark = false
}: ProblemStatementsViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"All" | "Software" | "Hardware">("All");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const softwareCount = useMemo(
    () => problemStatements.filter(ps => ps.category === "Software").length,
    [problemStatements]
  );
  const hardwareCount = useMemo(
    () => problemStatements.filter(ps => ps.category === "Hardware").length,
    [problemStatements]
  );

  const filteredStatements = useMemo(() => {
    return problemStatements.filter(ps => {
      const matchesCat =
        selectedCategory === "All" ||
        ps.category.toLowerCase() === selectedCategory.toLowerCase();

      const q = searchQuery.trim().toLowerCase();
      if (!q) return matchesCat;

      const matchesSearch =
        ps.code.toLowerCase().includes(q) ||
        ps.title.toLowerCase().includes(q) ||
        ps.organization.toLowerCase().includes(q) ||
        ps.category.toLowerCase().includes(q);

      return matchesCat && matchesSearch;
    });
  }, [problemStatements, selectedCategory, searchQuery]);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => {
      setCopiedCode(null);
    }, 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Hero / Header Section */}
      <div className={`rounded-3xl border p-6 md:p-10 shadow-sm relative overflow-hidden ${
        isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"
      }`}>
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-50 border border-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:border-indigo-900/60 dark:text-indigo-400">
            <Sparkles className="w-3.5 h-3.5" />
            Official SIH 2026 Problem Statements
          </div>
          <h1 className="text-2xl sm:text-4xl font-black font-display tracking-tight">
            Explore Problem Statements
          </h1>
          <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? "text-slate-400" : "text-slate-600"}`}>
            Browse official challenge statements published by Central Ministries, State Governments, and Industry Partners.
            Select a problem to form your team and submit your proposal deck.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <a
              href="/api/settings/sample-ppt/download"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Download PPT Template
            </a>
            <button
              onClick={() => onNavigateToRegister()}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                isDark 
                  ? "border-slate-700 text-slate-300 hover:bg-slate-800" 
                  : "border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <ArrowRight className="w-4 h-4 text-indigo-500" />
              Direct Team Registration
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className={`rounded-2xl border p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4 ${
        isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
      }`}>
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
          <button
            onClick={() => setSelectedCategory("All")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
              selectedCategory === "All"
                ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            All Statements ({problemStatements.length})
          </button>
          <button
            onClick={() => setSelectedCategory("Software")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
              selectedCategory === "Software"
                ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            Software ({softwareCount})
          </button>
          <button
            onClick={() => setSelectedCategory("Hardware")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
              selectedCategory === "Hardware"
                ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            Hardware ({hardwareCount})
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by code, title, ministry..."
            className={`w-full pl-9.5 pr-4 py-2 text-xs rounded-xl border outline-none transition-all ${
              isDark
                ? "bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-indigo-500"
                : "bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:bg-white focus:border-indigo-500"
            }`}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Problem Statements Grid */}
      {filteredStatements.length === 0 ? (
        <div className={`rounded-3xl border p-12 text-center space-y-4 ${
          isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
        }`}>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No Problem Statements Found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            No matching statements found for "{searchQuery}". Try searching with different keywords or clearing filters.
          </p>
          <button
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("All");
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl cursor-pointer"
          >
            Reset Search Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredStatements.map((ps, index) => {
            const isSoftware = ps.category === "Software";
            return (
              <motion.div
                key={ps.id || ps.code || index}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15, delay: Math.min(index * 0.03, 0.3) }}
                className={`rounded-2xl border p-5 md:p-6 transition-all hover:shadow-md flex flex-col justify-between gap-4 group ${
                  isDark
                    ? "bg-slate-900 border-slate-800 hover:border-indigo-800"
                    : "bg-white border-slate-200 hover:border-indigo-200"
                }`}
              >
                <div className="space-y-3">
                  {/* Top Bar: Code & Category */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-extrabold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                        {ps.code}
                      </span>
                      <button
                        onClick={() => handleCopyCode(ps.code)}
                        title="Copy PS Code"
                        className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        {copiedCode === ps.code ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
                      isSoftware
                        ? "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800"
                        : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"
                    }`}>
                      {isSoftware ? <Code className="w-3 h-3" /> : <Cpu className="w-3 h-3" />}
                      {ps.category}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className={`text-sm sm:text-base font-bold leading-snug font-display ${
                    isDark ? "text-slate-100 group-hover:text-indigo-300" : "text-slate-900 group-hover:text-indigo-600"
                  } transition-colors`}>
                    {ps.title}
                  </h3>

                  {/* Organization */}
                  <div className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <Building2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" />
                    <span>{ps.organization || "Government of India / AICTE"}</span>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className={`pt-3 border-t flex items-center justify-between gap-3 ${
                  isDark ? "border-slate-800" : "border-slate-100"
                }`}>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Order #{index + 1}
                  </span>
                  <button
                    onClick={() => onNavigateToRegister(ps.id)}
                    className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer group/btn"
                  >
                    <span>Register for this Problem</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

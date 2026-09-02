import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Trophy,
  Sparkles,
  Clock,
  Search,
  Filter,
  Users,
  User,
  GraduationCap,
  Briefcase,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Code,
  Cpu,
  RefreshCw,
  ExternalLink
} from "lucide-react";
import { ProblemStatement } from "../types";

export interface SelectedTeamItem {
  id: string;
  registrationId?: string;
  teamName: string;
  leadName: string;
  leadDepartment: string;
  leadAcademicYear?: string;
  mentorName?: string;
  problemStatementId?: string;
  hasFemaleMember?: boolean;
  member1?: string;
  member2?: string;
  member3?: string;
  member4?: string;
  member5?: string;
  selectionNotes?: string;
  submittedAt?: string;
}

interface SelectedTeamsViewProps {
  problemStatements: ProblemStatement[];
  onNavigateToStatements: () => void;
  onNavigateToRegister: () => void;
  isDark?: boolean;
}

export default function SelectedTeamsView({
  problemStatements,
  onNavigateToStatements,
  onNavigateToRegister,
  isDark = false
}: SelectedTeamsViewProps) {
  const [selectedTeams, setSelectedTeams] = useState<SelectedTeamItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("All");

  const fetchSelectedTeams = async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/registrations/selected");
      if (!res.ok) {
        throw new Error(`Failed to fetch selected teams (${res.status})`);
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        setSelectedTeams(data);
      } else {
        setSelectedTeams([]);
      }
    } catch (err: any) {
      console.warn("Could not load selected teams from API:", err);
      // Attempt fallback to empty array or local safe state
      setSelectedTeams([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSelectedTeams();
  }, []);

  const psMap = useMemo(() => {
    const map = new Map<string, ProblemStatement>();
    problemStatements.forEach((ps) => {
      map.set(ps.id, ps);
      if (ps.code) map.set(ps.code, ps);
    });
    return map;
  }, [problemStatements]);

  const uniqueDepartments = useMemo(() => {
    const depts = new Set<string>();
    selectedTeams.forEach((t) => {
      if (t.leadDepartment) depts.add(t.leadDepartment);
    });
    return ["All", ...Array.from(depts)];
  }, [selectedTeams]);

  const filteredTeams = useMemo(() => {
    return selectedTeams.filter((t) => {
      const matchDept = departmentFilter === "All" || t.leadDepartment === departmentFilter;
      const q = searchQuery.trim().toLowerCase();
      if (!q) return matchDept;

      const ps = t.problemStatementId ? psMap.get(t.problemStatementId) : undefined;
      const psCode = ps?.code?.toLowerCase() || "";
      const psTitle = ps?.title?.toLowerCase() || "";

      const matchSearch =
        t.teamName.toLowerCase().includes(q) ||
        t.leadName.toLowerCase().includes(q) ||
        (t.registrationId && t.registrationId.toLowerCase().includes(q)) ||
        (t.mentorName && t.mentorName.toLowerCase().includes(q)) ||
        (t.leadDepartment && t.leadDepartment.toLowerCase().includes(q)) ||
        psCode.includes(q) ||
        psTitle.includes(q);

      return matchDept && matchSearch;
    });
  }, [selectedTeams, departmentFilter, searchQuery, psMap]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Top Header banner */}
      <div className={`rounded-3xl border p-6 md:p-10 shadow-sm relative overflow-hidden ${
        isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"
      }`}>
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-50 border border-amber-200 text-amber-700 dark:bg-amber-950/60 dark:border-amber-900/60 dark:text-amber-400">
            <Trophy className="w-3.5 h-3.5" />
            Smart India Hackathon 2026 Selections
          </div>
          <h1 className="text-2xl sm:text-4xl font-black font-display tracking-tight">
            Final Selected Teams
          </h1>
          <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? "text-slate-400" : "text-slate-600"}`}>
            Official list of shortlisted and selected teams approved by Institutional SPOC and Super Admin
            to represent Sri Vasavi Engineering College in SIH 2026.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={fetchSelectedTeams}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              Refresh Results
            </button>
            <button
              onClick={onNavigateToStatements}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 cursor-pointer"
            >
              Browse Problem Statements
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className={`rounded-3xl border p-12 text-center space-y-3 ${
          isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
        }`}>
          <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-500">Checking selected teams list...</p>
        </div>
      ) : selectedTeams.length === 0 ? (
        /* COMING SOON CARD (when no teams are selected yet) */
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`rounded-3xl border p-8 sm:p-14 text-center space-y-6 max-w-2xl mx-auto shadow-sm ${
            isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
          }`}
        >
          <div className="w-20 h-20 rounded-3xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200/60 dark:border-amber-800/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-sm">
            <Clock className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <span className="inline-block px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300">
              Evaluation In Progress
            </span>
            <h2 className="text-xl sm:text-3xl font-black font-display text-slate-900 dark:text-white">
              Selected Teams Announcement Coming Soon
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-md mx-auto">
              The internal jury evaluation and SPOC screening are currently underway. The finalized list of selected teams representing SVEC for SIH 2026 will be published here once selections are approved.
            </p>
          </div>

          <div className="pt-4 flex flex-wrap justify-center gap-3">
            <button
              onClick={onNavigateToStatements}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center gap-2"
            >
              <BookOpen className="w-4 h-4" />
              View Problem Statements
            </button>
            <button
              onClick={onNavigateToRegister}
              className={`px-5 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                isDark 
                  ? "border-slate-700 text-slate-300 hover:bg-slate-800" 
                  : "border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              Register Team
            </button>
          </div>
        </motion.div>
      ) : (
        /* Selected Teams List */
        <div className="space-y-6">
          {/* Filter and Search Bar */}
          <div className={`rounded-2xl border p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4 ${
            isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
          }`}>
            <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
              {uniqueDepartments.map((dept) => (
                <button
                  key={dept}
                  onClick={() => setDepartmentFilter(dept)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                    departmentFilter === dept
                      ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {dept === "All" ? `All (${selectedTeams.length})` : dept}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search team, lead, mentor, PS..."
                className={`w-full pl-9.5 pr-4 py-2 text-xs rounded-xl border outline-none transition-all ${
                  isDark
                    ? "bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-indigo-500"
                    : "bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:bg-white focus:border-indigo-500"
                }`}
              />
            </div>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTeams.map((team, idx) => {
              const ps = team.problemStatementId ? psMap.get(team.problemStatementId) : undefined;
              const members = [team.member1, team.member2, team.member3, team.member4, team.member5].filter(Boolean);

              return (
                <motion.div
                  key={team.id || idx}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15, delay: Math.min(idx * 0.04, 0.3) }}
                  className={`rounded-2xl border p-5 sm:p-6 shadow-xs flex flex-col justify-between gap-4 transition-all hover:shadow-md ${
                    isDark ? "bg-slate-900 border-slate-800 hover:border-indigo-800" : "bg-white border-slate-200 hover:border-indigo-200"
                  }`}
                >
                  <div className="space-y-3">
                    {/* Top row */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-extrabold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Selected
                        </span>
                        {team.registrationId && (
                          <span className="font-mono text-xs font-bold text-slate-400">
                            {team.registrationId}
                          </span>
                        )}
                      </div>

                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        {team.leadDepartment || "General"}
                      </span>
                    </div>

                    {/* Team Name */}
                    <h3 className="text-lg font-black font-display text-slate-900 dark:text-white">
                      {team.teamName}
                    </h3>

                    {/* Problem statement */}
                    {ps && (
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-150 dark:border-slate-700/60 space-y-1">
                        <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                          <span className="font-mono bg-indigo-100 dark:bg-indigo-900/50 px-1.5 py-0.5 rounded">
                            {ps.code}
                          </span>
                          <span>{ps.category}</span>
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold line-clamp-2">
                          {ps.title}
                        </p>
                      </div>
                    )}

                    {/* Team Members and Lead Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400 pt-1">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Team Lead</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{team.leadName}</span>
                      </div>
                      {team.mentorName && (
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Faculty Mentor</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{team.mentorName}</span>
                        </div>
                      )}
                    </div>

                    {/* Members pills */}
                    {members.length > 0 && (
                      <div className="space-y-1 pt-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                          Team Members ({members.length + 1} total)
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {members.map((m, mIdx) => (
                            <span
                              key={mIdx}
                              className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                            >
                              {m}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Remarks / Selection Notes */}
                    {team.selectionNotes && (
                      <div className="text-xs italic text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg border border-dashed border-slate-200 dark:border-slate-700">
                        "{team.selectionNotes}"
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect, useCallback, Suspense, lazy } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Layers,
  ShieldCheck,
  HelpCircle,
  GraduationCap,
  LogOut,
  FileText,
  Menu,
  X,
  ChevronRight,
  User,
  Sparkles,
  BookOpen,
  Trophy,
  Lock,
  ArrowRight
} from "lucide-react";
import { ProblemStatement, Registration, HomepageContent, CustomPage, MenuItem, LiveUpdate } from "./types";
import SvecLogo from "./components/SvecLogo";
import LandingPage from "./components/LandingPage";
import { api } from "./services/api";

// Lazy-loaded route subviews for optimized initial bundle loading speed
const RegistrationForm = lazy(() => import("./components/RegistrationForm"));
const StudentAuth = lazy(() => import("./components/StudentAuth"));
const Receipt = lazy(() => import("./components/Receipt"));
const AdminPanel = lazy(() => import("./components/AdminPanel"));
const ProblemStatementsView = lazy(() => import("./components/ProblemStatementsView"));
const SelectedTeamsView = lazy(() => import("./components/SelectedTeamsView"));

function SubviewLoader() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] py-16 space-y-3">
      <div className="w-9 h-9 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">Loading module...</span>
    </div>
  );
}

function parseInitialRoute(): string {
  if (typeof window === "undefined") return "home";

  // Check URL pathname
  const path = window.location.pathname.toLowerCase();
  if (path === "/admin" || path === "/admin/login") return "admin";
  if (path === "/statements" || path === "/problem-statements") return "statements";
  if (path === "/register" || path === "/register-team") return "register";
  if (path === "/student-login" || path === "/student-portal" || path === "/login") return "student-portal";
  if (path === "/selected-teams" || path === "/selected") return "selected-teams";
  if (path === "/receipt" || path === "/my-registration") return "receipt";

  // Check URL hash
  const hash = window.location.hash.replace(/^#\/?/, "").toLowerCase();
  if (hash === "admin" || hash === "admin/login") return "admin";
  if (hash === "statements" || hash === "problem-statements") return "statements";
  if (hash === "register" || hash === "register-team") return "register";
  if (hash === "student-login" || hash === "student-portal" || hash === "login") return "student-portal";
  if (hash === "selected-teams" || hash === "selected") return "selected-teams";
  if (hash === "receipt" || hash === "my-registration") return "receipt";
  if (hash) return hash;

  // Check query params
  const searchParams = new URLSearchParams(window.location.search);
  const viewParam = searchParams.get("view") || searchParams.get("tab");
  if (viewParam) return viewParam;

  if (sessionStorage.getItem("svec_sih_admin_token")) {
    return "admin";
  }

  return "home";
}

export default function App() {
  const [view, setView] = useState<string>(parseInitialRoute);
  const [problemStatements, setProblemStatements] = useState<ProblemStatement[]>(() => {
    try {
      const saved = localStorage.getItem("svec_problem_statements_backup");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [latestRegistration, setLatestRegistration] = useState<Registration | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasExistingRegistration, setHasExistingRegistration] = useState<Registration | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedProblemId, setSelectedProblemId] = useState<string | undefined>(undefined);

  // Dynamic layout states - hydrated from cache for instant 0ms First Contentful Paint
  const [homepageData, setHomepageData] = useState<HomepageContent | null>(() => {
    try {
      const saved = localStorage.getItem("svec_homepage_backup");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [customPages, setCustomPages] = useState<CustomPage[]>(() => {
    try {
      const saved = localStorage.getItem("svec_custom_pages_backup");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [menuItems, setMenuItems] = useState<MenuItem[]>(() => {
    try {
      const saved = localStorage.getItem("svec_menu_backup");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [updates, setUpdates] = useState<LiveUpdate[]>([]);
  const [publicSettings, setPublicSettings] = useState<{
    portalTheme?: "light" | "dark";
    logoUrl?: string;
    portalTitle?: string;
    portalCaption?: string;
    creditsTitle?: string;
    creditsContent?: string;
    creditsEnabled?: boolean;
  } | null>(() => {
    try {
      const saved = localStorage.getItem("svec_settings_backup");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [student, setStudent] = useState<{ id: string; email: string; token?: string; gender?: string; department?: string; mobile?: string } | null>(() => {
    try {
      const saved = localStorage.getItem("svec_sih_student");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Fetch initial content, navigation links and lists
  const fetchAllInitialData = async () => {
    try {
      const [psRes, homeRes, pagesRes, menuRes, settingsRes, updatesRes] = await Promise.allSettled([
        api.get<ProblemStatement[]>("/api/problem-statements"),
        api.get<HomepageContent>("/api/homepage"),
        api.get<CustomPage[]>("/api/custom-pages"),
        api.get<MenuItem[]>("/api/menu"),
        api.get<any>("/api/settings/public"),
        api.get<LiveUpdate[]>("/api/updates")
      ]);

      if (psRes.status === "fulfilled" && psRes.value) {
        if (Array.isArray(psRes.value) && psRes.value.length > 0) {
          setProblemStatements(psRes.value);
          try {
            localStorage.setItem("svec_problem_statements_backup", JSON.stringify(psRes.value));
          } catch (e) {}
        } else {
          // Fallback to local browser cache if server returned empty
          try {
            const cached = localStorage.getItem("svec_problem_statements_backup");
            if (cached) {
              const parsed = JSON.parse(cached);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setProblemStatements(parsed);
              } else {
                setProblemStatements(psRes.value);
              }
            } else {
              setProblemStatements(psRes.value);
            }
          } catch (e) {
            setProblemStatements(psRes.value);
          }
        }
      }

      if (homeRes.status === "fulfilled" && homeRes.value) {
        setHomepageData(homeRes.value);
        try {
          localStorage.setItem("svec_homepage_backup", JSON.stringify(homeRes.value));
        } catch {}
      }

      if (pagesRes.status === "fulfilled" && pagesRes.value) {
        setCustomPages(pagesRes.value);
        try {
          localStorage.setItem("svec_custom_pages_backup", JSON.stringify(pagesRes.value));
        } catch {}
      }

      if (menuRes.status === "fulfilled" && menuRes.value) {
        setMenuItems(menuRes.value);
        try {
          localStorage.setItem("svec_menu_backup", JSON.stringify(menuRes.value));
        } catch {}
      }

      if (settingsRes.status === "fulfilled" && settingsRes.value) {
        setPublicSettings(settingsRes.value);
        try {
          localStorage.setItem("svec_settings_backup", JSON.stringify(settingsRes.value));
        } catch {}
      }

      if (updatesRes.status === "fulfilled" && updatesRes.value) {
        setUpdates(updatesRes.value);
      }
    } catch (err) {
      console.error("Failed to load initial workspace data", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyRegistration = async (email: string) => {
    try {
      const data = await api.get<{ found: boolean; registration?: Registration }>(
        "/api/registrations/my",
        { params: { email } }
      );
      if (data && data.found && data.registration) {
        setHasExistingRegistration(data.registration);
        setLatestRegistration(data.registration);
      } else {
        setHasExistingRegistration(null);
      }
    } catch (err) {
      console.error("Failed to fetch registration on mount/auth", err);
    }
  };

  useEffect(() => {
    fetchAllInitialData();
  }, []);

  useEffect(() => {
    if (student?.email) {
      fetchMyRegistration(student.email);
    } else {
      setHasExistingRegistration(null);
      setLatestRegistration(null);
    }
  }, [student?.email]);

  // Sync route on popstate and hashchange
  useEffect(() => {
    const handleLocationChange = () => {
      const target = parseInitialRoute();
      setView(target);
    };

    window.addEventListener("popstate", handleLocationChange);
    window.addEventListener("hashchange", handleLocationChange);

    return () => {
      window.removeEventListener("popstate", handleLocationChange);
      window.removeEventListener("hashchange", handleLocationChange);
    };
  }, []);

  const handleRegistrationSuccess = (reg: Registration) => {
    setLatestRegistration(reg);
    setHasExistingRegistration(reg);
    setView("receipt");
    if (typeof window !== "undefined") {
      window.history.pushState(null, "", "#receipt");
    }
  };

  const handleResetForm = () => {
    setLatestRegistration(null);
    setView("register");
    if (typeof window !== "undefined") {
      window.history.pushState(null, "", "#register");
    }
  };

  // Helper to change view and sync URL
  const navigateTo = useCallback((target: string) => {
    setView(target);
    setMobileMenuOpen(false);

    if (typeof window !== "undefined") {
      if (target === "home") {
        window.history.pushState(null, "", "/");
      } else {
        window.history.pushState(null, "", `#${target}`);
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  // Safe fallback list of menu items if fetch hasn't completed or returned empty
  const getRenderMenuItems = (): MenuItem[] => {
    const defaultList: MenuItem[] = [
      { id: "m1", label: "Home", type: "system", target: "home", order: 0 },
      { id: "m2", label: "Problem Statements", type: "system", target: "statements", order: 1 },
      { id: "m3", label: "Register Team", type: "system", target: "register", order: 2 },
      { id: "m4", label: "Student Login", type: "system", target: "student-portal", order: 3 },
      { id: "m5", label: "Selected Teams", type: "system", target: "selected-teams", order: 4 },
      { id: "m6", label: "FAQ & Contact", type: "system", target: "faq", order: 5 },
      { id: "m7", label: "Admin Login", type: "system", target: "admin", order: 6 }
    ];

    let itemsToProcess = defaultList;
    if (menuItems && menuItems.length > 0) {
      // Ensure default items exist if not present in custom items
      const merged = [...menuItems];
      defaultList.forEach((def) => {
        if (!merged.some((m) => m.target === def.target)) {
          merged.push(def);
        }
      });
      itemsToProcess = merged;
    }

    // When a student is logged in, hide Admin Login menu item from the student's navigation
    if (student) {
      itemsToProcess = itemsToProcess.filter(
        (m) => m.target !== "admin" && m.target !== "admin/login" && m.label.toLowerCase() !== "admin login"
      );
    }

    return itemsToProcess.sort((a, b) => a.order - b.order);
  };

  // Parse Markdown formatting for custom pages
  const renderSimpleMarkdown = (text: string) => {
    if (!text) return null;

    // Check if the content is rich HTML
    const isHtml = /<[a-z][\s\S]*>/i.test(text) || text.includes("</") || text.includes("<img") || text.includes("<div");
    if (isHtml) {
      return (
        <div 
          dangerouslySetInnerHTML={{ __html: text }} 
          className="rich-html-container max-w-none break-words"
        />
      );
    }

    return text.split("\n").map((line, idx) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("### ")) {
        return (
          <h3 key={idx} className={`text-base sm:text-lg font-bold mt-5 mb-2 first:mt-0 font-display ${isDark ? "text-slate-100" : "text-slate-800"}`}>
            {trimmed.replace("### ", "")}
          </h3>
        );
      }
      if (trimmed.startsWith("## ")) {
        return (
          <h2 key={idx} className={`text-lg sm:text-xl font-extrabold mt-6 mb-3 first:mt-0 border-b pb-1.5 font-display ${isDark ? "text-slate-100 border-slate-800" : "text-slate-800 border-slate-100"}`}>
            {trimmed.replace("## ", "")}
          </h2>
        );
      }
      if (trimmed.startsWith("# ")) {
        return (
          <h1 key={idx} className={`text-xl sm:text-2xl font-black mt-8 mb-4 first:mt-0 font-display ${isDark ? "text-white" : "text-slate-900"}`}>
            {trimmed.replace("# ", "")}
          </h1>
        );
      }
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        return (
          <li key={idx} className={`ml-5 list-disc text-sm mb-1 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
            {trimmed.substring(2)}
          </li>
        );
      }
      if (trimmed === "") {
        return <div key={idx} className="h-2" />;
      }
      return (
        <p key={idx} className={`text-sm leading-relaxed mb-3 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
          {trimmed}
        </p>
      );
    });
  };

  const isDark = publicSettings?.portalTheme === "dark" && view !== "admin";

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="relative flex items-center justify-center">
          <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <GraduationCap className="absolute w-6 h-6 text-indigo-600 animate-pulse" />
        </div>
        <p className="mt-4 text-sm font-semibold text-slate-600 animate-pulse">
          Loading Hackathon Portal...
        </p>
      </div>
    );
  }

  // Find if current view is a custom page slug
  const currentCustomPage = customPages.find(p => p.slug === view && p.published);

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${isDark ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-850"}`}>
      {/* Top Universal Navbar */}
      <header className={`sticky top-0 z-30 shadow-xs print:hidden transition-colors duration-300 ${isDark ? "bg-slate-900 border-b border-slate-800 text-white" : "bg-white border-b border-slate-200"}`}>
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div 
            onClick={() => navigateTo("home")}
            className="flex items-center gap-3 cursor-pointer hover:opacity-90 transition-opacity"
            id="brand-header"
          >
            {publicSettings?.logoUrl ? (
              <img src={publicSettings.logoUrl} className="w-11 h-11 object-contain rounded-lg" alt="Logo" referrerPolicy="no-referrer" />
            ) : (
              <SvecLogo className="w-11 h-11" />
            )}
            <div>
              <span className={`font-bold font-display tracking-tight text-xs sm:text-sm md:text-base block ${isDark ? "text-white" : "text-slate-900"}`}>
                {publicSettings?.portalTitle || "SVEC - SIH Internal Hackathon 2026"}
              </span>
              <span className={`text-[10px] font-semibold block -mt-1 uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-400"}`}>
                {publicSettings?.portalCaption || "Sri Vasavi Engineering College"}
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links (strictly rendered in menu order) */}
          <nav className={`hidden lg:flex items-center gap-1 p-1 rounded-xl transition-colors duration-300 ${isDark ? "bg-slate-800/80 border border-slate-700/50" : "bg-slate-100/70 border border-slate-200/40"}`}>
            {getRenderMenuItems().map((item) => {
              let isActive = view === item.target;
              if (item.target === "statements" && (view === "statements" || view === "problem-statements")) {
                isActive = true;
              }
              if (item.target === "register" && (view === "register" || view === "receipt")) {
                isActive = true;
              }
              if (item.target === "student-portal" && (view === "student-portal" || view === "student-login")) {
                isActive = true;
              }
              if (item.target === "selected-teams" && (view === "selected-teams" || view === "selected")) {
                isActive = true;
              }
              if (item.target === "admin" && (view === "admin" || view === "admin/login")) {
                isActive = true;
              }

              return (
                <button
                  key={item.id}
                  onClick={() => navigateTo(item.target)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? (isDark ? "bg-indigo-600 text-white shadow-sm" : "bg-white text-indigo-600 shadow-sm")
                      : (isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-950")
                  }`}
                  id={`nav-link-${item.target}`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Right Controls Area (Student state, Registration quick link, Admin, Mobile toggle) */}
          <div className="flex items-center gap-2">
            {student ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigateTo("receipt")}
                  className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    view === "receipt"
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : isDark
                        ? "bg-slate-800 border-slate-700 text-indigo-300 hover:bg-slate-750"
                        : "bg-indigo-50 border-indigo-100 text-indigo-700 hover:bg-indigo-100/70"
                  }`}
                  id="header-view-registration-btn"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>My Team</span>
                </button>

                <button
                  onClick={() => {
                    localStorage.removeItem("svec_sih_student");
                    setStudent(null);
                    navigateTo("home");
                  }}
                  className={`text-xs font-bold flex items-center gap-1 px-2.5 py-1.5 rounded-xl transition-all cursor-pointer border ${
                    isDark
                      ? "text-slate-400 hover:text-red-400 hover:bg-red-950/20 border-transparent hover:border-red-950"
                      : "text-slate-600 hover:text-red-600 hover:bg-red-50/50 border-transparent hover:border-red-100"
                  }`}
                  title="Logout Student Session"
                  id="header-logout-btn"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Logout</span>
                </button>
              </div>
            ) : null}

            {/* Mobile Hamburger toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`lg:hidden p-2 rounded-xl cursor-pointer transition-colors ${isDark ? "text-slate-400 hover:bg-slate-800" : "text-slate-500 hover:bg-slate-100"}`}
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className={`lg:hidden shadow-lg overflow-hidden relative z-20 transition-colors duration-300 ${
              isDark 
                ? "bg-slate-900 border-b border-slate-800 text-white" 
                : "bg-white border-b border-slate-200"
            }`}
          >
            <div className="p-4 space-y-1.5">
              <span className="text-[9px] font-black tracking-widest text-slate-400 block uppercase mb-1">
                Navigation Menu
              </span>
              {getRenderMenuItems().map((item) => (
                <button
                  key={item.id}
                  onClick={() => navigateTo(item.target)}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between cursor-pointer transition-colors ${
                    view === item.target
                      ? (isDark ? "bg-indigo-950/60 text-indigo-300" : "bg-indigo-50 text-indigo-700")
                      : (isDark ? "text-slate-300 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-50")
                  }`}
                >
                  <span>{item.label}</span>
                  <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                </button>
              ))}

              {student && (
                <div className={`pt-3 mt-2 border-t flex items-center justify-between ${isDark ? "border-slate-800" : "border-slate-100"}`}>
                  <div className="text-[11px] font-semibold text-slate-400 truncate max-w-[200px]">
                    Logged in: <span className="font-mono text-indigo-400">{student.email}</span>
                  </div>
                  <button
                    onClick={() => {
                      localStorage.removeItem("svec_sih_student");
                      setStudent(null);
                      navigateTo("home");
                    }}
                    className="text-xs font-bold text-red-500 hover:underline cursor-pointer"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Body */}
      <main className="flex-1 pb-16">
        <Suspense fallback={<SubviewLoader />}>
          <AnimatePresence mode="wait">
          {/* 1. DYNAMIC HOME PAGE / LANDING PAGE */}
          {view === "home" && homepageData && (
            <motion.div
              key="home-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <LandingPage 
                homepageData={homepageData} 
                onNavigate={navigateTo} 
                customPages={customPages}
                isDark={isDark}
                publicSettings={publicSettings}
                updates={updates}
              />
            </motion.div>
          )}

          {/* 2. PROBLEM STATEMENTS VIEW (in super admin uploaded order) */}
          {(view === "statements" || view === "problem-statements") && (
            <motion.div
              key="statements-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <ProblemStatementsView
                problemStatements={problemStatements}
                onNavigateToRegister={(psId) => {
                  if (psId) setSelectedProblemId(psId);
                  navigateTo("register");
                }}
                isDark={isDark}
              />
            </motion.div>
          )}

          {/* 3. DIRECT REGISTRATION FORM (STUDENTS) */}
          {view === "register" && (
            <motion.div
              key="register-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {student ? (
                <RegistrationForm
                  student={student}
                  problemStatements={problemStatements}
                  onSuccess={handleRegistrationSuccess}
                />
              ) : (
                <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
                  {/* Top Notice */}
                  <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isDark ? "bg-slate-900 border-slate-800 text-slate-300" : "bg-indigo-50/70 border-indigo-100 text-indigo-900"
                  }`}>
                    <div className="flex items-center gap-2.5">
                      <GraduationCap className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider">Direct Team Registration</h3>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          Sign in with your student email or create a new account to complete and submit your team registration.
                        </p>
                      </div>
                    </div>
                  </div>

                  <StudentAuth
                    isDark={isDark}
                    onAuthSuccess={(s) => {
                      localStorage.setItem("svec_sih_student", JSON.stringify(s));
                      setStudent(s);
                      fetchMyRegistration(s.email);
                    }}
                  />
                </div>
              )}
            </motion.div>
          )}

          {/* 4. STUDENT LOGIN VIEW */}
          {(view === "student-portal" || view === "student-login") && (
            <motion.div
              key="student-portal-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="max-w-3xl mx-auto px-4 py-8 space-y-6"
            >
              {student ? (
                <div className={`rounded-3xl border p-8 shadow-sm space-y-6 text-center ${
                  isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"
                }`}>
                  <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
                    <GraduationCap className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                      Logged in Student
                    </span>
                    <h2 className="text-2xl font-black font-display mt-2">{student.email}</h2>
                    {student.department && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                        Department: {student.department}
                      </p>
                    )}
                  </div>

                  <div className="pt-4 flex flex-wrap justify-center gap-3">
                    {hasExistingRegistration ? (
                      <button
                        onClick={() => navigateTo("receipt")}
                        className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-2"
                      >
                        <FileText className="w-4 h-4" />
                        View My Team Registration
                      </button>
                    ) : (
                      <button
                        onClick={() => navigateTo("register")}
                        className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-2"
                      >
                        <Sparkles className="w-4 h-4" />
                        Register a Team
                      </button>
                    )}

                    <button
                      onClick={() => navigateTo("statements")}
                      className={`px-5 py-2.5 rounded-xl border text-xs font-bold cursor-pointer ${
                        isDark ? "border-slate-700 text-slate-300 hover:bg-slate-800" : "border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      Browse Problem Statements
                    </button>

                    <button
                      onClick={() => {
                        localStorage.removeItem("svec_sih_student");
                        setStudent(null);
                        navigateTo("home");
                      }}
                      className="px-5 py-2.5 rounded-xl border border-red-200 dark:border-red-900/60 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-bold cursor-pointer"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              ) : (
                <StudentAuth
                  isDark={isDark}
                  onAuthSuccess={(s) => {
                    localStorage.setItem("svec_sih_student", JSON.stringify(s));
                    setStudent(s);
                    fetchMyRegistration(s.email);
                  }}
                />
              )}
            </motion.div>
          )}

          {/* 5. SELECTED TEAMS VIEW (show only selected or coming soon) */}
          {(view === "selected-teams" || view === "selected") && (
            <motion.div
              key="selected-teams-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <SelectedTeamsView
                problemStatements={problemStatements}
                onNavigateToStatements={() => navigateTo("statements")}
                onNavigateToRegister={() => navigateTo("register")}
                isDark={isDark}
              />
            </motion.div>
          )}

          {/* 6. RECEIPT SCREEN */}
          {view === "receipt" && latestRegistration && (
            <motion.div
              key="receipt-view"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.25 }}
            >
              <Receipt
                registration={latestRegistration}
                problemStatements={problemStatements}
                onReset={handleResetForm}
                onUpdateRegistration={(updated) => {
                  setLatestRegistration(updated);
                  setHasExistingRegistration(updated);
                }}
              />
            </motion.div>
          )}

          {/* 7. ADMIN DASHBOARD & LOGIN ROUTE */}
          {view === "admin" && (
            <motion.div
              key="admin-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <AdminPanel
                problemStatements={problemStatements}
                onBackToPortal={() => navigateTo("home")}
                onRefreshStatements={fetchAllInitialData}
              />
            </motion.div>
          )}

          {/* 8. CUSTOM DYNAMIC PAGE RENDERER */}
          {currentCustomPage && (
            <motion.div
              key={`custom-page-${currentCustomPage.slug}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="max-w-4xl mx-auto px-4 py-8"
            >
              <div className={`rounded-3xl border p-6 md:p-10 shadow-sm space-y-6 ${isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200"}`}>
                <h1 className={`text-2xl sm:text-3xl font-black font-display border-b pb-4 ${isDark ? "text-white border-slate-800" : "text-slate-800 border-slate-100"}`}>
                  {currentCustomPage.title}
                </h1>
                <div className={`prose max-w-none ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                  {renderSimpleMarkdown(currentCustomPage.content)}
                </div>
              </div>
            </motion.div>
          )}

          {/* 9. FAQ VIEW */}
          {view === "faq" && (
            <motion.div
              key="faq-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="max-w-4xl mx-auto px-4 py-8 space-y-6"
            >
              <div className={`rounded-3xl border p-6 md:p-10 shadow-sm space-y-6 ${
                isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"
              }`}>
                <div className="space-y-2 border-b pb-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 px-3 py-1 rounded-full border border-indigo-100 dark:border-indigo-900">
                    Frequently Asked Questions
                  </span>
                  <h1 className="text-2xl sm:text-3xl font-black font-display">
                    SIH 2026 Help & Support
                  </h1>
                </div>

                <div className="space-y-4 text-xs sm:text-sm">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-150 dark:border-slate-700/60 space-y-1">
                    <h3 className="font-bold text-indigo-600 dark:text-indigo-400">
                      Q1: How many members are required in a team?
                    </h3>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                      Each team must consist of 6 student members (1 Team Lead + 5 Team Members) and 1 designated Faculty Mentor. Smart India Hackathon guidelines mandate at least one female member in every team.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-150 dark:border-slate-700/60 space-y-1">
                    <h3 className="font-bold text-indigo-600 dark:text-indigo-400">
                      Q2: Can team members be from different departments?
                    </h3>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                      Yes, interdisciplinary teams (e.g. CSE + ECE + MECH) are welcomed and encouraged for multidisciplinary problem statements.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-150 dark:border-slate-700/60 space-y-1">
                    <h3 className="font-bold text-indigo-600 dark:text-indigo-400">
                      Q3: How are final teams selected for SIH 2026?
                    </h3>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                      All registered teams submit their Idea PPT deck. Department SPOCs and Evaluators grade each submission. The Institutional SPOC / Super Admin finalizes the nominated teams, which appear under the "Selected Teams" tab.
                    </p>
                  </div>
                </div>

                <div className="pt-4 flex justify-between items-center border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => navigateTo("home")}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 cursor-pointer"
                  >
                    Back to Home
                  </button>
                  <button
                    onClick={() => navigateTo("register")}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer"
                  >
                    Register Team Now
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* 10. CREDITS PAGE RENDERER */}
          {view === "credits" && (
            <motion.div
              key="credits-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="max-w-4xl mx-auto px-4 py-8"
            >
              <div className={`rounded-3xl border p-6 md:p-10 shadow-sm space-y-6 ${isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200"}`}>
                <h1 className={`text-2xl sm:text-3xl font-black font-display border-b pb-4 ${isDark ? "text-white border-slate-800" : "text-slate-800 border-slate-100"}`}>
                  {publicSettings?.creditsTitle || "Department of CSE"}
                </h1>
                <div className={`prose max-w-none ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                  {publicSettings?.creditsContent && (publicSettings.creditsContent.includes("<") || publicSettings.creditsContent.includes("</")) ? (
                    <div dangerouslySetInnerHTML={{ __html: publicSettings.creditsContent }} className="space-y-4" />
                  ) : (
                    renderSimpleMarkdown(publicSettings?.creditsContent || "### Department of Computer Science & Engineering\n\nSri Vasavi Engineering College has spearheaded this Internal Hackathon Portal to encourage real-world problem solving among students.\n\n**Mentorship Team:** Department Faculty\n**Student Contributors:** CSE Batch 2026")
                  )}
                </div>
                <div className="pt-4 flex justify-start">
                  <button
                    onClick={() => navigateTo("home")}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    Back to Home
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        </Suspense>
      </main>
    </div>
  );
}

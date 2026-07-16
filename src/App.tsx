import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Layers, ShieldCheck, HelpCircle, GraduationCap, LogOut, FileText, Menu, X, ChevronRight } from "lucide-react";
import { ProblemStatement, Registration, HomepageContent, CustomPage, MenuItem } from "./types";
import RegistrationForm from "./components/RegistrationForm";
import StudentAuth from "./components/StudentAuth";
import Receipt from "./components/Receipt";
import AdminPanel from "./components/AdminPanel";
import SvecLogo from "./components/SvecLogo";
import LandingPage from "./components/LandingPage";

export default function App() {
  const [view, setView] = useState<string>("home");
  const [problemStatements, setProblemStatements] = useState<ProblemStatement[]>([]);
  const [latestRegistration, setLatestRegistration] = useState<Registration | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasExistingRegistration, setHasExistingRegistration] = useState<Registration | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Dynamic layout states
  const [homepageData, setHomepageData] = useState<HomepageContent | null>(null);
  const [customPages, setCustomPages] = useState<CustomPage[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [publicSettings, setPublicSettings] = useState<{
    portalTheme?: "light" | "dark";
    logoUrl?: string;
    portalTitle?: string;
    portalCaption?: string;
  } | null>(null);

  const [student, setStudent] = useState<{ id: string; email: string } | null>(() => {
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
      const [psRes, homeRes, pagesRes, menuRes, settingsRes] = await Promise.all([
        fetch("/api/problem-statements"),
        fetch("/api/homepage"),
        fetch("/api/custom-pages"),
        fetch("/api/menu"),
        fetch("/api/settings/public")
      ]);

      if (psRes.ok) {
        setProblemStatements(await psRes.json());
      }

      if (homeRes.ok) {
        setHomepageData(await homeRes.json());
      }

      if (pagesRes.ok) {
        setCustomPages(await pagesRes.json());
      }

      if (menuRes.ok) {
        setMenuItems(await menuRes.json());
      }

      if (settingsRes.ok) {
        setPublicSettings(await settingsRes.json());
      }
    } catch (err) {
      console.error("Failed to load initial workspace data", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyRegistration = async (email: string) => {
    try {
      const headers: Record<string, string> = {};
      const savedStudent = localStorage.getItem("svec_sih_student");
      let token = student?.token;
      if (!token && savedStudent) {
        try {
          token = JSON.parse(savedStudent).token;
        } catch (_) {}
      }
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch(`/api/registrations/my?email=${encodeURIComponent(email)}`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.found && data.registration) {
          setHasExistingRegistration(data.registration);
          setLatestRegistration(data.registration);
          setView("receipt");
        } else {
          setHasExistingRegistration(null);
        }
      }
    } catch (err) {
      console.error("Failed to fetch my registration on mount/auth", err);
    }
  };

  useEffect(() => {
    fetchAllInitialData();
  }, []);

  useEffect(() => {
    if (student) {
      fetchMyRegistration(student.email);
    } else {
      setHasExistingRegistration(null);
      setLatestRegistration(null);
    }
  }, [student]);

  const handleRegistrationSuccess = (reg: Registration) => {
    setLatestRegistration(reg);
    setHasExistingRegistration(reg);
    setView("receipt");
  };

  const handleResetForm = () => {
    setLatestRegistration(null);
    setView("register");
  };

  // Safe fallback list of menu items if fetch hasn't completed or returned empty
  const getRenderMenuItems = (): MenuItem[] => {
    if (student) {
      if (hasExistingRegistration) {
        return [
          { id: "registration-tab", label: "My Registration", type: "system", target: "receipt", order: 1 }
        ];
      } else {
        return [
          { id: "registration-tab", label: "My Registration", type: "system", target: "register", order: 1 }
        ];
      }
    }

    const hasAdminToken = !!sessionStorage.getItem("svec_sih_admin_token");
    if (view === "admin" || hasAdminToken) {
      return [
        { id: "admin-tab-header", label: "Admin Panel", type: "system", target: "admin", order: 1 }
      ];
    }

    if (menuItems && menuItems.length > 0) {
      return menuItems.sort((a, b) => a.order - b.order);
    }
    return [
      { id: "1", label: "Home", type: "system", target: "home", order: 1 },
      { id: "2", label: "Register", type: "system", target: "register", order: 2 },
      { id: "3", label: "Admin login", type: "system", target: "admin", order: 3 }
    ];
  };

  // Parse Markdown formatting for custom pages
  const renderSimpleMarkdown = (text: string) => {
    if (!text) return null;
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

  // Helper to change view and close drawers
  const navigateTo = (target: string) => {
    if (student) {
      // Allow only register or receipt view for logged in students
      if (target === "receipt" || target === "register") {
        setView(target);
      } else {
        const allowedTarget = hasExistingRegistration ? "receipt" : "register";
        setView(allowedTarget);
      }
    } else if (view === "admin" || sessionStorage.getItem("svec_sih_admin_token")) {
      setView("admin");
    } else {
      setView(target);
    }
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

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

  const isDark = publicSettings?.portalTheme === "dark" && view !== "admin";

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

          {/* Desktop Navigation Links */}
          <nav className={`hidden lg:flex items-center gap-1.5 p-1 rounded-xl transition-colors duration-300 ${isDark ? "bg-slate-800/80 border border-slate-700/50" : "bg-slate-100/70 border border-slate-200/40"}`}>
            {getRenderMenuItems().map((item) => {
              // Map display labels nicely
              let isActive = view === item.target;
              if (item.target === "register" && view === "receipt") {
                isActive = true;
              }

              return (
                <button
                  key={item.id}
                  onClick={() => navigateTo(item.target)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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

          {/* Right Controls Area (Student state, Mobile toggler) */}
          <div className="flex items-center gap-2">
            {student && (
              <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors duration-300 ${
                isDark 
                  ? "bg-slate-800/60 border border-slate-700 text-slate-300" 
                  : "bg-slate-50 border border-slate-200/80 text-slate-600"
              }`}>
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                <span>Student: <span className={`font-mono ${isDark ? "text-indigo-300" : "text-slate-800"}`}>{student.email}</span></span>
              </div>
            )}
            {student && hasExistingRegistration && view !== "receipt" && (
              <button
                onClick={() => navigateTo("receipt")}
                className={`text-xs font-bold flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all cursor-pointer border ${
                  isDark
                    ? "text-indigo-400 hover:text-indigo-350 hover:bg-indigo-950/40 border-indigo-900/60"
                    : "text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50/50 border-indigo-100 hover:border-indigo-200"
                }`}
                id="header-view-registration-btn"
              >
                <FileText className="w-4 h-4 text-indigo-600" />
                <span className="hidden sm:inline">My Registration</span>
              </button>
            )}
            {student && (
              <button
                onClick={() => {
                  localStorage.removeItem("svec_sih_student");
                  setStudent(null);
                  setView("home");
                }}
                className={`text-xs font-bold flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all cursor-pointer border ${
                  isDark
                    ? "text-slate-400 hover:text-red-400 hover:bg-red-950/20 border-transparent hover:border-red-950"
                    : "text-slate-600 hover:text-red-600 hover:bg-red-50/50 border-transparent hover:border-red-100"
                }`}
                id="header-logout-btn"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            )}

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
            <div className="p-4 space-y-2">
              <span className="text-[9px] font-black tracking-widest text-slate-400 block uppercase mb-1">Navigation links</span>
              {getRenderMenuItems().map((item) => (
                <button
                  key={item.id}
                  onClick={() => navigateTo(item.target)}
                  className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold flex items-center justify-between cursor-pointer transition-colors ${
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
                <div className={`pt-3 border-t ${isDark ? "border-slate-800" : "border-slate-100"}`}>
                  <div className={`px-4 py-2 rounded-xl text-[10px] font-semibold truncate ${isDark ? "bg-slate-800 text-slate-400" : "bg-slate-50 text-slate-500"}`}>
                    Vetted: <span className="font-mono text-slate-300">{student.email}</span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Body */}
      <main className="flex-1 pb-16">
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
              />
            </motion.div>
          )}

          {/* 2. REGISTRATION FORM (STUDENTS) */}
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
                <StudentAuth 
                  isDark={isDark}
                  onAuthSuccess={(s) => {
                    localStorage.setItem("svec_sih_student", JSON.stringify(s));
                    setStudent(s);
                  }} 
                />
              )}
            </motion.div>
          )}

          {/* 3. RECEIPT SCREEN */}
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

          {/* 4. ADMIN DASHBOARD */}
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
                onBackToPortal={() => setView("home")}
                onRefreshStatements={fetchAllInitialData}
              />
            </motion.div>
          )}

          {/* 5. CUSTOM MARKDOWN PAGE RENDERER */}
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
        </AnimatePresence>
      </main>
    </div>
  );
}

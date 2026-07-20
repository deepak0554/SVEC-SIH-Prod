import React, { useState, useEffect } from "react";
import { HomepageContent, CustomPage, LiveUpdate, PreviousPhoto } from "../types";
import { Calendar, Phone, Mail, Award, Users, Shield, ArrowRight, Image as ImageIcon, Heart, Bell, Megaphone, Info, ChevronLeft, ChevronRight, X, Folder } from "lucide-react";

interface LandingPageProps {
  homepageData: HomepageContent;
  onNavigate: (view: "form" | "receipt" | "admin" | string) => void;
  customPages: CustomPage[];
  isDark?: boolean;
  publicSettings?: {
    creditsTitle?: string;
    creditsContent?: string;
    creditsEnabled?: boolean;
  } | null;
  updates?: LiveUpdate[];
}

export default function LandingPage({ homepageData, onNavigate, customPages, isDark = false, publicSettings, updates = [] }: LandingPageProps) {
  const { sihDetails, sponsors, patrons = [], studentSpocs, collegeSpocs, previousPhotos = [] } = homepageData;

  // Selected gallery group/album on homepage
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  const [galleryPage, setGalleryPage] = useState(1);
  const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null);
  const IMAGES_PER_PAGE = 6;

  // Group photos by groupTitle dynamically
  const groupedPhotos = React.useMemo(() => {
    const groups: Record<string, typeof previousPhotos> = {};
    previousPhotos.forEach((photo) => {
      const gTitle = (photo.groupTitle || "General Gallery").trim();
      if (!groups[gTitle]) {
        groups[gTitle] = [];
      }
      groups[gTitle].push(photo);
    });
    return groups;
  }, [previousPhotos]);

  const activePhotos = selectedGroup ? (groupedPhotos[selectedGroup] || []) : [];

  const totalGalleryPages = activePhotos ? Math.ceil(activePhotos.length / IMAGES_PER_PAGE) : 0;
  const currentPage = Math.min(galleryPage, Math.max(1, totalGalleryPages));
  
  const paginatedPhotos = activePhotos 
    ? activePhotos.slice((currentPage - 1) * IMAGES_PER_PAGE, currentPage * IMAGES_PER_PAGE)
    : [];

  const handlePrevPhoto = () => {
    if (activePhotoIndex !== null && activePhotos && activePhotos.length > 0) {
      setActivePhotoIndex((activePhotoIndex - 1 + activePhotos.length) % activePhotos.length);
    }
  };

  const handleNextPhoto = () => {
    if (activePhotoIndex !== null && activePhotos && activePhotos.length > 0) {
      setActivePhotoIndex((activePhotoIndex + 1) % activePhotos.length);
    }
  };

  useEffect(() => {
    if (activePhotoIndex === null) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActivePhotoIndex(null);
      } else if (e.key === "ArrowLeft") {
        handlePrevPhoto();
      } else if (e.key === "ArrowRight") {
        handleNextPhoto();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activePhotoIndex, activePhotos]);

  // Simple and robust parser for custom page content / markdown
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

  // Modern UI avatar helper based on initials
  const getInitialsAvatar = (name: string, bgClass: string = "bg-indigo-100 text-indigo-700") => {
    const parts = name.split(" ");
    const initials = parts.map((p) => p[0]).join("").substring(0, 2).toUpperCase();
    return (
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-base shadow-xs ${bgClass}`}>
        {initials}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-12">
      {/* Hero Section */}
      <section 
        className="relative bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 rounded-3xl overflow-hidden text-white shadow-xl px-6 py-12 md:p-16 flex flex-col md:flex-row items-center gap-8 md:gap-12"
        id="landing-hero"
      >
        {/* Decorative Grid Background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />

        <div className="flex-1 space-y-6 relative z-10 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 border border-indigo-400/30 rounded-full text-[11px] font-bold uppercase tracking-wider text-indigo-300">
            <Award className="w-3.5 h-3.5 text-indigo-300" />
            <span>Sri Vasavi Engineering College</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black font-display tracking-tight leading-tight">
            {sihDetails.title}
          </h1>

          {sihDetails.slogan && (
            <p className="text-emerald-400 font-semibold text-sm sm:text-base tracking-wide uppercase">
              {sihDetails.slogan}
            </p>
          )}

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl">
            {sihDetails.description}
          </p>

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs sm:text-sm text-slate-300">
            {sihDetails.dates && (
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2.5 rounded-2xl">
                <Calendar className="w-4 h-4 text-emerald-400" />
                <span>{sihDetails.dates}</span>
              </div>
            )}
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center md:justify-start gap-4">
            <button
              onClick={() => onNavigate("register")}
              className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 text-slate-950 px-6 py-3.5 rounded-2xl font-bold text-sm tracking-tight transition-all hover:scale-[1.02] flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-500/10"
              id="landing-hero-register-btn"
            >
              <span>Register Your Team</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                const element = document.getElementById("college-student-spocs");
                if (element) {
                  element.scrollIntoView({ behavior: "smooth" });
                }
              }}
              className="w-full sm:w-auto bg-white/10 hover:bg-white/15 text-white px-6 py-3.5 rounded-2xl font-bold text-sm transition-all border border-white/10 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Contact SPOCs</span>
            </button>
          </div>
        </div>

        {/* Decorative Graphic */}
        <div className="hidden lg:flex flex-col items-center justify-center w-72 relative">
          <div className="w-64 h-64 rounded-full bg-gradient-to-tr from-indigo-500 to-emerald-400 opacity-20 blur-2xl absolute animate-pulse" />
          <div className="border border-white/15 bg-white/5 backdrop-blur-md p-6 rounded-3xl relative z-10 w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-500/30 rounded-xl flex items-center justify-center text-indigo-300 font-bold">SIH</div>
              <div>
                <h4 className="text-xs font-bold text-white">Internal Hackathon</h4>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">2026 Edition</p>
              </div>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-white/5">
                <span className="text-slate-400">Team Size:</span>
                <span className="text-emerald-400 font-semibold">6 Students</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-white/5">
                <span className="text-slate-400">Female Rule:</span>
                <span className="text-emerald-400 font-semibold">Min. 1 Mandatory</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400">Platform:</span>
                <span className="text-indigo-300 font-semibold">Vetted Selection</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Live Updates Scrolling Section */}
      {updates && updates.length > 0 && (
        <section className={`rounded-3xl border p-6 md:p-8 shadow-sm ${isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"}`}>
          <div className={`flex items-center justify-between border-b pb-4 mb-4 gap-4 flex-wrap ${isDark ? "border-slate-850" : "border-slate-100"}`}>
            <div className="flex items-center gap-2.5">
              <Megaphone className={`w-5 h-5 ${isDark ? "text-indigo-400" : "text-indigo-600"}`} />
              <h2 className="text-lg font-bold tracking-tight">Latest Announcements</h2>
            </div>
            <span className={`text-[10px] uppercase font-bold tracking-wider ${isDark ? "text-slate-500" : "text-slate-400"}`}>
              Live Feed
            </span>
          </div>

          {/* Clean, simple vertical scrolling container with high visibility styling */}
          <div className={`relative h-44 overflow-hidden rounded-xl border p-2 ${isDark ? "bg-slate-950/50 border-slate-800" : "bg-slate-50/70 border-slate-200/70"}`}>
            <div className="animate-scroll-up space-y-2.5">
              {[...updates, ...updates, ...updates, ...updates].map((update, idx) => {
                const isImp = update.isImportant;
                const dateObj = new Date(update.createdAt);
                const formattedDate = isNaN(dateObj.getTime()) ? "" : dateObj.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit"
                });

                return (
                  <div 
                    key={`${update.id}-${idx}`}
                    className={`p-3.5 rounded-lg flex items-start gap-3 border shadow-xs ${
                      isDark 
                        ? isImp 
                          ? "bg-slate-900 border-red-900/60" 
                          : "bg-slate-900 border-slate-800/80"
                        : isImp 
                          ? "bg-red-50/40 border-red-200/80" 
                          : "bg-white border-slate-200/60"
                    }`}
                  >
                    {isImp ? (
                      <span className="mt-1.5 shrink-0 h-2.5 w-2.5 rounded-full bg-red-600 animate-pulse" />
                    ) : (
                      <span className={`mt-1.5 shrink-0 h-2 w-2 rounded-full ${isDark ? "bg-indigo-400" : "bg-indigo-600"}`} />
                    )}
                    <div className="flex-1 min-w-0 space-y-1 text-left">
                      <div className="flex items-center gap-2 flex-wrap">
                        {isImp && (
                          <span className={`text-[9px] font-extrabold uppercase tracking-wider ${isDark ? "text-red-400" : "text-red-600"}`}>
                            Urgent Notice
                          </span>
                        )}
                        {formattedDate && (
                          <span className={`text-[10px] font-medium font-mono ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                            {formattedDate}
                          </span>
                        )}
                      </div>
                      <p className={`text-sm font-semibold leading-relaxed break-words ${isDark ? "text-slate-100" : "text-slate-800"}`}>
                        {update.text}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Dynamic/Custom Pages Section in Landing (If published custom pages exist) */}
      {customPages.filter(p => p.published && p.slug === "guidelines").map((page) => (
        <section key={page.id} className={`rounded-3xl border p-6 md:p-8 shadow-xs space-y-4 ${isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200/80"}`}>
          <div className={`flex items-center gap-2.5 pb-2 border-b ${isDark ? "border-slate-800" : "border-slate-100"}`}>
            <div className={`p-2 rounded-xl ${isDark ? "bg-slate-800 text-emerald-400" : "bg-emerald-50 text-emerald-600"}`}>
              <Shield className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold font-display">
              {page.title}
            </h2>
          </div>
          <div className={`prose max-w-none ${isDark ? "text-slate-300" : "text-slate-600"}`}>
            {renderSimpleMarkdown(page.content)}
          </div>
        </section>
      ))}

      {/* College Patrons */}
      {patrons && patrons.length > 0 && (
        <section className="space-y-8" id="landing-patrons">
          <div className="text-center space-y-1">
            <h2 className={`text-2xl sm:text-3xl font-black font-display tracking-tight ${isDark ? "text-white" : "text-slate-800"}`}>
              College Patrons & Management
            </h2>
            <p className={`text-sm max-w-xl mx-auto ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Under the visionary leadership and guidance of our college management.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {patrons.map((patron) => (
              <div
                key={patron.id}
                className={`rounded-3xl border p-6 flex flex-col items-center text-center gap-4 shadow-xs transition-all ${isDark ? "bg-slate-900 border-slate-800 hover:border-indigo-500" : "bg-white border-slate-200 hover:border-indigo-300 hover:shadow-sm"}`}
              >
                <div className={`w-24 h-24 rounded-full overflow-hidden border shadow-xs flex items-center justify-center ${isDark ? "bg-slate-850 border-slate-700" : "bg-slate-50 border-slate-100"}`}>
                  {patron.imageUrl ? (
                    <img
                      src={patron.imageUrl}
                      alt={patron.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center font-bold text-lg ${isDark ? "bg-indigo-950/50 text-indigo-300" : "bg-indigo-50 text-indigo-700"}`}>
                      {patron.name.split(" ").filter(Boolean).map((p) => p[0]).join("").substring(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <h3 className={`font-extrabold text-sm sm:text-base leading-tight ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                    {patron.name}
                  </h3>
                  <p className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider inline-block ${isDark ? "text-indigo-300 bg-indigo-950/45" : "text-indigo-600 bg-indigo-50/70"}`}>
                    {patron.position}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* SPOC Details Section */}
      <section className="grid md:grid-cols-2 gap-8" id="college-student-spocs">
        {/* College SPOCs */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-500" />
            <h2 className={`text-xl font-bold font-display ${isDark ? "text-white" : "text-slate-800"}`}>College SPOC / Mentor Team</h2>
          </div>
          <div className="space-y-4">
            {collegeSpocs.map((spoc) => (
              <div
                key={spoc.id}
                className={`rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 transition-all shadow-xs border ${isDark ? "bg-slate-900 border-slate-800 hover:border-indigo-550" : "bg-white border-slate-200 hover:border-indigo-100"}`}
              >
                {spoc.imageUrl ? (
                  <img
                    src={spoc.imageUrl}
                    alt={spoc.name}
                    className={`w-14 h-14 rounded-2xl object-cover shadow-xs border ${isDark ? "border-slate-800" : "border-slate-100"}`}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  getInitialsAvatar(spoc.name, isDark ? "bg-indigo-950 text-indigo-300" : "bg-indigo-50 text-indigo-600")
                )}
                <div className="flex-1 space-y-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <h3 className={`font-bold text-sm sm:text-base leading-tight ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                      {spoc.name}
                    </h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${isDark ? "bg-indigo-950/80 text-indigo-300" : "bg-indigo-50 text-indigo-600"}`}>
                      {spoc.role}
                    </span>
                  </div>
                  <p className={`text-xs font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>{spoc.department}</p>
                  <div className={`flex flex-wrap gap-x-4 gap-y-1.5 pt-1 text-xs ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                    {spoc.email && (
                      <a
                        href={`mailto:${spoc.email}`}
                        className="flex items-center gap-1 hover:text-indigo-400 transition-colors"
                      >
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-semibold">{spoc.email}</span>
                      </a>
                    )}
                    {spoc.phone && (
                      <a
                        href={`tel:${spoc.phone}`}
                        className="flex items-center gap-1 hover:text-indigo-400 transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-mono">{spoc.phone}</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Student SPOCs */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-500" />
            <h2 className={`text-xl font-bold font-display ${isDark ? "text-white" : "text-slate-800"}`}>Student SPOC Coordination</h2>
          </div>
          <div className="space-y-4">
            {studentSpocs.map((spoc) => (
              <div
                key={spoc.id}
                className={`rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 transition-all shadow-xs border ${isDark ? "bg-slate-900 border-slate-800 hover:border-emerald-550" : "bg-white border-slate-200 hover:border-emerald-100"}`}
              >
                {spoc.imageUrl ? (
                  <img
                    src={spoc.imageUrl}
                    alt={spoc.name}
                    className={`w-14 h-14 rounded-2xl object-cover shadow-xs border ${isDark ? "border-slate-800" : "border-slate-100"}`}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  getInitialsAvatar(spoc.name, isDark ? "bg-emerald-950 text-emerald-300" : "bg-emerald-50 text-emerald-700")
                )}
                <div className="flex-1 space-y-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <h3 className={`font-bold text-sm sm:text-base leading-tight ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                      {spoc.name}
                    </h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${isDark ? "bg-emerald-950/80 text-emerald-300" : "bg-emerald-50 text-emerald-700"}`}>
                      {spoc.role}
                    </span>
                  </div>
                  <p className={`text-xs font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>{spoc.department}</p>
                  <div className={`flex flex-wrap gap-x-4 gap-y-1.5 pt-1 text-xs ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                    {spoc.email && (
                      <a
                        href={`mailto:${spoc.email}`}
                        className="flex items-center gap-1 hover:text-emerald-400 transition-colors"
                      >
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-semibold">{spoc.email}</span>
                      </a>
                    )}
                    {spoc.phone && (
                      <a
                        href={`tel:${spoc.phone}`}
                        className="flex items-center gap-1 hover:text-emerald-400 transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-mono">{spoc.phone}</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Previous SIH Photos Gallery */}
      {previousPhotos && previousPhotos.length > 0 && (
        <section className="space-y-6" id="landing-gallery">
          {selectedGroup === null ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-indigo-500" />
                  <h2 className={`text-xl font-bold font-display ${isDark ? "text-white" : "text-slate-800"}`}>Previous SIH Gallery</h2>
                </div>
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500">
                  Select an album below to explore memory archives
                </span>
              </div>

              {/* Album Cover Stacks Grid */}
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-8 animate-fade-in text-left">
                {(Object.entries(groupedPhotos) as [string, PreviousPhoto[]][]).map(([groupName, photos]) => {
                  const coverPhotos = photos.slice(0, 3);
                  return (
                    <div
                      key={groupName}
                      onClick={() => {
                        setSelectedGroup(groupName);
                        setGalleryPage(1);
                      }}
                      className={`group rounded-3xl border p-6 overflow-hidden transition-all duration-300 cursor-pointer hover:-translate-y-1.5 hover:shadow-xl flex flex-col justify-between ${
                        isDark 
                          ? "bg-slate-900 border-slate-800 hover:border-indigo-500 hover:shadow-indigo-950/25" 
                          : "bg-white border-slate-200 hover:border-indigo-300 hover:shadow-slate-100"
                      }`}
                    >
                      {/* Overlapping physical photo folder stacks */}
                      <div className="h-44 w-full flex items-center justify-center relative select-none">
                        {coverPhotos.length > 0 ? (
                          coverPhotos.map((photo, photoIndex) => {
                            // Generate stacked layered rotates
                            const rotationStyles = [
                              "-rotate-6 -translate-x-3.5 z-0 scale-95 opacity-80",
                              "rotate-3 translate-x-2 z-10 scale-98 opacity-90",
                              "rotate-0 z-20 scale-100"
                            ];
                            const rotation = rotationStyles[photoIndex % rotationStyles.length];
                            
                            return (
                              <div
                                key={photo.id}
                                className={`absolute w-36 h-36 rounded-2xl overflow-hidden border-2 shadow-md transition-all duration-500 group-hover:scale-105 ${rotation} ${
                                  isDark ? "border-slate-850 bg-slate-950" : "border-white bg-slate-100"
                                }`}
                              >
                                {photo.imageUrl ? (
                                  <img
                                    src={photo.imageUrl}
                                    alt={photo.title}
                                    className="w-full h-full object-cover"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-slate-400 bg-slate-100 dark:bg-slate-950">
                                    <ImageIcon className="w-7 h-7" />
                                  </div>
                                )}
                              </div>
                            );
                          })
                        ) : (
                          <div className="w-36 h-36 rounded-2xl border-2 border-dashed flex items-center justify-center text-slate-400">
                            <ImageIcon className="w-8 h-8" />
                          </div>
                        )}
                      </div>

                      <div className="pt-5 text-center space-y-2">
                        <h3 className={`font-extrabold text-sm leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors ${isDark ? "text-slate-200" : "text-slate-850"}`}>
                          {groupName}
                        </h3>
                        <span className={`inline-block text-[10px] font-extrabold px-3 py-0.5 rounded-full ${
                          isDark 
                            ? "bg-indigo-950/60 text-indigo-300 border border-indigo-900/60" 
                            : "bg-indigo-50 text-indigo-700 border border-indigo-100"
                        }`}>
                          {photos.length} Photo(s)
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/60 pb-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedGroup(null)}
                    className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                      isDark
                        ? "border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    ← Back to Albums
                  </button>
                  <span className="text-slate-300 dark:text-slate-700 font-light">|</span>
                  <div className="flex items-center gap-2">
                    <Folder className="w-4.5 h-4.5 text-indigo-500" />
                    <h2 className={`text-base font-extrabold font-display ${isDark ? "text-white" : "text-slate-850"}`}>
                      {selectedGroup}
                    </h2>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isDark ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600"}`}>
                      {activePhotos.length} memory item(s)
                    </span>
                  </div>
                </div>
                
                {totalGalleryPages > 1 && (
                  <span className="text-xs font-bold text-slate-400 dark:text-slate-500">
                    Showing {paginatedPhotos.length} of {activePhotos.length} images (Page {currentPage} of {totalGalleryPages})
                  </span>
                )}
              </div>

              {/* Interactive Image Grid */}
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 animate-fade-in text-left">
                {paginatedPhotos.map((photo, idx) => {
                  const originalIndex = (currentPage - 1) * IMAGES_PER_PAGE + idx;
                  return (
                    <div
                      key={photo.id}
                      onClick={() => setActivePhotoIndex(originalIndex)}
                      className={`rounded-2xl border overflow-hidden shadow-xs transition-all duration-300 group cursor-pointer hover:-translate-y-1 hover:shadow-md ${
                        isDark 
                          ? "bg-slate-900 border-slate-800 hover:border-indigo-500 hover:shadow-indigo-950/25" 
                          : "bg-white border-slate-200 hover:border-indigo-300 hover:shadow-slate-100"
                      }`}
                    >
                      <div className={`h-48 flex items-center justify-center relative overflow-hidden ${isDark ? "bg-slate-950" : "bg-slate-100"}`}>
                        {photo.imageUrl ? (
                          <>
                            <img
                              src={photo.imageUrl}
                              alt={photo.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              referrerPolicy="no-referrer"
                            />
                            {/* Hover Overlay Visual Indicator */}
                            <div className="absolute inset-0 bg-slate-950/20 group-hover:bg-slate-950/40 transition-colors duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                              <span className="px-3 py-1.5 bg-white/90 dark:bg-slate-900/90 text-slate-900 dark:text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 select-none transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                                <ImageIcon className="w-3.5 h-3.5" /> View Image
                              </span>
                            </div>
                          </>
                        ) : (
                          <div className="flex flex-col items-center justify-center text-slate-400 gap-2 p-4 text-center">
                            <ImageIcon className="w-8 h-8 text-slate-500" />
                            <span className="text-xs font-semibold uppercase tracking-wider">{photo.title}</span>
                          </div>
                        )}
                      </div>
                      <div className="p-4 space-y-1">
                        <h3 className={`font-bold text-sm leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-450 transition-colors ${isDark ? "text-slate-200" : "text-slate-850"}`}>{photo.title}</h3>
                        {photo.description && (
                          <p className={`text-xs leading-relaxed line-clamp-2 ${isDark ? "text-slate-400" : "text-slate-500"}`}>{photo.description}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination Controls */}
              {totalGalleryPages > 1 && (
                <div className="flex items-center justify-center gap-3 pt-4">
                  <button
                    onClick={() => setGalleryPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                      currentPage === 1
                        ? "opacity-30 cursor-not-allowed border-slate-200/50 text-slate-400"
                        : isDark
                          ? "border-slate-800 hover:bg-slate-800 text-slate-300 bg-slate-900"
                          : "border-slate-200 hover:bg-slate-50 text-slate-700 bg-white"
                    }`}
                    title="Previous Page"
                  >
                    <ChevronLeft className="w-4.5 h-4.5" />
                  </button>
                  
                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: totalGalleryPages }).map((_, pageIdx) => {
                      const pageNum = pageIdx + 1;
                      const isActive = currentPage === pageNum;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setGalleryPage(pageNum)}
                          className={`w-9.5 h-9.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                            isActive
                              ? "bg-indigo-650 text-white shadow-xs"
                              : isDark
                                ? "text-slate-400 bg-slate-900/55 border border-slate-800/80 hover:bg-slate-800 hover:text-white"
                                : "text-slate-600 bg-white border border-slate-200/80 hover:bg-slate-50 hover:text-slate-900"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setGalleryPage(prev => Math.min(totalGalleryPages, prev + 1))}
                    disabled={currentPage === totalGalleryPages}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                      currentPage === totalGalleryPages
                        ? "opacity-30 cursor-not-allowed border-slate-200/50 text-slate-400"
                        : isDark
                          ? "border-slate-800 hover:bg-slate-800 text-slate-300 bg-slate-900"
                          : "border-slate-200 hover:bg-slate-50 text-slate-700 bg-white"
                    }`}
                    title="Next Page"
                  >
                    <ChevronRight className="w-4.5 h-4.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* Lightbox Modal Popup */}
      {activePhotoIndex !== null && activePhotos[activePhotoIndex] && (
        <div 
          className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-[1000] flex flex-col justify-between p-4 md:p-8 animate-fade-in select-none"
          onClick={() => setActivePhotoIndex(null)}
        >
          {/* Top Bar inside popup */}
          <div className="flex items-center justify-between w-full max-w-5xl mx-auto text-white pb-3 border-b border-white/10">
            <div className="text-left">
              <span className="text-[10px] font-bold font-mono tracking-wider text-slate-400 uppercase">
                SIH Gallery • {selectedGroup || "Gallery"} • Image {activePhotoIndex + 1} of {activePhotos.length}
              </span>
              <h3 className="text-lg font-bold tracking-tight text-white mt-0.5">
                {activePhotos[activePhotoIndex].title}
              </h3>
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); setActivePhotoIndex(null); }}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all duration-200 cursor-pointer"
              title="Close Gallery (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Center Image Container with Navigation */}
          <div className="flex-1 flex items-center justify-center relative max-w-5xl w-full mx-auto my-4 group/modal">
            {/* Previous Image Button */}
            <button
              onClick={(e) => { e.stopPropagation(); handlePrevPhoto(); }}
              className="absolute left-2 md:left-4 z-10 p-3.5 rounded-full bg-black/60 hover:bg-black/80 border border-white/10 text-white transition-all duration-200 cursor-pointer opacity-100 md:opacity-0 group-hover/modal:opacity-100"
              title="Previous Image"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            {/* Main Lightbox Image */}
            <div 
              className="relative max-h-[68vh] max-w-full flex items-center justify-center rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-slate-900"
              onClick={(e) => e.stopPropagation()}
            >
              {activePhotos[activePhotoIndex].imageUrl ? (
                <img
                  src={activePhotos[activePhotoIndex].imageUrl}
                  alt={activePhotos[activePhotoIndex].title}
                  className="max-h-[68vh] object-contain select-none rounded-xl"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="h-64 w-96 flex flex-col items-center justify-center text-slate-400 gap-3 p-8 text-center bg-slate-900">
                  <ImageIcon className="w-12 h-12 text-slate-500" />
                  <span className="text-sm font-semibold uppercase tracking-wider">{activePhotos[activePhotoIndex].title}</span>
                </div>
              )}
            </div>

            {/* Next Image Button */}
            <button
              onClick={(e) => { e.stopPropagation(); handleNextPhoto(); }}
              className="absolute right-2 md:right-4 z-10 p-3.5 rounded-full bg-black/60 hover:bg-black/80 border border-white/10 text-white transition-all duration-200 cursor-pointer opacity-100 md:opacity-0 group-hover/modal:opacity-100"
              title="Next Image"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          {/* Bottom Caption & Pagination Dots */}
          <div className="w-full max-w-3xl mx-auto text-center text-white pt-2">
            {activePhotos[activePhotoIndex].description ? (
              <p className="text-sm md:text-base leading-relaxed text-slate-300 max-w-2xl mx-auto font-medium">
                {activePhotos[activePhotoIndex].description}
              </p>
            ) : (
              <p className="text-xs text-slate-500 italic">No description provided for this photo.</p>
            )}
            
            {/* Dots */}
            <div className="flex justify-center items-center gap-1.5 mt-4 flex-wrap">
              {activePhotos.map((_, dotIdx) => (
                <button
                  key={dotIdx}
                  onClick={(e) => { e.stopPropagation(); setActivePhotoIndex(dotIdx); }}
                  className={`w-2 h-2 rounded-full transition-all cursor-pointer ${
                    activePhotoIndex === dotIdx 
                      ? "bg-indigo-500 w-5" 
                      : "bg-white/20 hover:bg-white/45"
                  }`}
                  title={`Go to image ${dotIdx + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className={`border-t pt-8 text-center text-xs font-semibold space-y-2 ${isDark ? "border-slate-800 text-slate-500" : "border-slate-200 text-slate-400"}`}>
        <div className={`flex items-center justify-center gap-1.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
          <span>Sri Vasavi Engineering College (SVEC) Hackathon Center</span>
          <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" />
        </div>
        <p>© 2026 SVEC. All Rights Reserved. Prepared for Smart India Hackathon internal selections.</p>
        {publicSettings?.creditsEnabled !== false && (
          <div className="pt-2">
            <button
              onClick={() => onNavigate("credits")}
              className="text-indigo-650 hover:text-indigo-750 dark:text-indigo-400 dark:hover:text-indigo-300 underline font-bold transition-colors cursor-pointer"
            >
              {publicSettings?.creditsTitle || "Department of CSE"}
            </button>
          </div>
        )}
      </footer>
    </div>
  );
}

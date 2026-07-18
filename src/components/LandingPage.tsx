import React from "react";
import { HomepageContent, CustomPage } from "../types";
import { Calendar, Phone, Mail, Award, Users, Shield, ArrowRight, Image as ImageIcon, Heart } from "lucide-react";

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
}

export default function LandingPage({ homepageData, onNavigate, customPages, isDark = false, publicSettings }: LandingPageProps) {
  const { sihDetails, sponsors, patrons = [], studentSpocs, collegeSpocs, previousPhotos } = homepageData;

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
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-indigo-500" />
            <h2 className={`text-xl font-bold font-display ${isDark ? "text-white" : "text-slate-800"}`}>Previous SIH Gallery</h2>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
            {previousPhotos.map((photo) => (
              <div
                key={photo.id}
                className={`rounded-2xl border overflow-hidden shadow-xs transition-all group ${isDark ? "bg-slate-900 border-slate-800 hover:border-indigo-550" : "bg-white border-slate-200 hover:border-indigo-200"}`}
              >
                <div className={`h-48 flex items-center justify-center relative overflow-hidden ${isDark ? "bg-slate-950" : "bg-slate-100"}`}>
                  {photo.imageUrl ? (
                    <img
                      src={photo.imageUrl}
                      alt={photo.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400 gap-2 p-4 text-center">
                      <ImageIcon className="w-8 h-8 text-slate-500" />
                      <span className="text-xs font-semibold uppercase tracking-wider">{photo.title}</span>
                    </div>
                  )}
                </div>
                <div className="p-4 space-y-1">
                  <h3 className={`font-bold text-sm leading-tight ${isDark ? "text-slate-200" : "text-slate-800"}`}>{photo.title}</h3>
                  {photo.description && (
                    <p className={`text-xs leading-relaxed ${isDark ? "text-slate-400" : "text-slate-500"}`}>{photo.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
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

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Printer, X, FileText, Info, HelpCircle, Download } from "lucide-react";
import { Registration } from "../types";
import SvecLogo from "./SvecLogo";

// Helper to temporarily intercept CSS rules containing "oklch" (which crashes html2canvas in Tailwind v4)
function makeOklchSafe() {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext("2d");

  function oklchToRgb(oklchColor: string): string {
    if (!ctx) return "rgb(0, 0, 0)";
    try {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = oklchColor;
      ctx.fillRect(0, 0, 1, 1);
      const imgData = ctx.getImageData(0, 0, 1, 1).data;
      return `rgba(${imgData[0]}, ${imgData[1]}, ${imgData[2]}, ${imgData[3] / 255})`;
    } catch (e) {
      return "rgb(0, 0, 0)";
    }
  }

  function replaceOklchInString(str: string): string {
    if (!str || typeof str !== "string") return str;
    if (!str.includes("oklch") && !str.includes("oklab")) return str;
    return str.replace(/(oklch|oklab)\([^)]+\)/g, (match) => oklchToRgb(match));
  }

  // 1. Patch getComputedStyle
  const originalGetComputedStyle = window.getComputedStyle;
  window.getComputedStyle = function(element, pseudoElement) {
    const style = originalGetComputedStyle(element, pseudoElement);
    return new Proxy(style, {
      get(target, prop) {
        const value = (target as any)[prop];
        if (typeof value === "function") {
          if (prop === "getPropertyValue") {
            return function(propertyName: string) {
              const val = target.getPropertyValue(propertyName);
              return replaceOklchInString(val);
            };
          }
          return value.bind(target);
        }
        if (typeof prop === "string" && typeof value === "string") {
          return replaceOklchInString(value);
        }
        return value;
      }
    });
  };

  // 2. Patch CSSStyleSheet cssRules and rules
  const cssRulesDescriptor = Object.getOwnPropertyDescriptor(CSSStyleSheet.prototype, "cssRules");
  const rulesDescriptor = Object.getOwnPropertyDescriptor(CSSStyleSheet.prototype, "rules");

  function proxyRuleList(rules: CSSRuleList): CSSRuleList {
    if (!rules) return rules;
    return new Proxy(rules, {
      get(target, prop) {
        if (prop === "length") {
          return target.length;
        }
        if (prop === "item") {
          return function(index: number) {
            const rule = target.item(index);
            return rule ? proxyRule(rule) : null;
          };
        }
        const index = Number(prop);
        if (!isNaN(index)) {
          const rule = target[index];
          return rule ? proxyRule(rule) : undefined;
        }
        const val = (target as any)[prop];
        return typeof val === "function" ? val.bind(target) : val;
      }
    }) as any;
  }

  function proxyRule(rule: CSSRule): CSSRule {
    if (!rule) return rule;
    return new Proxy(rule, {
      get(target, prop) {
        if (prop === "cssText") {
          try {
            return replaceOklchInString(target.cssText);
          } catch {
            return "";
          }
        }
        if (prop === "style" && "style" in target) {
          const style = (target as any).style;
          return new Proxy(style, {
            get(styleTarget, styleProp) {
              const val = (styleTarget as any)[styleProp];
              if (typeof val === "function") {
                if (styleProp === "getPropertyValue") {
                  return function(propertyName: string) {
                    const v = styleTarget.getPropertyValue(propertyName);
                    return replaceOklchInString(v);
                  };
                }
                return val.bind(styleTarget);
              }
              if (typeof styleProp === "string" && typeof val === "string") {
                return replaceOklchInString(val);
              }
              return val;
            }
          });
        }
        const val = (target as any)[prop];
        return typeof val === "function" ? val.bind(target) : val;
      }
    });
  }

  const patchGetter = (originalGetter: any) => {
    return function(this: CSSStyleSheet) {
      try {
        const rules = originalGetter.call(this);
        return proxyRuleList(rules);
      } catch (e) {
        return [];
      }
    };
  };

  if (cssRulesDescriptor && cssRulesDescriptor.get) {
    Object.defineProperty(CSSStyleSheet.prototype, "cssRules", {
      get: patchGetter(cssRulesDescriptor.get),
      configurable: true,
    });
  }
  if (rulesDescriptor && rulesDescriptor.get) {
    Object.defineProperty(CSSStyleSheet.prototype, "rules", {
      get: patchGetter(rulesDescriptor.get),
      configurable: true,
    });
  }

  return () => {
    window.getComputedStyle = originalGetComputedStyle;
    if (cssRulesDescriptor) {
      Object.defineProperty(CSSStyleSheet.prototype, "cssRules", cssRulesDescriptor);
    }
    if (rulesDescriptor) {
      Object.defineProperty(CSSStyleSheet.prototype, "rules", rulesDescriptor);
    }
  };
}

interface ConsentLetterModalProps {
  isOpen: boolean;
  onClose: () => void;
  registration: Registration;
  isReadOnly?: boolean;
  config?: {
    logoUrl?: string;
    portalTitle?: string;
    portalCaption?: string;
  };
}

interface RosterMember {
  role: string;
  name: string;
  gender: string;
  email: string;
  phone: string;
  stream: string;
  academicYear: string;
}

export default function ConsentLetterModal({
  isOpen,
  onClose,
  registration,
  isReadOnly = false,
  config,
}: ConsentLetterModalProps) {
  const [logoUrl, setLogoUrl] = useState(config?.logoUrl || "");

  useEffect(() => {
    if (config?.logoUrl) {
      setLogoUrl(config.logoUrl);
    }
  }, [config?.logoUrl]);

  useEffect(() => {
    if (!logoUrl) {
      const fetchLogo = async () => {
        try {
          const res = await fetch("/api/settings/public");
          if (res.ok) {
            const data = await res.json();
            if (data.logoUrl) {
              setLogoUrl(data.logoUrl);
            }
          }
        } catch (err) {
          console.error("Error fetching settings for logo:", err);
        }
      };
      fetchLogo();
    }
  }, [logoUrl]);

  const [aicteNo, setAicteNo] = useState("1-3634005111 (Sri Vasavi Engineering College)");
  const [principalName, setPrincipalName] = useState("Dr. Ch. Rambabu");
  const [collegeStamp, setCollegeStamp] = useState("The Principal\nSri Vasavi Engineering College (Autonomous)\nPedatadepalli, Tadepalligudem");
  
  const [letterDate, setLetterDate] = useState(() => {
    const today = new Date();
    const day = today.getDate();
    const year = today.getFullYear();
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const monthName = monthNames[today.getMonth()];
    return `${day}/${monthName}/${year}`;
  });

  const [roster, setRoster] = useState<RosterMember[]>([]);

  // Initialize roster from registration data
  useEffect(() => {
    if (!registration) return;

    const initialRoster: RosterMember[] = [];

    // Add Lead
    initialRoster.push({
      role: "Team Leader",
      name: registration.leadName || "",
      gender: registration.leadGender || "",
      email: registration.studentEmail || "",
      phone: registration.leadMobile || "",
      stream: registration.leadDepartment || "B.Tech",
      academicYear: registration.leadAcademicYear || "3rd Year",
    });

    // Add member 1 to 5 if populated
    if (registration.member1) {
      initialRoster.push({
        role: "Team Member",
        name: registration.member1,
        gender: registration.member1Gender || "",
        email: registration.member1Email || "",
        phone: registration.member1Phone || "",
        stream: registration.leadDepartment || "B.Tech",
        academicYear: registration.member1AcademicYear || "3rd Year",
      });
    }
    if (registration.member2) {
      initialRoster.push({
        role: "Team Member",
        name: registration.member2,
        gender: registration.member2Gender || "",
        email: registration.member2Email || "",
        phone: registration.member2Phone || "",
        stream: registration.leadDepartment || "B.Tech",
        academicYear: registration.member2AcademicYear || "3rd Year",
      });
    }
    if (registration.member3) {
      initialRoster.push({
        role: "Team Member",
        name: registration.member3,
        gender: registration.member3Gender || "",
        email: registration.member3Email || "",
        phone: registration.member3Phone || "",
        stream: registration.leadDepartment || "B.Tech",
        academicYear: registration.member3AcademicYear || "3rd Year",
      });
    }
    if (registration.member4) {
      initialRoster.push({
        role: "Team Member",
        name: registration.member4,
        gender: registration.member4Gender || "",
        email: registration.member4Email || "",
        phone: registration.member4Phone || "",
        stream: registration.leadDepartment || "B.Tech",
        academicYear: registration.member4AcademicYear || "3rd Year",
      });
    }
    if (registration.member5) {
      initialRoster.push({
        role: "Team Member",
        name: registration.member5,
        gender: registration.member5Gender || "",
        email: registration.member5Email || "",
        phone: registration.member5Phone || "",
        stream: registration.leadDepartment || "B.Tech",
        academicYear: registration.member5AcademicYear || "3rd Year",
      });
    }

    // Fill standard empty rows up to 6 members total if required by official format
    while (initialRoster.length < 6) {
      initialRoster.push({
        role: "Team Member",
        name: "",
        gender: "",
        email: "",
        phone: "",
        stream: "",
        academicYear: "",
      });
    }

    setRoster(initialRoster);
  }, [registration]);

  const handleUpdateRosterCell = (index: number, field: keyof RosterMember, value: string) => {
    setRoster(prev => prev.map((m, i) => i === index ? { ...m, [field]: value } : m));
  };

  const handleDownloadPDF = async () => {
    const element = document.getElementById("printable-consent-letter");
    if (!element) return;

    // Capture and reset scroll positions of all scrollable ancestor containers
    // to prevent html2canvas offset alignment/blank-space bugs
    const scrolledAncestors: Array<{ element: HTMLElement; scrollTop: number; scrollLeft: number }> = [];
    let parent = element.parentElement;
    while (parent) {
      if (parent.scrollHeight > parent.clientHeight || parent.scrollWidth > parent.clientWidth) {
        scrolledAncestors.push({
          element: parent,
          scrollTop: parent.scrollTop,
          scrollLeft: parent.scrollLeft,
        });
        parent.scrollTop = 0;
        parent.scrollLeft = 0;
      }
      parent = parent.parentElement;
    }

    // Load html2pdf from local path first, fallback to CDN if it fails
    if (!(window as any).html2pdf) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "/js/html2pdf.bundle.min.js";
        script.onload = () => resolve();
        script.onerror = () => {
          // Try CDN fallback
          const cdnScript = document.createElement("script");
          cdnScript.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
          cdnScript.onload = () => resolve();
          cdnScript.onerror = () => reject(new Error("Failed to load PDF library"));
          document.head.appendChild(cdnScript);
        };
        document.head.appendChild(script);
      });
    }

    element.classList.add("pdf-generation-active");

    const opt = {
      margin:       10, // Clean 10mm margins for proper spacing and fitting
      filename:     `Consent_Letter_${(registration.teamName || "Team").replace(/[^a-zA-Z0-9]/g, "_")}.pdf`,
      image:        { type: "jpeg", quality: 0.98 },
      html2canvas:  { 
        scale: 2.5, 
        useCORS: true, 
        logging: false,
        scrollX: 0,
        scrollY: 0
      },
      jsPDF:        { unit: "mm", format: "a4", orientation: "portrait" }
    };

    // Generate and save
    const restore = makeOklchSafe();
    try {
      await (window as any).html2pdf().set(opt).from(element).save();
    } finally {
      restore();
      element.classList.remove("pdf-generation-active");
      
      // Restore the scroll positions of all ancestors perfectly
      scrolledAncestors.forEach(({ element: el, scrollTop, scrollLeft }) => {
        el.scrollTop = scrollTop;
        el.scrollLeft = scrollLeft;
      });
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 text-slate-800">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs no-print"
        ></motion.div>

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 20 }}
          className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden relative z-10 no-print"
        >
          {/* Modal Header */}
          <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold font-display text-sm uppercase tracking-wider">College Consent Letter Generator</h3>
                <p className="text-[10px] text-slate-400">View and print official Smart India Hackathon nomination letter</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body (Two-column layout on Desktop) */}
          <div className="flex-1 overflow-y-auto flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
            {/* Left Column: Letter Customizer Forms */}
            {!isReadOnly && (
              <div className="w-full lg:w-1/3 p-6 bg-slate-50/50 space-y-5">
                <div>
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest block mb-1">Configuration</span>
                  <h4 className="text-sm font-extrabold text-slate-800 font-display">Consent Letter Customizer</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Adjust variables to auto-generate the printable document head and footer.</p>
                </div>

                <div className="space-y-4">
                  {/* Date */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Letter Date</label>
                    <input
                      type="text"
                      value={letterDate}
                      onChange={(e) => setLetterDate(e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 shadow-2xs font-medium"
                      placeholder="e.g. 17/July/2026"
                    />
                  </div>

                  {/* AICTE / UGC ID */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">AICTE / UGC Registration No.</label>
                    <input
                      type="text"
                      value={aicteNo}
                      onChange={(e) => setAicteNo(e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 shadow-2xs font-medium"
                      placeholder="AICTE/UGC Registration Number"
                    />
                  </div>

                  {/* Principal Name */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Principal's Name</label>
                    <input
                      type="text"
                      value={principalName}
                      onChange={(e) => setPrincipalName(e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 shadow-2xs font-medium"
                      placeholder="e.g. Dr. Ch. Rambabu"
                    />
                  </div>

                  {/* College Stamp text */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Stamp / Signature Footer</label>
                    <textarea
                      value={collegeStamp}
                      onChange={(e) => setCollegeStamp(e.target.value)}
                      rows={3}
                      className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 shadow-2xs font-medium resize-none"
                      placeholder="Stamp text..."
                    />
                  </div>
                </div>

                <div className="p-3.5 bg-indigo-50/50 border border-indigo-100 rounded-2xl flex gap-2.5 items-start text-xs text-indigo-800">
                  <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold">Pro-tip for printing:</p>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      You can edit any cell directly in the letter's roster table on the right. Just click and edit the fields to fix formatting or spelling issues instantly.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Right Column: Printable Document Layout */}
            <div className="flex-1 p-6 overflow-y-auto space-y-6">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-start gap-2.5 shadow-2xs">
                <Printer className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                <div>
                  <p className="font-bold text-emerald-900">Official Document Preview</p>
                  <p className="mt-0.5 text-emerald-700">This matches the ministry's standardized format. In your print options, choose <b>Portrait</b> and enable <b>Background graphics</b> for best results.</p>
                </div>
              </div>

               {/* Printable Area Wrapper with elegant letter box shadow */}
              <div className="border border-slate-200/80 rounded-3xl p-8 bg-white shadow-md max-w-3xl mx-auto">
                <div id="printable-consent-letter" className="font-serif text-slate-900 text-left space-y-4">
                  {/* Print Stylesheet Injection */}
                  <style dangerouslySetInnerHTML={{__html: `
                    @media print {
                      #printable-consent-letter {
                        font-family: Georgia, Cambria, "Times New Roman", Times, serif !important;
                        color: #000000 !important;
                        background: #ffffff !important;
                        width: 100% !important;
                        padding: 15mm 20mm 15mm 20mm !important;
                        margin: 0 !important;
                        box-shadow: none !important;
                        border: none !important;
                        font-size: 10pt !important;
                        line-height: 1.4 !important;
                        box-sizing: border-box !important;
                        page-break-inside: avoid !important;
                      }
                      table {
                        width: 100% !important;
                        border-collapse: collapse !important;
                        margin-top: 10px !important;
                        margin-bottom: 10px !important;
                        table-layout: fixed !important;
                      }
                      th, td {
                        border: 1px solid #475569 !important;
                        padding: 5px 6px !important;
                        font-size: 8.5pt !important;
                        font-family: Arial, Helvetica, sans-serif !important;
                        vertical-align: middle !important;
                        word-break: break-word !important;
                      }
                      th {
                        background-color: #f1f5f9 !important;
                        font-weight: bold !important;
                        color: #0f172a !important;
                        text-align: left !important;
                        text-transform: uppercase !important;
                      }
                      input, textarea, .print-no-border {
                        border: none !important;
                        background: transparent !important;
                        outline: none !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        box-shadow: none !important;
                        width: 100% !important;
                        height: auto !important;
                        font-size: inherit !important;
                        font-family: inherit !important;
                        color: #000000 !important;
                      }
                    }

                    /* Interactive PDF generation styles via html2canvas */
                    .pdf-generation-active #printable-consent-letter,
                    .pdf-generation-active {
                      font-family: Georgia, Cambria, "Times New Roman", Times, serif !important;
                      color: #000000 !important;
                      background: #ffffff !important;
                      width: 100% !important;
                      padding: 5mm 5mm 5mm 5mm !important;
                      margin: 0 !important;
                      box-shadow: none !important;
                      border: none !important;
                      font-size: 9.5pt !important;
                      line-height: 1.35 !important;
                      box-sizing: border-box !important;
                    }
                    .pdf-generation-active table {
                      width: 100% !important;
                      border-collapse: collapse !important;
                      margin-top: 8px !important;
                      margin-bottom: 8px !important;
                      table-layout: fixed !important;
                    }
                    .pdf-generation-active th, 
                    .pdf-generation-active td {
                      border: 1px solid #475569 !important;
                      padding: 4px 5px !important;
                      font-size: 8pt !important;
                      font-family: Arial, Helvetica, sans-serif !important;
                      vertical-align: middle !important;
                      word-break: break-word !important;
                    }
                    .pdf-generation-active th {
                      background-color: #f1f5f9 !important;
                      font-weight: bold !important;
                      color: #0f172a !important;
                      text-align: left !important;
                      text-transform: uppercase !important;
                    }
                    .pdf-generation-active input, 
                    .pdf-generation-active textarea, 
                    .pdf-generation-active .print-no-border {
                      border: none !important;
                      background: transparent !important;
                      outline: none !important;
                      padding: 0 !important;
                      margin: 0 !important;
                      box-shadow: none !important;
                      width: 100% !important;
                      height: auto !important;
                      font-size: inherit !important;
                      font-family: inherit !important;
                      color: #000000 !important;
                    }
                  `}} />

                  {/* College Letterhead (Balanced symmetrical header) */}
                  <div className="flex items-center justify-between pb-4 border-b-2 border-slate-900">
                    <div className="w-16 h-16 shrink-0 flex items-center justify-center">
                      {logoUrl ? (
                        <img src={logoUrl} width="64" height="64" className="max-w-full max-h-full object-contain" alt="College Logo" referrerPolicy="no-referrer" />
                      ) : (
                        <SvecLogo className="w-16 h-16" />
                      )}
                    </div>
                    <div className="flex-1 text-center font-sans px-4">
                      <h2 className="text-lg md:text-xl font-black text-blue-700 tracking-tight leading-none uppercase">
                        SRI VASAVI ENGINEERING COLLEGE <span className="text-indigo-600 font-bold lowercase text-xs">(Autonomous)</span>
                      </h2>
                      <p className="text-[9px] font-bold text-slate-600 mt-1">
                        (Sponsored by Sri Vasavi Educational Society; Regd.No:898/2000)
                      </p>
                      <p className="text-[9px] font-bold text-slate-700 mt-0.5">
                        | Accredited by <span className="text-pink-600 font-extrabold">NAAC</span> with <span className="text-pink-600 font-extrabold">'A'</span> Grade | &amp; | Accredited by <span className="text-pink-600 font-extrabold">NBA</span> |
                      </p>
                      <p className="text-[9px] font-semibold text-slate-600 mt-0.5">
                        Approved by AICTE, New Delhi and Permanently Affiliated to JNTUK, Kakinada
                      </p>
                      <p className="text-[10px] font-black text-slate-900 mt-0.5 uppercase tracking-wide">
                        Pedatadepalli, TADEPALLIGUDEM – 534 101, W.G. Dist, (A.P.)
                      </p>
                    </div>
                    {/* Symmetrical Spacer to guarantee perfect centering */}
                    <div className="w-16 h-16 shrink-0" />
                  </div>

                  {/* Letter Details */}
                  <div className="pt-2 flex justify-between items-center text-xs font-sans">
                    <div className="text-slate-700 font-medium">
                      <strong>Ref:</strong> SVEC/SIH2026/NOM
                    </div>
                    <div className="text-slate-700 font-medium">
                      <strong>Date:</strong> <span className="underline font-semibold">{letterDate}</span>
                    </div>
                  </div>

                  {/* Subject Line */}
                  <div className="text-center font-bold text-sm uppercase tracking-wide font-sans my-3 text-slate-900">
                    SUB: SMART INDIA HACKATHON (SIH) 2026 – NOMINATION
                  </div>

                  {/* Body Paragraph */}
                  <p className="text-xs sm:text-sm leading-relaxed text-slate-800 text-justify">
                    I am pleased to nominate the below team from our college to participate in Smart India Hackathon 2026. 
                    AICTE Application No / UGC Registration No for our college is <strong className="underline text-indigo-700 font-sans">{aicteNo || "___________________"}</strong>.
                  </p>

                  {/* Team Header */}
                  <div className="font-semibold text-xs text-slate-800 mt-2 font-sans">
                    <strong>Team Name:</strong> <span className="underline font-bold text-indigo-700 uppercase">{registration.teamName}</span>
                  </div>

                  {/* Team Members Roster Grid / Table */}
                  <div className="overflow-x-auto pt-1">
                    <table className="w-full border-collapse border border-slate-300 text-left text-xs table-fixed">
                      <thead>
                        <tr className="bg-slate-100 font-bold border-b border-slate-300">
                          <th className="border border-slate-300 p-1.5 text-[9px] uppercase font-sans text-slate-700 w-[15%] min-w-[75px]">Role</th>
                          <th className="border border-slate-300 p-1.5 text-[9px] uppercase font-sans text-slate-700 w-[20%] min-w-[95px]">Name</th>
                          <th className="border border-slate-300 p-1.5 text-[9px] uppercase font-sans text-slate-700 text-center w-[8%] min-w-[40px]">Gender</th>
                          <th className="border border-slate-300 p-1.5 text-[9px] uppercase font-sans text-slate-700 w-[25%] min-w-[120px]">Email ID</th>
                          <th className="border border-slate-300 p-1.5 text-[9px] uppercase font-sans text-slate-700 w-[14%] min-w-[70px]">Mobile No.</th>
                          <th className="border border-slate-300 p-1.5 text-[9px] uppercase font-sans text-slate-700 w-[9%] min-w-[45px]">Stream</th>
                          <th className="border border-slate-300 p-1.5 text-[9px] uppercase font-sans text-slate-700 w-[9%] min-w-[45px]">Year</th>
                        </tr>
                      </thead>
                      <tbody>
                        {roster.map((member, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="border border-slate-300 p-1.5 text-[10px] font-bold text-slate-700 font-sans">
                              {member.role}
                            </td>
                            <td className="border border-slate-300 p-1.5">
                              {isReadOnly ? (
                                <span className="text-slate-800 text-[10px] font-sans px-0.5 block truncate">{member.name || "-"}</span>
                              ) : (
                                <input
                                  type="text"
                                  value={member.name}
                                  onChange={(e) => handleUpdateRosterCell(idx, "name", e.target.value)}
                                  className="w-full bg-transparent outline-none border-none p-0 text-slate-800 text-[10px] print-no-border font-medium"
                                  placeholder="Enter Name"
                                />
                              )}
                            </td>
                            <td className="border border-slate-300 p-1.5 text-center">
                              {isReadOnly ? (
                                <span className="text-slate-800 text-[10px] font-sans px-0.5 block text-center">{member.gender || "-"}</span>
                              ) : (
                                <input
                                  type="text"
                                  value={member.gender}
                                  onChange={(e) => handleUpdateRosterCell(idx, "gender", e.target.value)}
                                  className="w-full bg-transparent outline-none border-none p-0 text-slate-800 text-[10px] text-center print-no-border font-medium"
                                  placeholder="M/F"
                                />
                              )}
                            </td>
                            <td className="border border-slate-300 p-1.5">
                              {isReadOnly ? (
                                <span className="text-slate-800 text-[9px] font-mono px-0.5 block break-all leading-tight">{member.email || "-"}</span>
                              ) : (
                                <input
                                  type="email"
                                  value={member.email}
                                  onChange={(e) => handleUpdateRosterCell(idx, "email", e.target.value)}
                                  className="w-full bg-transparent outline-none border-none p-0 text-slate-800 text-[9px] print-no-border font-mono break-all leading-tight"
                                  placeholder="Enter Email"
                                />
                              )}
                            </td>
                            <td className="border border-slate-300 p-1.5">
                              {isReadOnly ? (
                                <span className="text-slate-800 text-[9px] font-mono px-0.5 block leading-tight">{member.phone || "-"}</span>
                              ) : (
                                <input
                                  type="tel"
                                  value={member.phone}
                                  onChange={(e) => handleUpdateRosterCell(idx, "phone", e.target.value)}
                                  className="w-full bg-transparent outline-none border-none p-0 text-slate-800 text-[9px] print-no-border font-mono leading-tight"
                                  placeholder="Enter Phone"
                                />
                              )}
                            </td>
                            <td className="border border-slate-300 p-1.5">
                              {isReadOnly ? (
                                <span className="text-slate-800 text-[10px] font-sans px-0.5 block truncate">{member.stream || "-"}</span>
                              ) : (
                                <input
                                  type="text"
                                  value={member.stream}
                                  onChange={(e) => handleUpdateRosterCell(idx, "stream", e.target.value)}
                                  className="w-full bg-transparent outline-none border-none p-0 text-slate-800 text-[10px] print-no-border"
                                  placeholder="e.g. CSE"
                                />
                              )}
                            </td>
                            <td className="border border-slate-300 p-1.5">
                              {isReadOnly ? (
                                <span className="text-slate-800 text-[10px] font-sans px-0.5 block truncate">{member.academicYear || "-"}</span>
                              ) : (
                                <input
                                  type="text"
                                  value={member.academicYear}
                                  onChange={(e) => handleUpdateRosterCell(idx, "academicYear", e.target.value)}
                                  className="w-full bg-transparent outline-none border-none p-0 text-slate-800 text-[10px] print-no-border"
                                  placeholder="e.g. 3rd Year"
                                />
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Closing signature and stamp blocks */}
                  <div className="pt-6 flex justify-between items-end text-xs text-slate-800 leading-relaxed font-sans">
                    {/* Left side: College Seal/Stamp placeholder */}
                    <div className="text-left">
                      <p className="text-[10px] text-slate-400 italic">College Seal / Stamp</p>
                      <div className="w-24 h-14 border border-dashed border-slate-300 rounded-lg mt-1 flex items-center justify-center text-[10px] text-slate-300 bg-slate-50/50">
                        Place Seal Here
                      </div>
                    </div>
                    {/* Right side: Principal Signature */}
                    <div className="text-right">
                      <p className="font-medium">Sincerely,</p>
                      <div className="mt-8">
                        <p className="font-bold text-slate-900">{principalName}</p>
                        <p className="text-[10px] text-slate-600 font-medium">Principal</p>
                        <p className="text-[9px] text-slate-500 whitespace-pre-line mt-0.5 italic leading-tight">{collegeStamp}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="p-6 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0 no-print">
            <p className="text-[11px] text-slate-500 max-w-md text-center sm:text-left">
              <b>Tip:</b> If the browser's print dialog is restricted, click <b>Download Consent Letter (PDF)</b> to save a perfectly formatted PDF directly to your device!
            </p>
            <div className="flex flex-wrap justify-end gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-xs font-bold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl shadow-xs cursor-pointer transition-colors"
              >
                Close Preview
              </button>
              <button
                type="button"
                onClick={handleDownloadPDF}
                className="px-5 py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md cursor-pointer transition-all flex items-center gap-1.5"
                title="Download official PDF copy of the consent letter"
              >
                <Download className="w-4 h-4" />
                Download Consent Letter (PDF)
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md cursor-pointer transition-all flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                Print Consent Letter (PDF)
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

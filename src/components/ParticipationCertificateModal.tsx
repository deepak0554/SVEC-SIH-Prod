import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Printer, X, Download, Award, ShieldCheck, Loader2 } from "lucide-react";
import { Registration, ProblemStatement } from "../types";
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

interface ParticipationCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName: string;
  registration: Registration;
  config: any;
  problemStatement?: ProblemStatement | null;
}

export default function ParticipationCertificateModal({
  isOpen,
  onClose,
  studentName,
  registration,
  config,
  problemStatement
}: ParticipationCertificateModalProps) {
  if (!isOpen || !config) return null;

  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  // Substitute certificate body placeholders
  const getSubstitutedBody = () => {
    let body = config.certificateBody || "for actively participating in the SVEC Smart India Hackathon 2026 Internal Hackathon. Their dedication and creative problem solving are highly commendable.";
    body = body.replace(/\[StudentName\]/gi, studentName || "Participant");
    body = body.replace(/\[TeamName\]/gi, registration.teamName || "the Team");
    body = body.replace(/\[ProblemCode\]/gi, problemStatement?.code || "N/A");
    body = body.replace(/\[ProblemTitle\]/gi, problemStatement?.title || "N/A");
    return body;
  };

  const handleDownloadPDF = async () => {
    if (isDownloading) return;
    setDownloadError("");
    setIsDownloading(true);

    // Yield main thread so the loading state and spinner can render in the browser
    setTimeout(async () => {
      // Save scroll positions of all ancestors to prevent shifted/clipped canvas captures
      const scrolledAncestors: { element: HTMLElement; scrollTop: number; scrollLeft: number }[] = [];
      try {
        const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
          import("html2canvas"),
          import("jspdf")
        ]);

        const element = document.getElementById("certificate-print-area");
        if (!element) {
          throw new Error("Print area not found");
        }

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

        const restore = makeOklchSafe();
        try {
          const canvas = await html2canvas(element, {
            scale: 2.5,
            useCORS: true,
            logging: false,
            scrollX: 0,
            scrollY: 0,
            allowTaint: true,
            backgroundColor: isDarkTech ? "#020617" : "#ffffff",
          });

          const imgData = canvas.toDataURL("image/jpeg", 0.98);

          // Create A4 Landscape PDF
          const pdf = new jsPDF({
            orientation: "landscape",
            unit: "mm",
            format: "a4",
            compress: true,
          });

          const pageWidth = pdf.internal.pageSize.getWidth(); // 297 mm
          const pageHeight = pdf.internal.pageSize.getHeight(); // 210 mm

          // Scale to 100% of the A4 page print area with zero margins/borders
          pdf.addImage(imgData, "JPEG", 0, 0, pageWidth, pageHeight, undefined, "FAST");
          pdf.save(`Certificate_${studentName.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`);
        } finally {
          restore();
        }
      } catch (err: any) {
        console.error("Certificate PDF generation error:", err);
        setDownloadError(err?.message || "Failed to generate PDF. Please try again.");
      } finally {
        // Restore scroll positions of ancestors
        scrolledAncestors.forEach(({ element: el, scrollTop, scrollLeft }) => {
          el.scrollTop = scrollTop;
          el.scrollLeft = scrollLeft;
        });
        setIsDownloading(false);
      }
    }, 150);
  };

  const handlePrint = () => {
    window.print();
  };

  // Determine border and theme color
  const accentColor = config.certificateBorderColor || "#4f46e5";

  // Build Background Frame Styles based on config
  const renderBackgroundFrame = () => {
    switch (config.certificateBgType) {
      case "image":
        if (config.certificateBgUrl) {
          return (
            <img
              src={config.certificateBgUrl}
              alt="Certificate Background"
              className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
              referrerPolicy="no-referrer"
            />
          );
        }
        // Fallback to classic if image is selected but none uploaded
        return <div className="absolute inset-0 bg-slate-50 border-12 border-double" style={{ borderColor: accentColor }} />;

      case "modern":
        return (
          <>
            {/* Elegant Indigo/Violet Sidebar Stripe Frame */}
            <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-b from-indigo-700 via-indigo-600 to-indigo-900" />
            <div className="absolute inset-y-0 right-0 w-2 bg-slate-200" />
            <div className="absolute inset-0 border-4 border-slate-200" />
            <div className="absolute top-6 bottom-6 left-14 right-8 border border-indigo-100" />
          </>
        );

      case "tech":
        return (
          <>
            {/* Tech Cyber Circuit Inspired Accents */}
            <div className="absolute inset-0 bg-slate-950" />
            <div className="absolute inset-4 border border-indigo-900/40" />
            <div className="absolute inset-6 border border-indigo-500/20" />
            {/* Corner Bracket Flourishes */}
            <div className="absolute top-6 left-6 w-8 h-8 border-t-2 border-l-2" style={{ borderColor: accentColor }} />
            <div className="absolute top-6 right-6 w-8 h-8 border-t-2 border-r-2" style={{ borderColor: accentColor }} />
            <div className="absolute bottom-6 left-6 w-8 h-8 border-b-2 border-l-2" style={{ borderColor: accentColor }} />
            <div className="absolute bottom-6 right-6 w-8 h-8 border-b-2 border-r-2" style={{ borderColor: accentColor }} />
            <div className="absolute inset-0 bg-[radial-gradient(#ffffff04_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
          </>
        );

      case "classic":
      default:
        return (
          <>
            {/* Classic double dynamic border */}
            <div className="absolute inset-0 bg-stone-50/70" />
            <div className="absolute inset-6 border-4" style={{ borderColor: accentColor }} />
            <div className="absolute inset-8 border" style={{ borderColor: accentColor }} />
            {/* Corner flourishes */}
            <div className="absolute top-10 left-10 w-6 h-6 border-t-2 border-l-2" style={{ borderColor: accentColor }} />
            <div className="absolute top-10 right-10 w-6 h-6 border-t-2 border-r-2" style={{ borderColor: accentColor }} />
            <div className="absolute bottom-10 left-10 w-6 h-6 border-b-2 border-l-2" style={{ borderColor: accentColor }} />
            <div className="absolute bottom-10 right-10 w-6 h-6 border-b-2 border-r-2" style={{ borderColor: accentColor }} />
          </>
        );
    }
  };

  const isDarkTech = config.certificateBgType === "tech";

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 no-print cursor-pointer"
        onClick={onClose}
      >
        <style>{`
          @media print {
            @page {
              size: A4 landscape;
              margin: 0mm;
            }
            body {
              margin: 0 !important;
              padding: 0 !important;
              background: transparent !important;
            }
            body * {
              visibility: hidden !important;
            }
            #certificate-print-area,
            #certificate-print-area * {
              visibility: visible !important;
            }
            #certificate-print-area {
              position: fixed !important;
              left: 0 !important;
              top: 0 !important;
              width: 297mm !important;
              height: 210mm !important;
              margin: 0 !important;
              box-sizing: border-box !important;
              z-index: 9999999 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              page-break-inside: avoid !important;
              page-break-before: avoid !important;
              page-break-after: avoid !important;
            }
          }
        `}</style>
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col border border-slate-100 cursor-default"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-indigo-600 animate-bounce" />
              <div>
                <h2 className="text-sm font-black text-slate-800">Participation Certificate Preview</h2>
                <p className="text-[10px] text-slate-400 mt-0.5">Customize options are fully manageable at your Admin Settings panel.</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-lg transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Certificate View Frame with Landscape Constraints */}
          <div className="p-6 overflow-auto bg-slate-100 flex-1 flex justify-center items-start sm:items-center min-h-0">
            {/* This DOM element is what html2pdf copies (A4 landscape scale: 297mm x 210mm / 842px x 595px) */}
            <div
              id="certificate-print-area"
              className={`relative overflow-hidden w-[842px] h-[595px] shrink-0 shadow-lg text-center p-10 flex flex-col justify-between select-none ${
                isDarkTech ? "text-slate-100" : "text-slate-800"
              }`}
              style={{ fontFamily: "'Inter', sans-serif", width: "842px", height: "595px", boxSizing: "border-box" }}
            >
              {/* Background Style Overlays */}
              {renderBackgroundFrame()}

              {/* Dynamic Content Layers */}
              <div className="relative z-10 flex flex-col justify-between h-full">
                {/* Header Logo */}
                <div className="flex justify-center items-center gap-2 mt-1">
                  {config?.logoUrl ? (
                    <img src={config.logoUrl} className="w-12 h-12 object-contain" alt="College Logo" referrerPolicy="no-referrer" />
                  ) : (
                    <SvecLogo className="w-12 h-12" />
                  )}
                  <div className="text-left">
                    <span className={`block text-xs font-black tracking-wide ${isDarkTech ? "text-white" : "text-slate-800"}`}>
                      SRI VASAVI ENGINEERING COLLEGE
                    </span>
                    <span className="block text-[8px] tracking-widest uppercase font-semibold text-slate-400">
                      Autonomous College • Tadepalligudem
                    </span>
                  </div>
                </div>

                {/* Main Content Details */}
                <div className="space-y-3.5 my-auto px-8">
                  {/* Title */}
                  <h1
                    className="text-2xl font-black tracking-widest uppercase mb-1"
                    style={{ color: isDarkTech ? "#ffffff" : accentColor }}
                  >
                    {config.certificateTitle || "CERTIFICATE OF PARTICIPATION"}
                  </h1>

                  {/* Subtitle */}
                  <p className="text-[10px] tracking-widest uppercase text-slate-400 font-bold">
                    {config.certificateSubtitle || "This certificate is proudly awarded to"}
                  </p>

                  {/* Student Name */}
                  <div className="py-1.5 inline-block border-b border-dashed border-slate-300">
                    <span
                      className="text-3xl font-serif italic tracking-wide px-4 block"
                      style={{ color: isDarkTech ? "#6366f1" : accentColor }}
                    >
                      {studentName}
                    </span>
                  </div>

                  {/* Body Text */}
                  <p className={`text-xs max-w-xl mx-auto leading-relaxed px-4 ${isDarkTech ? "text-slate-300" : "text-slate-600"}`}>
                    {getSubstitutedBody()}
                  </p>
                </div>

                {/* Footer details: Date and Signatories */}
                <div className="flex flex-wrap justify-around items-end gap-6 px-6 mb-1">
                  {/* Dynamic Signatories */}
                  {config.certificateSignatories && config.certificateSignatories.length > 0 ? (
                    config.certificateSignatories.map((sig, idx) => (
                      <div key={sig.id || idx} className="space-y-1 text-center min-w-[120px] max-w-[180px] flex-1">
                        <div className="h-6 flex items-center justify-center">
                          <span className="font-serif italic text-[10px] text-slate-400 font-medium">Verified Signed</span>
                        </div>
                        <div className="border-t border-slate-300/60 pt-1.5">
                          <p className={`text-[10px] font-black leading-tight ${isDarkTech ? "text-slate-200" : "text-slate-800"}`}>
                            {sig.name || "Signatory"}
                          </p>
                          <p className="text-[8px] text-slate-400 font-semibold leading-normal mt-0.5">{sig.title || "Title/Role"}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <>
                      {/* Fallback Left Signatory */}
                      <div className="space-y-1 text-center min-w-[120px] max-w-[180px] flex-1">
                        <div className="h-6 flex items-center justify-center">
                          <span className="font-serif italic text-[10px] text-slate-400 font-medium">Verified Signed</span>
                        </div>
                        <div className="border-t border-slate-300/60 pt-1.5">
                          <p className={`text-[10px] font-black ${isDarkTech ? "text-slate-200" : "text-slate-800"}`}>
                            {config.certificateSignatory1Name || "Dr. Ch. Rambabu"}
                          </p>
                          <p className="text-[8px] text-slate-400 font-semibold mt-0.5">{config.certificateSignatory1Title || "Principal & Chairman, SVEC"}</p>
                        </div>
                      </div>

                      {/* Fallback Right Signatory */}
                      <div className="space-y-1 text-center min-w-[120px] max-w-[180px] flex-1">
                        <div className="h-6 flex items-center justify-center">
                          <span className="font-serif italic text-[10px] text-slate-400 font-medium">Verified Signed</span>
                        </div>
                        <div className="border-t border-slate-300/60 pt-1.5">
                          <p className={`text-[10px] font-black ${isDarkTech ? "text-slate-200" : "text-slate-800"}`}>
                            {config.certificateSignatory2Name || "Dr. K. Shirin Bhanu"}
                          </p>
                          <p className="text-[8px] text-slate-400 font-semibold mt-0.5">{config.certificateSignatory2Title || "College SPOC & Convenor"}</p>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Middle Date & Verifier QR Stamp */}
                  <div className="text-center space-y-1 min-w-[120px] pb-0.5">
                    <div className="flex justify-center mb-1">
                      <ShieldCheck className="w-5 h-5 text-emerald-500" />
                    </div>
                    <p className="text-[8px] tracking-widest uppercase font-bold text-slate-400">Date of Issue</p>
                    <p className={`text-[9px] font-bold ${isDarkTech ? "text-slate-300" : "text-slate-700"}`}>
                      {config.certificateDateText || "July 17, 2026"}
                    </p>
                  </div>
                </div>

                {/* Bottom Metadata */}
                <div className="flex justify-between items-center px-6 mt-1 text-[7px] text-slate-400 font-mono">
                  <span>Certificate ID: SVEC-IH2026-REG{registration.registrationId}</span>
                  <span>Autonomous Accreditation Scheme Code: SVEC-02</span>
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="p-6 border-t border-slate-100 bg-slate-50 flex flex-col gap-3 shrink-0">
            {downloadError && (
              <p className="text-xs text-rose-600 font-bold text-right w-full">
                ⚠️ {downloadError}
              </p>
            )}
            <div className="flex items-center justify-between w-full">
              <p className="text-[10px] text-slate-500 max-w-sm hidden sm:block">
                <b>Print-Ready A4 Landscape:</b> Perfectly formatted for single-sheet print area with zero bleed/overflow.
              </p>
              <div className="flex gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isDownloading}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Close Preview
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  disabled={isDownloading}
                  className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl cursor-pointer transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Print directly using browser print dialog"
                >
                  <Printer className="w-4 h-4" />
                  Print
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPDF}
                  disabled={isDownloading}
                  className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md cursor-pointer transition-all flex items-center gap-1.5 disabled:opacity-80 disabled:cursor-not-allowed"
                >
                  {isDownloading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      Generating PDF...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Download Certificate (PDF)
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

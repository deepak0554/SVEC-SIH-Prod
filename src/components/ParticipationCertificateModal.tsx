import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Printer, X, Download, Award, ShieldCheck } from "lucide-react";
import { Registration, ProblemStatement } from "../types";
import SvecLogo from "./SvecLogo";

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
    const element = document.getElementById("certificate-print-area");
    if (!element) return;

    // Load html2pdf from CDN if it's not already loaded
    if (!(window as any).html2pdf) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Failed to load PDF library"));
        document.head.appendChild(script);
      });
    }

    const opt = {
      margin: 0,
      filename: `Certificate_${studentName.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`,
      image: { type: "jpeg", quality: 1.0 },
      html2canvas: { scale: 3, useCORS: true, logging: false },
      jsPDF: { unit: "mm", format: "a4", orientation: "landscape" }
    };

    const worker = (window as any).html2pdf().from(element).set(opt);
    await worker.save();
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
            {/* This DOM element is what html2pdf copies (A4 landscape scale: 297mm x 210mm matches exactly 4:3 or ~1.41 ratio) */}
            <div
              id="certificate-print-area"
              className={`relative overflow-hidden w-[800px] h-[565px] shrink-0 shadow-lg text-center p-12 flex flex-col justify-between select-none ${
                isDarkTech ? "text-slate-100" : "text-slate-800"
              }`}
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              {/* Background Style Overlays */}
              {renderBackgroundFrame()}

              {/* Dynamic Content Layers */}
              <div className="relative z-10 flex flex-col justify-between h-full">
                {/* Header Logo */}
                <div className="flex justify-center items-center gap-2 mt-2">
                  <SvecLogo className="w-12 h-12" />
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
                <div className="space-y-4 my-auto px-8">
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
                  <div className="py-2 inline-block border-b border-dashed border-slate-300">
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
                <div className="flex flex-wrap justify-around items-end gap-6 px-6 mb-2">
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
          <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
            <p className="text-[10px] text-slate-500 max-w-sm hidden sm:block">
              <b>Tip:</b> Click <b>Download Certificate (PDF)</b> to save a high-fidelity vector PDF matching standard landscape size for printing!
            </p>
            <div className="flex gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl cursor-pointer transition-colors"
              >
                Close Preview
              </button>
              <button
                type="button"
                onClick={handleDownloadPDF}
                className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md cursor-pointer transition-all flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                Download Certificate (PDF)
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

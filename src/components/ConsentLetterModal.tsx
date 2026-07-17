import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Printer, X, FileText, Info, HelpCircle, Download } from "lucide-react";
import { Registration } from "../types";
import SvecLogo from "./SvecLogo";

interface ConsentLetterModalProps {
  isOpen: boolean;
  onClose: () => void;
  registration: Registration;
  isReadOnly?: boolean;
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
}: ConsentLetterModalProps) {
  const [aicteNo, setAicteNo] = useState("1-3634005111 (Sri Vasavi Engineering College)");
  const [principalName, setPrincipalName] = useState("DR. CH. Rambabu");
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
      academicYear: "3rd Year",
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
        academicYear: "3rd Year",
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
        academicYear: "3rd Year",
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
        academicYear: "3rd Year",
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
        academicYear: "3rd Year",
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
        academicYear: "3rd Year",
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
      margin:       [15, 15, 15, 15], // [top, left, bottom, right] in mm
      filename:     `Consent_Letter_${(registration.teamName || "Team").replace(/[^a-zA-Z0-9]/g, "_")}.pdf`,
      image:        { type: "jpeg", quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, logging: false },
      jsPDF:        { unit: "mm", format: "a4", orientation: "portrait" }
    };

    // Generate and save
    (window as any).html2pdf().set(opt).from(element).save();
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
                      placeholder="e.g. Dr. K. S. S. Rao"
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
                <div id="printable-consent-letter" className="font-serif text-slate-900 text-left space-y-5">
                  {/* Print Stylesheet Injection */}
                  <style dangerouslySetInnerHTML={{__html: `
                    @media print {
                      @page {
                        size: A4 portrait;
                        margin: 0;
                      }
                      body * {
                        visibility: hidden !important;
                      }
                      #printable-consent-letter, #printable-consent-letter * {
                        visibility: visible !important;
                      }
                      #printable-consent-letter {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 20mm 20mm 20mm 20mm !important;
                        border: none !important;
                        box-shadow: none !important;
                        background: white !important;
                        color: black !important;
                        font-size: 11pt !important;
                        box-sizing: border-box !important;
                      }
                      /* Ensure fields display clean without inputs */
                      .print-no-border {
                        border: none !important;
                        background: transparent !important;
                        outline: none !important;
                        padding: 0 !important;
                        box-shadow: none !important;
                        width: 100% !important;
                        height: auto !important;
                        resize: none !important;
                      }
                    }
                  `}} />

                  {/* College Letterhead (Reusable standard structure matching user expectations) */}
                  <div className="flex items-center gap-4 pb-4 border-b-2 border-slate-900">
                    <div className="shrink-0">
                      <SvecLogo className="w-16 h-16" />
                    </div>
                    <div className="flex-1 text-center font-sans">
                      <h2 className="text-lg md:text-xl font-black text-blue-700 tracking-tight leading-none uppercase">
                        SRI VASAVI ENGINEERING COLLEGE <span className="text-indigo-600 font-bold lowercase text-xs">(Autonomous)</span>
                      </h2>
                      <p className="text-[8px] font-bold text-slate-600 mt-0.5">
                        (Sponsored by Sri Vasavi Educational Society; Regd.No:898/2000)
                      </p>
                      <p className="text-[8px] font-bold text-slate-700 mt-0.5">
                        | Accredited by <span className="text-pink-600 font-extrabold">NAAC</span> with <span className="text-pink-600 font-extrabold">'A'</span> Grade | &amp; | Accredited by <span className="text-pink-600 font-extrabold">NBA</span> |
                      </p>
                      <p className="text-[8px] font-semibold text-slate-600 mt-0.5">
                        Approved by AICTE, New Delhi and Permanently Affiliated to JNTUK, Kakinada
                      </p>
                      <p className="text-[9px] font-black text-slate-900 mt-0.5 uppercase tracking-wide">
                        Pedatadepalli, TADEPALLIGUDEM – 534 101, W.G. Dist, (A.P.)
                      </p>
                    </div>
                  </div>

                  {/* Letter Details */}
                  <div className="pt-4 flex justify-between text-sm">
                    <div>
                      <span>Date: <span className="underline font-sans text-xs font-semibold">{letterDate}</span></span>
                    </div>
                  </div>

                  {/* Subject Line */}
                  <div className="text-center font-bold text-sm uppercase tracking-wide font-sans mt-3">
                    Sub: Smart India Hackathon 2026 – Nomination
                  </div>

                  {/* Body Paragraph */}
                  <p className="text-xs sm:text-sm leading-relaxed text-slate-800 text-justify">
                    I am pleased to nominate the below team from our college to participate in Smart India Hackathon 2026. 
                    AICTE Application No/ UGC Registration No for our college is <strong className="underline text-indigo-700 font-sans">{aicteNo || "___________________"}</strong>.
                  </p>

                  {/* Team Header */}
                  <div className="font-bold text-sm text-slate-900 mt-4 font-sans flex items-center gap-1.5">
                    <span>Team : </span>
                    <span className="underline text-indigo-600 font-black">{registration.teamName}</span>
                  </div>

                  {/* Team Members Roster Grid / Table */}
                  <div className="overflow-x-auto pt-2">
                    <table className="w-full border-collapse border border-slate-300 text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 font-bold border-b border-slate-300">
                          <th className="border border-slate-300 p-1.5 text-[10px] uppercase font-sans text-slate-500 w-28">Role</th>
                          <th className="border border-slate-300 p-1.5 text-[10px] uppercase font-sans text-slate-500">Name</th>
                          <th className="border border-slate-300 p-1.5 text-[10px] uppercase font-sans text-slate-500 text-center w-16">Gender</th>
                          <th className="border border-slate-300 p-1.5 text-[10px] uppercase font-sans text-slate-500">Email id</th>
                          <th className="border border-slate-300 p-1.5 text-[10px] uppercase font-sans text-slate-500">Mobile no.</th>
                          <th className="border border-slate-300 p-1.5 text-[10px] uppercase font-sans text-slate-500 w-20">Stream</th>
                          <th className="border border-slate-300 p-1.5 text-[10px] uppercase font-sans text-slate-500 w-20">Academic Year</th>
                        </tr>
                      </thead>
                      <tbody>
                        {roster.map((member, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="border border-slate-300 p-1.5 text-[11px] font-bold text-slate-700 font-sans">
                              {member.role}
                            </td>
                            <td className="border border-slate-300 p-1.5">
                              {isReadOnly ? (
                                <span className="text-slate-800 text-[11px] font-medium font-sans px-0.5">{member.name || "-"}</span>
                              ) : (
                                <input
                                  type="text"
                                  value={member.name}
                                  onChange={(e) => handleUpdateRosterCell(idx, "name", e.target.value)}
                                  className="w-full bg-transparent outline-none border-none p-0 text-slate-800 text-[11px] print-no-border font-medium"
                                  placeholder="Enter Name"
                                />
                              )}
                            </td>
                            <td className="border border-slate-300 p-1.5 text-center">
                              {isReadOnly ? (
                                <span className="text-slate-800 text-[11px] font-medium font-sans px-0.5">{member.gender || "-"}</span>
                              ) : (
                                <input
                                  type="text"
                                  value={member.gender}
                                  onChange={(e) => handleUpdateRosterCell(idx, "gender", e.target.value)}
                                  className="w-full bg-transparent outline-none border-none p-0 text-slate-800 text-[11px] text-center print-no-border font-medium"
                                  placeholder="M/F"
                                />
                              )}
                            </td>
                            <td className="border border-slate-300 p-1.5">
                              {isReadOnly ? (
                                <span className="text-slate-800 text-[11px] font-medium font-mono text-[10px] px-0.5">{member.email || "-"}</span>
                              ) : (
                                <input
                                  type="email"
                                  value={member.email}
                                  onChange={(e) => handleUpdateRosterCell(idx, "email", e.target.value)}
                                  className="w-full bg-transparent outline-none border-none p-0 text-slate-800 text-[11px] print-no-border font-mono text-[10px]"
                                  placeholder="Enter Email"
                                />
                              )}
                            </td>
                            <td className="border border-slate-300 p-1.5">
                              {isReadOnly ? (
                                <span className="text-slate-800 text-[11px] font-medium font-mono text-[10px] px-0.5">{member.phone || "-"}</span>
                              ) : (
                                <input
                                  type="tel"
                                  value={member.phone}
                                  onChange={(e) => handleUpdateRosterCell(idx, "phone", e.target.value)}
                                  className="w-full bg-transparent outline-none border-none p-0 text-slate-800 text-[11px] print-no-border font-mono text-[10px]"
                                  placeholder="Enter Phone"
                                />
                              )}
                            </td>
                            <td className="border border-slate-300 p-1.5">
                              {isReadOnly ? (
                                <span className="text-slate-800 text-[11px] font-medium font-sans px-0.5">{member.stream || "-"}</span>
                              ) : (
                                <input
                                  type="text"
                                  value={member.stream}
                                  onChange={(e) => handleUpdateRosterCell(idx, "stream", e.target.value)}
                                  className="w-full bg-transparent outline-none border-none p-0 text-slate-800 text-[11px] print-no-border"
                                  placeholder="e.g. CSE"
                                />
                              )}
                            </td>
                            <td className="border border-slate-300 p-1.5">
                              {isReadOnly ? (
                                <span className="text-slate-800 text-[11px] font-medium font-sans px-0.5">{member.academicYear || "-"}</span>
                              ) : (
                                <input
                                  type="text"
                                  value={member.academicYear}
                                  onChange={(e) => handleUpdateRosterCell(idx, "academicYear", e.target.value)}
                                  className="w-full bg-transparent outline-none border-none p-0 text-slate-800 text-[11px] print-no-border"
                                  placeholder="e.g. 3rd Year"
                                />
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Closing signature blocks */}
                  <div className="pt-10 flex justify-between items-start text-xs text-slate-800 leading-relaxed font-sans">
                    <div>
                      <p>Sincerely,</p>
                      <div className="mt-12">
                        <p className="font-bold text-slate-900 underline">{principalName}</p>
                        <p className="text-[9px] text-slate-400 whitespace-pre-line mt-1 italic">{collegeStamp}</p>
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

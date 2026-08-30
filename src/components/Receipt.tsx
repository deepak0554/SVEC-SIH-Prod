import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  CheckCircle,
  Printer,
  FileText,
  Calendar,
  Layers,
  Phone,
  User,
  Users,
  Briefcase,
  CornerDownRight,
  ArrowRight,
  Upload,
  Save,
  Check,
  AlertCircle,
  FileUp,
  File,
  Trash2,
  Lock,
  CloudUpload,
  CheckCircle2,
  Download,
  Trophy,
  Sparkles,
  Award,
  Link2,
  ExternalLink
} from "lucide-react";
import { Registration, ProblemStatement } from "../types";
import SvecLogo from "./SvecLogo";
import ParticipationCertificateModal from "./ParticipationCertificateModal";
import ConsentLetterModal from "./ConsentLetterModal";

interface ReceiptProps {
  registration: Registration;
  problemStatements: ProblemStatement[];
  onReset: () => void;
  onUpdateRegistration?: (updated: Registration) => void;
}

export default function Receipt({
  registration,
  problemStatements,
  onReset,
  onUpdateRegistration
}: ReceiptProps) {
  const statement = problemStatements.find(ps => ps.id === registration.problemStatementId);

  const getAuthHeaders = (extraHeaders: Record<string, string> = {}) => {
    const headers: Record<string, string> = { ...extraHeaders };
    try {
      const saved = localStorage.getItem("svec_sih_student");
      if (saved) {
        const studentObj = JSON.parse(saved);
        if (studentObj.token) {
          headers["Authorization"] = `Bearer ${studentObj.token}`;
        }
      }
    } catch (err) {}
    return headers;
  };

  // Tab Navigation State
  const [activeTab, setActiveTab] = useState<"slip" | "proposal" | "profile" | "team" | "certificates">("slip");

  // Proposal Form State
  const [abstract, setAbstract] = useState(registration.abstract || "");
  const [implementationSteps, setImplementationSteps] = useState(registration.implementationSteps || "");
  const [pptFileName, setPptFileName] = useState(registration.pptFileName || "");
  const [pptBase64, setPptBase64] = useState(registration.pptBase64 || "");
  const [proposalStatus, setProposalStatus] = useState<"saved" | "submitted">(registration.proposalStatus || "saved");

  // Profile state
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMobile, setProfileMobile] = useState("");
  const [profileGender, setProfileGender] = useState("");
  const [profileDept, setProfileDept] = useState("");
  const [profileOldPass, setProfileOldPass] = useState("");
  const [profileNewPass, setProfileNewPass] = useState("");
  const [profileConfirmPass, setProfileConfirmPass] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [profileError, setProfileError] = useState("");

  // Team management state
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamSuccess, setTeamSuccess] = useState("");
  const [teamError, setTeamError] = useState("");
  const [teamMembersCount, setTeamMembersCount] = useState<number>(5);
  const [genderDiversityRequired, setGenderDiversityRequired] = useState<boolean>(true);
  const [lockStudentUpdates, setLockStudentUpdates] = useState<boolean>(false);
  const [lockRegisterAnotherTeam, setLockRegisterAnotherTeam] = useState<boolean>(false);
  const [enableCertificates, setEnableCertificates] = useState<boolean>(false);
  const [certificateConfig, setCertificateConfig] = useState<any>(null);
  const [selectedCertStudentName, setSelectedCertStudentName] = useState<string | null>(null);
  const [showConsentLetter, setShowConsentLetter] = useState<boolean>(false);

  // Sample PPT Demo & Presentation Template Config
  const [samplePptConfig, setSamplePptConfig] = useState<{
    enabled: boolean;
    url: string;
    fileName: string;
    fileBase64: string;
    description: string;
  }>({
    enabled: true,
    url: "",
    fileName: "",
    fileBase64: "",
    description: ""
  });

  useEffect(() => {
    fetch("/api/settings/public")
      .then(res => res.json())
      .then(data => {
        if (data.teamMembersCount !== undefined) {
          setTeamMembersCount(data.teamMembersCount);
        }
        if (data.genderDiversityRequired !== undefined) {
          setGenderDiversityRequired(data.genderDiversityRequired);
        }
        if (data.lockStudentUpdates !== undefined) {
          setLockStudentUpdates(data.lockStudentUpdates);
        }
        if (data.lockRegisterAnotherTeam !== undefined) {
          setLockRegisterAnotherTeam(data.lockRegisterAnotherTeam);
        }
        if (data.enableCertificates !== undefined) {
          setEnableCertificates(data.enableCertificates);
          setCertificateConfig(data);
          if (!data.enableCertificates) {
            setActiveTab(prev => prev === "certificates" ? "slip" : prev);
          }
        }
        if (data.samplePptEnabled !== undefined) {
          setSamplePptConfig({
            enabled: !!data.samplePptEnabled,
            url: data.samplePptUrl || "",
            fileName: data.samplePptFileName || "",
            fileBase64: data.samplePptFileBase64 || "",
            description: data.samplePptDescription || ""
          });
        }
      })
      .catch(err => console.error("Error loading public settings in Receipt", err));
  }, []);

  const [leadName, setLeadName] = useState(registration.leadName || "");
  const [leadMobile, setLeadMobile] = useState(registration.leadMobile || "");
  const [leadGender, setLeadGender] = useState(registration.leadGender || "Male");

  const [member1, setMember1] = useState(registration.member1 || "");
  const [member1Gender, setMember1Gender] = useState(registration.member1Gender || "Male");
  const [member1Email, setMember1Email] = useState(registration.member1Email || "");
  const [member1Phone, setMember1Phone] = useState(registration.member1Phone || "");

  const [member2, setMember2] = useState(registration.member2 || "");
  const [member2Gender, setMember2Gender] = useState(registration.member2Gender || "Male");
  const [member2Email, setMember2Email] = useState(registration.member2Email || "");
  const [member2Phone, setMember2Phone] = useState(registration.member2Phone || "");

  const [member3, setMember3] = useState(registration.member3 || "");
  const [member3Gender, setMember3Gender] = useState(registration.member3Gender || "Male");
  const [member3Email, setMember3Email] = useState(registration.member3Email || "");
  const [member3Phone, setMember3Phone] = useState(registration.member3Phone || "");

  const [member4, setMember4] = useState(registration.member4 || "");
  const [member4Gender, setMember4Gender] = useState(registration.member4Gender || "Male");
  const [member4Email, setMember4Email] = useState(registration.member4Email || "");
  const [member4Phone, setMember4Phone] = useState(registration.member4Phone || "");

  const [member5, setMember5] = useState(registration.member5 || "");
  const [member5Gender, setMember5Gender] = useState(registration.member5Gender || "Male");
  const [member5Email, setMember5Email] = useState(registration.member5Email || "");
  const [member5Phone, setMember5Phone] = useState(registration.member5Phone || "");

  const [mentorName, setMentorName] = useState(registration.mentorName || "");

  // Drag and Drop States
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Status/Alert States
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Payment pending states & functions
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [paymentStatusMessage, setPaymentStatusMessage] = useState("");

  const loadRazorpayScript = (keyId?: string) => {
    return new Promise((resolve) => {
      if (keyId === "rzp_test_mock") {
        (window as any).Razorpay = class {
          options: any;
          constructor(options: any) {
            this.options = options;
          }
          open() {
            const overlay = document.createElement("div");
            overlay.id = "mock-razorpay-overlay";
            overlay.style.position = "fixed";
            overlay.style.inset = "0";
            overlay.style.backgroundColor = "rgba(15, 23, 42, 0.75)";
            overlay.style.backdropFilter = "blur(8px)";
            overlay.style.display = "flex";
            overlay.style.alignItems = "center";
            overlay.style.justifyContent = "center";
            overlay.style.zIndex = "999999";
            overlay.style.padding = "16px";
            overlay.style.fontFamily = "system-ui, -apple-system, sans-serif";

            const modal = document.createElement("div");
            modal.style.backgroundColor = "#ffffff";
            modal.style.borderRadius = "24px";
            modal.style.width = "100%";
            modal.style.maxWidth = "460px";
            modal.style.boxShadow = "0 25px 50px -12px rgba(0, 0, 0, 0.25)";
            modal.style.border = "1px solid #e2e8f0";
            modal.style.overflow = "hidden";
            modal.style.display = "flex";
            modal.style.flexDirection = "column";

            const header = document.createElement("div");
            header.style.backgroundColor = "#4f46e5";
            header.style.color = "#ffffff";
            header.style.padding = "24px";
            header.style.textAlign = "center";

            const title = document.createElement("h3");
            title.innerText = "SVEC Hackathon Gateway";
            title.style.fontSize = "18px";
            title.style.fontWeight = "800";
            title.style.margin = "0";

            const subtitle = document.createElement("p");
            subtitle.innerText = "SIMULATION SANDBOX (LOCALHOST FRIENDLY)";
            subtitle.style.fontSize = "11px";
            subtitle.style.fontWeight = "600";
            subtitle.style.margin = "4px 0 0 0";
            subtitle.style.opacity = "0.9";
            subtitle.style.letterSpacing = "0.05em";

            header.appendChild(title);
            header.appendChild(subtitle);

            const body = document.createElement("div");
            body.style.padding = "28px 24px";
            body.style.display = "flex";
            body.style.flexDirection = "column";
            body.style.gap = "20px";

            const detailsBox = document.createElement("div");
            detailsBox.style.backgroundColor = "#f8fafc";
            detailsBox.style.border = "1px solid #e2e8f0";
            detailsBox.style.borderRadius = "16px";
            detailsBox.style.padding = "16px";
            detailsBox.style.display = "flex";
            detailsBox.style.flexDirection = "column";
            detailsBox.style.gap = "10px";

            const row1 = document.createElement("div");
            row1.style.display = "flex";
            row1.style.justifyContent = "space-between";
            row1.style.fontSize = "12px";
            row1.innerHTML = `<span style="color: #64748b; font-weight: 500;">Recipient</span><span style="color: #0f172a; font-weight: 600;">SVEC SIH Portal</span>`;

            const row2 = document.createElement("div");
            row2.style.display = "flex";
            row2.style.justifyContent = "space-between";
            row2.style.fontSize = "12px";
            row2.innerHTML = `<span style="color: #64748b; font-weight: 500;">Payer Email</span><span style="color: #0f172a; font-weight: 600; word-break: break-all;">${this.options.prefill?.email || "student@svec.edu.in"}</span>`;

            const row3 = document.createElement("div");
            row3.style.display = "flex";
            row3.style.justifyContent = "space-between";
            row3.style.alignItems = "center";
            row3.style.paddingTop = "10px";
            row3.style.borderTop = "1px dashed #e2e8f0";
            row3.innerHTML = `<span style="color: #0f172a; font-weight: 700; font-size: 14px;">Total Amount</span><span style="color: #4f46e5; font-weight: 800; font-size: 18px;">₹${(this.options.amount / 100).toFixed(2)}</span>`;

            detailsBox.appendChild(row1);
            detailsBox.appendChild(row2);
            detailsBox.appendChild(row3);

            const desc = document.createElement("p");
            desc.innerText = "This modal simulates the Razorpay Checkout flow locally. You can proceed with a successful completion or simulate a cancelled transaction.";
            desc.style.fontSize = "11px";
            desc.style.color = "#64748b";
            desc.style.lineHeight = "1.5";
            desc.style.margin = "0";

            const actions = document.createElement("div");
            actions.style.display = "flex";
            actions.style.flexDirection = "column";
            actions.style.gap = "10px";

            const successBtn = document.createElement("button");
            successBtn.innerText = "Simulate Success (Complete Payment)";
            successBtn.style.backgroundColor = "#10b981";
            successBtn.style.color = "#ffffff";
            successBtn.style.border = "none";
            successBtn.style.borderRadius = "12px";
            successBtn.style.padding = "14px";
            successBtn.style.fontSize = "13px";
            successBtn.style.fontWeight = "700";
            successBtn.style.cursor = "pointer";

            const cancelBtn = document.createElement("button");
            cancelBtn.innerText = "Cancel / Dismiss Payment";
            cancelBtn.style.backgroundColor = "#ffffff";
            cancelBtn.style.color = "#64748b";
            cancelBtn.style.border = "1px solid #cbd5e1";
            cancelBtn.style.borderRadius = "12px";
            cancelBtn.style.padding = "14px";
            cancelBtn.style.fontSize = "13px";
            cancelBtn.style.fontWeight = "600";
            cancelBtn.style.cursor = "pointer";

            successBtn.onclick = () => {
              document.body.removeChild(overlay);
              const paymentId = "pay_mock_" + Math.random().toString(36).substring(2, 11);
              this.options.handler({
                razorpay_payment_id: paymentId,
                razorpay_order_id: this.options.order_id,
                razorpay_signature: "mock_signature_svec_sih_2026"
              });
            };

            cancelBtn.onclick = () => {
              document.body.removeChild(overlay);
              if (this.options.modal?.ondismiss) {
                this.options.modal.ondismiss();
              }
            };

            actions.appendChild(successBtn);
            actions.appendChild(cancelBtn);

            body.appendChild(detailsBox);
            body.appendChild(desc);
            body.appendChild(actions);

            modal.appendChild(header);
            modal.appendChild(body);
            overlay.appendChild(modal);
            document.body.appendChild(overlay);
          }
        };
        resolve(true);
        return;
      }

      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleProceedWithPayment = async () => {
    setPaymentLoading(true);
    setPaymentError("");
    setPaymentStatusMessage("Initiating secure Razorpay payment...");

    try {
      const orderRes = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentEmail: registration.studentEmail })
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) {
        setPaymentError(orderData.error || "Failed to initiate payment. Please contact SVEC admin.");
        setPaymentLoading(false);
        setPaymentStatusMessage("");
        return;
      }

      setPaymentStatusMessage("Opening Razorpay payment gateway...");
      const isScriptLoaded = await loadRazorpayScript(orderData.keyId);
      if (!isScriptLoaded) {
        setPaymentError("Failed to load payment checkout script. Please check your network connection.");
        setPaymentLoading(false);
        setPaymentStatusMessage("");
        return;
      }

      setPaymentStatusMessage("Please complete the payment in the Razorpay pop-up...");

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "SVEC SIH Hackathon 2026",
        description: `Registration Fee: ₹${orderData.amount / 100}`,
        order_id: orderData.orderId,
        handler: async function (response: any) {
          setPaymentStatusMessage("Verifying secure signature with SVEC server...");
          try {
            const verifyRes = await fetch("/api/registrations/verify-payment", {
              method: "POST",
              headers: getAuthHeaders({ "Content-Type": "application/json" }),
              body: JSON.stringify({
                registrationId: registration.registrationId,
                paymentId: response.razorpay_payment_id,
                orderId: response.razorpay_order_id,
                signature: response.razorpay_signature
              })
            });

            const verifyData = await verifyRes.json();
            if (verifyRes.ok && verifyData.success) {
              setPaymentStatusMessage("Payment completed successfully!");
              if (onUpdateRegistration) {
                onUpdateRegistration(verifyData.registration);
              }
            } else {
              setPaymentError(verifyData.error || "Payment verification failed. Please contact support.");
            }
          } catch (err: any) {
            setPaymentError("Network error during payment verification.");
          } finally {
            setPaymentLoading(false);
            setPaymentStatusMessage("");
          }
        },
        prefill: {
          name: registration.leadName,
          email: registration.studentEmail,
          contact: registration.leadMobile
        },
        theme: {
          color: "#4f46e5"
        },
        modal: {
          ondismiss: function() {
            setPaymentLoading(false);
            setPaymentStatusMessage("");
            setPaymentError("Payment was cancelled. You must complete the payment to complete registration.");
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      console.error("Payment initialization error", err);
      setPaymentError("Failed to load payment portal. Please try again.");
      setPaymentLoading(false);
      setPaymentStatusMessage("");
    }
  };

  // Sync state with registration prop updates
  useEffect(() => {
    setAbstract(registration.abstract || "");
    setImplementationSteps(registration.implementationSteps || "");
    setPptFileName(registration.pptFileName || "");
    setPptBase64(registration.pptBase64 || "");
    setProposalStatus(registration.proposalStatus || "saved");

    setLeadName(registration.leadName || "");
    setLeadMobile(registration.leadMobile || "");
    setLeadGender(registration.leadGender || "Male");
    setMember1(registration.member1 || "");
    setMember1Gender(registration.member1Gender || "Male");
    setMember1Email(registration.member1Email || "");
    setMember1Phone(registration.member1Phone || "");
    setMember2(registration.member2 || "");
    setMember2Gender(registration.member2Gender || "Male");
    setMember2Email(registration.member2Email || "");
    setMember2Phone(registration.member2Phone || "");
    setMember3(registration.member3 || "");
    setMember3Gender(registration.member3Gender || "Male");
    setMember3Email(registration.member3Email || "");
    setMember3Phone(registration.member3Phone || "");
    setMember4(registration.member4 || "");
    setMember4Gender(registration.member4Gender || "Male");
    setMember4Email(registration.member4Email || "");
    setMember4Phone(registration.member4Phone || "");
    setMember5(registration.member5 || "");
    setMember5Gender(registration.member5Gender || "Male");
    setMember5Email(registration.member5Email || "");
    setMember5Phone(registration.member5Phone || "");
    setMentorName(registration.mentorName || "");
  }, [registration]);

  const fetchStudentProfile = async () => {
    setProfileLoading(true);
    setProfileError("");
    setProfileSuccess("");
    try {
      const res = await fetch(`/api/students/profile?email=${encodeURIComponent(registration.studentEmail || "")}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setProfileMobile(data.mobile || "");
        setProfileGender(data.gender || "");
        setProfileDept(data.department || "");
      } else {
        setProfileError("Could not retrieve profile info.");
      }
    } catch (err) {
      setProfileError("Network error. Failed to load profile.");
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "profile") {
      fetchStudentProfile();
    }
  }, [activeTab]);

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date(registration.submittedAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });

  // Check if student has filled all fields to enable submission
  const isAbstractFilled = abstract.trim().length >= 10;
  const isStepsFilled = implementationSteps.trim().length >= 10;
  const isPptUploaded = pptFileName.trim().length > 0;
  const canSubmit = isAbstractFilled && isStepsFilled && isPptUploaded;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (proposalStatus === "submitted") return;
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (proposalStatus === "submitted") return;
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelection(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (proposalStatus === "submitted") return;
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelection(files[0]);
    }
  };

  const handleFileSelection = (file: File) => {
    // Check file type: PPT or PDF
    const fileExtension = file.name.split(".").pop()?.toLowerCase();
    const allowedExtensions = ["ppt", "pptx", "pdf"];
    if (!allowedExtensions.includes(fileExtension || "")) {
      setErrorMsg("Invalid file type. Please upload a PPT, PPTX or PDF file.");
      return;
    }

    // Limit size to 12MB
    if (file.size > 12 * 1024 * 1024) {
      setErrorMsg("File is too large. Maximum allowed size is 12MB.");
      return;
    }

    setErrorMsg("");
    setSuccessMsg("");

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setPptBase64(result);
      setPptFileName(file.name);
    };
    reader.onerror = () => {
      setErrorMsg("Failed to read the file. Please try again.");
    };
    reader.readAsDataURL(file);
  };

  const removeUploadedFile = () => {
    if (proposalStatus === "submitted") return;
    setPptFileName("");
    setPptBase64("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const triggerFileBrowser = () => {
    if (proposalStatus === "submitted") return;
    fileInputRef.current?.click();
  };

  const handleSaveOrSubmit = async (status: "saved" | "submitted") => {
    if (status === "submitted" && !canSubmit) {
      setErrorMsg("Please complete all requirements in the checklist before submitting.");
      return;
    }

    setSaving(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/registrations/my/proposal", {
        method: "PUT",
        headers: getAuthHeaders({
          "Content-Type": "application/json"
        }),
        body: JSON.stringify({
          email: registration.studentEmail,
          abstract,
          implementationSteps,
          pptFileName,
          pptBase64,
          proposalStatus: status
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(data.message);
        if (onUpdateRegistration) {
          onUpdateRegistration(data.registration);
        }
      } else {
        setErrorMsg(data.error || "Failed to update proposal.");
      }
    } catch (err) {
      setErrorMsg("Network error. Failed to save project proposal.");
    } finally {
      setSaving(false);
    }
  };

  // Helper to trigger download of the PPT (server URL or fallback)
  const downloadPpt = () => {
    if (registration.pptFileUrl) {
      window.open(registration.pptFileUrl, "_blank");
      return;
    }
    if (registration.id) {
      window.open(`/api/registrations/${registration.id}/ppt`, "_blank");
      return;
    }
    if (pptBase64) {
      const link = document.createElement("a");
      link.href = pptBase64;
      link.download = pptFileName || "project-presentation.pptx";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 print:py-0">
      
      {/* Top Navigation Tabs */}
      <div className="flex justify-center mb-8 print:hidden">
        <div className="bg-slate-100 p-1.5 rounded-2xl flex flex-wrap sm:flex-nowrap gap-1 border border-slate-200 shadow-sm max-w-2xl w-full">
          <button
            onClick={() => setActiveTab("slip")}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "slip"
                ? "bg-white text-indigo-700 shadow-md"
                : "text-slate-600 hover:text-slate-900"
            }`}
            id="tab-registration-slip"
          >
            <FileText className="w-4 h-4" />
            Ticket
          </button>
          <button
            onClick={() => setActiveTab("proposal")}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "proposal"
                ? "bg-white text-indigo-700 shadow-md"
                : "text-slate-600 hover:text-slate-900"
            }`}
            id="tab-project-proposal"
          >
            <Layers className="w-4 h-4" />
            Project Submission
          </button>
          <button
            onClick={() => setActiveTab("profile")}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "profile"
                ? "bg-white text-indigo-700 shadow-md"
                : "text-slate-600 hover:text-slate-900"
            }`}
            id="tab-student-profile"
          >
            <User className="w-4 h-4" />
            My Profile
          </button>
          <button
            onClick={() => setActiveTab("team")}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "team"
                ? "bg-white text-indigo-700 shadow-md"
                : "text-slate-600 hover:text-slate-900"
            }`}
            id="tab-manage-team"
          >
            <Users className="w-4 h-4" />
            Manage Team
          </button>
          {enableCertificates && (
            <button
              onClick={() => setActiveTab("certificates")}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === "certificates"
                  ? "bg-white text-indigo-700 shadow-md"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              id="tab-certificates"
            >
              <Award className="w-4 h-4" />
              Certificates
            </button>
          )}
        </div>
      </div>

      {/* SELECTION CELEBRATION BANNER */}
      {registration.isFinalSelected && (
        <div className="mb-6 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-3xl p-6 shadow-lg border border-emerald-400 relative overflow-hidden animate-fade-in print:hidden">
          {/* Ambient light circles for high-end aesthetic */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-teal-400/20 rounded-full blur-xl -ml-8 -mb-8"></div>
          
          <div className="relative z-10 flex flex-col sm:flex-row items-center gap-5">
            <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl text-yellow-300">
              <Trophy className="w-8 h-8 animate-bounce" />
            </div>
            <div className="text-center sm:text-left flex-1 space-y-1">
              <span className="inline-flex items-center gap-1 bg-emerald-700/50 border border-emerald-400/40 text-emerald-100 text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-1 rounded-full">
                <Sparkles className="w-3 h-3 text-yellow-300 animate-spin" /> Nominated for Next Round
              </span>
              <h3 className="text-xl font-extrabold font-display leading-tight tracking-tight mt-1.5">
                Congratulations! Your Team is Selected!
              </h3>
              <p className="text-sm text-emerald-50 font-medium max-w-xl">
                We are thrilled to announce that your team <strong className="font-extrabold underline">{registration.teamName}</strong> has been selected for the next level of Smart India Hackathon.
              </p>
              {registration.selectionNotes && (
                <div className="mt-3 p-3 bg-white/10 border border-white/15 rounded-xl text-xs text-emerald-100 leading-relaxed font-sans italic">
                  <strong className="not-italic font-bold block mb-0.5 text-yellow-300">Jury Remarks & Next Steps:</strong>
                  "{registration.selectionNotes}"
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payment Pending Banner */}
      {registration.paymentStatus === "pending" && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl p-5 shadow-sm print:hidden animate-fade-in">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="p-2 bg-amber-100 rounded-xl text-amber-700 font-bold text-lg leading-none">⚠️</span>
              <div>
                <h4 className="text-sm font-bold text-amber-800">Registration Payment Pending</h4>
                <p className="text-xs text-amber-700/90 mt-0.5 leading-relaxed">
                  Your team registration for <strong className="font-semibold">{registration.teamName}</strong> is created, but payment is pending. Please proceed with the payment to complete the registration.
                </p>
              </div>
            </div>
            <button
              onClick={handleProceedWithPayment}
              disabled={paymentLoading}
              className="px-5 py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-all shadow-sm shrink-0 flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {paymentLoading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  Processing...
                </>
              ) : (
                <>
                  <span>Proceed with Payment</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>

          {paymentStatusMessage && (
            <div className="mt-4 p-3 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-xl text-xs font-mono flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></span>
              <span>{paymentStatusMessage}</span>
            </div>
          )}

          {paymentError && (
            <div className="mt-4 p-3 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl text-xs font-mono flex items-start gap-1.5">
              <span>❌</span>
              <span>{paymentError}</span>
            </div>
          )}
        </div>
      )}

      <AnimatePresence mode="wait">
        {activeTab === "slip" && (
          <motion.div
            key="slip-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            {/* Top Animation & Banner */}
            <div className="text-center mb-8 print:hidden">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full text-emerald-600 mb-4 animate-bounce">
                <CheckCircle className="w-10 h-10" />
              </div>
              <h1 className="text-3xl font-bold font-display text-slate-800 tracking-tight">
                Registration Successful!
              </h1>
              <p className="text-slate-500 mt-2 text-sm max-w-md mx-auto">
                Your team has been successfully registered for the SVEC - SIH Internal Hackathon 2026. A confirmation ticket has been generated below.
              </p>
            </div>

            {/* Styled Ticket / Receipt */}
            <div
              className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden relative print:shadow-none print:border-slate-300"
              id="receipt-ticket"
            >
              {/* Ticket Header */}
              <div className="bg-slate-900 text-white px-6 py-8 relative print:bg-white print:text-slate-900 print:border-b print:border-slate-300">
                <div className="absolute top-1/2 -translate-y-1/2 right-6 p-2 opacity-15 pointer-events-none print:opacity-30">
                  <SvecLogo className="w-28 h-28" />
                </div>

                <div className="flex justify-between items-start relative z-10 pr-16 md:pr-24">
                  <div>
                    <p className="text-indigo-400 text-xs font-bold uppercase tracking-widest print:text-indigo-600">
                      SVEC - SIH Internal Hackathon 2026
                    </p>
                    <h2 className="text-2xl font-extrabold font-display mt-1 print:text-slate-800">
                      Official Registration Slip
                    </h2>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-xs bg-indigo-500/20 text-indigo-200 border border-indigo-400/20 px-3 py-1.5 rounded-lg font-bold print:bg-indigo-50 print:text-indigo-700 print:border-indigo-200">
                      {registration.registrationId}
                    </span>
                  </div>
                </div>

                {/* Ticket barcode effect */}
                <div className="mt-6 pt-6 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400 print:border-slate-200 print:text-slate-500">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-400" />
                    <span>Registered on {formattedDate}</span>
                  </div>
                  <div className="font-mono text-[9px] tracking-widest bg-white p-1 rounded-sm opacity-90 text-slate-900 print:opacity-100 print:border print:border-slate-300">
                    ||||| | | |||| || | || |||
                  </div>
                </div>
              </div>

              {/* Ticket Body with details */}
              <div className="p-6 md:p-8 space-y-6">
                
                {/* Team and Problem Statement Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-6 border-b border-slate-100 print:border-slate-200">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Team Name</span>
                    <span className="text-lg font-bold text-indigo-900 font-display block mt-0.5">{registration.teamName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Faculty Mentor</span>
                    <span className="text-base font-semibold text-slate-800 block mt-0.5">{registration.mentorName}</span>
                  </div>
                </div>

                {/* Problem Statement Details */}
                {statement && (
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/60 print:bg-slate-50">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Mapping Problem Statement</span>
                    <div className="flex gap-2 items-center mb-1">
                      <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-md">
                        {statement.code}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-md">
                        {statement.category}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-slate-800 leading-snug">
                      {statement.title}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      <span className="font-medium text-slate-600">Nodal Agency:</span> {statement.organization}
                    </p>
                  </div>
                )}

                {/* Leader Info */}
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    Team Leader Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50/50 rounded-xl p-4 border border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Name</span>
                      <span className="text-sm font-bold text-slate-700">{registration.leadName}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Department</span>
                      <span className="text-sm font-semibold text-slate-600">{registration.leadDepartment}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Mobile No</span>
                      <span className="text-sm font-semibold text-slate-600 font-mono">{registration.leadMobile}</span>
                    </div>
                  </div>
                </div>

                {/* Members Info */}
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      Team Members {teamMembersCount > 0 ? `(${teamMembersCount})` : ""}
                    </span>
                    {teamMembersCount > 0 && (
                      <span className="text-[10px] font-normal text-slate-400">
                        Total Team Size: {teamMembersCount + 1}
                      </span>
                    )}
                  </h3>

                  {teamMembersCount === 0 ? (
                    <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-3.5 text-xs text-slate-500 italic flex items-center gap-2">
                      <span>Solo Registration (Individual participant — No additional team members configured).</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {Array.from({ length: teamMembersCount }, (_, idx) => idx + 1).map((num) => {
                        const name = (registration as any)[`member${num}`] || "";
                        const gender = (registration as any)[`member${num}Gender`];
                        const email = (registration as any)[`member${num}Email`];
                        const phone = (registration as any)[`member${num}Phone`];
                        const year = (registration as any)[`member${num}AcademicYear`];

                        return (
                          <div
                            key={num}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2.5 px-3.5 bg-slate-50/50 hover:bg-slate-50 rounded-xl transition-colors border border-slate-100/80"
                          >
                            <div className="flex items-center gap-3">
                              <span className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 text-xs flex items-center justify-center font-bold font-mono border border-indigo-100 shrink-0">
                                {num}
                              </span>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold text-slate-800">
                                    {name || <span className="text-slate-400 italic">Member {num}</span>}
                                  </span>
                                  {gender && (
                                    <span
                                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                        gender.toLowerCase() === "female"
                                          ? "bg-pink-50 text-pink-700 border border-pink-200"
                                          : "bg-blue-50 text-blue-700 border border-blue-200"
                                      }`}
                                    >
                                      {gender}
                                    </span>
                                  )}
                                </div>
                                {(email || phone) && (
                                  <div className="flex items-center gap-2.5 text-[11px] text-slate-500 mt-0.5">
                                    {email && <span className="truncate">{email}</span>}
                                    {email && phone && <span className="text-slate-300">•</span>}
                                    {phone && <span className="font-mono">{phone}</span>}
                                  </div>
                                )}
                              </div>
                            </div>
                            {year && (
                              <span className="text-[10px] font-medium text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 self-start sm:self-center">
                                {year}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Payment Status / Information */}
                {registration.paymentStatus && (
                  <div className={`rounded-xl p-4 border ${
                    registration.paymentStatus === "paid"
                      ? "bg-emerald-50/40 border-emerald-100"
                      : registration.paymentStatus === "pending"
                      ? "bg-amber-50/40 border-amber-100"
                      : "bg-slate-50 border-slate-100"
                  }`}>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Payment Information
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-slate-400 block">Payment Status</span>
                        <span className={`font-bold uppercase ${
                          registration.paymentStatus === "paid"
                            ? "text-emerald-700"
                            : registration.paymentStatus === "pending"
                            ? "text-amber-700 font-extrabold animate-pulse"
                            : "text-slate-700"
                        }`}>
                          {registration.paymentStatus === "paid" ? "Paid" : registration.paymentStatus === "pending" ? "Pending" : "Waived / Free"}
                        </span>
                      </div>
                      {registration.paymentStatus === "paid" && (
                        <div>
                          <span className="text-slate-400 block">Amount Paid</span>
                          <span className="font-bold text-slate-800 text-sm">₹{registration.amountPaid}</span>
                        </div>
                      )}
                      {registration.paymentId && (
                        <div className="sm:col-span-2 pt-2 border-t border-slate-100">
                          <span className="text-slate-400 block">Transaction Reference ID</span>
                          <span className="font-mono font-semibold text-slate-600 block break-all select-all">
                            {registration.paymentId}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Gender Diversity Check */}
                <div className="flex justify-between items-center bg-indigo-50/50 rounded-xl p-4 border border-indigo-100">
                  <div className="text-xs">
                    <p className="font-semibold text-slate-800">Gender Diversity Criteria</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {genderDiversityRequired 
                        ? "At least one female member is compulsory for this event." 
                        : "Optional for this event. Encouraged but not compulsory."}
                    </p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold border ${
                    registration.hasFemaleMember
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : genderDiversityRequired
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-slate-50 text-slate-600 border-slate-200"
                  }`}>
                    {registration.hasFemaleMember 
                      ? "Yes (Compliant)" 
                      : genderDiversityRequired 
                        ? "No (Non-compliant)" 
                        : "No (Optional)"}
                  </div>
                </div>

              </div>

              {/* Ticket Footer decoration */}
              <div className="bg-slate-50 px-6 py-5 border-t border-dashed border-slate-200 text-center text-slate-400 text-[10px] flex justify-between items-center print:bg-white print:border-slate-300">
                <span>Validated by SVEC SIH Institutional SPOC Office</span>
                <span className="font-bold text-indigo-600">STATUS: VERIFIED</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 mt-8 print:hidden">
              <button
                onClick={handlePrint}
                className="flex-1 py-3 px-4 rounded-xl font-bold bg-slate-800 hover:bg-slate-900 text-white flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer shadow-xs"
              >
                <Printer className="w-4 h-4" />
                Print / Save Slip
              </button>
              
              <button
                type="button"
                onClick={() => setShowConsentLetter(true)}
                className="flex-1 py-3 px-4 rounded-xl font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer shadow-xs"
                title="Generate & Download official SIH Consent / Nomination Letter"
              >
                <FileText className="w-4 h-4 text-indigo-600" />
                Nomination Letter
              </button>

              {lockRegisterAnotherTeam ? (
                <button
                  disabled
                  className="flex-1 py-3 px-4 rounded-xl font-bold bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center gap-2 cursor-not-allowed"
                >
                  <Lock className="w-4 h-4 text-slate-400" />
                  Register Another (Locked)
                </button>
              ) : (
                <button
                  onClick={onReset}
                  className="flex-1 py-3 px-4 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer shadow-md shadow-indigo-100"
                >
                  Register Another Team
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === "proposal" && (
          <motion.div
            key="proposal-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden p-6 md:p-8 text-left space-y-6"
          >
            <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-extrabold font-display text-slate-800">Project Proposal Submission</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Describe your solution abstract, upload your pitch PPT, and chart out implementation steps for your problem statement.
                </p>
              </div>
              <div>
                {proposalStatus === "submitted" ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <Lock className="w-3.5 h-3.5" />
                    Submitted & Locked
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    <Save className="w-3.5 h-3.5" />
                    In Progress (Draft)
                  </span>
                )}
              </div>
            </div>

            {/* Notification Messages */}
            {successMsg && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-4 flex gap-3 text-xs md:text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-bold">Success!</span> {successMsg}
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="bg-red-50 border border-red-200 text-red-800 rounded-2xl p-4 flex gap-3 text-xs md:text-sm">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                <div>
                  <span className="font-bold">Error:</span> {errorMsg}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Form Input fields */}
              <div className="lg:col-span-2 space-y-5">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    1. Project Abstract / Summary Solution
                  </label>
                  <p className="text-[11px] text-slate-400">
                    Provide a concise summary of your idea, novelty, and how it addresses the chosen problem statement. (Minimum 10 characters)
                  </p>
                  <textarea
                    rows={6}
                    disabled={proposalStatus === "submitted"}
                    placeholder="Describe your solution, target audience, core logic, unique value propositions..."
                    value={abstract}
                    onChange={(e) => setAbstract(e.target.value)}
                    className={`w-full px-4 py-3 border rounded-xl text-xs md:text-sm outline-none transition-all resize-none ${
                      proposalStatus === "submitted"
                        ? "bg-slate-50 border-slate-200 text-slate-500 cursor-not-allowed"
                        : "border-slate-200 focus:border-indigo-500 bg-white"
                    }`}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    2. Implementation Steps / Methodology
                  </label>
                  <p className="text-[11px] text-slate-400">
                    Detail the technological stack, architecture, hardware components, database strategy, and step-by-step milestones. (Minimum 10 characters)
                  </p>
                  <textarea
                    rows={6}
                    disabled={proposalStatus === "submitted"}
                    placeholder="Phase 1: Architecture design, Phase 2: Core modules, Phase 3: Integration, Phase 4: Pilot deployment..."
                    value={implementationSteps}
                    onChange={(e) => setImplementationSteps(e.target.value)}
                    className={`w-full px-4 py-3 border rounded-xl text-xs md:text-sm outline-none transition-all resize-none ${
                      proposalStatus === "submitted"
                        ? "bg-slate-50 border-slate-200 text-slate-500 cursor-not-allowed"
                        : "border-slate-200 focus:border-indigo-500 bg-white"
                    }`}
                  />
                </div>
              </div>

              {/* Sidebar Checklist & File Uploader */}
              <div className="space-y-6">
                
                {/* SAMPLE PPT DEMO & TEMPLATE REFERENCE DOWNLOAD */}
                {samplePptConfig.enabled && (
                  <div className="bg-gradient-to-br from-indigo-50/90 via-slate-50 to-blue-50/60 border border-indigo-100/90 rounded-2xl p-4 md:p-5 space-y-3.5 shadow-xs">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-xs shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs font-bold text-slate-800 font-display">
                            Sample Pitch PPT & Demo Template
                          </h4>
                          <span className="text-[9px] font-bold text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded-full border border-indigo-200">
                            Official Resource
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                          {samplePptConfig.description || "Download the official PowerPoint presentation template to structure your project pitch slides according to SIH guidelines."}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 pt-1 border-t border-indigo-100/70">
                      {samplePptConfig.fileBase64 ? (
                        <a
                          href={samplePptConfig.fileBase64}
                          download={samplePptConfig.fileName || "SVEC_SIH_Sample_Proposal_Template.pptx"}
                          className="flex-1 py-2 px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 text-center"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Download Sample PPT
                        </a>
                      ) : (
                        <a
                          href="/api/settings/sample-ppt/download"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-2 px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 text-center"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Download Sample PPT
                        </a>
                      )}

                      {samplePptConfig.url && (
                        <a
                          href={samplePptConfig.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-2 px-3.5 bg-white hover:bg-slate-50 text-indigo-700 border border-indigo-200 font-bold text-xs rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 shrink-0"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-indigo-600" />
                          Demo Link
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* PPT File upload */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    3. Upload Pitch Presentation PPT/PDF
                  </label>
                  
                  {pptFileName ? (
                    <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
                          <FileUp className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-700 break-all truncate" title={pptFileName}>
                            {pptFileName}
                          </p>
                          <span className="inline-block text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded mt-1">
                            Ready to Save
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-1">
                        {pptBase64 && (
                          <button
                            type="button"
                            onClick={downloadPpt}
                            className="flex-1 py-2 px-3 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-[10px] rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Download PPT
                          </button>
                        )}
                        {proposalStatus !== "submitted" && (
                          <button
                            type="button"
                            onClick={removeUploadedFile}
                            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-red-100"
                            title="Remove presentation file"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={triggerFileBrowser}
                      className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3 ${
                        proposalStatus === "submitted"
                          ? "bg-slate-50 border-slate-100 cursor-not-allowed text-slate-400"
                          : isDragging
                          ? "border-indigo-500 bg-indigo-50/40 text-indigo-600"
                          : "border-slate-200 hover:border-indigo-400 hover:bg-slate-50/50 text-slate-500"
                      }`}
                    >
                      <CloudUpload className="w-8 h-8 text-indigo-500 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-slate-700">Drag & Drop presentation file</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">or click to browse from device</p>
                        <p className="text-[9px] text-indigo-600 mt-2 font-semibold">Allowed: .ppt, .pptx, .pdf (Max 12MB)</p>
                      </div>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept=".ppt,.pptx,.pdf"
                        className="hidden"
                        disabled={proposalStatus === "submitted"}
                      />
                    </div>
                  )}
                </div>

                {/* Submit Checklist */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/60 text-xs text-slate-600 space-y-3">
                  <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px] block">
                    Submission Requirement Checklist:
                  </span>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        isAbstractFilled ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-500"
                      }`}>
                        {isAbstractFilled ? <Check className="w-3 h-3 text-emerald-700" /> : "1"}
                      </span>
                      <span className={isAbstractFilled ? "line-through text-slate-400 font-medium" : "font-medium"}>
                        Solution Abstract (min 10 chars)
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        isStepsFilled ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-500"
                      }`}>
                        {isStepsFilled ? <Check className="w-3 h-3 text-emerald-700" /> : "2"}
                      </span>
                      <span className={isStepsFilled ? "line-through text-slate-400 font-medium" : "font-medium"}>
                        Implementation Steps (min 10 chars)
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        isPptUploaded ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-500"
                      }`}>
                        {isPptUploaded ? <Check className="w-3 h-3 text-emerald-700" /> : "3"}
                      </span>
                      <span className={isPptUploaded ? "line-through text-slate-400 font-medium" : "font-medium"}>
                        Upload Presentation Pitch PPT
                      </span>
                    </div>
                  </div>

                  {!canSubmit && proposalStatus !== "submitted" && (
                    <div className="text-[10px] bg-indigo-50 border border-indigo-100 text-indigo-700 p-2.5 rounded-xl leading-normal">
                      💡 You can save this work as a <strong>draft</strong> anytime. Final Submission is locked until all checklist items are ticked.
                    </div>
                  )}
                </div>

                {/* Form Buttons */}
                <div className="space-y-2 pt-2">
                  {proposalStatus !== "submitted" ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleSaveOrSubmit("saved")}
                        disabled={saving}
                        className="w-full py-3 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                        id="btn-proposal-save"
                      >
                        <Save className="w-4 h-4" />
                        {saving ? "Saving Draft..." : "Save Draft"}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm("Are you absolutely sure you want to lock and submit this proposal? You will not be able to edit it afterwards.")) {
                            handleSaveOrSubmit("submitted");
                          }
                        }}
                        disabled={saving || !canSubmit}
                        className={`w-full py-3 font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                          canSubmit
                            ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-150 glow-btn"
                            : "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                        }`}
                        id="btn-proposal-submit"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Final Lock & Submit Project
                      </button>
                    </>
                  ) : (
                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center text-emerald-800 text-xs font-bold flex flex-col items-center gap-1.5">
                      <Lock className="w-5 h-5 text-emerald-600" />
                      <span>This project has been submitted.</span>
                      <span className="text-[10px] font-medium text-slate-400">Reach out to SPOC office for reset.</span>
                    </div>
                  )}
                </div>

              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "profile" && (
          <motion.div
            key="profile-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="space-y-6"
          >
            <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 text-left shadow-sm">
              <h2 className="text-xl font-bold font-display text-slate-800 flex items-center gap-2">
                <User className="w-5 h-5 text-indigo-500" />
                My Profile Details
              </h2>
              <p className="text-slate-500 text-xs mt-1">
                View your registered account credentials and manage your account security.
              </p>

              {profileLoading ? (
                <div className="py-12 text-center">
                  <span className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin inline-block"></span>
                  <p className="text-xs text-slate-400 mt-2">Retrieving profile...</p>
                </div>
              ) : (
                <div className="mt-6 space-y-6">
                  {profileError && (
                    <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-3 flex gap-2 text-xs">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      <span>{profileError}</span>
                    </div>
                  )}

                  {profileSuccess && (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-3 flex gap-2 text-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{profileSuccess}</span>
                    </div>
                  )}

                  {lockStudentUpdates && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-3.5 flex gap-2.5 text-xs font-semibold text-amber-800 shadow-xs">
                      <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <span>Editing locked: Profile modifications have been disabled by the SPOC Administrator.</span>
                    </div>
                  )}

                  {/* Profile form */}
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (lockStudentUpdates) return;
                      setProfileError("");
                      setProfileSuccess("");
                      setProfileLoading(true);

                      try {
                        const res = await fetch("/api/students/profile", {
                          method: "PUT",
                          headers: getAuthHeaders({ "Content-Type": "application/json" }),
                          body: JSON.stringify({
                            email: registration.studentEmail,
                            gender: profileGender,
                            department: profileDept,
                            mobile: profileMobile
                          })
                        });

                        const data = await res.json();
                        if (res.ok && data.success) {
                          setProfileSuccess("Profile details updated successfully.");
                        } else {
                          setProfileError(data.error || "Failed to update profile.");
                        }
                      } catch (err) {
                        setProfileError("Network error. Please try again.");
                      } finally {
                        setProfileLoading(false);
                      }
                    }}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-b border-slate-100 pb-6"
                  >
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Email Address (Read-only)</label>
                      <input
                        type="text"
                        value={registration.studentEmail || ""}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-500 outline-none cursor-not-allowed"
                        disabled
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Phone Number</label>
                      <input
                        type="text"
                        placeholder="10-digit mobile"
                        value={profileMobile}
                        onChange={(e) => setProfileMobile(e.target.value)}
                        className={`w-full px-4 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 transition-all font-mono ${
                          lockStudentUpdates ? "bg-slate-50 text-slate-400 cursor-not-allowed" : "bg-white"
                        }`}
                        required
                        disabled={lockStudentUpdates}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Gender</label>
                      <select
                        value={profileGender}
                        onChange={(e) => setProfileGender(e.target.value)}
                        className={`w-full px-4 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 cursor-pointer ${
                          lockStudentUpdates ? "bg-slate-50 text-slate-400 cursor-not-allowed" : "bg-white"
                        }`}
                        required
                        disabled={lockStudentUpdates}
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Department</label>
                      <select
                        value={profileDept}
                        onChange={(e) => setProfileDept(e.target.value)}
                        className={`w-full px-4 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 cursor-pointer ${
                          lockStudentUpdates ? "bg-slate-50 text-slate-400 cursor-not-allowed" : "bg-white"
                        }`}
                        required
                        disabled={lockStudentUpdates}
                      >
                        <option value="CSE">Computer Science & Engineering (CSE)</option>
                        <option value="CSE-AI">CSE - Artificial Intelligence (CSE-AI)</option>
                        <option value="CSE-DS">CSE - Data Science (CSE-DS)</option>
                        <option value="IT">Information Technology (IT)</option>
                        <option value="ECE">Electronics & Communication (ECE)</option>
                        <option value="EEE">Electrical & Electronics (EEE)</option>
                        <option value="ME">Mechanical Engineering (ME)</option>
                        <option value="CE">Civil Engineering (CE)</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2 text-right pt-2">
                      <button
                        type="submit"
                        disabled={lockStudentUpdates}
                        className={`px-5 py-2.5 font-bold text-xs rounded-xl shadow-md transition-all ${
                          lockStudentUpdates
                            ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                            : "bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
                        }`}
                      >
                        {lockStudentUpdates ? "Profile Editing Locked" : "Save Profile Info"}
                      </button>
                    </div>
                  </form>

                  {/* Password reset form */}
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      setProfileError("");
                      setProfileSuccess("");

                      if (profileNewPass !== profileConfirmPass) {
                        setProfileError("New passwords do not match.");
                        return;
                      }

                      if (profileNewPass.length < 6) {
                        setProfileError("New password must be at least 6 characters long.");
                        return;
                      }

                      setProfileLoading(true);
                      try {
                        const res = await fetch("/api/students/change-password", {
                          method: "POST",
                          headers: getAuthHeaders({ "Content-Type": "application/json" }),
                          body: JSON.stringify({
                            email: registration.studentEmail,
                            oldPassword: profileOldPass,
                            newPassword: profileNewPass
                          })
                        });

                        const data = await res.json();
                        if (res.ok) {
                          setProfileSuccess("Your password has been changed successfully.");
                          setProfileOldPass("");
                          setProfileNewPass("");
                          setProfileConfirmPass("");
                        } else {
                          setProfileError(data.error || "Failed to update password.");
                        }
                      } catch (err) {
                        setProfileError("Network error. Please try again.");
                      } finally {
                        setProfileLoading(false);
                      }
                    }}
                    className="space-y-4"
                  >
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 pt-2">
                      <Lock className="w-4 h-4 text-indigo-500" />
                      Change Password
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Current Password</label>
                        <input
                          type="password"
                          placeholder="Current password"
                          value={profileOldPass}
                          onChange={(e) => setProfileOldPass(e.target.value)}
                          className="w-full px-4 py-2.5 border border-slate-200 bg-white rounded-xl text-xs outline-none focus:border-indigo-500 transition-all"
                          required
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">New Password</label>
                        <input
                          type="password"
                          placeholder="At least 6 characters"
                          value={profileNewPass}
                          onChange={(e) => setProfileNewPass(e.target.value)}
                          className="w-full px-4 py-2.5 border border-slate-200 bg-white rounded-xl text-xs outline-none focus:border-indigo-500 transition-all"
                          required
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Confirm New Password</label>
                        <input
                          type="password"
                          placeholder="Repeat new password"
                          value={profileConfirmPass}
                          onChange={(e) => setProfileConfirmPass(e.target.value)}
                          className="w-full px-4 py-2.5 border border-slate-200 bg-white rounded-xl text-xs outline-none focus:border-indigo-500 transition-all"
                          required
                        />
                      </div>
                    </div>

                    <div className="text-right pt-2">
                      <button
                        type="submit"
                        className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all"
                      >
                        Update Password
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === "team" && (
          <motion.div
            key="team-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="space-y-6"
          >
            <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 text-left shadow-sm">
              <div className="flex justify-between items-center border-b border-slate-150 pb-4 mb-6">
                <div>
                  <h2 className="text-xl font-bold font-display text-slate-800 flex items-center gap-2">
                    <Users className="w-5 h-5 text-indigo-500" />
                    Manage Team Roster & Details
                  </h2>
                  <p className="text-slate-500 text-xs mt-1">
                    Update phone numbers, names, email IDs and genders of your {teamMembersCount + 1}-member team.
                  </p>
                </div>
                <span className="font-mono text-xs bg-slate-100 text-slate-800 px-3 py-1 rounded-lg font-bold border border-slate-200">
                  ID: {registration.registrationId}
                </span>
              </div>

              {teamError && (
                <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 text-xs mb-6 flex gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{teamError}</span>
                </div>
              )}

              {teamSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-4 text-xs mb-6 flex gap-2 font-medium">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{teamSuccess}</span>
                </div>
              )}

              {lockStudentUpdates && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 text-xs mb-6 flex gap-2.5 font-semibold">
                  <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>Editing locked: Team roster and student member details have been locked by the SPOC Administrator.</span>
                </div>
              )}

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (lockStudentUpdates) return;
                  setTeamError("");
                  setTeamSuccess("");
                  setTeamLoading(true);

                  try {
                    const res = await fetch("/api/registrations/my/team", {
                      method: "PUT",
                      headers: getAuthHeaders({ "Content-Type": "application/json" }),
                      body: JSON.stringify({
                        email: registration.studentEmail,
                        leadName,
                        leadMobile,
                        leadGender,
                        member1,
                        member1Gender,
                        member1Email,
                        member1Phone,
                        member2,
                        member2Gender,
                        member2Email,
                        member2Phone,
                        member3,
                        member3Gender,
                        member3Email,
                        member3Phone,
                        member4,
                        member4Gender,
                        member4Email,
                        member4Phone,
                        member5,
                        member5Gender,
                        member5Email,
                        member5Phone,
                        mentorName
                      })
                    });

                    const data = await res.json();
                    if (res.ok) {
                      setTeamSuccess(data.message || "Team details updated successfully.");
                      if (onUpdateRegistration) {
                        onUpdateRegistration(data.registration);
                      }
                    } else {
                      setTeamError(data.error || "Failed to update team details.");
                    }
                  } catch (err) {
                    setTeamError("Network error. Failed to save team roster.");
                  } finally {
                    setTeamLoading(false);
                  }
                }}
                className="space-y-6"
              >
                {/* Team Lead Section */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/60">
                  <h3 className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-indigo-600 rounded-full"></span>
                    Team Leader (You)
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Leader Name</label>
                      <input
                        type="text"
                        value={leadName}
                        onChange={(e) => setLeadName(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl text-xs outline-none focus:border-indigo-500"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Leader Phone</label>
                      <input
                        type="text"
                        value={leadMobile}
                        onChange={(e) => setLeadMobile(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl text-xs outline-none focus:border-indigo-500 font-mono"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Leader Gender</label>
                      <select
                        value={leadGender}
                        onChange={(e) => setLeadGender(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl text-xs outline-none focus:border-indigo-500 cursor-pointer"
                        required
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Team Members Section */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2">
                    {teamMembersCount > 0 
                      ? `Team Members (${teamMembersCount} additional students required)` 
                      : "Solo Registration (No additional members required)"}
                  </h3>

                  {/* Member 1 */}
                  {teamMembersCount >= 1 && (
                    <div className="bg-white border border-slate-100 rounded-xl p-4 hover:border-slate-200 transition-all space-y-3">
                      <span className="text-[11px] font-bold text-slate-600 uppercase block">Team Member 1</span>
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <input
                          type="text"
                          placeholder="Name"
                          value={member1}
                          onChange={(e) => setMember1(e.target.value)}
                          className="px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500"
                          required
                        />
                        <input
                          type="email"
                          placeholder="College Email ID"
                          value={member1Email}
                          onChange={(e) => setMember1Email(e.target.value)}
                          className="px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 font-mono"
                          required
                        />
                        <input
                          type="text"
                          placeholder="Phone Number"
                          value={member1Phone}
                          onChange={(e) => setMember1Phone(e.target.value)}
                          className="px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 font-mono"
                          required
                        />
                        <select
                          value={member1Gender}
                          onChange={(e) => setMember1Gender(e.target.value)}
                          className="px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 cursor-pointer"
                          required
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Member 2 */}
                  {teamMembersCount >= 2 && (
                    <div className="bg-white border border-slate-100 rounded-xl p-4 hover:border-slate-200 transition-all space-y-3">
                      <span className="text-[11px] font-bold text-slate-600 uppercase block">Team Member 2</span>
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <input
                          type="text"
                          placeholder="Name"
                          value={member2}
                          onChange={(e) => setMember2(e.target.value)}
                          className="px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500"
                          required
                        />
                        <input
                          type="email"
                          placeholder="College Email ID"
                          value={member2Email}
                          onChange={(e) => setMember2Email(e.target.value)}
                          className="px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 font-mono"
                          required
                        />
                        <input
                          type="text"
                          placeholder="Phone Number"
                          value={member2Phone}
                          onChange={(e) => setMember2Phone(e.target.value)}
                          className="px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 font-mono"
                          required
                        />
                        <select
                          value={member2Gender}
                          onChange={(e) => setMember2Gender(e.target.value)}
                          className="px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 cursor-pointer"
                          required
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Member 3 */}
                  {teamMembersCount >= 3 && (
                    <div className="bg-white border border-slate-100 rounded-xl p-4 hover:border-slate-200 transition-all space-y-3">
                      <span className="text-[11px] font-bold text-slate-600 uppercase block">Team Member 3</span>
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <input
                          type="text"
                          placeholder="Name"
                          value={member3}
                          onChange={(e) => setMember3(e.target.value)}
                          className="px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500"
                          required
                        />
                        <input
                          type="email"
                          placeholder="College Email ID"
                          value={member3Email}
                          onChange={(e) => setMember3Email(e.target.value)}
                          className="px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 font-mono"
                          required
                        />
                        <input
                          type="text"
                          placeholder="Phone Number"
                          value={member3Phone}
                          onChange={(e) => setMember3Phone(e.target.value)}
                          className="px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 font-mono"
                          required
                        />
                        <select
                          value={member3Gender}
                          onChange={(e) => setMember3Gender(e.target.value)}
                          className="px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 cursor-pointer"
                          required
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Member 4 */}
                  {teamMembersCount >= 4 && (
                    <div className="bg-white border border-slate-100 rounded-xl p-4 hover:border-slate-200 transition-all space-y-3">
                      <span className="text-[11px] font-bold text-slate-600 uppercase block">Team Member 4</span>
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <input
                          type="text"
                          placeholder="Name"
                          value={member4}
                          onChange={(e) => setMember4(e.target.value)}
                          className="px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500"
                          required
                        />
                        <input
                          type="email"
                          placeholder="College Email ID"
                          value={member4Email}
                          onChange={(e) => setMember4Email(e.target.value)}
                          className="px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 font-mono"
                          required
                        />
                        <input
                          type="text"
                          placeholder="Phone Number"
                          value={member4Phone}
                          onChange={(e) => setMember4Phone(e.target.value)}
                          className="px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 font-mono"
                          required
                        />
                        <select
                          value={member4Gender}
                          onChange={(e) => setMember4Gender(e.target.value)}
                          className="px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 cursor-pointer"
                          required
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Member 5 */}
                  {teamMembersCount >= 5 && (
                    <div className="bg-white border border-slate-100 rounded-xl p-4 hover:border-slate-200 transition-all space-y-3">
                      <span className="text-[11px] font-bold text-slate-600 uppercase block">Team Member 5</span>
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <input
                          type="text"
                          placeholder="Name"
                          value={member5}
                          onChange={(e) => setMember5(e.target.value)}
                          className="px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500"
                          required
                        />
                        <input
                          type="email"
                          placeholder="College Email ID"
                          value={member5Email}
                          onChange={(e) => setMember5Email(e.target.value)}
                          className="px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 font-mono"
                          required
                        />
                        <input
                          type="text"
                          placeholder="Phone Number"
                          value={member5Phone}
                          onChange={(e) => setMember5Phone(e.target.value)}
                          className="px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 font-mono"
                          required
                        />
                        <select
                          value={member5Gender}
                          onChange={(e) => setMember5Gender(e.target.value)}
                          className="px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 cursor-pointer"
                          required
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Mentor Section */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/60">
                  <h3 className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-indigo-600 rounded-full"></span>
                    Faculty Mentor Details
                  </h3>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Faculty Mentor Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Dr. Ramana Rao, Professor"
                      value={mentorName}
                      onChange={(e) => setMentorName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl text-xs outline-none focus:border-indigo-500"
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="submit"
                    disabled={teamLoading || lockStudentUpdates}
                    className={`px-6 py-3 font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 ${
                      lockStudentUpdates
                        ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                        : "bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
                    }`}
                  >
                    {teamLoading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-indigo-200 border-t-white rounded-full animate-spin inline-block"></span>
                        <span>Saving Changes...</span>
                      </>
                    ) : lockStudentUpdates ? (
                      <>
                        <Lock className="w-4 h-4 text-slate-400" />
                        <span>Team Roster Locked</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Save Team Details</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
        {activeTab === "certificates" && enableCertificates && (
          <motion.div
            key="certificates-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden p-6 md:p-8 text-left space-y-6"
          >
            <div>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-2xl text-indigo-600">
                  <Award className="w-8 h-8" />
                </div>
                <div>
                  <span className="inline-flex items-center gap-1 bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full">
                    ★ Hackathon Completed ★
                  </span>
                  <h3 className="text-xl font-extrabold font-display leading-tight tracking-tight mt-1 text-slate-800">
                    Download Your Participation Certificates
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Participation certificates are now available for download. Select any member to preview, edit, or print.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-6">
                {/* Team Leader Card */}
                {registration.leadName && (
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col justify-between hover:bg-slate-100 transition-all">
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase tracking-wider text-amber-600 font-extrabold font-mono">Team Leader</span>
                      <h4 className="text-sm font-bold truncate text-slate-800">{registration.leadName}</h4>
                      <p className="text-[10px] text-slate-500 truncate">{registration.studentEmail}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedCertStudentName(registration.leadName)}
                      className="mt-4 w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-1.5 cursor-pointer border border-transparent"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Get Certificate
                    </button>
                  </div>
                )}

                {/* Team Members Certificates */}
                {Array.from({ length: teamMembersCount }, (_, idx) => idx + 1).map((num) => {
                  const name = (registration as any)[`member${num}`];
                  const email = (registration as any)[`member${num}Email`];
                  if (!name) return null;
                  return (
                    <div key={num} className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col justify-between hover:bg-slate-100 transition-all">
                      <div className="space-y-1">
                        <span className="text-[9px] uppercase tracking-wider text-slate-400 font-extrabold font-mono">Team Member {num}</span>
                        <h4 className="text-sm font-bold truncate text-slate-800">{name}</h4>
                        <p className="text-[10px] text-slate-500 truncate">{email || "No Email listed"}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedCertStudentName(name)}
                        className="mt-4 w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-1.5 cursor-pointer border border-transparent"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Get Certificate
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Printable CSS Helper */}
      <style>{`
        @media print {
          body {
            background-color: white !important;
            color: black !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          #receipt-ticket {
            border: 1px solid #cbd5e1 !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      {selectedCertStudentName && enableCertificates && (
        <ParticipationCertificateModal
          isOpen={true}
          onClose={() => setSelectedCertStudentName(null)}
          studentName={selectedCertStudentName}
          registration={registration}
          config={certificateConfig}
          problemStatement={problemStatements.find(p => p.id === registration.problemStatementId)}
        />
      )}

      {showConsentLetter && (
        <ConsentLetterModal
          isOpen={true}
          onClose={() => setShowConsentLetter(false)}
          registration={registration}
          isReadOnly={false}
        />
      )}

    </div>
  );
}

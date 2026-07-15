import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Users,
  User,
  Phone,
  BookOpen,
  Briefcase,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  ChevronRight,
  ChevronLeft,
  Search,
  ExternalLink,
  ShieldCheck,
  UserPlus,
  Mail
} from "lucide-react";
import { ProblemStatement, Registration } from "../types";
import SvecLogo from "./SvecLogo";

interface RegistrationFormProps {
  student: { id: string; email: string; gender?: string; department?: string; mobile?: string };
  onSuccess: (registration: Registration) => void;
  problemStatements: ProblemStatement[];
  onNavigateToAdmin: () => void;
}

export default function RegistrationForm({
  student,
  onSuccess,
  problemStatements,
  onNavigateToAdmin
}: RegistrationFormProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    teamName: "",
    leadName: "",
    leadDepartment: student.department || "",
    leadMobile: student.mobile || "",
    leadGender: student.gender || "",
    member1: "",
    member1Gender: "",
    member1Email: "",
    member1Phone: "",
    member2: "",
    member2Gender: "",
    member2Email: "",
    member2Phone: "",
    member3: "",
    member3Gender: "",
    member3Email: "",
    member3Phone: "",
    member4: "",
    member4Gender: "",
    member4Email: "",
    member4Phone: "",
    member5: "",
    member5Gender: "",
    member5Email: "",
    member5Phone: "",
    hasFemaleMember: null as boolean | null,
    mentorName: "",
    problemStatementId: ""
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [teamNameStatus, setTeamNameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"All" | "Software" | "Hardware">("All");

  const [feeSettings, setFeeSettings] = useState<{ feeEnabled: boolean; feeAmount: number; razorpayKeyId: string } | null>(null);
  const [paymentStatusMessage, setPaymentStatusMessage] = useState("");

  // Fetch public settings on mount
  useEffect(() => {
    fetch("/api/settings/public")
      .then(res => res.json())
      .then(data => {
        setFeeSettings(data);
      })
      .catch(err => console.error("Error loading public settings", err));
  }, []);


  // Debounced check for team name uniqueness
  useEffect(() => {
    if (!formData.teamName.trim()) {
      setTeamNameStatus("idle");
      return;
    }

    setTeamNameStatus("checking");
    const delayDebounce = setTimeout(async () => {
      try {
        const res = await fetch(`/api/registrations/check-team?name=${encodeURIComponent(formData.teamName)}`);
        const data = await res.json();
        if (data.available) {
          setTeamNameStatus("available");
          setErrors(prev => {
            const copy = { ...prev };
            delete copy.teamName;
            return copy;
          });
        } else {
          setTeamNameStatus("taken");
          setErrors(prev => ({ ...prev, teamName: "This team name is already registered." }));
        }
      } catch (err) {
        setTeamNameStatus("idle");
      }
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [formData.teamName]);

  const validateStep = (currentStep: number) => {
    const newErrors: Record<string, string> = {};

    if (currentStep === 1) {
      if (!formData.teamName.trim()) {
        newErrors.teamName = "Team Name is required.";
      } else if (teamNameStatus === "taken") {
        newErrors.teamName = "Team name is already taken.";
      }
      if (!formData.problemStatementId) {
        newErrors.problemStatementId = "Please select a Problem Statement.";
      }
      if (!formData.mentorName.trim()) {
        newErrors.mentorName = "Mentor Name is required.";
      }
      if (formData.hasFemaleMember === null) {
        newErrors.hasFemaleMember = "Please indicate if your team has at least one female member.";
      }
    }

    if (currentStep === 2) {
      if (!formData.leadName.trim()) {
        newErrors.leadName = "Team Lead Name is required.";
      }
      if (!formData.leadDepartment.trim()) {
        newErrors.leadDepartment = "Department is required.";
      }
      if (!formData.leadGender) {
        newErrors.leadGender = "Gender is required.";
      }
      if (!formData.leadMobile.trim()) {
        newErrors.leadMobile = "Mobile number is required.";
      } else if (!/^[0-9]{10}$/.test(formData.leadMobile.trim())) {
        newErrors.leadMobile = "Please enter a valid 10-digit mobile number.";
      }
    }

    if (currentStep === 3) {
      for (let i = 1; i <= 5; i++) {
        const nameKey = `member${i}`;
        const genderKey = `member${i}Gender`;
        const emailKey = `member${i}Email`;
        const phoneKey = `member${i}Phone`;

        const nameVal = (formData[nameKey as keyof typeof formData] as string || "").trim();
        const genderVal = (formData[genderKey as keyof typeof formData] as string || "").trim();
        const emailVal = (formData[emailKey as keyof typeof formData] as string || "").trim();
        const phoneVal = (formData[phoneKey as keyof typeof formData] as string || "").trim();

        if (!nameVal) {
          newErrors[nameKey] = `Member ${i} Name is required.`;
        }
        if (!genderVal) {
          newErrors[genderKey] = `Member ${i} Gender is required.`;
        }
        if (!emailVal) {
          newErrors[emailKey] = `Member ${i} Email is required.`;
        } else if (!/\S+@\S+\.\S+/.test(emailVal)) {
          newErrors[emailKey] = `Enter a valid email for Member ${i}.`;
        }
        if (!phoneVal) {
          newErrors[phoneKey] = `Member ${i} Phone is required.`;
        } else if (!/^[0-9]{10}$/.test(phoneVal)) {
          newErrors[phoneKey] = `Enter a 10-digit phone for Member ${i}.`;
        }
      }

      // Check for at least one female student based on entered gender fields (Team Lead + Members 1 to 5)
      const leadGenderLower = (formData.leadGender || "").trim().toLowerCase();
      let hasFemale = leadGenderLower === "female";

      for (let i = 1; i <= 5; i++) {
        const genderKey = `member${i}Gender`;
        const genderVal = (formData[genderKey as keyof typeof formData] as string || "").trim().toLowerCase();
        if (genderVal === "female") {
          hasFemale = true;
        }
      }

      if (!hasFemale) {
        newErrors.femaleRepresentation = "SIH guidelines mandate at least one female student in every 6-member team. Please check the gender field of the Team Lead or Team Members to ensure at least one female member is registered.";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(prev => Math.min(prev + 1, 3));
    }
  };

  const handleBack = () => {
    setStep(prev => Math.max(prev - 1, 1));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error dynamically
    if (errors[name]) {
      setErrors(prev => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
    }
  };

  const handleFemaleSelect = (val: boolean) => {
    setFormData(prev => ({ ...prev, hasFemaleMember: val }));
    if (errors.hasFemaleMember) {
      setErrors(prev => {
        const copy = { ...prev };
        delete copy.hasFemaleMember;
        return copy;
      });
    }
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const submitRegistration = async (paymentDetails?: { paymentId: string; orderId: string; signature: string }) => {
    setIsSubmitting(true);
    setPaymentStatusMessage("Finalizing SVEC SIH Hackathon Registration...");
    try {
      // Calculate hasFemaleMember programmatically from gender fields
      const leadGenderLower = (formData.leadGender || "").trim().toLowerCase();
      let calculatedHasFemale = leadGenderLower === "female";
      for (let i = 1; i <= 5; i++) {
        const genderVal = ((formData as any)[`member${i}Gender`] || "").trim().toLowerCase();
        if (genderVal === "female") {
          calculatedHasFemale = true;
        }
      }

      const payload = {
        ...formData,
        hasFemaleMember: calculatedHasFemale,
        studentEmail: student.email,
        ...paymentDetails
      };

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if ((student as any).token) {
        headers["Authorization"] = `Bearer ${(student as any).token}`;
      }

      const res = await fetch("/api/registrations", {
        method: "POST",
        headers,
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onSuccess(data.registration);
      } else {
        setErrors({ submit: data.error || "Submission failed. Please try again." });
      }
    } catch (err) {
      setErrors({ submit: "A network error occurred. Please try again later." });
    } finally {
      setIsSubmitting(false);
      setPaymentStatusMessage("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(3)) return;

    if (feeSettings?.feeEnabled) {
      setIsSubmitting(true);
      setPaymentStatusMessage("Initiating secure Razorpay payment...");
      setErrors({});

      try {
        const orderRes = await fetch("/api/payments/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentEmail: student.email })
        });

        const orderData = await orderRes.json();
        if (!orderRes.ok) {
          setErrors({ submit: orderData.error || "Failed to initiate payment. Please contact SVEC admin." });
          setIsSubmitting(false);
          setPaymentStatusMessage("");
          return;
        }

        setPaymentStatusMessage("Opening Razorpay payment gateway...");
        const isScriptLoaded = await loadRazorpayScript();
        if (!isScriptLoaded) {
          setErrors({ submit: "Failed to load payment checkout script. Please check your network connection." });
          setIsSubmitting(false);
          setPaymentStatusMessage("");
          return;
        }

        setPaymentStatusMessage("Please complete the payment in the Razorpay pop-up...");

        const options = {
          key: orderData.keyId,
          amount: orderData.amount,
          currency: orderData.currency,
          name: "SVEC SIH Hackathon 2026",
          description: `Registration Fee: ₹${feeSettings.feeAmount}`,
          order_id: orderData.orderId,
          handler: async function (response: any) {
            submitRegistration({
              paymentId: response.razorpay_payment_id,
              orderId: response.razorpay_order_id,
              signature: response.razorpay_signature
            });
          },
          prefill: {
            name: formData.leadName,
            email: student.email,
            contact: formData.leadMobile
          },
          theme: {
            color: "#4f46e5"
          },
          modal: {
            ondismiss: function() {
              setIsSubmitting(false);
              setPaymentStatusMessage("");
              setErrors({ submit: "Payment was cancelled. You must complete the payment of ₹" + feeSettings.feeAmount + " to register." });
            }
          }
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      } catch (err: any) {
        console.error("Payment initialization error", err);
        setErrors({ submit: "Failed to load payment portal. Please try again." });
        setIsSubmitting(false);
        setPaymentStatusMessage("");
      }
    } else {
      submitRegistration();
    }
  };

  // Filter problem statements based on search term and category
  const filteredStatements = problemStatements.filter(ps => {
    const matchesSearch =
      ps.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ps.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ps.organization.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "All" || ps.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const selectedStatementDetails = problemStatements.find(ps => ps.id === formData.problemStatementId);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Upper banner section */}
      <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-800 text-white rounded-2xl shadow-xl overflow-hidden mb-8 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent opacity-40"></div>
        <div className="px-8 py-10 md:py-12 relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3 flex-1">
            <span className="inline-block bg-indigo-500/30 text-indigo-100 text-xs font-semibold px-3.5 py-1.5 rounded-full uppercase tracking-wider backdrop-blur-sm border border-indigo-400/20">
              SVEC - SIH 2026 Internal Hackathon
            </span>
            <h1 className="text-3xl md:text-4xl font-extrabold font-display tracking-tight leading-tight">
              Team Registration Portal
            </h1>
            <p className="text-indigo-100 text-sm md:text-base max-w-xl font-light leading-relaxed">
              Register your team of 6 members to represent Sri Vasavi Engineering College in the upcoming Smart India Hackathon. Ensure all fields are filled accurately.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row md:flex-col items-center gap-4 w-full md:w-auto self-stretch md:self-auto justify-between md:justify-center border-t border-white/10 md:border-t-0 pt-4 md:pt-0">
            <div className="bg-white/15 backdrop-blur-md p-3 rounded-2xl border border-white/25 shadow-inner flex items-center justify-center">
              <SvecLogo className="w-20 h-20 filter drop-shadow-md" />
            </div>
            <button
              type="button"
              onClick={onNavigateToAdmin}
              className="text-indigo-100 hover:text-white text-xs font-semibold flex items-center gap-1.5 bg-white/10 hover:bg-white/20 transition-all px-4 py-2.5 rounded-xl backdrop-blur-sm border border-white/10 shadow-xs cursor-pointer"
              id="admin-login-btn"
            >
              <ShieldCheck className="w-4 h-4 text-indigo-300" />
              Admin Portal
            </button>
          </div>
        </div>
      </div>

      {/* Progress Stepper */}
      <div className="mb-8 max-w-xl mx-auto">
        <div className="flex items-center justify-between relative">
          <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-slate-200 -translate-y-1/2 z-0"></div>
          
          <div className="absolute left-0 top-1/2 h-0.5 bg-indigo-600 -translate-y-1/2 z-0 transition-all duration-300" 
               style={{ width: `${((step - 1) / 2) * 100}%` }}></div>

          {[
            { num: 1, label: "Idea & Mentor", icon: BookOpen },
            { num: 2, label: "Team Leader", icon: User },
            { num: 3, label: "Team Members", icon: Users }
          ].map((s) => {
            const IconComponent = s.icon;
            const isActive = step >= s.num;
            const isCurrent = step === s.num;
            return (
              <div key={s.num} className="flex flex-col items-center relative z-10">
                <button
                  type="button"
                  onClick={() => {
                    // Let user jump back, but not forward without validation
                    if (s.num < step) setStep(s.num);
                  }}
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 shadow-md ${
                    isCurrent
                      ? "bg-indigo-600 text-white ring-4 ring-indigo-100 scale-110"
                      : isActive
                      ? "bg-indigo-500 text-white"
                      : "bg-slate-100 text-slate-400 border border-slate-200"
                  }`}
                  id={`step-btn-${s.num}`}
                >
                  <IconComponent className="w-5 h-5" />
                </button>
                <span className={`text-xs mt-2 font-medium text-center ${isCurrent ? "text-indigo-600 font-semibold" : "text-slate-500"}`}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dynamic Fee Notice */}
      {feeSettings?.feeEnabled && (
        <div className="mb-6 bg-amber-50 border border-amber-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-amber-100 text-amber-800 rounded-xl font-bold text-xs uppercase shrink-0">Fee Req</span>
            <div>
              <p className="text-xs font-bold text-amber-900 uppercase tracking-wider">SIH Registration Fee Enabled</p>
              <p className="text-xs text-amber-700">An institutional fee is required to submit your internal hackathon registration.</p>
            </div>
          </div>
          <div className="text-left sm:text-right shrink-0">
            <p className="text-2xl font-extrabold text-amber-950 font-mono font-sans">₹{feeSettings.feeAmount}</p>
            <p className="text-[10px] text-amber-600 font-bold uppercase tracking-wider">Razorpay Gateway Enabled</p>
          </div>
        </div>
      )}

      {/* Form Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6 md:p-10">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-xl font-bold text-slate-800 font-display flex items-center gap-2 mb-1">
                    <BookOpen className="text-indigo-500 w-5 h-5" />
                    Problem Statement & Team Info
                  </h2>
                  <p className="text-sm text-slate-500">
                    Define your team name and map it to a registered SIH Problem Statement.
                  </p>
                </div>

                {/* Team Name */}
                <div className="space-y-2">
                  <label htmlFor="teamName" className="block text-sm font-semibold text-slate-700">
                    Team Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="teamName"
                      id="teamName"
                      value={formData.teamName}
                      onChange={handleChange}
                      placeholder="Enter a unique name for your team"
                      className={`w-full px-4 py-3 rounded-xl border transition-all outline-none pl-11 pr-24 input-glow ${
                        errors.teamName
                          ? "border-red-300 focus:ring-4 focus:ring-red-100"
                          : teamNameStatus === "available"
                          ? "border-emerald-300 focus:ring-4 focus:ring-emerald-100"
                          : "border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                      }`}
                    />
                    <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    
                    {/* Unique status badge */}
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium">
                      {teamNameStatus === "checking" && (
                        <span className="text-slate-400 flex items-center gap-1">
                          <span className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></span>
                          Checking...
                        </span>
                      )}
                      {teamNameStatus === "available" && (
                        <span className="text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                          Available
                        </span>
                      )}
                      {teamNameStatus === "taken" && (
                        <span className="text-red-600 bg-red-50 px-2.5 py-1 rounded-full border border-red-200">
                          Taken
                        </span>
                      )}
                    </div>
                  </div>
                  {errors.teamName && (
                    <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {errors.teamName}
                    </p>
                  )}
                </div>

                {/* Problem Statement Selection with custom list searcher */}
                <div className="space-y-3">
                  <div className="flex justify-between items-end">
                    <label htmlFor="problemStatementId" className="block text-sm font-semibold text-slate-700">
                      Problem Statement <span className="text-red-500">*</span>
                    </label>
                    <a
                      href="https://sih.gov.in/sih2025PS"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 group transition-colors"
                    >
                      Browse SIH 2025 PS Portal
                      <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </a>
                  </div>

                  {/* Dropdown UI with an integrated interactive filter search box */}
                  <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 space-y-3">
                    <div className="flex flex-col md:flex-row gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          placeholder="Search statements by code, title, or agency..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white outline-none focus:border-indigo-500 pl-9"
                        />
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      </div>
                      
                      <div className="flex gap-1 bg-slate-200/60 p-1 rounded-lg self-start md:self-auto">
                        {(["All", "Software", "Hardware"] as const).map(cat => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                              selectedCategory === cat
                                ? "bg-white text-slate-800 shadow-xs"
                                : "text-slate-500 hover:text-slate-800"
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="relative">
                      <select
                        name="problemStatementId"
                        id="problemStatementId"
                        value={formData.problemStatementId}
                        onChange={handleChange}
                        className={`w-full px-3 py-2.5 rounded-xl border bg-white transition-all outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 ${
                          errors.problemStatementId ? "border-red-300" : "border-slate-200"
                        }`}
                      >
                        <option value="">-- Choose Problem Statement --</option>
                        {filteredStatements.map((ps) => (
                          <option key={ps.id} value={ps.id}>
                            [{ps.code}] {ps.category} - {ps.title.slice(0, 95)}{ps.title.length > 95 ? "..." : ""} ({ps.organization})
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedStatementDetails && (
                      <div className="bg-indigo-50/50 rounded-xl p-3 border border-indigo-100 space-y-1.5 mt-2">
                        <div className="flex justify-between items-center text-[11px] font-bold">
                          <span className="text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-md">
                            {selectedStatementDetails.code}
                          </span>
                          <span className={`px-2 py-0.5 rounded-md ${
                            selectedStatementDetails.category === "Software" 
                              ? "bg-sky-100 text-sky-800" 
                              : "bg-amber-100 text-amber-800"
                          }`}>
                            {selectedStatementDetails.category}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-slate-800 leading-snug">
                          {selectedStatementDetails.title}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          <span className="font-medium text-slate-600">Nodal Agency:</span> {selectedStatementDetails.organization}
                        </p>
                      </div>
                    )}
                  </div>
                  {errors.problemStatementId && (
                    <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {errors.problemStatementId}
                    </p>
                  )}
                </div>

                {/* Mentor Name */}
                <div className="space-y-2">
                  <label htmlFor="mentorName" className="block text-sm font-semibold text-slate-700">
                    Name of the Mentor <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="mentorName"
                      id="mentorName"
                      value={formData.mentorName}
                      onChange={handleChange}
                      placeholder="Full name of your faculty mentor"
                      className={`w-full px-4 py-3 rounded-xl border transition-all outline-none pl-11 input-glow ${
                        errors.mentorName
                          ? "border-red-300 focus:ring-4 focus:ring-red-100"
                          : "border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                      }`}
                    />
                    <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  </div>
                  {errors.mentorName && (
                    <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {errors.mentorName}
                    </p>
                  )}
                </div>

                {/* Does your team include at least one female member? */}
                <div className="space-y-3">
                  <span className="block text-sm font-semibold text-slate-700">
                    Does your team include at least one female member? <span className="text-red-500">*</span>
                  </span>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => handleFemaleSelect(true)}
                      className={`py-3.5 px-4 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        formData.hasFemaleMember === true
                          ? "border-indigo-600 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-500/20"
                          : "border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
                      }`}
                    >
                      <CheckCircle className={`w-4 h-4 ${formData.hasFemaleMember === true ? "text-indigo-600" : "text-transparent"}`} />
                      Yes, it includes a female member
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFemaleSelect(false)}
                      className={`py-3.5 px-4 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        formData.hasFemaleMember === false
                          ? "border-amber-500 bg-amber-50 text-amber-700 ring-2 ring-amber-500/20"
                          : "border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
                      }`}
                    >
                      <CheckCircle className={`w-4 h-4 ${formData.hasFemaleMember === false ? "text-amber-500" : "text-transparent"}`} />
                      No female members
                    </button>
                  </div>
                  
                  {/* Informational reminder about SIH mandates */}
                  <div className="bg-amber-50 rounded-xl p-3 border border-amber-200 flex gap-2 text-xs text-amber-800 leading-snug">
                    <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>SIH Recommendation:</strong> Having at least one female member is highly encouraged by SIH regulations to promote gender diversity.
                    </span>
                  </div>

                  {errors.hasFemaleMember && (
                    <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {errors.hasFemaleMember}
                    </p>
                  )}
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-xl font-bold text-slate-800 font-display flex items-center gap-2 mb-1">
                    <User className="text-indigo-500 w-5 h-5" />
                    Team Lead Information
                  </h2>
                  <p className="text-sm text-slate-500">
                    Enter the details of the Team Leader who will be the primary point of contact.
                  </p>
                </div>

                {/* Lead Name */}
                <div className="space-y-2">
                  <label htmlFor="leadName" className="block text-sm font-semibold text-slate-700">
                    Name of Team Lead <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="leadName"
                      id="leadName"
                      value={formData.leadName}
                      onChange={handleChange}
                      placeholder="Full name of the team leader"
                      className={`w-full px-4 py-3 rounded-xl border transition-all outline-none pl-11 input-glow ${
                        errors.leadName
                          ? "border-red-300 focus:ring-4 focus:ring-red-100"
                          : "border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                      }`}
                    />
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  </div>
                  {errors.leadName && (
                    <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {errors.leadName}
                    </p>
                  )}
                </div>

                {/* Lead Department */}
                <div className="space-y-2">
                  <label htmlFor="leadDepartment" className="block text-sm font-semibold text-slate-700">
                    Department of Team Lead <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="leadDepartment"
                      id="leadDepartment"
                      value={formData.leadDepartment}
                      onChange={handleChange}
                      placeholder="e.g. Computer Science Engineering, Information Technology"
                      className={`w-full px-4 py-3 rounded-xl border transition-all outline-none pl-11 input-glow ${
                        errors.leadDepartment
                          ? "border-red-300 focus:ring-4 focus:ring-red-100"
                          : "border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                      }`}
                    />
                    <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  </div>
                  {errors.leadDepartment && (
                    <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {errors.leadDepartment}
                    </p>
                  )}
                </div>

                {/* Lead Mobile No */}
                <div className="space-y-2">
                  <label htmlFor="leadMobile" className="block text-sm font-semibold text-slate-700">
                    Mobile No of Team Lead <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      name="leadMobile"
                      id="leadMobile"
                      value={formData.leadMobile}
                      onChange={handleChange}
                      maxLength={10}
                      placeholder="10-digit mobile number"
                      className={`w-full px-4 py-3 rounded-xl border transition-all outline-none pl-11 input-glow ${
                        errors.leadMobile
                          ? "border-red-300 focus:ring-4 focus:ring-red-100"
                          : "border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                      }`}
                    />
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  </div>
                  {errors.leadMobile && (
                    <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {errors.leadMobile}
                    </p>
                  )}
                </div>

                {/* Lead Gender */}
                <div className="space-y-2">
                  <label htmlFor="leadGender" className="block text-sm font-semibold text-slate-700">
                    Gender of Team Lead <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      name="leadGender"
                      id="leadGender"
                      value={formData.leadGender}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 rounded-xl border transition-all outline-none pl-11 bg-white appearance-none cursor-pointer ${
                        errors.leadGender
                          ? "border-red-300 focus:ring-4 focus:ring-red-100"
                          : "border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                      }`}
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                  </div>
                  {errors.leadGender && (
                    <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {errors.leadGender}
                    </p>
                  )}
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-xl font-bold text-slate-800 font-display flex items-center gap-2 mb-1">
                    <Users className="text-indigo-500 w-5 h-5" />
                    Team Members Information
                  </h2>
                  <p className="text-sm text-slate-500">
                    Enter the details of the other 5 team members to complete the 6-person roster.
                  </p>
                </div>

                <div className="space-y-6">
                  {[1, 2, 3, 4, 5].map((num) => {
                    const fieldName = `member${num}`;
                    const hasError = !!errors[fieldName];
                    return (
                      <div key={num} className="bg-slate-50/55 hover:bg-slate-50 border border-slate-100 rounded-2xl p-5 transition-all space-y-4">
                        <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                          <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[11px] flex items-center justify-center font-bold">
                            {num}
                          </span>
                          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                            Team Member {num}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Member Name */}
                          <div className="space-y-1.5 sm:col-span-2">
                            <label htmlFor={fieldName} className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                              Full Name <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                              <input
                                type="text"
                                name={fieldName}
                                id={fieldName}
                                value={(formData as any)[fieldName]}
                                onChange={handleChange}
                                placeholder={`Full name of Member ${num}`}
                                className={`w-full px-3.5 py-2.5 rounded-xl border text-xs transition-all outline-none pl-10 bg-white focus:ring-4 focus:ring-indigo-100 ${
                                  hasError
                                    ? "border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100"
                                    : "border-slate-200 focus:border-indigo-500"
                                }`}
                              />
                              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            </div>
                            {hasError && (
                              <p className="text-[11px] text-red-500 flex items-center gap-1 mt-0.5">
                                <AlertCircle className="w-3 h-3" />
                                {(errors as any)[fieldName]}
                              </p>
                            )}
                          </div>

                          {/* Member Gender */}
                          <div className="space-y-1.5">
                            <label htmlFor={`${fieldName}Gender`} className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                              Gender <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                              <select
                                name={`${fieldName}Gender`}
                                id={`${fieldName}Gender`}
                                value={(formData as any)[`${fieldName}Gender`]}
                                onChange={handleChange}
                                className={`w-full px-3.5 py-2.5 rounded-xl border text-xs transition-all outline-none pl-10 bg-white appearance-none cursor-pointer focus:ring-4 focus:ring-indigo-100 ${
                                  errors[`${fieldName}Gender`]
                                    ? "border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100"
                                    : "border-slate-200 focus:border-indigo-500"
                                }`}
                              >
                                <option value="">Select Gender</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                              </select>
                              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            </div>
                            {errors[`${fieldName}Gender`] && (
                              <p className="text-[11px] text-red-500 flex items-center gap-1 mt-0.5">
                                <AlertCircle className="w-3 h-3" />
                                {errors[`${fieldName}Gender`]}
                              </p>
                            )}
                          </div>

                          {/* Member Phone */}
                          <div className="space-y-1.5">
                            <label htmlFor={`${fieldName}Phone`} className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                              Phone / Mobile <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                              <input
                                type="tel"
                                name={`${fieldName}Phone`}
                                id={`${fieldName}Phone`}
                                maxLength={10}
                                value={(formData as any)[`${fieldName}Phone`]}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/\D/g, "");
                                  setFormData(prev => ({ ...prev, [`${fieldName}Phone`]: val }));
                                  if (errors[`${fieldName}Phone`]) {
                                    setErrors(copy => {
                                      const newC = { ...copy };
                                      delete newC[`${fieldName}Phone`];
                                      return newC;
                                    });
                                  }
                                }}
                                placeholder="10-digit mobile"
                                className={`w-full px-3.5 py-2.5 rounded-xl border text-xs transition-all outline-none pl-10 bg-white focus:ring-4 focus:ring-indigo-100 ${
                                  errors[`${fieldName}Phone`]
                                    ? "border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100"
                                    : "border-slate-200 focus:border-indigo-500"
                                }`}
                              />
                              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            </div>
                            {errors[`${fieldName}Phone`] && (
                              <p className="text-[11px] text-red-500 flex items-center gap-1 mt-0.5">
                                <AlertCircle className="w-3 h-3" />
                                {errors[`${fieldName}Phone`]}
                              </p>
                            )}
                          </div>

                          {/* Member Email */}
                          <div className="space-y-1.5 sm:col-span-2">
                            <label htmlFor={`${fieldName}Email`} className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                              Email Address <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                              <input
                                type="email"
                                name={`${fieldName}Email`}
                                id={`${fieldName}Email`}
                                value={(formData as any)[`${fieldName}Email`]}
                                onChange={handleChange}
                                placeholder="member@example.com"
                                className={`w-full px-3.5 py-2.5 rounded-xl border text-xs transition-all outline-none pl-10 bg-white focus:ring-4 focus:ring-indigo-100 ${
                                  errors[`${fieldName}Email`]
                                    ? "border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100"
                                    : "border-slate-200 focus:border-indigo-500"
                                }`}
                              />
                              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            </div>
                            {errors[`${fieldName}Email`] && (
                              <p className="text-[11px] text-red-500 flex items-center gap-1 mt-0.5">
                                <AlertCircle className="w-3 h-3" />
                                {errors[`${fieldName}Email`]}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {errors.femaleRepresentation && (
                  <div className="bg-amber-50 border border-amber-300 text-amber-900 rounded-xl p-4 flex gap-3 text-sm">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">SIH Female Representation Mandate</p>
                      <p className="text-xs text-amber-800">{errors.femaleRepresentation}</p>
                    </div>
                  </div>
                )}

                {errors.submit && (
                  <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 flex gap-3 text-sm">
                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                    <div>
                      <p className="font-semibold">Submission Error</p>
                      <p className="text-xs text-red-700">{errors.submit}</p>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Payment Status Message */}
          {paymentStatusMessage && (
            <div className="bg-indigo-50 border border-indigo-100 text-indigo-800 rounded-xl p-4 text-xs font-semibold text-center flex items-center justify-center gap-2.5 mt-8">
              <span className="w-2 h-2 bg-indigo-600 rounded-full animate-ping"></span>
              <span>{paymentStatusMessage}</span>
            </div>
          )}

          {/* Navigation Action Buttons */}
          <div className="flex items-center justify-between border-t border-slate-100 mt-10 pt-6">
            {step > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                disabled={isSubmitting}
                className="px-5 py-3 rounded-xl font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 active:scale-98 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 glow-btn"
                id="btn-back"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            ) : (
              <div /> // placeholder for alignment
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-3 rounded-xl font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200 active:scale-98 transition-all flex items-center gap-2 cursor-pointer glow-btn"
                id="btn-next"
              >
                Continue
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-3.5 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 active:scale-98 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-80 glow-btn"
                id="btn-submit"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Submitting Team...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4.5 h-4.5" />
                    Submit Registration
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Portal footer help card */}
      <div className="mt-8 text-center text-slate-400 text-xs">
        <p>Copyright © 2026 SIH Committee. All submissions are stored securely.</p>
        <p className="mt-1">
          Having trouble? Contact the institutional SPOC or visit the{" "}
          <a
            href="https://sih.gov.in"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-500 hover:underline inline-flex items-center gap-0.5"
          >
            Official SIH Portal
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </p>
      </div>
    </div>
  );
}

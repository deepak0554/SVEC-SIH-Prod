import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Lock,
  Plus,
  Edit2,
  Trash2,
  Download,
  Search,
  Filter,
  CheckCircle,
  AlertCircle,
  BarChart2,
  FileSpreadsheet,
  Settings,
  ChevronLeft,
  Sparkles,
  X,
  FileText,
  PieChart,
  Users,
  Briefcase,
  Layers,
  ArrowUpDown,
  CreditCard,
  Mail,
  LogOut,
  UserPlus,
  ShieldAlert,
  Send,
  Image,
  MessageSquare,
  MessageCircle,
  Smartphone,
  History,
  Clock,
  Check,
  Shield
} from "lucide-react";
import * as XLSX from "xlsx";
import { ProblemStatement, Registration, Stats } from "../types";
import PageMenuCustomizer from "./PageMenuCustomizer";

interface AdminPanelProps {
  onBackToPortal: () => void;
  problemStatements: ProblemStatement[];
  onRefreshStatements: () => void;
}

export default function AdminPanel({
  onBackToPortal,
  problemStatements,
  onRefreshStatements
}: AdminPanelProps) {
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminRole, setAdminRole] = useState<"SPOC" | "Student SPOC" | null>(() => {
    return (sessionStorage.getItem("svec_sih_admin_role") as any) || null;
  });
  const [selectedRole, setSelectedRole] = useState<"SPOC" | "Student SPOC">("SPOC");
  const [passcode, setPasscode] = useState(() => {
    return sessionStorage.getItem("svec_sih_admin_token") || "";
  });
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return !!sessionStorage.getItem("svec_sih_admin_token");
  });
  const [loginError, setLoginError] = useState("");
  const [activeTab, setActiveTab] = useState<"registrations" | "statements" | "stats" | "settings" | "students" | "admins" | "security" | "customizer" | "broadcast">("registrations");

  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
  } | null>(null);

  // Change own password states (Admins / Student SPOC)
  const [oldAdminPassword, setOldAdminPassword] = useState("");
  const [newAdminPasswordSelf, setNewAdminPasswordSelf] = useState("");
  const [confirmAdminPasswordSelf, setConfirmAdminPasswordSelf] = useState("");
  const [adminPasswordSelfSuccess, setAdminPasswordSelfSuccess] = useState("");
  const [adminPasswordSelfError, setAdminPasswordSelfError] = useState("");
  const [adminPasswordSelfLoading, setAdminPasswordSelfLoading] = useState(false);

  // Reset other admin password states
  const [selectedAdminForReset, setSelectedAdminForReset] = useState<string | null>(null);
  const [newAdminPassword, setNewAdminPassword] = useState("");

  // Admins management state
  const [adminsList, setAdminsList] = useState<{ username: string; role: "SPOC" | "Student SPOC" }[]>([]);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [newAdminUser, setNewAdminUser] = useState("");
  const [newAdminPass, setNewAdminPass] = useState("");
  const [newAdminRole, setNewAdminRole] = useState<"SPOC" | "Student SPOC">("Student SPOC");
  const [adminAddError, setAdminAddError] = useState("");
  const [adminAddSuccess, setAdminAddSuccess] = useState("");

  // Email Broadcast state
  const [broadcastSubject, setBroadcastSubject] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastRecipientGroup, setBroadcastRecipientGroup] = useState<"all_logins" | "team_leads" | "all_team_members" | "test_single">("test_single");
  const [broadcastTestEmail, setBroadcastTestEmail] = useState("");
  const [broadcastSuccess, setBroadcastSuccess] = useState("");
  const [broadcastError, setBroadcastError] = useState("");
  const [broadcastLoading, setBroadcastLoading] = useState(false);

  // Channel Tab selection inside Broadcast
  const [broadcastSubTab, setBroadcastSubTab] = useState<"email" | "sms" | "whatsapp">("email");

  // SMS Broadcast state
  const [smsMessage, setSmsMessage] = useState("");
  const [smsRecipientGroup, setSmsRecipientGroup] = useState<"all_logins" | "team_leads" | "all_team_members" | "test_single">("test_single");
  const [smsTestMobile, setSmsTestMobile] = useState("");
  const [smsSuccess, setSmsSuccess] = useState("");
  const [smsError, setSmsError] = useState("");
  const [smsLoading, setSmsLoading] = useState(false);

  // WhatsApp Broadcast state
  const [whatsappTemplate, setWhatsappTemplate] = useState<"reg_confirmed" | "deadline_reminder" | "announcement">("reg_confirmed");
  const [whatsappRecipientGroup, setWhatsappRecipientGroup] = useState<"all_logins" | "team_leads" | "all_team_members" | "test_single">("test_single");
  const [whatsappTestMobile, setWhatsappTestMobile] = useState("");
  const [whatsappVar1, setWhatsappVar1] = useState("");
  const [whatsappVar2, setWhatsappVar2] = useState("");
  const [whatsappVar3, setWhatsappVar3] = useState("");
  const [whatsappSuccess, setWhatsappSuccess] = useState("");
  const [whatsappError, setWhatsappError] = useState("");
  const [whatsappLoading, setWhatsappLoading] = useState(false);

  // Broadcast Logs state
  const [broadcastLogs, setBroadcastLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const fetchBroadcastLogs = async () => {
    setLogsLoading(true);
    try {
      const res = await fetch("/api/admin/broadcast-logs", {
        headers: { "X-Admin-Passcode": passcode }
      });
      if (res.ok) {
        const data = await res.json();
        setBroadcastLogs(data);
      }
    } catch (err) {
      console.error("Error fetching broadcast logs:", err);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn && activeTab === "broadcast") {
      fetchBroadcastLogs();
    }
  }, [isLoggedIn, activeTab]);

  const getWhatsAppPreviewText = () => {
    if (whatsappTemplate === "reg_confirmed") {
      return `Hello *${whatsappVar1 || "[Student Name]"}*, your registration for SIH Hackathon under Team *${whatsappVar2 || "[Team Name]"}* is confirmed. Proceed to pay if applicable. Code: *${whatsappVar3 || "[REG-ID]"}*.`;
    }
    if (whatsappTemplate === "deadline_reminder") {
      return `Dear Team Lead *${whatsappVar1 || "[Lead Name]"}*, this is a gentle reminder that your problem statement PPT submission is due on *${whatsappVar2 || "[Date]"}*. Please submit on the portal.`;
    }
    return `Attention SVEC Hackers: *${whatsappVar1 || "[Announcement Content]"}*. Check details on the portal!`;
  };

  // SMS Broadcast Handler
  const handleSendSmsBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    setSmsError("");
    setSmsSuccess("");

    if (!smsMessage.trim()) {
      setSmsError("SMS content cannot be empty.");
      return;
    }

    if (smsRecipientGroup === "test_single" && (!smsTestMobile.trim() || smsTestMobile.trim().length < 10)) {
      setSmsError("Please provide a valid 10-digit mobile number.");
      return;
    }

    setSmsLoading(true);
    try {
      const res = await fetch("/api/admin/broadcast-sms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Passcode": passcode
        },
        body: JSON.stringify({
          message: smsMessage,
          recipientGroup: smsRecipientGroup,
          testMobile: smsTestMobile
        })
      });

      const data = await res.json();
      if (res.ok) {
        setSmsSuccess(data.message || "SMS broadcast dispatched successfully!");
        if (smsRecipientGroup !== "test_single") {
          setSmsMessage("");
        }
        fetchBroadcastLogs();
      } else {
        setSmsError(data.error || "Failed to dispatch SMS broadcast.");
      }
    } catch (err) {
      setSmsError("Network error. Could not dispatch SMS broadcast.");
    } finally {
      setSmsLoading(false);
    }
  };

  // WhatsApp Broadcast Handler
  const handleSendWhatsappBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    setWhatsappError("");
    setWhatsappSuccess("");

    if (whatsappRecipientGroup === "test_single" && (!whatsappTestMobile.trim() || whatsappTestMobile.trim().length < 10)) {
      setWhatsappError("Please provide a valid 10-digit mobile number.");
      return;
    }

    setWhatsappLoading(true);
    try {
      const res = await fetch("/api/admin/broadcast-whatsapp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Passcode": passcode
        },
        body: JSON.stringify({
          templateName: whatsappTemplate,
          variables: [whatsappVar1, whatsappVar2, whatsappVar3].filter(Boolean),
          recipientGroup: whatsappRecipientGroup,
          testMobile: whatsappTestMobile
        })
      });

      const data = await res.json();
      if (res.ok) {
        setWhatsappSuccess(data.message || "WhatsApp template broadcast dispatched successfully!");
        setWhatsappVar1("");
        setWhatsappVar2("");
        setWhatsappVar3("");
        fetchBroadcastLogs();
      } else {
        setWhatsappError(data.error || "Failed to dispatch WhatsApp broadcast.");
      }
    } catch (err) {
      setWhatsappError("Network error. Could not dispatch WhatsApp broadcast.");
    } finally {
      setWhatsappLoading(false);
    }
  };

  const fetchAdminsList = async () => {
    setAdminsLoading(true);
    try {
      const res = await fetch("/api/admin/manage-admins", {
        headers: { "X-Admin-Passcode": passcode }
      });
      if (res.ok) {
        const data = await res.json();
        setAdminsList(data);
      }
    } catch (err) {
      console.error("Failed to load admins list", err);
    } finally {
      setAdminsLoading(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn && activeTab === "admins" && adminRole === "SPOC") {
      fetchAdminsList();
    }
  }, [isLoggedIn, activeTab, adminRole]);

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminAddError("");
    setAdminAddSuccess("");

    if (!newAdminUser.trim() || !newAdminPass.trim() || !newAdminRole) {
      setAdminAddError("All fields are required.");
      return;
    }

    try {
      const res = await fetch("/api/admin/manage-admins", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Passcode": passcode
        },
        body: JSON.stringify({
          username: newAdminUser,
          password: newAdminPass,
          role: newAdminRole
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAdminAddSuccess(data.message || "Admin account created successfully.");
        setNewAdminUser("");
        setNewAdminPass("");
        fetchAdminsList();
      } else {
        setAdminAddError(data.error || "Failed to create admin.");
      }
    } catch (err) {
      setAdminAddError("Network error. Failed to connect to server.");
    }
  };

  const handleDeleteAdmin = (userToDelete: string) => {
    setDeleteConfirm({
      isOpen: true,
      title: "Delete Admin Account",
      message: `Are you sure you want to delete admin account "${userToDelete}"? This will permanently remove their access credentials.`,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/manage-admins/${userToDelete}`, {
            method: "DELETE",
            headers: {
              "X-Admin-Passcode": passcode
            }
          });
          const data = await res.json();
          if (res.ok && data.success) {
            fetchAdminsList();
          } else {
            alert(data.error || "Failed to delete admin.");
          }
        } catch (err) {
          alert("Network error. Failed to delete admin.");
        } finally {
          setDeleteConfirm(null);
        }
      }
    });
  };

  // Broadcast Email Handler
  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    setBroadcastError("");
    setBroadcastSuccess("");

    if (!broadcastSubject.trim()) {
      setBroadcastError("Subject line cannot be empty.");
      return;
    }
    if (!broadcastMessage.trim()) {
      setBroadcastError("Broadcast message content cannot be empty.");
      return;
    }
    if (broadcastRecipientGroup === "test_single" && (!broadcastTestEmail.trim() || !/\S+@\S+\.\S+/.test(broadcastTestEmail))) {
      setBroadcastError("Please provide a valid single recipient email address for testing.");
      return;
    }

    setBroadcastLoading(true);
    try {
      const res = await fetch("/api/admin/broadcast-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Passcode": passcode
        },
        body: JSON.stringify({
          subject: broadcastSubject,
          message: broadcastMessage,
          recipientGroup: broadcastRecipientGroup,
          testEmail: broadcastTestEmail
        })
      });

      const data = await res.json();
      if (res.ok) {
        setBroadcastSuccess(data.message || "Bulk broadcast email initiated successfully!");
        // Only clear if not test
        if (broadcastRecipientGroup !== "test_single") {
          setBroadcastSubject("");
          setBroadcastMessage("");
        }
      } else {
        setBroadcastError(data.error || "Failed to dispatch broadcast email.");
      }
    } catch (err) {
      setBroadcastError("Network error. Could not reach server to dispatch broadcast.");
    } finally {
      setBroadcastLoading(false);
    }
  };

  // State for Settings & Fees
  const [settingsForm, setSettingsForm] = useState({
    feeEnabled: false,
    feeAmount: 0,
    razorpayKeyId: "",
    razorpayKeySecret: "",
    jwtEnabled: false,
    emailEnabled: false,
    smtpHost: "",
    smtpPort: 587,
    smtpUser: "",
    smtpPass: "",
    smtpFrom: "",
    portalTheme: "light" as "light" | "dark",
    logoUrl: "",
    portalTitle: "",
    portalCaption: "",

    // SMS Configuration
    smsEnabled: false,
    smsProvider: "twilio" as "twilio" | "msg91" | "custom",
    twilioSid: "",
    twilioAuthToken: "",
    twilioFrom: "",
    msg91AuthKey: "",
    msg91SenderId: "",
    msg91Route: "4",
    smsCustomUrl: "",
    smsCustomMethod: "POST" as "GET" | "POST",
    smsCustomHeaders: "",
    smsCustomPayload: "",

    // WhatsApp Configuration
    whatsappEnabled: false,
    whatsappProvider: "meta" as "meta" | "custom",
    whatsappAccessToken: "",
    whatsappPhoneId: "",
    whatsappWabaId: "",
    whatsappCustomUrl: "",
    whatsappCustomMethod: "POST" as "GET" | "POST",
    whatsappCustomHeaders: "",
    whatsappCustomPayload: ""
  });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsError, setSettingsError] = useState("");
  const [settingsSuccess, setSettingsSuccess] = useState("");

  const fetchSettings = async () => {
    setSettingsLoading(true);
    setSettingsError("");
    try {
      const res = await fetch("/api/settings", {
        headers: { "X-Admin-Passcode": passcode }
      });
      if (res.ok) {
        const data = await res.json();
        setSettingsForm({
          feeEnabled: data.feeEnabled || false,
          feeAmount: data.feeAmount || 0,
          razorpayKeyId: data.razorpayKeyId || "",
          razorpayKeySecret: data.razorpayKeySecret || "",
          jwtEnabled: data.jwtEnabled || false,
          emailEnabled: data.emailEnabled || false,
          smtpHost: data.smtpHost || "",
          smtpPort: data.smtpPort || 587,
          smtpUser: data.smtpUser || "",
          smtpPass: data.smtpPass || "",
          smtpFrom: data.smtpFrom || "",
          portalTheme: data.portalTheme || "light",
          logoUrl: data.logoUrl || "",
          portalTitle: data.portalTitle || "",
          portalCaption: data.portalCaption || "",

          // SMS Gateway Config
          smsEnabled: data.smsEnabled || false,
          smsProvider: data.smsProvider || "twilio",
          twilioSid: data.twilioSid || "",
          twilioAuthToken: data.twilioAuthToken || "",
          twilioFrom: data.twilioFrom || "",
          msg91AuthKey: data.msg91AuthKey || "",
          msg91SenderId: data.msg91SenderId || "",
          msg91Route: data.msg91Route || "4",
          smsCustomUrl: data.smsCustomUrl || "",
          smsCustomMethod: data.smsCustomMethod || "POST",
          smsCustomHeaders: data.smsCustomHeaders || "",
          smsCustomPayload: data.smsCustomPayload || "",

          // WhatsApp Config
          whatsappEnabled: data.whatsappEnabled || false,
          whatsappProvider: data.whatsappProvider || "meta",
          whatsappAccessToken: data.whatsappAccessToken || "",
          whatsappPhoneId: data.whatsappPhoneId || "",
          whatsappWabaId: data.whatsappWabaId || "",
          whatsappCustomUrl: data.whatsappCustomUrl || "",
          whatsappCustomMethod: data.whatsappCustomMethod || "POST",
          whatsappCustomHeaders: data.whatsappCustomHeaders || "",
          whatsappCustomPayload: data.whatsappCustomPayload || ""
        });
      } else {
        setSettingsError("Failed to fetch current settings.");
      }
    } catch (err) {
      setSettingsError("Network error loading settings.");
    } finally {
      setSettingsLoading(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn && activeTab === "settings") {
      fetchSettings();
    }
  }, [isLoggedIn, activeTab]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsError("");
    setSettingsSuccess("");

    if (settingsForm.feeEnabled) {
      if (settingsForm.feeAmount <= 0) {
        setSettingsError("Fee amount must be greater than 0 if fee is enabled.");
        return;
      }
      if (!settingsForm.razorpayKeyId.trim() || !settingsForm.razorpayKeySecret.trim()) {
        setSettingsError("Razorpay Key ID and Key Secret are required when registration fee is enabled.");
        return;
      }
    }

    if (settingsForm.emailEnabled) {
      if (!settingsForm.smtpHost.trim() || !settingsForm.smtpUser.trim() || !settingsForm.smtpPass.trim()) {
        setSettingsError("SMTP Host, Username, and Password are required when the email system is enabled.");
        return;
      }
    }

    if (settingsForm.smsEnabled) {
      if (settingsForm.smsProvider === "twilio") {
        if (!settingsForm.twilioSid.trim() || !settingsForm.twilioAuthToken.trim() || !settingsForm.twilioFrom.trim()) {
          setSettingsError("Twilio Account SID, Auth Token, and From Number are required when Twilio SMS is selected.");
          return;
        }
      } else if (settingsForm.smsProvider === "msg91") {
        if (!settingsForm.msg91AuthKey.trim()) {
          setSettingsError("MSG91 Auth Key is required when MSG91 SMS is selected.");
          return;
        }
      } else if (settingsForm.smsProvider === "custom") {
        if (!settingsForm.smsCustomUrl.trim()) {
          setSettingsError("Custom SMS Endpoint URL is required when custom gateway is selected.");
          return;
        }
      }
    }

    if (settingsForm.whatsappEnabled) {
      if (settingsForm.whatsappProvider === "meta") {
        if (!settingsForm.whatsappAccessToken.trim() || !settingsForm.whatsappPhoneId.trim()) {
          setSettingsError("Meta Graph API Permanent Access Token and Phone Number ID are required when Meta Cloud API is selected.");
          return;
        }
      } else if (settingsForm.whatsappProvider === "custom") {
        if (!settingsForm.whatsappCustomUrl.trim()) {
          setSettingsError("Custom WhatsApp Endpoint URL is required when custom WhatsApp gateway is selected.");
          return;
        }
      }
    }

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Passcode": passcode
        },
        body: JSON.stringify(settingsForm)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSettingsSuccess("Settings saved and updated successfully!");
      } else {
        setSettingsError(data.error || "Failed to update settings.");
      }
    } catch (err) {
      setSettingsError("Network error. Could not update settings.");
    }
  };

  // State for registrations
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [regSearchTerm, setRegSearchTerm] = useState("");
  const [regFilterDept, setRegFilterDept] = useState("All");
  const [regFilterPS, setRegFilterPS] = useState("All");

  // Payment details popup state
  const [selectedRegPayment, setSelectedRegPayment] = useState<Registration | null>(null);

  // Proposal details popup state
  const [selectedRegProposal, setSelectedRegProposal] = useState<Registration | null>(null);

  // Editing registration state
  const [editingReg, setEditingReg] = useState<Registration | null>(null);
  const [editForm, setEditForm] = useState<Partial<Registration>>({});
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState("");

  // State for problem statement management
  const [psForm, setPsForm] = useState({
    code: "",
    title: "",
    category: "Software" as "Software" | "Hardware",
    organization: ""
  });
  const [editingPsId, setEditingPsId] = useState<string | null>(null);
  const [psError, setPsError] = useState("");
  const [psSuccess, setPsSuccess] = useState("");
  const [showPsFormModal, setShowPsFormModal] = useState(false);

  // Bulk import spreadsheet states
  const [showBulkSection, setShowBulkSection] = useState(false);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [importAction, setImportAction] = useState<"merge" | "replace">("merge");
  const [isBulkImporting, setIsBulkImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const [importSuccess, setImportSuccess] = useState("");

  // Sorting
  const [sortField, setSortField] = useState<keyof Registration>("teamName");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // State for students management
  const [students, setStudents] = useState<any[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsError, setStudentsError] = useState("");
  const [studentsSuccess, setStudentsSuccess] = useState("");
  const [studentSearchTerm, setStudentSearchTerm] = useState("");
  const [selectedStudentForReset, setSelectedStudentForReset] = useState<string | null>(null);
  const [newStudentPassword, setNewStudentPassword] = useState("");

  const fetchStudents = async () => {
    setStudentsLoading(true);
    setStudentsError("");
    try {
      const res = await fetch("/api/admin/students", {
        headers: { "X-Admin-Passcode": passcode }
      });
      if (res.ok) {
        const data = await res.json();
        setStudents(data);
      } else {
        setStudentsError("Failed to fetch student logins.");
      }
    } catch (err) {
      setStudentsError("Network error loading student list.");
    } finally {
      setStudentsLoading(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn && activeTab === "students") {
      fetchStudents();
    }
  }, [isLoggedIn, activeTab]);

  const handleDeleteStudent = (studentId: string, email: string) => {
    setDeleteConfirm({
      isOpen: true,
      title: "Delete Student Account",
      message: `Are you sure you want to delete the student account for ${email}? This will delete their student login credentials and access to registrations.`,
      onConfirm: async () => {
        setStudentsError("");
        setStudentsSuccess("");
        try {
          const res = await fetch(`/api/admin/students/${studentId}`, {
            method: "DELETE",
            headers: { "X-Admin-Passcode": passcode }
          });
          const data = await res.json();
          if (res.ok) {
            setStudentsSuccess(`Account for ${email} deleted successfully.`);
            fetchStudents();
          } else {
            setStudentsError(data.error || "Failed to delete student account.");
          }
        } catch (err) {
          setStudentsError("Network error. Could not delete student.");
        } finally {
          setDeleteConfirm(null);
        }
      }
    });
  };

  const handleResetPassword = async (studentId: string, email: string) => {
    if (!newStudentPassword || newStudentPassword.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }

    setStudentsError("");
    setStudentsSuccess("");
    try {
      const res = await fetch(`/api/admin/students/${studentId}/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Passcode": passcode
        },
        body: JSON.stringify({ newPassword: newStudentPassword })
      });
      const data = await res.json();
      if (res.ok) {
        setStudentsSuccess(`Password for ${email} reset successfully.`);
        setSelectedStudentForReset(null);
        setNewStudentPassword("");
        fetchStudents();
      } else {
        setStudentsError(data.error || "Failed to reset password.");
      }
    } catch (err) {
      setStudentsError("Network error. Could not reset password.");
    }
  };

  // Fetch registrations once logged in
  const fetchRegistrations = async () => {
    try {
      const res = await fetch("/api/registrations", {
        headers: { "X-Admin-Passcode": passcode }
      });
      if (res.ok) {
        const data = await res.json();
        setRegistrations(data);
      } else {
        setIsLoggedIn(false);
        setLoginError("Session expired or unauthorized. Please log in again.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchRegistrations();
    }
  }, [isLoggedIn]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    if (!adminUsername.trim() || !adminPassword.trim()) {
      setLoginError("Username and password are required");
      return;
    }

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: adminUsername,
          password: adminPassword,
          role: selectedRole
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPasscode(data.token);
        setAdminRole(data.role);
        setIsLoggedIn(true);
        sessionStorage.setItem("svec_sih_admin_token", data.token);
        sessionStorage.setItem("svec_sih_admin_role", data.role);
        sessionStorage.setItem("svec_sih_admin_username", data.username);
      } else {
        setLoginError(data.error || "Incorrect credentials or role selection.");
      }
    } catch (err) {
      setLoginError("Failed to connect to backend server");
    }
  };

  const handleCreateOrUpdatePS = async (e: React.FormEvent) => {
    e.preventDefault();
    setPsError("");
    setPsSuccess("");

    if (!psForm.code.trim() || !psForm.title.trim() || !psForm.organization.trim()) {
      setPsError("All fields are required");
      return;
    }

    try {
      const url = editingPsId ? `/api/problem-statements/${editingPsId}` : "/api/problem-statements";
      const method = editingPsId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Passcode": passcode
        },
        body: JSON.stringify(psForm)
      });

      const data = await res.json();
      if (res.ok) {
        setPsSuccess(editingPsId ? "Problem statement updated successfully!" : "Problem statement created successfully!");
        setPsForm({ code: "", title: "", category: "Software", organization: "" });
        setEditingPsId(null);
        setShowPsFormModal(false);
        onRefreshStatements();
      } else {
        setPsError(data.error || "Failed to save problem statement");
      }
    } catch (err) {
      setPsError("Network error occurred.");
    }
  };

  const handleEditPSClick = (ps: ProblemStatement) => {
    setPsForm({
      code: ps.code,
      title: ps.title,
      category: ps.category,
      organization: ps.organization
    });
    setEditingPsId(ps.id);
    setPsError("");
    setPsSuccess("");
    setShowPsFormModal(true);
  };

  const handleDeletePS = (id: string) => {
    setDeleteConfirm({
      isOpen: true,
      title: "Delete Problem Statement",
      message: "Are you sure you want to delete this Problem Statement? It may affect existing registrations mapped to it.",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/problem-statements/${id}`, {
            method: "DELETE",
            headers: { "X-Admin-Passcode": passcode }
          });
          if (res.ok) {
            onRefreshStatements();
            setPsSuccess("Deleted successfully!");
          } else {
            const data = await res.json();
            alert(data.error || "Failed to delete");
          }
        } catch (err) {
          alert("Network error.");
        } finally {
          setDeleteConfirm(null);
        }
      }
    });
  };

  const handleDeleteRegistration = (id: string) => {
    setDeleteConfirm({
      isOpen: true,
      title: "Delete Team Registration",
      message: "Are you sure you want to delete this student team registration? This action is irreversible and cannot be recovered.",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/registrations/${id}`, {
            method: "DELETE",
            headers: { "X-Admin-Passcode": passcode }
          });
          if (res.ok) {
            fetchRegistrations();
          } else {
            const data = await res.json();
            alert(data.error || "Failed to delete registration");
          }
        } catch (err) {
          alert("Network error.");
        } finally {
          setDeleteConfirm(null);
        }
      }
    });
  };

  const handleOpenEditReg = (reg: Registration) => {
    setEditingReg(reg);
    setEditForm({ ...reg });
    setEditError("");
    setEditSuccess("");
  };

  const handleUpdateRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReg) return;
    setEditError("");
    setEditSuccess("");

    try {
      const res = await fetch(`/api/registrations/${editingReg.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Passcode": passcode
        },
        body: JSON.stringify(editForm)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setEditSuccess("Registration updated successfully!");
        fetchRegistrations();
        setTimeout(() => {
          setEditingReg(null);
        }, 1000);
      } else {
        setEditError(data.error || "Failed to update registration");
      }
    } catch (err) {
      setEditError("Network error updating registration.");
    }
  };

  // Bulk problem statements import helpers
  const handleDownloadTemplate = () => {
    const headers = ["code", "title", "category", "organization"];
    const rows = [
      ["SIH1632", "AI-driven real-time power consumption anomaly detector for campus grids", "Software", "Ministry of Power"],
      ["SIH1633", "Smart solar tracking photovoltaic panel array with automated dust cleaning system", "Hardware", "Ministry of New and Renewable Energy"]
    ];
    // Create CSV content
    const csvRows = [
      headers.join(","),
      ...rows.map(r => r.map(cell => `"${cell.replace(/"/g, '""')}"`).join(","))
    ];
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "svec_sih_problem_statements_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    parseFile(file);
    // Clear input so same file can be chosen again
    e.target.value = "";
  };

  const parseFile = (file: File) => {
    setImportError("");
    setImportSuccess("");
    setParsedData([]);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Read sheet as double array to parse headers in case-insensitive way
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        if (!json || json.length === 0) {
          setImportError("The uploaded file is empty.");
          return;
        }

        // Detect columns from first row (headers)
        const headers = json[0].map((h: any) => h?.toString().toLowerCase().trim() || "");
        const codeIdx = headers.indexOf("code");
        const titleIdx = headers.indexOf("title");
        const categoryIdx = headers.indexOf("category");
        const orgIdx = headers.indexOf("organization");

        if (codeIdx === -1 || titleIdx === -1 || categoryIdx === -1 || orgIdx === -1) {
          setImportError(
            "Invalid header columns. The file must contain headers matching: 'code', 'title', 'category', 'organization' (case-insensitive)."
          );
          return;
        }

        const rows: any[] = [];
        const validationErrors: string[] = [];

        for (let i = 1; i < json.length; i++) {
          const row = json[i];
          if (!row || row.length === 0 || row.every((cell: any) => cell === null || cell === undefined || cell === "")) {
            continue; // skip blank rows
          }

          const code = row[codeIdx]?.toString().trim() || "";
          const title = row[titleIdx]?.toString().trim() || "";
          const categoryRaw = row[categoryIdx]?.toString().trim() || "";
          const organization = row[orgIdx]?.toString().trim() || "";

          if (!code || !title || !categoryRaw || !organization) {
            validationErrors.push(`Row ${i + 1}: Missing one or more required fields.`);
            continue;
          }

          const category = (categoryRaw.toLowerCase() === "hardware" || categoryRaw.toLowerCase() === "h") ? "Hardware" : "Software";

          rows.push({
            code,
            title,
            category,
            organization
          });
        }

        if (validationErrors.length > 0) {
          setImportError(`Row validation errors:\n${validationErrors.slice(0, 5).join("\n")}${validationErrors.length > 5 ? `\n...and ${validationErrors.length - 5} more errors` : ""}`);
          return;
        }

        if (rows.length === 0) {
          setImportError("No valid rows of problem statements found in sheet.");
          return;
        }

        setParsedData(rows);
        setImportSuccess(`Successfully parsed ${rows.length} rows. Please review and click 'Confirm Bulk Import' below.`);
      } catch (err: any) {
        console.error(err);
        setImportError("Failed to read and parse this file. Ensure it is a valid Excel (.xlsx/.xls) or CSV (.csv) file.");
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleBulkSubmit = async () => {
    if (parsedData.length === 0) return;
    setIsBulkImporting(true);
    setImportError("");
    setImportSuccess("");

    try {
      const res = await fetch("/api/problem-statements/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Passcode": passcode
        },
        body: JSON.stringify({
          statements: parsedData,
          action: importAction
        })
      });

      const data = await res.json();
      if (res.ok) {
        setImportSuccess(`Import completed! Successfully imported ${data.count} problem statements. Total: ${data.total}`);
        setParsedData([]);
        onRefreshStatements();
      } else {
        setImportError(data.error || "Failed to import statements.");
        if (data.details && Array.isArray(data.details)) {
          setImportError(`${data.error}:\n${data.details.slice(0, 5).join("\n")}`);
        }
      }
    } catch (err) {
      console.error(err);
      setImportError("Network error occurred during bulk import.");
    } finally {
      setIsBulkImporting(false);
    }
  };

  // Export registrations to CSV
  const handleExportCSV = () => {
    if (registrations.length === 0) return;

    const headers = [
      "Registration ID",
      "Team Name",
      "Lead Name",
      "Lead Department",
      "Lead Mobile",
      "Member 1",
      "Member 2",
      "Member 3",
      "Member 4",
      "Member 5",
      "Has Female Member",
      "Faculty Mentor",
      "Problem Statement Code",
      "Problem Statement Title",
      "Registration Time"
    ];

    const rows = registrations.map(reg => {
      const ps = problemStatements.find(p => p.id === reg.problemStatementId);
      return [
        reg.registrationId,
        `"${reg.teamName.replace(/"/g, '""')}"`,
        `"${reg.leadName.replace(/"/g, '""')}"`,
        `"${reg.leadDepartment.replace(/"/g, '""')}"`,
        `'${reg.leadMobile}`, // Single quote prevents Excel trimming leading zeros
        `"${reg.member1.replace(/"/g, '""')}"`,
        `"${reg.member2.replace(/"/g, '""')}"`,
        `"${reg.member3.replace(/"/g, '""')}"`,
        `"${reg.member4.replace(/"/g, '""')}"`,
        `"${reg.member5.replace(/"/g, '""')}"`,
        reg.hasFemaleMember ? "Yes" : "No",
        `"${reg.mentorName.replace(/"/g, '""')}"`,
        ps ? ps.code : "N/A",
        ps ? `"${ps.title.replace(/"/g, '""')}"` : "N/A",
        reg.submittedAt
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `SVEC_SIH_Hackathon_Registrations_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtering registrations
  const filteredRegs = registrations.filter(reg => {
    const ps = problemStatements.find(p => p.id === reg.problemStatementId);
    const searchStr = `${reg.teamName} ${reg.leadName} ${reg.mentorName} ${reg.registrationId} ${ps?.code || ""} ${ps?.title || ""}`.toLowerCase();
    const matchesSearch = searchStr.includes(regSearchTerm.toLowerCase());
    const matchesDept = regFilterDept === "All" || reg.leadDepartment.trim().toLowerCase() === regFilterDept.trim().toLowerCase();
    const matchesPS = regFilterPS === "All" || reg.problemStatementId === regFilterPS;
    return matchesSearch && matchesDept && matchesPS;
  });

  // Sorting logic
  const sortedRegs = [...filteredRegs].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];

    if (typeof valA === "string" && typeof valB === "string") {
      return sortOrder === "asc"
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA);
    }
    return 0;
  });

  const handleSort = (field: keyof Registration) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // Calculate stats
  const uniqueDepartments = Array.from(new Set(registrations.map(r => r.leadDepartment.trim())));
  
  const stats: Stats = {
    totalTeams: registrations.length,
    departmentCounts: registrations.reduce((acc, r) => {
      const dept = r.leadDepartment.trim();
      acc[dept] = (acc[dept] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    femaleCount: registrations.filter(r => r.hasFemaleMember).length,
    hardwareCount: registrations.filter(r => {
      const ps = problemStatements.find(p => p.id === r.problemStatementId);
      return ps?.category === "Hardware";
    }).length,
    softwareCount: registrations.filter(r => {
      const ps = problemStatements.find(p => p.id === r.problemStatementId);
      return ps?.category === "Software";
    }).length
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden"
        >
          <div className="bg-slate-900 px-6 py-8 text-center text-white relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-700/50 to-violet-800/50 mix-blend-multiply"></div>
            <div className="relative z-10">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-white/10 rounded-2xl mb-3 text-indigo-300">
                <Lock className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold font-display">SVEC SIH Authority</h2>
              <p className="text-slate-400 text-xs mt-1">Please enter your admin credentials to access the Admin dashboard</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="p-6 md:p-8 space-y-4 text-left">
            {/* Role selection */}
            <div className="space-y-1.5 text-left">
              <label htmlFor="role-select" className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                Select Admin Role
              </label>
              <select
                id="role-select"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as any)}
                className="w-full px-3 py-2.5 border border-slate-200 bg-slate-50 rounded-xl outline-none focus:bg-white focus:border-indigo-500 cursor-pointer text-xs"
              >
                <option value="SPOC">SPOC (Super Admin)</option>
                <option value="Student SPOC">Student SPOC</option>
              </select>
            </div>

            {/* Username */}
            <div className="space-y-1.5 text-left">
              <label htmlFor="admin-username" className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                Username
              </label>
              <input
                type="text"
                id="admin-username"
                value={adminUsername}
                onChange={(e) => setAdminUsername(e.target.value)}
                placeholder="e.g. spoc"
                className="w-full px-4 py-2 border border-slate-200 bg-slate-50 rounded-xl outline-none focus:bg-white focus:border-indigo-500 transition-all text-xs"
                required
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5 text-left">
              <label htmlFor="admin-password" className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                Password
              </label>
              <input
                type="password"
                id="admin-password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2 border border-slate-200 bg-slate-50 rounded-xl outline-none focus:bg-white focus:border-indigo-500 transition-all text-xs"
                required
              />
            </div>

            {loginError && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {loginError}
              </p>
            )}

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-md shadow-indigo-100 active:scale-98 cursor-pointer text-sm glow-btn"
              id="admin-verify-btn"
            >
              Verify Credentials & Login
            </button>
            <button
              type="button"
              onClick={onBackToPortal}
              className="w-full py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold transition-all text-xs cursor-pointer flex items-center justify-center gap-1.5"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to Registration Portal
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      
      {/* Top Breadcrumb Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-200">
        <div>
          <button
            onClick={onBackToPortal}
            className="text-slate-500 hover:text-slate-800 text-xs font-semibold flex items-center gap-1 mb-2 group transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            Registration Portal
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 shadow-sm">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold font-display text-slate-800 tracking-tight flex items-center gap-2.5">
                Institutional Admin Panel
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="text-xs text-slate-500">
                  Maintain problem statements, monitor submissions, and analyze team parameters.
                </span>
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full">
                  Role: {adminRole || "SPOC"}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  (User: {sessionStorage.getItem("svec_sih_admin_username") || "admin"})
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Logout and Session controls */}
        <div className="flex items-center gap-2 self-start md:self-center">
          <button
            onClick={() => {
              sessionStorage.removeItem("svec_sih_admin_token");
              sessionStorage.removeItem("svec_sih_admin_role");
              sessionStorage.removeItem("svec_sih_admin_username");
              setPasscode("");
              setAdminRole(null);
              setIsLoggedIn(false);
            }}
            className="px-3 py-2 border border-slate-200 text-slate-500 hover:text-red-600 hover:bg-red-50 hover:border-red-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout Account
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-2">
        {/* Tab Selection */}
        <div className="flex flex-wrap gap-1 bg-slate-200/60 p-1.5 rounded-xl self-start md:self-center">
          <button
            onClick={() => setActiveTab("registrations")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "registrations"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Team Submissions ({registrations.length})
          </button>
          <button
            onClick={() => setActiveTab("statements")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "statements"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Problem Statements ({problemStatements.length})
          </button>
          <button
            onClick={() => setActiveTab("stats")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "stats"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Analytics & Metrics
          </button>
          {adminRole !== "Student SPOC" && (
            <button
              onClick={() => setActiveTab("settings")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "settings"
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Settings
            </button>
          )}
          <button
            onClick={() => setActiveTab("students")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "students"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
            id="admin-tab-students"
          >
            Student Logins
          </button>
          <button
            onClick={() => setActiveTab("broadcast")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "broadcast"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
            id="admin-tab-broadcast"
          >
            Broadcast
          </button>
          {adminRole === "SPOC" && (
            <>
              <button
                onClick={() => setActiveTab("admins")}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "admins"
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                id="admin-tab-admins"
              >
                Manage Admin Users
              </button>
              <button
                onClick={() => setActiveTab("customizer")}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "customizer"
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                id="admin-tab-customizer"
              >
                Landing Page & Menus
              </button>
            </>
          )}
          <button
            onClick={() => setActiveTab("security")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "security"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
            id="admin-tab-security"
          >
            Change Password
          </button>
        </div>
      </div>

      {/* REGISTRATIONS TAB */}
      {activeTab === "registrations" && (
        <div className="space-y-6">
          {/* Controls Panel */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-wrap gap-3 items-center justify-between">
            <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
              
              {/* Search */}
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <input
                  type="text"
                  placeholder="Search teams, leads, or codes..."
                  value={regSearchTerm}
                  onChange={(e) => setRegSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 outline-none focus:bg-white focus:border-indigo-500 pl-8 transition-all"
                />
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              </div>

              {/* Department Filter */}
              <div className="flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={regFilterDept}
                  onChange={(e) => setRegFilterDept(e.target.value)}
                  className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="All">All Departments</option>
                  {uniqueDepartments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              {/* Problem Statement Filter */}
              <div className="flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={regFilterPS}
                  onChange={(e) => setRegFilterPS(e.target.value)}
                  className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white outline-none focus:border-indigo-500 cursor-pointer max-w-[180px]"
                >
                  <option value="All">All Problem Statements</option>
                  {problemStatements.map(ps => (
                    <option key={ps.id} value={ps.id}>[{ps.code}] {ps.title.slice(0, 30)}...</option>
                  ))}
                </select>
              </div>

            </div>

            {/* CSV export trigger */}
            {registrations.length > 0 && (
              <button
                onClick={handleExportCSV}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            )}
          </div>

          {/* Registrations List Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {sortedRegs.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                      <th className="py-4 px-6 cursor-pointer hover:bg-slate-100" onClick={() => handleSort("registrationId")}>
                        <div className="flex items-center gap-1">
                          Reg ID <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </th>
                      <th className="py-4 px-6 cursor-pointer hover:bg-slate-100" onClick={() => handleSort("teamName")}>
                        <div className="flex items-center gap-1">
                          Team Details <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </th>
                      <th className="py-4 px-6 cursor-pointer hover:bg-slate-100" onClick={() => handleSort("leadName")}>
                        <div className="flex items-center gap-1">
                          Team Lead <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </th>
                      <th className="py-4 px-6">Problem Statement</th>
                      <th className="py-4 px-6">Roster Details</th>
                      <th className="py-4 px-6">Mentor</th>
                      <th className="py-4 px-6">Female Ratio</th>
                      <th className="py-4 px-6">Payment</th>
                      <th className="py-4 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {sortedRegs.map((reg) => {
                      const ps = problemStatements.find(p => p.id === reg.problemStatementId);
                      return (
                        <tr key={reg.id} className="hover:bg-indigo-50/10 transition-colors">
                          <td className="py-4 px-6 font-mono font-bold whitespace-nowrap">
                            <button
                              onClick={() => setSelectedRegProposal(reg)}
                              className="text-indigo-600 hover:text-indigo-800 hover:underline outline-none text-left cursor-pointer font-bold font-mono"
                              title="Click to view work-related problem statement abstract, steps & PPT"
                            >
                              {reg.registrationId}
                            </button>
                          </td>
                          <td className="py-4 px-6 font-medium">
                            <span className="font-bold text-slate-900 font-display text-sm block">
                              {reg.teamName}
                            </span>
                            <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                              Sub: {new Date(reg.submittedAt).toLocaleDateString()}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <span className="font-semibold text-slate-800 block">{reg.leadName} ({reg.leadGender || "N/A"})</span>
                            <span className="text-[10px] text-slate-400 block">{reg.leadDepartment}</span>
                            <span className="text-[10px] text-indigo-600 font-mono block mt-0.5">{reg.leadMobile}</span>
                          </td>
                          <td className="py-4 px-6 max-w-xs">
                            {ps ? (
                              <div className="space-y-1">
                                <span className="font-mono text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                                  {ps.code}
                                </span>
                                <p className="font-medium text-slate-800 text-[11px] leading-snug line-clamp-2">
                                  {ps.title}
                                </p>
                              </div>
                            ) : (
                              <span className="text-red-500 font-medium">Mapped PS deleted</span>
                            )}
                          </td>
                          <td className="py-4 px-6">
                            <details className="cursor-pointer group">
                              <summary className="text-[11px] font-semibold text-indigo-600 hover:underline outline-none">
                                View 6-Person Details
                              </summary>
                              <div className="mt-1.5 p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-3 min-w-[240px] shadow-sm max-h-[220px] overflow-y-auto text-left">
                                {/* Lead Details */}
                                <div className="border-b border-slate-100 pb-1.5">
                                  <span className="text-[9px] font-bold text-indigo-700 uppercase block">Team Lead</span>
                                  <p className="text-[10px] font-semibold text-slate-800">{reg.leadName} ({reg.leadGender || "N/A"})</p>
                                  <p className="text-[9px] text-slate-500">{reg.leadDepartment} • {reg.leadMobile}</p>
                                </div>
                                {/* Member Details */}
                                {[1, 2, 3, 4, 5].map(mNum => {
                                  const mName = (reg as any)[`member${mNum}`];
                                  const mGender = (reg as any)[`member${mNum}Gender`] || "N/A";
                                  const mEmail = (reg as any)[`member${mNum}Email`] || "N/A";
                                  const mPhone = (reg as any)[`member${mNum}Phone`] || "N/A";
                                  if (!mName) return null;
                                  return (
                                    <div key={mNum} className="border-b border-slate-100 pb-1.5 last:border-0 last:pb-0">
                                      <span className="text-[9px] font-bold text-slate-400 uppercase block">Member {mNum}</span>
                                      <p className="text-[10px] font-semibold text-slate-700">{mName} ({mGender})</p>
                                      <p className="text-[9px] text-slate-500">{mEmail} • {mPhone}</p>
                                    </div>
                                  );
                                })}
                              </div>
                            </details>
                          </td>
                          <td className="py-4 px-6 font-semibold text-slate-800 whitespace-nowrap">
                            {reg.mentorName}
                          </td>
                          <td className="py-4 px-6">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              reg.hasFemaleMember
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}>
                              {reg.hasFemaleMember ? "Compliant" : "No Female"}
                            </span>
                          </td>
                          <td className="py-4 px-6 whitespace-nowrap">
                            <button
                              onClick={() => setSelectedRegPayment(reg)}
                              title="Click to view full payment details"
                              className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all hover:scale-105 cursor-pointer flex items-center gap-1 ${
                                reg.paymentStatus === "paid"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                  : reg.paymentStatus === "free"
                                  ? "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                                  : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                              }`}
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              <span className="capitalize">{reg.paymentStatus || "Free"}</span>
                            </button>
                          </td>
                          <td className="py-4 px-6 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleOpenEditReg(reg)}
                                title="Edit registration fields"
                                className="p-2 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-800 rounded-lg transition-colors cursor-pointer"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              {adminRole !== "Student SPOC" ? (
                                <button
                                  onClick={() => handleDeleteRegistration(reg.id)}
                                  title="Delete registration student data"
                                  className="p-2 text-red-500 hover:bg-red-50 hover:text-red-700 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              ) : (
                                <button
                                  disabled
                                  title="Student SPOC cannot delete team registrations"
                                  className="p-2 text-slate-300 cursor-not-allowed opacity-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-16 px-4">
                <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-700">No matching registrations</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  We couldn't find any team registrations matching your filters or search options.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PROBLEM STATEMENTS TAB */}
      {activeTab === "statements" && (
        <div className="space-y-6">
          
          {/* Heading with action item */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-800 font-display">Manage Problem Statements</h2>
              <p className="text-xs text-slate-500">Add, edit, or remove the challenge definitions displayed on the student form.</p>
            </div>
            <button
              onClick={() => {
                setPsForm({ code: "", title: "", category: "Software", organization: "" });
                setEditingPsId(null);
                setPsError("");
                setPsSuccess("");
                setShowPsFormModal(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md shadow-indigo-100 flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Statement
            </button>
          </div>

          {psSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-3 flex gap-2 text-xs">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{psSuccess}</span>
            </div>
          )}

          {/* Bulk Import Collapsible Section */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-4">
            <div 
              className="flex items-center justify-between cursor-pointer select-none" 
              onClick={() => setShowBulkSection(!showBulkSection)}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center border border-indigo-100">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 font-display">Bulk Import via Excel / CSV</h3>
                  <p className="text-[11px] text-slate-500">Upload multiple problem statements instantly using a spreadsheet.</p>
                </div>
              </div>
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors">
                {showBulkSection ? "Hide Panel" : "Open Panel"}
              </span>
            </div>

            {showBulkSection && (
              <div className="pt-4 border-t border-slate-200 space-y-4">
                {/* Instructions & Template */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-150">
                  <div className="text-xs text-slate-600 leading-relaxed max-w-xl">
                    Prepare your spreadsheet or CSV with the exact columns: <strong className="font-semibold text-indigo-600 font-mono">code</strong>, <strong className="font-semibold text-indigo-600 font-mono">title</strong>, <strong className="font-semibold text-indigo-600 font-mono">category</strong>, and <strong className="font-semibold text-indigo-600 font-mono">organization</strong>. 
                    <br />
                    <span className="text-slate-400 mt-1 block">Category value can be "Software" or "Hardware".</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="text-indigo-600 hover:text-indigo-700 font-bold text-xs flex items-center gap-1.5 self-start sm:self-center bg-indigo-50 hover:bg-indigo-100 px-3.5 py-2 rounded-xl transition-colors shrink-0 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    Download Template
                  </button>
                </div>

                {/* Upload & Action Panel */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* File Upload Zone */}
                  <div className="border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-white rounded-xl p-6 text-center transition-all relative flex flex-col items-center justify-center min-h-[140px]">
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv,.txt"
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <FileSpreadsheet className="w-8 h-8 text-indigo-500 mb-2" />
                    <p className="text-xs font-bold text-slate-700">Drag & drop spreadsheet here, or click to browse</p>
                    <p className="text-[10px] text-slate-400 mt-1">Accepts Microsoft Excel (.xlsx/.xls) or CSV files</p>
                  </div>

                  {/* Options */}
                  <div className="bg-white p-4 rounded-xl border border-slate-150 flex flex-col justify-center space-y-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Import Mode</span>
                    <div className="space-y-3">
                      <label className="flex items-start gap-2.5 cursor-pointer">
                        <input
                          type="radio"
                          name="importAction"
                          value="merge"
                          checked={importAction === "merge"}
                          onChange={() => setImportAction("merge")}
                          className="mt-0.5 accent-indigo-600 w-4 h-4 cursor-pointer"
                        />
                        <div>
                          <span className="text-xs font-bold text-slate-800 block">Merge and Update (Safe)</span>
                          <span className="text-[10px] text-slate-500 block">Adds new statements and updates fields for existing codes. Keeps matchings intact.</span>
                        </div>
                      </label>

                      <label className="flex items-start gap-2.5 cursor-pointer">
                        <input
                          type="radio"
                          name="importAction"
                          value="replace"
                          checked={importAction === "replace"}
                          onChange={() => setImportAction("replace")}
                          className="mt-0.5 accent-indigo-600 w-4 h-4 cursor-pointer"
                        />
                        <div>
                          <span className="text-xs font-bold text-slate-800 block">Replace Entire List (Destructive)</span>
                          <span className="text-[10px] text-slate-500 block">Clears the database table and replaces it completely with sheet contents.</span>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Error Banner */}
                {importError && (
                  <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-3.5 text-xs flex gap-2 font-mono whitespace-pre-wrap">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-bold">Parsing Error Details:</p>
                      <p className="mt-1">{importError}</p>
                    </div>
                  </div>
                )}

                {/* Success Banner */}
                {importSuccess && (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-3.5 text-xs flex gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{importSuccess}</span>
                  </div>
                )}

                {/* Parsed Data Live Preview Table */}
                {parsedData.length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mt-2">
                    <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">Preview Data to Import ({parsedData.length} records found)</span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setParsedData([])}
                          className="px-2.5 py-1 text-[10px] font-semibold border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleBulkSubmit}
                          disabled={isBulkImporting}
                          className="px-3.5 py-1 text-[10px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1 cursor-pointer glow-btn"
                        >
                          {isBulkImporting ? "Importing..." : "Confirm & Save to Backend"}
                        </button>
                      </div>
                    </div>
                    <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 text-xs">
                      {parsedData.slice(0, 10).map((row, idx) => (
                        <div key={idx} className="p-3 hover:bg-slate-50/50 flex flex-col sm:flex-row justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded text-[10px] border border-indigo-100">{row.code}</span>
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                row.category === "Software" ? "bg-indigo-50 text-indigo-700 border border-indigo-100" : "bg-amber-50 text-amber-700 border border-amber-100"
                              }`}>
                                {row.category}
                              </span>
                            </div>
                            <p className="font-bold text-slate-800 text-[11px] leading-relaxed">{row.title}</p>
                          </div>
                          <div className="text-[10px] text-slate-500 font-medium self-start sm:self-center bg-slate-50 px-2 py-1 rounded border border-slate-100 shrink-0">
                            {row.organization}
                          </div>
                        </div>
                      ))}
                      {parsedData.length > 10 && (
                        <div className="p-3 text-center text-[10px] text-slate-400 bg-slate-50 italic border-t border-slate-150">
                          ... and {parsedData.length - 10} more items. Click 'Confirm & Save' to import all {parsedData.length} statements.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Table list of problem statements */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            {problemStatements.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                      <th className="py-4 px-6 w-28">Code</th>
                      <th className="py-4 px-6 w-24">Type</th>
                      <th className="py-4 px-6">Topic / Title</th>
                      <th className="py-4 px-6">Nodal Organization / Ministry</th>
                      <th className="py-4 px-6 w-24 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {problemStatements.map((ps) => (
                      <tr key={ps.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-6 font-mono font-bold text-indigo-700">
                          {ps.code}
                        </td>
                        <td className="py-4 px-6">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            ps.category === "Software" 
                              ? "bg-indigo-50 text-indigo-700 border border-indigo-100" 
                              : "bg-amber-50 text-amber-700 border border-amber-100"
                          }`}>
                            {ps.category}
                          </span>
                        </td>
                        <td className="py-4 px-6 font-semibold text-slate-800 leading-relaxed">
                          {ps.title}
                        </td>
                        <td className="py-4 px-6 text-slate-500">
                          {ps.organization}
                        </td>
                        <td className="py-4 px-6 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleEditPSClick(ps)}
                              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
                              title="Edit Problem Statement"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeletePS(ps.id)}
                              className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                              title="Delete Problem Statement"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-16 px-4">
                <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-700">No Problem Statements Added</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Add custom challenge definition codes and titles for students to map their idea papers.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ANALYTICS TAB */}
      {activeTab === "stats" && (
        <div className="space-y-6">
          <h2 className="text-lg font-bold text-slate-800 font-display">Analytics & Live Statistics</h2>

          {/* Quick numbers cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Teams</span>
                <span className="text-2xl font-extrabold text-slate-800 font-display">{stats.totalTeams}</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center shrink-0">
                <PieChart className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Female Representation</span>
                <span className="text-2xl font-extrabold text-slate-800 font-display">
                  {stats.totalTeams > 0 ? Math.round((stats.femaleCount / stats.totalTeams) * 100) : 0}%
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">{stats.femaleCount} teams have female members</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center shrink-0">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Software Track</span>
                <span className="text-2xl font-extrabold text-slate-800 font-display">{stats.softwareCount}</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">MAPPED TO SOFTWARE PS</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                <Briefcase className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Hardware Track</span>
                <span className="text-2xl font-extrabold text-slate-800 font-display">{stats.hardwareCount}</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">MAPPED TO HARDWARE PS</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Department distribution bar chart helper */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <h3 className="text-sm font-bold text-slate-800 font-display mb-4 flex items-center gap-1.5">
                <BarChart2 className="w-4 h-4 text-indigo-500" />
                Registrations by Department
              </h3>
              {Object.keys(stats.departmentCounts).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(stats.departmentCounts).map(([dept, count]) => {
                    const percentage = Math.round((count / stats.totalTeams) * 100);
                    return (
                      <div key={dept} className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-slate-700 truncate max-w-[200px] md:max-w-xs">{dept}</span>
                          <span className="font-bold text-indigo-600">{count} ({percentage}%)</span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${percentage}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-400 text-center py-10">No data available yet</p>
              )}
            </div>

            {/* Popular problem statements helper */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <h3 className="text-sm font-bold text-slate-800 font-display mb-4 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-500" />
                Popular Problem Statements
              </h3>
              {registrations.length > 0 ? (
                <div className="space-y-3">
                  {problemStatements.map(ps => {
                    const count = registrations.filter(r => r.problemStatementId === ps.id).length;
                    if (count === 0) return null;
                    const percentage = Math.round((count / registrations.length) * 100);
                    return (
                      <div key={ps.id} className="flex items-center justify-between text-xs py-2 border-b border-slate-50">
                        <div className="flex items-center gap-2 truncate pr-4">
                          <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                            {ps.code}
                          </span>
                          <span className="font-semibold text-slate-700 truncate" title={ps.title}>
                            {ps.title}
                          </span>
                        </div>
                        <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded shrink-0">
                          {count} teams
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-400 text-center py-10">No registrations received yet</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SETTINGS TAB */}
      {activeTab === "settings" && adminRole !== "Student SPOC" && (
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <h2 className="text-lg font-bold text-slate-800 font-display mb-1 flex items-center gap-2">
              <Settings className="w-5 h-5 text-indigo-500" />
              Registration Fee & Razorpay Configuration
            </h2>
            <p className="text-xs text-slate-500 mb-6">
              Configure if teams must pay an institutional fee to register and provide Razorpay API credentials.
            </p>

            {settingsLoading ? (
              <div className="py-12 text-center">
                <span className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin inline-block"></span>
                <p className="text-xs text-slate-400 mt-2">Loading credentials & settings...</p>
              </div>
            ) : (
              <form onSubmit={handleSaveSettings} className="space-y-6">
                {settingsError && (
                  <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 text-xs flex gap-2 font-medium">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <span>{settingsError}</span>
                  </div>
                )}

                {settingsSuccess && (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-4 text-xs flex gap-2 font-medium">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{settingsSuccess}</span>
                  </div>
                )}

                {/* Toggle Fee Requirement */}
                <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-700 block">Enable Registration Fee Collection</span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      Toggle whether students must pay a registration fee during form submission.
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={settingsForm.feeEnabled}
                      onChange={(e) => setSettingsForm(prev => ({ ...prev, feeEnabled: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                {/* Toggle JWT authentication */}
                <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-700 block flex items-center gap-1.5">
                      <Lock className="w-4 h-4 text-indigo-500" />
                      Enable JWT Authentication
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      Enforce secure JSON Web Token (JWT) verification on all student registration and profile endpoints. Only SPOC (Super Admin) can toggle this configuration.
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={settingsForm.jwtEnabled}
                      disabled={adminRole !== "SPOC"}
                      onChange={(e) => setSettingsForm(prev => ({ ...prev, jwtEnabled: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 peer-disabled:opacity-55"></div>
                  </label>
                </div>

                {/* Config Fields */}
                <AnimatePresence>
                  {settingsForm.feeEnabled && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-4 overflow-hidden"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Fee Amount */}
                        <div className="space-y-1.5 sm:col-span-2">
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Registration Fee Amount (₹)
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={settingsForm.feeAmount || ""}
                            onChange={(e) => setSettingsForm(prev => ({ ...prev, feeAmount: parseInt(e.target.value, 10) || 0 }))}
                            placeholder="e.g. 500"
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-xs focus:border-indigo-500 transition-all font-mono font-bold"
                            required={settingsForm.feeEnabled}
                          />
                        </div>

                        {/* Razorpay Key ID */}
                        <div className="space-y-1.5">
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Razorpay Key ID
                          </label>
                          <input
                            type="text"
                            value={settingsForm.razorpayKeyId}
                            onChange={(e) => setSettingsForm(prev => ({ ...prev, razorpayKeyId: e.target.value }))}
                            placeholder="rzp_test_..."
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-xs focus:border-indigo-500 transition-all font-mono"
                            required={settingsForm.feeEnabled}
                          />
                        </div>

                        {/* Razorpay Key Secret */}
                        <div className="space-y-1.5">
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Razorpay Key Secret
                          </label>
                          <input
                            type="password"
                            value={settingsForm.razorpayKeySecret}
                            onChange={(e) => setSettingsForm(prev => ({ ...prev, razorpayKeySecret: e.target.value }))}
                            placeholder="••••••••••••••••••••••••"
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-xs focus:border-indigo-500 transition-all font-mono"
                            required={settingsForm.feeEnabled}
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Toggle Email Service */}
                <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-700 block flex items-center gap-1.5">
                      <Mail className="w-4 h-4 text-indigo-500" />
                      Enable Automatic & Bulk Email System
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      Enables SMTP-driven email dispatch for automated student registrations, team submissions, and bulk administration broadcasts.
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={settingsForm.emailEnabled}
                      onChange={(e) => setSettingsForm(prev => ({ ...prev, emailEnabled: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                {/* SMTP Credentials Form Fields */}
                <AnimatePresence>
                  {settingsForm.emailEnabled && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-4 overflow-hidden border border-slate-100 rounded-2xl p-4 bg-slate-50/20"
                    >
                      <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-2">SMTP Configuration</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* SMTP Host */}
                        <div className="space-y-1.5">
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">SMTP Host</label>
                          <input
                            type="text"
                            value={settingsForm.smtpHost}
                            onChange={(e) => setSettingsForm(prev => ({ ...prev, smtpHost: e.target.value }))}
                            placeholder="e.g. smtp.gmail.com"
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-xs focus:border-indigo-500 transition-all font-mono"
                            required={settingsForm.emailEnabled}
                          />
                        </div>

                        {/* SMTP Port */}
                        <div className="space-y-1.5">
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">SMTP Port</label>
                          <input
                            type="number"
                            value={settingsForm.smtpPort}
                            onChange={(e) => setSettingsForm(prev => ({ ...prev, smtpPort: parseInt(e.target.value, 10) || 587 }))}
                            placeholder="e.g. 587 or 465"
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-xs focus:border-indigo-500 transition-all font-mono"
                            required={settingsForm.emailEnabled}
                          />
                        </div>

                        {/* SMTP User */}
                        <div className="space-y-1.5">
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">SMTP Username</label>
                          <input
                            type="text"
                            value={settingsForm.smtpUser}
                            onChange={(e) => setSettingsForm(prev => ({ ...prev, smtpUser: e.target.value }))}
                            placeholder="e.g. your-email@gmail.com"
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-xs focus:border-indigo-500 transition-all font-mono"
                            required={settingsForm.emailEnabled}
                          />
                        </div>

                        {/* SMTP Pass */}
                        <div className="space-y-1.5">
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">SMTP Password / App Key</label>
                          <input
                            type="password"
                            value={settingsForm.smtpPass}
                            onChange={(e) => setSettingsForm(prev => ({ ...prev, smtpPass: e.target.value }))}
                            placeholder="••••••••••••••••"
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-xs focus:border-indigo-500 transition-all font-mono"
                            required={settingsForm.emailEnabled}
                          />
                        </div>

                        {/* SMTP From */}
                        <div className="space-y-1.5 sm:col-span-2">
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Sender Display Address (From)</label>
                          <input
                            type="text"
                            value={settingsForm.smtpFrom}
                            onChange={(e) => setSettingsForm(prev => ({ ...prev, smtpFrom: e.target.value }))}
                            placeholder='e.g. "SVEC SIH Hackathon" <noreply@svecsih.org>'
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-xs focus:border-indigo-500 transition-all font-mono"
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Toggle SMS Gateway Service */}
                <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-700 block flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4 text-indigo-500" />
                      Enable SMS Gateway Dispatch
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      Enables real-time SMS dispatch to students (leads & team members) for alerts, registration confirmations, and announcements.
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={settingsForm.smsEnabled}
                      onChange={(e) => setSettingsForm(prev => ({ ...prev, smsEnabled: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                {/* SMS Gateway Credentials Form Fields */}
                <AnimatePresence>
                  {settingsForm.smsEnabled && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-4 overflow-hidden border border-slate-100 rounded-2xl p-4 bg-slate-50/20"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
                        <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-wider">SMS Gateway Configuration</h3>
                        <div className="flex items-center gap-2">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Provider Technology:</label>
                          <select
                            value={settingsForm.smsProvider}
                            onChange={(e) => setSettingsForm(prev => ({ ...prev, smsProvider: e.target.value as any }))}
                            className="px-2 py-1 border border-slate-200 rounded-lg text-xs outline-none bg-white font-medium text-slate-700"
                          >
                            <option value="twilio">Twilio SMS API</option>
                            <option value="msg91">MSG91 API (India)</option>
                            <option value="custom">Custom HTTP GET/POST</option>
                          </select>
                        </div>
                      </div>

                      {settingsForm.smsProvider === "twilio" && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Twilio Account SID</label>
                            <input
                              type="text"
                              value={settingsForm.twilioSid}
                              onChange={(e) => setSettingsForm(prev => ({ ...prev, twilioSid: e.target.value }))}
                              placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-xs focus:border-indigo-500 transition-all font-mono"
                              required={settingsForm.smsEnabled && settingsForm.smsProvider === "twilio"}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Twilio Auth Token</label>
                            <input
                              type="password"
                              value={settingsForm.twilioAuthToken}
                              onChange={(e) => setSettingsForm(prev => ({ ...prev, twilioAuthToken: e.target.value }))}
                              placeholder="••••••••••••••••••••••••••••••••"
                              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-xs focus:border-indigo-500 transition-all font-mono"
                              required={settingsForm.smsEnabled && settingsForm.smsProvider === "twilio"}
                            />
                          </div>
                          <div className="space-y-1.5 sm:col-span-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Twilio From Phone Number</label>
                            <input
                              type="text"
                              value={settingsForm.twilioFrom}
                              onChange={(e) => setSettingsForm(prev => ({ ...prev, twilioFrom: e.target.value }))}
                              placeholder="e.g. +18559092012"
                              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-xs focus:border-indigo-500 transition-all font-mono"
                              required={settingsForm.smsEnabled && settingsForm.smsProvider === "twilio"}
                            />
                          </div>
                        </div>
                      )}

                      {settingsForm.smsProvider === "msg91" && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5 sm:col-span-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">MSG91 Auth Key</label>
                            <input
                              type="password"
                              value={settingsForm.msg91AuthKey}
                              onChange={(e) => setSettingsForm(prev => ({ ...prev, msg91AuthKey: e.target.value }))}
                              placeholder="Enter your MSG91 Auth Key"
                              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-xs focus:border-indigo-500 transition-all font-mono"
                              required={settingsForm.smsEnabled && settingsForm.smsProvider === "msg91"}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Sender ID (DLT Header)</label>
                            <input
                              type="text"
                              value={settingsForm.msg91SenderId}
                              onChange={(e) => setSettingsForm(prev => ({ ...prev, msg91SenderId: e.target.value }))}
                              placeholder="e.g. SVECSI (6 characters)"
                              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-xs focus:border-indigo-500 transition-all font-mono"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Route ID</label>
                            <input
                              type="text"
                              value={settingsForm.msg91Route}
                              onChange={(e) => setSettingsForm(prev => ({ ...prev, msg91Route: e.target.value }))}
                              placeholder="e.g. 4 (Transactional)"
                              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-xs focus:border-indigo-500 transition-all font-mono"
                            />
                          </div>
                        </div>
                      )}

                      {settingsForm.smsProvider === "custom" && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="sm:col-span-2 space-y-1.5">
                              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Custom Gateway Base URL</label>
                              <input
                                type="text"
                                value={settingsForm.smsCustomUrl}
                                onChange={(e) => setSettingsForm(prev => ({ ...prev, smsCustomUrl: e.target.value }))}
                                placeholder="e.g. https://api.smsvendor.com/send?apikey=XYZ&phone={{phone}}&msg={{message}}"
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-xs focus:border-indigo-500 transition-all font-mono"
                                required={settingsForm.smsEnabled && settingsForm.smsProvider === "custom"}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Request Method</label>
                              <select
                                value={settingsForm.smsCustomMethod}
                                onChange={(e) => setSettingsForm(prev => ({ ...prev, smsCustomMethod: e.target.value as any }))}
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-xs focus:border-indigo-500 transition-all bg-white font-medium"
                              >
                                <option value="GET">HTTP GET</option>
                                <option value="POST">HTTP POST</option>
                              </select>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Custom HTTP Headers (JSON)</label>
                              <textarea
                                value={settingsForm.smsCustomHeaders}
                                onChange={(e) => setSettingsForm(prev => ({ ...prev, smsCustomHeaders: e.target.value }))}
                                placeholder='e.g. { "Authorization": "Bearer TOKEN" }'
                                rows={3}
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-xs focus:border-indigo-500 transition-all font-mono"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Custom POST Payload (JSON)</label>
                              <textarea
                                value={settingsForm.smsCustomPayload}
                                onChange={(e) => setSettingsForm(prev => ({ ...prev, smsCustomPayload: e.target.value }))}
                                placeholder='e.g. { "to": "{{phone}}", "body": "{{message}}" }'
                                rows={3}
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-xs focus:border-indigo-500 transition-all font-mono"
                              />
                            </div>
                          </div>
                          <p className="text-[10px] text-slate-400">
                            * Use <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">{"{{phone}}"}</code> for the target recipient and <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">{"{{message}}"}</code> for the text payload. They will be automatically replaced during bulk broadcast dispatch.
                          </p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Toggle WhatsApp Business Service */}
                <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-700 block flex items-center gap-1.5">
                      <MessageCircle className="w-4 h-4 text-emerald-500" />
                      Enable WhatsApp Business Profile Notifications
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      Enables real WhatsApp Business Cloud templates or custom WhatsApp gateway API dispatch to students for registration flow and deadline alerts.
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={settingsForm.whatsappEnabled}
                      onChange={(e) => setSettingsForm(prev => ({ ...prev, whatsappEnabled: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                {/* WhatsApp Gateway Credentials Form Fields */}
                <AnimatePresence>
                  {settingsForm.whatsappEnabled && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-4 overflow-hidden border border-slate-100 rounded-2xl p-4 bg-slate-50/20"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
                        <h3 className="text-xs font-bold text-emerald-600 uppercase tracking-wider">WhatsApp Business Configuration</h3>
                        <div className="flex items-center gap-2">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Profile Engine:</label>
                          <select
                            value={settingsForm.whatsappProvider}
                            onChange={(e) => setSettingsForm(prev => ({ ...prev, whatsappProvider: e.target.value as any }))}
                            className="px-2 py-1 border border-slate-200 rounded-lg text-xs outline-none bg-white font-medium text-slate-700"
                          >
                            <option value="meta">Meta Cloud API (Official)</option>
                            <option value="custom">Custom WhatsApp Provider API</option>
                          </select>
                        </div>
                      </div>

                      {settingsForm.whatsappProvider === "meta" && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5 sm:col-span-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Meta Graph Permanent Access Token</label>
                            <input
                              type="password"
                              value={settingsForm.whatsappAccessToken}
                              onChange={(e) => setSettingsForm(prev => ({ ...prev, whatsappAccessToken: e.target.value }))}
                              placeholder="EAAGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-xs focus:border-indigo-500 transition-all font-mono"
                              required={settingsForm.whatsappEnabled && settingsForm.whatsappProvider === "meta"}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">WhatsApp Phone Number ID</label>
                            <input
                              type="text"
                              value={settingsForm.whatsappPhoneId}
                              onChange={(e) => setSettingsForm(prev => ({ ...prev, whatsappPhoneId: e.target.value }))}
                              placeholder="e.g. 106129845129032"
                              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-xs focus:border-indigo-500 transition-all font-mono"
                              required={settingsForm.whatsappEnabled && settingsForm.whatsappProvider === "meta"}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">WhatsApp Business Account ID</label>
                            <input
                              type="text"
                              value={settingsForm.whatsappWabaId}
                              onChange={(e) => setSettingsForm(prev => ({ ...prev, whatsappWabaId: e.target.value }))}
                              placeholder="e.g. 109312847192837"
                              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-xs focus:border-indigo-500 transition-all font-mono"
                            />
                          </div>
                        </div>
                      )}

                      {settingsForm.whatsappProvider === "custom" && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="sm:col-span-2 space-y-1.5">
                              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Custom WhatsApp Gateway URL</label>
                              <input
                                type="text"
                                value={settingsForm.whatsappCustomUrl}
                                onChange={(e) => setSettingsForm(prev => ({ ...prev, whatsappCustomUrl: e.target.value }))}
                                placeholder="e.g. https://api.whatsappgateway.com/send"
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-xs focus:border-indigo-500 transition-all font-mono"
                                required={settingsForm.whatsappEnabled && settingsForm.whatsappProvider === "custom"}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Request Method</label>
                              <select
                                value={settingsForm.whatsappCustomMethod}
                                onChange={(e) => setSettingsForm(prev => ({ ...prev, whatsappCustomMethod: e.target.value as any }))}
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-xs focus:border-indigo-500 transition-all bg-white font-medium"
                              >
                                <option value="GET">HTTP GET</option>
                                <option value="POST">HTTP POST</option>
                              </select>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Custom HTTP Headers (JSON)</label>
                              <textarea
                                value={settingsForm.whatsappCustomHeaders}
                                onChange={(e) => setSettingsForm(prev => ({ ...prev, whatsappCustomHeaders: e.target.value }))}
                                placeholder='e.g. { "x-api-key": "SECRET" }'
                                rows={3}
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-xs focus:border-indigo-500 transition-all font-mono"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Custom Payload Structure (JSON)</label>
                              <textarea
                                value={settingsForm.whatsappCustomPayload}
                                onChange={(e) => setSettingsForm(prev => ({ ...prev, whatsappCustomPayload: e.target.value }))}
                                placeholder='e.g. { "to": "{{phone}}", "template": "{{template}}", "body_vars": {{variables}} }'
                                rows={3}
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-xs focus:border-indigo-500 transition-all font-mono"
                              />
                            </div>
                          </div>
                          <p className="text-[10px] text-slate-400">
                            * Placeholders: <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">{"{{phone}}"}</code> (sanitized 10/12-digit format), <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">{"{{template}}"}</code>, <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">{"{{variables}}"}</code> (JSON array), and individual variables: <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">{"{{var1}}"}</code>, <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">{"{{var2}}"}</code>, <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">{"{{var3}}"}</code>.
                          </p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Public Portal Customization & Branding */}
                <div className="border border-slate-100 rounded-2xl p-6 bg-slate-50/30 space-y-5">
                  <div>
                    <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                      <Sparkles className="w-4 h-4 text-indigo-500" />
                      Public Registration Portal Branding & Theme
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Customize the look, feel, title, logo, and caption of your public-facing student registration pages.
                    </p>
                  </div>

                  {/* Toggle Theme Option */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Portal Theme Style
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setSettingsForm(prev => ({ ...prev, portalTheme: "light" }))}
                        className={`border rounded-xl p-3 flex items-center justify-center gap-2 cursor-pointer transition-all font-bold text-xs ${settingsForm.portalTheme === "light" ? "border-indigo-600 bg-indigo-50/50 text-indigo-700" : "border-slate-200 hover:bg-slate-50 text-slate-600"}`}
                      >
                        <span className="w-2.5 h-2.5 bg-amber-500 rounded-full"></span>
                        Light Theme
                      </button>
                      <button
                        type="button"
                        onClick={() => setSettingsForm(prev => ({ ...prev, portalTheme: "dark" }))}
                        className={`border rounded-xl p-3 flex items-center justify-center gap-2 cursor-pointer transition-all font-bold text-xs ${settingsForm.portalTheme === "dark" ? "border-indigo-600 bg-indigo-950/80 text-indigo-300" : "border-slate-200 hover:bg-slate-50 text-slate-600"}`}
                      >
                        <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-pulse"></span>
                        Dark Theme (Premium)
                      </button>
                    </div>
                  </div>

                  {/* Title and Caption customization */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Portal Primary Header Title
                      </label>
                      <input
                        type="text"
                        value={settingsForm.portalTitle}
                        onChange={(e) => setSettingsForm(prev => ({ ...prev, portalTitle: e.target.value }))}
                        placeholder="e.g. SVEC - SIH Internal Hackathon 2026"
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-xs focus:border-indigo-500 transition-all font-bold"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Portal Subtitle / Caption
                      </label>
                      <input
                        type="text"
                        value={settingsForm.portalCaption}
                        onChange={(e) => setSettingsForm(prev => ({ ...prev, portalCaption: e.target.value }))}
                        placeholder="e.g. Sri Vasavi Engineering College"
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-xs focus:border-indigo-500 transition-all font-semibold"
                      />
                    </div>
                  </div>

                  {/* Logo upload options */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Portal Custom Brand Logo (Backend upload)
                    </label>
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-center overflow-hidden shrink-0">
                        {settingsForm.logoUrl ? (
                          <img src={settingsForm.logoUrl} className="w-full h-full object-contain p-1" alt="Custom Logo Preview" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="text-[10px] text-slate-400 text-center font-bold px-1">SVEC Logo</div>
                        )}
                      </div>
                      <div className="flex-1 w-full space-y-2 text-left">
                        <div className="flex flex-wrap gap-2">
                          <label className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-[11px] px-3 py-2 rounded-xl cursor-pointer transition-all shadow-xs flex items-center gap-1">
                            <Image className="w-3.5 h-3.5 text-indigo-500" />
                            <span>Upload New Custom Logo</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  if (file.size > 1.5 * 1024 * 1024) {
                                    alert("Logo file must be less than 1.5MB.");
                                    return;
                                  }
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setSettingsForm(prev => ({ ...prev, logoUrl: reader.result as string }));
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </label>
                          {settingsForm.logoUrl && (
                            <button
                              type="button"
                              onClick={() => setSettingsForm(prev => ({ ...prev, logoUrl: "" }))}
                              className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 font-bold text-[11px] px-3 py-2 rounded-xl cursor-pointer transition-all flex items-center gap-1"
                            >
                              Reset to Default SVEC SVG Logo
                            </button>
                          )}
                        </div>
                        <p className="text-[9px] text-slate-400 font-medium">
                          Supports PNG, JPG, WEBP, or SVG. Automatically optimized as a base64 asset on save.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                  {adminRole === "Student SPOC" ? (
                    <span className="text-amber-600 text-xs font-semibold bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-xl">
                      Read-Only: Student SPOC is not authorized to modify configuration.
                    </span>
                  ) : (
                    <span></span>
                  )}
                  <button
                    type="submit"
                    disabled={adminRole === "Student SPOC"}
                    className={`font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md cursor-pointer ${
                      adminRole === "Student SPOC"
                        ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                        : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-150 glow-btn"
                    }`}
                  >
                    Save Changes & Keys
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* STUDENT MANAGEMENT TAB */}
      {activeTab === "students" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-800 font-display flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-500" />
                  Manage Student Accounts
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  List registered students, reset passwords, or delete credentials to resolve login issues.
                </p>
              </div>
              <div className="relative max-w-xs w-full">
                <input
                  type="text"
                  placeholder="Search students by email..."
                  value={studentSearchTerm}
                  onChange={(e) => setStudentSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 outline-none focus:bg-white focus:border-indigo-500 pl-8 transition-all"
                  id="student-search-input"
                />
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              </div>
            </div>

            {studentsError && (
              <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 text-xs flex gap-2 font-medium mb-4">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{studentsError}</span>
              </div>
            )}

            {studentsSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-4 text-xs flex gap-2 font-medium mb-4">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{studentsSuccess}</span>
              </div>
            )}

            {studentsLoading ? (
              <div className="py-12 text-center">
                <span className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin inline-block"></span>
                <p className="text-xs text-slate-400 mt-2">Loading registered student logins...</p>
              </div>
            ) : (
              <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse" id="students-table">
                    <thead>
                      <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="px-6 py-4">Student Email</th>
                        <th className="px-6 py-4">Department</th>
                        <th className="px-6 py-4">Gender</th>
                        <th className="px-6 py-4">Mobile</th>
                        <th className="px-6 py-4">Created At</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {students.filter(s => s.email.toLowerCase().includes(studentSearchTerm.toLowerCase())).length > 0 ? (
                        students
                          .filter(s => s.email.toLowerCase().includes(studentSearchTerm.toLowerCase()))
                          .map((st) => (
                            <tr key={st.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-4 font-bold text-slate-800 font-mono">
                                {st.email}
                              </td>
                              <td className="px-6 py-4 text-slate-600">
                                {st.department}
                              </td>
                              <td className="px-6 py-4 text-slate-600">
                                {st.gender}
                              </td>
                              <td className="px-6 py-4 text-slate-600 font-mono">
                                {st.mobile}
                              </td>
                              <td className="px-6 py-4 text-slate-455">
                                {st.createdAt ? new Date(st.createdAt).toLocaleDateString() : "N/A"}
                              </td>
                              <td className="px-6 py-4 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-2">
                                  {selectedStudentForReset === st.id ? (
                                    <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
                                      <input
                                        type="text"
                                        placeholder="Min 6 chars"
                                        value={newStudentPassword}
                                        onChange={(e) => setNewStudentPassword(e.target.value)}
                                        className="px-2 py-1 text-xs border border-slate-200 bg-white rounded-md outline-none w-28 font-mono"
                                        id={`reset-pwd-input-${st.id}`}
                                      />
                                      <button
                                        onClick={() => handleResetPassword(st.id, st.email)}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] px-2 py-1 rounded-md cursor-pointer transition-colors"
                                        id={`reset-pwd-save-${st.id}`}
                                      >
                                        Save
                                      </button>
                                      <button
                                        onClick={() => {
                                          setSelectedStudentForReset(null);
                                          setNewStudentPassword("");
                                        }}
                                        className="text-slate-500 hover:text-slate-700 font-bold text-[10px] px-1.5 py-1 rounded-md cursor-pointer transition-colors"
                                        id={`reset-pwd-cancel-${st.id}`}
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        setSelectedStudentForReset(st.id);
                                        setNewStudentPassword("");
                                      }}
                                      className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50/50 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-indigo-100"
                                      id={`btn-reset-${st.id}`}
                                    >
                                      <Lock className="w-3.5 h-3.5" />
                                      Reset Password
                                    </button>
                                  )}

                                  <button
                                    onClick={() => handleDeleteStudent(st.id, st.email)}
                                    className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50/50 transition-colors cursor-pointer border border-transparent hover:border-red-100"
                                    title="Delete Student Account"
                                    id={`btn-delete-${st.id}`}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="text-center py-12 text-slate-400">
                            No student accounts found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ADMINS MANAGEMENT TAB */}
      {activeTab === "admins" && adminRole === "SPOC" && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-150 p-6 md:p-8 text-left shadow-sm">
            <h2 className="text-xl font-bold font-display text-slate-800">Manage Administrative Users</h2>
            <p className="text-slate-500 text-xs mt-1">
              As Super Admin (SPOC), you can provision new SPOC or Student SPOC logins and manage existing administrative privileges.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
              {/* Add New Admin Form */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 self-start space-y-4">
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-2">
                  <UserPlus className="w-4 h-4 text-indigo-600" />
                  Create Admin Account
                </h3>

                {adminAddError && (
                  <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-3 flex gap-2 text-xs">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>{adminAddError}</span>
                  </div>
                )}

                {adminAddSuccess && (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-3 flex gap-2 text-xs">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{adminAddSuccess}</span>
                  </div>
                )}

                <form onSubmit={handleCreateAdmin} className="space-y-4 text-left">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Username</label>
                    <input
                      type="text"
                      placeholder="e.g. janespoc"
                      value={newAdminUser}
                      onChange={(e) => setNewAdminUser(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl text-xs outline-none focus:border-indigo-500 font-mono"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Password</label>
                    <input
                      type="password"
                      placeholder="Min 6 characters"
                      value={newAdminPass}
                      onChange={(e) => setNewAdminPass(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl text-xs outline-none focus:border-indigo-500"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Select Privilege Role</label>
                    <select
                      value={newAdminRole}
                      onChange={(e) => setNewAdminRole(e.target.value as any)}
                      className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl text-xs outline-none focus:border-indigo-500 cursor-pointer"
                      required
                    >
                      <option value="Student SPOC">Student SPOC (Restricted / Read-only except Student Reset/Delete)</option>
                      <option value="SPOC">SPOC (Super Admin)</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer text-center"
                  >
                    Generate & Save Credentials
                  </button>
                </form>
              </div>

              {/* Admins list table */}
              <div className="lg:col-span-2 space-y-4">
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-indigo-600" />
                  Active Administrators List
                </h3>

                {adminsLoading ? (
                  <div className="py-12 text-center bg-slate-50 border border-slate-100 rounded-2xl">
                    <span className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin inline-block"></span>
                    <p className="text-xs text-slate-400 mt-2">Loading administrators...</p>
                  </div>
                ) : (
                  <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            <th className="px-6 py-4">Admin Username</th>
                            <th className="px-6 py-4">Privilege Role</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {adminsList.map((admin) => {
                            const isMe = admin.username.trim().toLowerCase() === (sessionStorage.getItem("svec_sih_admin_username") || "").trim().toLowerCase();
                            const isPrimary = admin.username.trim().toLowerCase() === "deepak0554";
                            return (
                              <tr key={admin.username} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4 font-bold text-slate-800 font-mono">
                                  {admin.username}
                                  {isMe && (
                                    <span className="ml-2 text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                                      You
                                    </span>
                                  )}
                                </td>
                                <td className="px-6 py-4">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                    admin.role === "SPOC"
                                      ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                      : "bg-amber-50 text-amber-700 border-amber-200"
                                  }`}>
                                    {admin.role}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                  {selectedAdminForReset === admin.username ? (
                                    <div className="flex items-center justify-end gap-1.5 animate-fade-in">
                                      <input
                                        type="password"
                                        placeholder="New password"
                                        value={newAdminPassword}
                                        onChange={(e) => setNewAdminPassword(e.target.value)}
                                        className="px-2 py-1 border border-slate-200 bg-white rounded-lg text-xs outline-hidden focus:border-indigo-500 font-sans w-28"
                                        id={`admin-reset-pwd-input-${admin.username}`}
                                      />
                                      <button
                                        onClick={async () => {
                                          if (!newAdminPassword || newAdminPassword.length < 6) {
                                            alert("Password must be at least 6 characters.");
                                            return;
                                          }
                                          try {
                                            const res = await fetch(`/api/admin/manage-admins/${admin.username}/reset-password`, {
                                              method: "POST",
                                              headers: {
                                                "Content-Type": "application/json",
                                                "X-Admin-Passcode": passcode
                                              },
                                              body: JSON.stringify({ newPassword: newAdminPassword })
                                            });
                                            const data = await res.json();
                                            if (res.ok) {
                                              alert(`Password for admin ${admin.username} has been reset successfully.`);
                                              setSelectedAdminForReset(null);
                                              setNewAdminPassword("");
                                            } else {
                                              alert(data.error || "Failed to reset admin password.");
                                            }
                                          } catch (err) {
                                            alert("Network error. Failed to reset password.");
                                          }
                                        }}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] px-2 py-1 rounded-md cursor-pointer transition-colors"
                                        id={`admin-reset-pwd-save-${admin.username}`}
                                      >
                                        Save
                                      </button>
                                      <button
                                        onClick={() => {
                                          setSelectedAdminForReset(null);
                                          setNewAdminPassword("");
                                        }}
                                        className="text-slate-500 hover:text-slate-700 font-bold text-[10px] px-1.5 py-1 rounded-md cursor-pointer transition-colors"
                                        id={`admin-reset-pwd-cancel-${admin.username}`}
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-end gap-2">
                                      <button
                                        onClick={() => {
                                          setSelectedAdminForReset(admin.username);
                                          setNewAdminPassword("");
                                        }}
                                        className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline px-2 py-1 rounded-md transition-colors cursor-pointer"
                                        id={`btn-admin-reset-${admin.username}`}
                                      >
                                        <Lock className="w-3 h-3" />
                                        Reset Password
                                      </button>

                                      {!isPrimary && !isMe && (
                                        <button
                                          onClick={() => handleDeleteAdmin(admin.username)}
                                          className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50/50 transition-colors cursor-pointer"
                                          title="Revoke admin permissions"
                                          id={`btn-admin-delete-${admin.username}`}
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CHANGE OWN PASSWORD TAB */}
      {activeTab === "security" && (
        <div className="max-w-xl mx-auto space-y-6 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 text-left shadow-sm">
            <h2 className="text-xl font-bold font-display text-slate-800 flex items-center gap-2">
              <Lock className="w-5 h-5 text-indigo-500" />
              Change Administrator Password
            </h2>
            <p className="text-slate-500 text-xs mt-1">
              For security, please enter your current administrator password, followed by your new password twice.
            </p>

            {adminPasswordSelfSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-3 flex gap-2 text-xs mt-4">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{adminPasswordSelfSuccess}</span>
              </div>
            )}

            {adminPasswordSelfError && (
              <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-3 flex gap-2 text-xs mt-4">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{adminPasswordSelfError}</span>
              </div>
            )}

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setAdminPasswordSelfError("");
                setAdminPasswordSelfSuccess("");

                if (newAdminPasswordSelf !== confirmAdminPasswordSelf) {
                  setAdminPasswordSelfError("New passwords do not match.");
                  return;
                }

                if (newAdminPasswordSelf.length < 6) {
                  setAdminPasswordSelfError("New password must be at least 6 characters long.");
                  return;
                }

                setAdminPasswordSelfLoading(true);
                try {
                  const res = await fetch("/api/admin/change-password", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "X-Admin-Passcode": passcode
                    },
                    body: JSON.stringify({
                      oldPassword: oldAdminPassword,
                      newPassword: newAdminPasswordSelf
                    })
                  });

                  const data = await res.json();
                  if (res.ok) {
                    setAdminPasswordSelfSuccess(data.message || "Password changed successfully.");
                    setOldAdminPassword("");
                    setNewAdminPasswordSelf("");
                    setConfirmAdminPasswordSelf("");
                  } else {
                    setAdminPasswordSelfError(data.error || "Failed to change password.");
                  }
                } catch (err) {
                  setAdminPasswordSelfError("Network error. Please try again.");
                } finally {
                  setAdminPasswordSelfLoading(false);
                }
              }}
              className="space-y-4 mt-6"
            >
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Current Password
                </label>
                <input
                  type="password"
                  placeholder="Enter current administrative password"
                  value={oldAdminPassword}
                  onChange={(e) => setOldAdminPassword(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 bg-white rounded-xl text-xs outline-none focus:border-indigo-500 transition-all"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  New Password
                </label>
                <input
                  type="password"
                  placeholder="At least 6 characters"
                  value={newAdminPasswordSelf}
                  onChange={(e) => setNewAdminPasswordSelf(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 bg-white rounded-xl text-xs outline-none focus:border-indigo-500 transition-all"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  placeholder="Repeat new password"
                  value={confirmAdminPasswordSelf}
                  onChange={(e) => setConfirmAdminPasswordSelf(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 bg-white rounded-xl text-xs outline-none focus:border-indigo-500 transition-all"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={adminPasswordSelfLoading}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer flex justify-center items-center gap-1"
              >
                {adminPasswordSelfLoading ? (
                  <span className="w-4 h-4 border-2 border-indigo-200 border-t-white rounded-full animate-spin inline-block"></span>
                ) : (
                  <span>Update Password</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* BROADCAST TAB */}
      {activeTab === "broadcast" && (
        <div className="max-w-5xl mx-auto space-y-6 animate-fade-in text-left">
          {/* Header Banner */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shrink-0">
                  <Send className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-black font-display text-slate-800">
                    Institution Broadcast Hub
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Send real-time alerts, confirmations, and reminders to students. Managed by SPOC administrators.
                  </p>
                </div>
              </div>

              {/* SPOC Management Authorization Badge */}
              <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-3 flex items-center gap-3">
                <Shield className="w-5 h-5 text-indigo-600 shrink-0" />
                <div>
                  <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wide block">
                    SPOC Authorized Channel
                  </span>
                  <span className="text-[10px] text-indigo-600 block leading-none">
                    Admin role: {adminRole}
                  </span>
                </div>
              </div>
            </div>

            {/* Inner Channel Selector Tabs */}
            <div className="flex border-b border-slate-100 mt-6 p-1 bg-slate-50/50 rounded-2xl gap-1">
              <button
                type="button"
                onClick={() => setBroadcastSubTab("email")}
                className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  broadcastSubTab === "email"
                    ? "bg-white text-indigo-600 shadow-sm border border-slate-100"
                    : "text-slate-500 hover:text-slate-800 hover:bg-white/50"
                }`}
              >
                <Mail className="w-4 h-4 text-indigo-500" />
                <span>Email Broadcast</span>
              </button>

              <button
                type="button"
                onClick={() => setBroadcastSubTab("sms")}
                className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  broadcastSubTab === "sms"
                    ? "bg-white text-amber-600 shadow-sm border border-slate-100"
                    : "text-slate-500 hover:text-slate-800 hover:bg-white/50"
                }`}
              >
                <Smartphone className="w-4 h-4 text-amber-500" />
                <span>SMS Broadcast</span>
              </button>

              <button
                type="button"
                onClick={() => setBroadcastSubTab("whatsapp")}
                className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  broadcastSubTab === "whatsapp"
                    ? "bg-white text-emerald-600 shadow-sm border border-slate-100"
                    : "text-slate-500 hover:text-slate-800 hover:bg-white/50"
                }`}
              >
                <MessageCircle className="w-4 h-4 text-emerald-500" />
                <span>WhatsApp Broadcast</span>
              </button>
            </div>
          </div>

          {/* Form & Live Handset Preview Workspace */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Left Column: Form Editors */}
            <div className="lg:col-span-3 bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6">
              {/* EMAIL CHANNEL FORM */}
              {broadcastSubTab === "email" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 font-display">Email Announcement Creator</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Dispatches responsive HTML emails via SMTP server</p>
                  </div>

                  {!settingsForm.emailEnabled ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-slate-700">
                      <div className="flex gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-xs font-bold text-amber-800">Email System is Offline</h4>
                          <p className="text-[11px] text-amber-700 mt-1 leading-relaxed">
                            The bulk email transmission system is currently disabled.
                          </p>
                          <p className="text-[11px] text-amber-600 mt-2 leading-relaxed font-semibold">
                            {adminRole === "SPOC" ? (
                              <span>Please go to the Settings tab to configure institutional SMTP credentials.</span>
                            ) : (
                              <span>Please request a Super Admin (SPOC) to configure SMTP credentials in Settings.</span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleSendBroadcast} className="space-y-5">
                      {broadcastError && (
                        <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 text-xs flex gap-2 font-medium animate-shake">
                          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                          <span>{broadcastError}</span>
                        </div>
                      )}

                      {broadcastSuccess && (
                        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-4 text-xs flex gap-2 font-medium">
                          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{broadcastSuccess}</span>
                        </div>
                      )}

                      {/* Recipient selection for Email */}
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Recipient Audience
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <label className={`border rounded-xl p-3 flex items-start gap-2.5 cursor-pointer transition-all ${broadcastRecipientGroup === "test_single" ? "border-indigo-500 bg-indigo-50/10" : "border-slate-200 hover:bg-slate-50"}`}>
                            <input
                              type="radio"
                              name="emailRecipient"
                              checked={broadcastRecipientGroup === "test_single"}
                              onChange={() => setBroadcastRecipientGroup("test_single")}
                              className="mt-0.5 accent-indigo-600"
                            />
                            <div>
                              <span className="text-xs font-bold text-slate-700 block">Single Test Email</span>
                              <span className="text-[9px] text-slate-400 block mt-0.5">Send formatted draft to a test inbox.</span>
                            </div>
                          </label>

                          <label className={`border rounded-xl p-3 flex items-start gap-2.5 cursor-pointer transition-all ${broadcastRecipientGroup === "all_logins" ? "border-indigo-500 bg-indigo-50/10" : "border-slate-200 hover:bg-slate-50"}`}>
                            <input
                              type="radio"
                              name="emailRecipient"
                              checked={broadcastRecipientGroup === "all_logins"}
                              onChange={() => setBroadcastRecipientGroup("all_logins")}
                              className="mt-0.5 accent-indigo-600"
                            />
                            <div>
                              <span className="text-xs font-bold text-slate-700 block">All Student Logins</span>
                              <span className="text-[9px] text-slate-400 block mt-0.5">All created logins in database.</span>
                            </div>
                          </label>

                          <label className={`border rounded-xl p-3 flex items-start gap-2.5 cursor-pointer transition-all ${broadcastRecipientGroup === "team_leads" ? "border-indigo-500 bg-indigo-50/10" : "border-slate-200 hover:bg-slate-50"}`}>
                            <input
                              type="radio"
                              name="emailRecipient"
                              checked={broadcastRecipientGroup === "team_leads"}
                              onChange={() => setBroadcastRecipientGroup("team_leads")}
                              className="mt-0.5 accent-indigo-600"
                            />
                            <div>
                              <span className="text-xs font-bold text-slate-700 block">Team Leaders Only</span>
                              <span className="text-[9px] text-slate-400 block mt-0.5">Dispatches to primary team leads.</span>
                            </div>
                          </label>

                          <label className={`border rounded-xl p-3 flex items-start gap-2.5 cursor-pointer transition-all ${broadcastRecipientGroup === "all_team_members" ? "border-indigo-500 bg-indigo-50/10" : "border-slate-200 hover:bg-slate-50"}`}>
                            <input
                              type="radio"
                              name="emailRecipient"
                              checked={broadcastRecipientGroup === "all_team_members"}
                              onChange={() => setBroadcastRecipientGroup("all_team_members")}
                              className="mt-0.5 accent-indigo-600"
                            />
                            <div>
                              <span className="text-xs font-bold text-slate-700 block">All Roster Members</span>
                              <span className="text-[9px] text-slate-400 block mt-0.5">To all team members' emails.</span>
                            </div>
                          </label>
                        </div>
                      </div>

                      {broadcastRecipientGroup === "test_single" && (
                        <div className="space-y-1.5">
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Test Email Address
                          </label>
                          <input
                            type="email"
                            value={broadcastTestEmail}
                            onChange={(e) => setBroadcastTestEmail(e.target.value)}
                            placeholder="e.g. admin@college.edu"
                            className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none text-xs focus:border-indigo-500 transition-all font-mono"
                            required={broadcastRecipientGroup === "test_single"}
                          />
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Subject Line
                        </label>
                        <input
                          type="text"
                          value={broadcastSubject}
                          onChange={(e) => setBroadcastSubject(e.target.value)}
                          placeholder="e.g. SVEC SIH 2026 - Abstract Presentation Schedule & Evaluation Matrix"
                          className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none text-xs focus:border-indigo-500 transition-all font-bold"
                          required
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Announcement Body (Rich Text Support)
                        </label>
                        <textarea
                          value={broadcastMessage}
                          onChange={(e) => setBroadcastMessage(e.target.value)}
                          placeholder="Type details, timings, guidelines or instructions..."
                          rows={6}
                          className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none text-xs focus:border-indigo-500 transition-all leading-relaxed"
                          required
                        />
                      </div>

                      <div className="pt-2 flex justify-end">
                        <button
                          type="submit"
                          disabled={broadcastLoading}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                        >
                          {broadcastLoading ? (
                            <>
                              <span className="w-3.5 h-3.5 border-2 border-indigo-200 border-t-white rounded-full animate-spin inline-block"></span>
                              <span>Sending...</span>
                            </>
                          ) : (
                            <>
                              <Send className="w-3.5 h-3.5" />
                              <span>Dispatch Email Broadcast</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* SMS CHANNEL FORM */}
              {broadcastSubTab === "sms" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 font-display">SMS Alert Creator</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Send high-priority SMS notifications straight to handsets</p>
                  </div>

                  <form onSubmit={handleSendSmsBroadcast} className="space-y-5">
                    {smsError && (
                      <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 text-xs flex gap-2 font-medium">
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                        <span>{smsError}</span>
                      </div>
                    )}

                    {smsSuccess && (
                      <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-4 text-xs flex gap-2 font-medium">
                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{smsSuccess}</span>
                      </div>
                    )}

                    {/* Recipient selection for SMS */}
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Recipient Target Group
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <label className={`border rounded-xl p-3 flex items-start gap-2.5 cursor-pointer transition-all ${smsRecipientGroup === "test_single" ? "border-amber-500 bg-amber-50/10" : "border-slate-200 hover:bg-slate-50"}`}>
                          <input
                            type="radio"
                            name="smsRecipient"
                            checked={smsRecipientGroup === "test_single"}
                            onChange={() => setSmsRecipientGroup("test_single")}
                            className="mt-0.5 accent-amber-600"
                          />
                          <div>
                            <span className="text-xs font-bold text-slate-700 block">Single Mobile Number</span>
                            <span className="text-[9px] text-slate-400 block mt-0.5">Send a test SMS to a custom handset.</span>
                          </div>
                        </label>

                        <label className={`border rounded-xl p-3 flex items-start gap-2.5 cursor-pointer transition-all ${smsRecipientGroup === "all_logins" ? "border-amber-500 bg-amber-50/10" : "border-slate-200 hover:bg-slate-50"}`}>
                          <input
                            type="radio"
                            name="smsRecipient"
                            checked={smsRecipientGroup === "all_logins"}
                            onChange={() => setSmsRecipientGroup("all_logins")}
                            className="mt-0.5 accent-amber-600"
                          />
                          <div>
                            <span className="text-xs font-bold text-slate-700 block">All Logined Students</span>
                            <span className="text-[9px] text-slate-400 block mt-0.5">Broadcast to student mobile numbers.</span>
                          </div>
                        </label>

                        <label className={`border rounded-xl p-3 flex items-start gap-2.5 cursor-pointer transition-all ${smsRecipientGroup === "team_leads" ? "border-amber-500 bg-amber-50/10" : "border-slate-200 hover:bg-slate-50"}`}>
                          <input
                            type="radio"
                            name="smsRecipient"
                            checked={smsRecipientGroup === "team_leads"}
                            onChange={() => setSmsRecipientGroup("team_leads")}
                            className="mt-0.5 accent-amber-600"
                          />
                          <div>
                            <span className="text-xs font-bold text-slate-700 block">Team Leaders Only</span>
                            <span className="text-[9px] text-slate-400 block mt-0.5">Target lead registration phones.</span>
                          </div>
                        </label>

                        <label className={`border rounded-xl p-3 flex items-start gap-2.5 cursor-pointer transition-all ${smsRecipientGroup === "all_team_members" ? "border-amber-500 bg-amber-50/10" : "border-slate-200 hover:bg-slate-50"}`}>
                          <input
                            type="radio"
                            name="smsRecipient"
                            checked={smsRecipientGroup === "all_team_members"}
                            onChange={() => setSmsRecipientGroup("all_team_members")}
                            className="mt-0.5 accent-amber-600"
                          />
                          <div>
                            <span className="text-xs font-bold text-slate-700 block">All Roster Members</span>
                            <span className="text-[9px] text-slate-400 block mt-0.5">Target entire rosters of all teams.</span>
                          </div>
                        </label>
                      </div>
                    </div>

                    {smsRecipientGroup === "test_single" && (
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Test Mobile Number
                        </label>
                        <input
                          type="tel"
                          value={smsTestMobile}
                          onChange={(e) => setSmsTestMobile(e.target.value)}
                          placeholder="e.g. 9876543210"
                          className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none text-xs focus:border-amber-500 transition-all font-mono"
                          required={smsRecipientGroup === "test_single"}
                        />
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                          SMS Text Message
                        </label>
                        <span className="text-[10px] font-mono text-slate-400 font-bold bg-slate-100 px-1.5 py-0.5 rounded">
                          {smsMessage.length} chars | {Math.ceil(smsMessage.length / 160) || 1} credit(s)
                        </span>
                      </div>
                      <textarea
                        value={smsMessage}
                        onChange={(e) => setSmsMessage(e.target.value)}
                        placeholder="Type short alert. SMS credit logic splits text per 160 characters. Standard DLT header applicable..."
                        rows={5}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none text-xs focus:border-amber-500 transition-all leading-relaxed"
                        required
                      />
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        type="submit"
                        disabled={smsLoading}
                        className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                      >
                        {smsLoading ? (
                          <>
                            <span className="w-3.5 h-3.5 border-2 border-amber-200 border-t-white rounded-full animate-spin inline-block"></span>
                            <span>Sending SMS...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span>Dispatch SMS Broadcast</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* WHATSAPP CHANNEL FORM */}
              {broadcastSubTab === "whatsapp" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 font-display">WhatsApp Template Broadcast</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Send Meta-approved interactive rich-template messages</p>
                  </div>

                  <form onSubmit={handleSendWhatsappBroadcast} className="space-y-5">
                    {whatsappError && (
                      <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 text-xs flex gap-2 font-medium">
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                        <span>{whatsappError}</span>
                      </div>
                    )}

                    {whatsappSuccess && (
                      <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-4 text-xs flex gap-2 font-medium">
                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{whatsappSuccess}</span>
                      </div>
                    )}

                    {/* Template selection */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Approved Template Name
                      </label>
                      <select
                        value={whatsappTemplate}
                        onChange={(e) => {
                          setWhatsappTemplate(e.target.value as any);
                          setWhatsappVar1("");
                          setWhatsappVar2("");
                          setWhatsappVar3("");
                        }}
                        className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none text-xs focus:border-emerald-500 transition-all font-bold text-slate-700 bg-white"
                      >
                        <option value="reg_confirmed">svec_sih_registration_confirmed</option>
                        <option value="deadline_reminder">svec_sih_deadline_reminder</option>
                        <option value="announcement">svec_sih_general_announcement</option>
                      </select>
                    </div>

                    {/* Recipient selection for WhatsApp */}
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Target Audience
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <label className={`border rounded-xl p-3 flex items-start gap-2.5 cursor-pointer transition-all ${whatsappRecipientGroup === "test_single" ? "border-emerald-500 bg-emerald-50/10" : "border-slate-200 hover:bg-slate-50"}`}>
                          <input
                            type="radio"
                            name="whatsappRecipient"
                            checked={whatsappRecipientGroup === "test_single"}
                            onChange={() => setWhatsappRecipientGroup("test_single")}
                            className="mt-0.5 accent-emerald-600"
                          />
                          <div>
                            <span className="text-xs font-bold text-slate-700 block">Single Handset (Test)</span>
                            <span className="text-[9px] text-slate-400 block mt-0.5">Send a test to verify variables.</span>
                          </div>
                        </label>

                        <label className={`border rounded-xl p-3 flex items-start gap-2.5 cursor-pointer transition-all ${whatsappRecipientGroup === "all_logins" ? "border-emerald-500 bg-emerald-50/10" : "border-slate-200 hover:bg-slate-50"}`}>
                          <input
                            type="radio"
                            name="whatsappRecipient"
                            checked={whatsappRecipientGroup === "all_logins"}
                            onChange={() => setWhatsappRecipientGroup("all_logins")}
                            className="mt-0.5 accent-emerald-600"
                          />
                          <div>
                            <span className="text-xs font-bold text-slate-700 block">All Logined Students</span>
                            <span className="text-[9px] text-slate-400 block mt-0.5">Broadcast template to students.</span>
                          </div>
                        </label>

                        <label className={`border rounded-xl p-3 flex items-start gap-2.5 cursor-pointer transition-all ${whatsappRecipientGroup === "team_leads" ? "border-emerald-500 bg-emerald-50/10" : "border-slate-200 hover:bg-slate-50"}`}>
                          <input
                            type="radio"
                            name="whatsappRecipient"
                            checked={whatsappRecipientGroup === "team_leads"}
                            onChange={() => setWhatsappRecipientGroup("team_leads")}
                            className="mt-0.5 accent-emerald-600"
                          />
                          <div>
                            <span className="text-xs font-bold text-slate-700 block">Team Leaders Only</span>
                            <span className="text-[9px] text-slate-400 block mt-0.5">Target lead registration phones.</span>
                          </div>
                        </label>

                        <label className={`border rounded-xl p-3 flex items-start gap-2.5 cursor-pointer transition-all ${whatsappRecipientGroup === "all_team_members" ? "border-emerald-500 bg-emerald-50/10" : "border-slate-200 hover:bg-slate-50"}`}>
                          <input
                            type="radio"
                            name="whatsappRecipient"
                            checked={whatsappRecipientGroup === "all_team_members"}
                            onChange={() => setWhatsappRecipientGroup("all_team_members")}
                            className="mt-0.5 accent-emerald-600"
                          />
                          <div>
                            <span className="text-xs font-bold text-slate-700 block">All Roster Members</span>
                            <span className="text-[9px] text-slate-400 block mt-0.5">Target every listed student phone.</span>
                          </div>
                        </label>
                      </div>
                    </div>

                    {whatsappRecipientGroup === "test_single" && (
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Test Mobile Number (WhatsApp)
                        </label>
                        <input
                          type="tel"
                          value={whatsappTestMobile}
                          onChange={(e) => setWhatsappTestMobile(e.target.value)}
                          placeholder="e.g. 9876543210"
                          className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none text-xs focus:border-emerald-500 transition-all font-mono"
                          required={whatsappRecipientGroup === "test_single"}
                        />
                      </div>
                    )}

                    {/* Dynamic Variables based on Template */}
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-4">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                        Template Parameters (Variables)
                      </span>

                      {whatsappTemplate === "reg_confirmed" && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500">{"{{1}}"} Student Name</label>
                            <input
                              type="text"
                              value={whatsappVar1}
                              onChange={(e) => setWhatsappVar1(e.target.value)}
                              placeholder="e.g. Rohan Sharma"
                              className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-lg outline-none text-xs focus:border-emerald-500"
                              required
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500">{"{{2}}"} Team Name</label>
                            <input
                              type="text"
                              value={whatsappVar2}
                              onChange={(e) => setWhatsappVar2(e.target.value)}
                              placeholder="e.g. CyberKnights"
                              className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-lg outline-none text-xs focus:border-emerald-500"
                              required
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500">{"{{3}}"} Reg Code</label>
                            <input
                              type="text"
                              value={whatsappVar3}
                              onChange={(e) => setWhatsappVar3(e.target.value)}
                              placeholder="e.g. SIH-REG-1025"
                              className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-lg outline-none text-xs focus:border-emerald-500"
                              required
                            />
                          </div>
                        </div>
                      )}

                      {whatsappTemplate === "deadline_reminder" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500">{"{{1}}"} Lead Name</label>
                            <input
                              type="text"
                              value={whatsappVar1}
                              onChange={(e) => setWhatsappVar1(e.target.value)}
                              placeholder="e.g. Divya Teja"
                              className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-lg outline-none text-xs focus:border-emerald-500"
                              required
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500">{"{{2}}"} Deadline Date</label>
                            <input
                              type="text"
                              value={whatsappVar2}
                              onChange={(e) => setWhatsappVar2(e.target.value)}
                              placeholder="e.g. Oct 25th, 11:59 PM"
                              className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-lg outline-none text-xs focus:border-emerald-500"
                              required
                            />
                          </div>
                        </div>
                      )}

                      {whatsappTemplate === "announcement" && (
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500">{"{{1}}"} Announcement Content</label>
                          <textarea
                            value={whatsappVar1}
                            onChange={(e) => setWhatsappVar1(e.target.value)}
                            placeholder="e.g. PPT presentation begins tomorrow 9:00 AM in Room 402."
                            rows={3}
                            className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-lg outline-none text-xs focus:border-emerald-500"
                            required
                          />
                        </div>
                      )}
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        type="submit"
                        disabled={whatsappLoading}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                      >
                        {whatsappLoading ? (
                          <>
                            <span className="w-3.5 h-3.5 border-2 border-emerald-200 border-t-white rounded-full animate-spin inline-block"></span>
                            <span>Sending WhatsApp...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span>Dispatch WhatsApp Broadcast</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>

            {/* Right Column: Handset / Device Live Preview */}
            <div className="lg:col-span-2 space-y-6">
              {/* WHATSAPP DEVICE PREVIEW */}
              {broadcastSubTab === "whatsapp" && (
                <div className="bg-slate-950 rounded-[40px] border-[10px] border-slate-800 shadow-2xl p-4 w-full relative overflow-hidden aspect-[9/18] text-left flex flex-col justify-between">
                  {/* Speaker & Camera Notch */}
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-2xl z-20 flex items-center justify-center">
                    <div className="w-12 h-1 bg-slate-900 rounded-full"></div>
                  </div>

                  {/* WhatsApp Chat Interface */}
                  <div className="flex-1 flex flex-col justify-between pt-6">
                    {/* Header bar */}
                    <div className="bg-[#075e54] text-white py-2.5 px-3 flex items-center gap-2 -mx-4 -mt-2.5">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-[#075e54] font-bold text-xs">
                        SV
                      </div>
                      <div className="flex-1">
                        <span className="text-[11px] font-bold flex items-center gap-1">
                          SVEC SIH Office
                          <span className="w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center text-[7px] text-white font-bold">✓</span>
                        </span>
                        <span className="text-[8px] text-emerald-100/80 block">Official Business Account</span>
                      </div>
                    </div>

                    {/* Chat Area */}
                    <div className="flex-1 bg-[#efeae2] -mx-4 p-3 overflow-y-auto flex flex-col justify-end gap-2 text-slate-800">
                      {/* Interactive Verified Notification */}
                      <div className="bg-amber-100/80 text-amber-900 border border-amber-200/50 text-[8px] py-1.5 px-2.5 rounded-lg text-center leading-normal max-w-[85%] mx-auto">
                        🔒 Messages are end-to-end encrypted. No one outside this chat can read them.
                      </div>

                      {/* Live WhatsApp Bubble */}
                      <div className="bg-white rounded-xl rounded-tr-none p-2.5 shadow-sm max-w-[85%] self-end relative border-l-4 border-emerald-500">
                        {/* Meta Approved Template Header banner */}
                        <div className="bg-emerald-50 text-[#128c7e] text-[8px] font-bold px-1.5 py-0.5 rounded mb-1.5 inline-block uppercase tracking-wider">
                          Official Template Alert
                        </div>

                        {/* Substitution text */}
                        <p className="text-[10px] leading-relaxed text-slate-700 font-sans whitespace-pre-wrap">
                          {getWhatsAppPreviewText()}
                        </p>

                        <div className="text-right text-[7px] text-slate-400 mt-1 block">
                          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>

                    {/* Input Area */}
                    <div className="bg-[#f0f0f0] p-2 -mx-4 -mb-4 flex items-center gap-1.5">
                      <div className="flex-1 bg-white rounded-full px-3 py-1 text-[9px] text-slate-400">
                        Type a reply...
                      </div>
                      <div className="w-6 h-6 rounded-full bg-[#128c7e] flex items-center justify-center text-white">
                        <Send className="w-3 h-3" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SMS DEVICE PREVIEW */}
              {broadcastSubTab === "sms" && (
                <div className="bg-slate-950 rounded-[40px] border-[10px] border-slate-800 shadow-2xl p-4 w-full relative overflow-hidden aspect-[9/18] text-left flex flex-col justify-between">
                  {/* Speaker & Camera Notch */}
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-2xl z-20"></div>

                  <div className="flex-1 flex flex-col justify-between pt-6">
                    {/* Header bar */}
                    <div className="bg-slate-900 text-slate-200 py-3 px-3 border-b border-slate-800 flex items-center justify-between -mx-4 -mt-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-800 text-slate-300 font-bold text-[10px] flex items-center justify-center">
                          SV
                        </div>
                        <div>
                          <span className="text-[11px] font-bold block">SV-SIHACK</span>
                          <span className="text-[7px] text-slate-500 block">Institutional SMS Header</span>
                        </div>
                      </div>
                    </div>

                    {/* SMS Bubble display */}
                    <div className="flex-1 bg-slate-950 -mx-4 p-3 flex flex-col justify-end gap-2">
                      <div className="bg-slate-900 rounded-2xl rounded-tr-none p-3 shadow-md max-w-[85%] self-end">
                        <p className="text-[10px] leading-relaxed text-slate-300 font-mono">
                          {smsMessage || "Type your short alert text in the editor to preview your live SMS transmission layout here..."}
                        </p>
                        <div className="text-right text-[7px] text-slate-500 mt-1 block">
                          SMS Channel • {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>

                    {/* SMS Footer */}
                    <div className="bg-slate-900 border-t border-slate-800 p-2.5 -mx-4 -mb-4 flex items-center gap-2">
                      <div className="flex-1 bg-slate-950 border border-slate-800 rounded-full px-3 py-1.5 text-[8px] text-slate-500 font-mono">
                        Text Message
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* EMAIL DEVICE PREVIEW */}
              {broadcastSubTab === "email" && (
                <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm text-left space-y-4">
                  <div className="border-b border-slate-100 pb-3">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                      Live HTML Email Layout Preview
                    </span>
                    <div className="bg-slate-50 rounded-xl p-3 text-xs space-y-1 font-sans">
                      <p><strong className="text-slate-500">From:</strong> {settingsForm.smtpFrom || "sih-support@college.edu"}</p>
                      <p><strong className="text-slate-500">To:</strong> {broadcastRecipientGroup === "test_single" ? (broadcastTestEmail || "[Test Email]") : `[${broadcastRecipientGroup.replace('_', ' ')}]`}</p>
                      <p><strong className="text-slate-500">Subject:</strong> {broadcastSubject || "[Announcement Subject Line]"}</p>
                    </div>
                  </div>

                  {/* Simulated Mail Body */}
                  <div className="border border-slate-200 rounded-2xl p-4 bg-white shadow-sm font-sans max-h-96 overflow-y-auto">
                    <div className="border-b-2 border-indigo-600 pb-2 mb-4">
                      <h2 className="text-sm font-black text-indigo-600 tracking-tight">SVEC SIH Hackathon Updates</h2>
                      <span className="text-[8px] text-slate-400 uppercase tracking-wider font-bold">Official Announcement</span>
                    </div>

                    <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {broadcastMessage || "Provide announcement text inside the editor on the left to review the responsive email layout..."}
                    </div>

                    <hr className="border-slate-100 my-4" />
                    <p className="text-[9px] text-slate-400 text-center">
                      This is an official announcement from SVEC Smart India Hackathon Administration.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* BROADCAST TRANSMISSION HISTORY LOGS */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm">
            <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <History className="w-5 h-5 text-indigo-500" />
                <h3 className="text-base font-extrabold font-display text-slate-800">
                  Recent Broadcast Transmission Logs
                </h3>
              </div>
              <button
                type="button"
                onClick={fetchBroadcastLogs}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
              >
                Refresh Log
              </button>
            </div>

            {logsLoading ? (
              <div className="py-8 text-center space-y-2">
                <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
                <p className="text-xs text-slate-400">Loading audit log stream...</p>
              </div>
            ) : broadcastLogs.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <div className="w-10 h-10 bg-slate-50 text-slate-300 rounded-2xl flex items-center justify-center mx-auto">
                  <Clock className="w-5 h-5" />
                </div>
                <h4 className="text-xs font-bold text-slate-600">No transmissions logged yet</h4>
                <p className="text-[10px] text-slate-400 max-w-xs mx-auto">
                  Broadcasts dispatched across Email, SMS, or WhatsApp will be fully logged and audited here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600 border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                      <th className="pb-3 pr-4 font-bold">Channel</th>
                      <th className="pb-3 pr-4 font-bold">Target Group</th>
                      <th className="pb-3 pr-4 font-bold">Recipients</th>
                      <th className="pb-3 pr-4 font-bold">Content Snippet</th>
                      <th className="pb-3 pr-4 font-bold">Dispatched By</th>
                      <th className="pb-3 pr-4 font-bold">Date & Time</th>
                      <th className="pb-3 font-bold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {broadcastLogs.map((log) => (
                      <tr key={log.id} className="border-b border-slate-50 last:border-none hover:bg-slate-50/50 transition-all">
                        <td className="py-3.5 pr-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            log.channel === "Email"
                              ? "bg-indigo-50 text-indigo-700 border border-indigo-100"
                              : log.channel === "SMS"
                              ? "bg-amber-50 text-amber-700 border border-amber-100"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                          }`}>
                            {log.channel === "Email" && <Mail className="w-3 h-3" />}
                            {log.channel === "SMS" && <Smartphone className="w-3 h-3" />}
                            {log.channel === "WhatsApp" && <MessageCircle className="w-3 h-3" />}
                            {log.channel}
                          </span>
                        </td>
                        <td className="py-3.5 pr-4 font-semibold text-slate-700">
                          {log.recipientGroup.replace("_", " ")}
                        </td>
                        <td className="py-3.5 pr-4 font-mono font-bold text-slate-500">
                          {log.recipientCount} target(s)
                        </td>
                        <td className="py-3.5 pr-4 text-[11px] max-w-xs truncate text-slate-500" title={log.message}>
                          {log.subject ? `[${log.subject}] ` : ""}{log.message}
                        </td>
                        <td className="py-3.5 pr-4 text-slate-500 font-semibold">
                          {log.sender}
                        </td>
                        <td className="py-3.5 pr-4 text-slate-400 font-medium">
                          {new Date(log.timestamp).toLocaleString([], {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </td>
                        <td className="py-3.5">
                          <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-[10px] bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                            <Check className="w-3 h-3" />
                            Success
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* LANDING PAGE CUSTOMIZER TAB */}
      {activeTab === "customizer" && adminRole === "SPOC" && (
        <div className="animate-fade-in space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 text-left shadow-sm">
            <div className="flex items-center gap-3 mb-2 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold font-display text-slate-800">
                  Landing Page & Navigation Link Customizer
                </h2>
                <p className="text-xs text-slate-400">
                  Add custom pages, modify the home hero description, structure your navbar, and populate sponsor/gallery logs dynamically.
                </p>
              </div>
            </div>
            <PageMenuCustomizer passcode={passcode} />
          </div>
        </div>
      )}

      {/* CREATE/EDIT PROBLEM STATEMENT MODAL */}
      <AnimatePresence>
        {showPsFormModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPsFormModal(false)}
              className="absolute inset-0 bg-slate-900 opacity-50"
            ></motion.div>

            {/* Form modal container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden relative z-10"
            >
              <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
                <h3 className="font-bold font-display text-base">
                  {editingPsId ? "Edit Problem Statement" : "Add New Problem Statement"}
                </h3>
                <button
                  onClick={() => setShowPsFormModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateOrUpdatePS} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* PS Code */}
                  <div className="space-y-1.5">
                    <label htmlFor="code" className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Problem Statement Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="code"
                      value={psForm.code}
                      onChange={(e) => setPsForm(prev => ({ ...prev, code: e.target.value }))}
                      placeholder="e.g. SIH1627"
                      className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-xl outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all font-mono"
                      required
                    />
                  </div>

                  {/* PS Category */}
                  <div className="space-y-1.5">
                    <label htmlFor="category" className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Category Track <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="category"
                      value={psForm.category}
                      onChange={(e) => setPsForm(prev => ({ ...prev, category: e.target.value as "Software" | "Hardware" }))}
                      className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-xl outline-none focus:bg-white focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="Software">Software Track</option>
                      <option value="Hardware">Hardware Track</option>
                    </select>
                  </div>
                </div>

                {/* PS Title */}
                <div className="space-y-1.5">
                  <label htmlFor="title" className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Title / Challenge Statement <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="title"
                    value={psForm.title}
                    onChange={(e) => setPsForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter the challenge details..."
                    className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-xl outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all"
                    required
                  />
                </div>

                {/* Nodal Agency */}
                <div className="space-y-1.5">
                  <label htmlFor="organization" className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Nodal Agency / Ministry <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="organization"
                    value={psForm.organization}
                    onChange={(e) => setPsForm(prev => ({ ...prev, organization: e.target.value }))}
                    placeholder="e.g. Ministry of Power, State Government of Delhi"
                    className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-xl outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all"
                    required
                  />
                </div>

                {psError && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {psError}
                  </p>
                )}

                <div className="flex gap-2 pt-2 border-t border-slate-100 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowPsFormModal(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-xl border border-slate-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md cursor-pointer"
                  >
                    {editingPsId ? "Save Changes" : "Create Statement"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE CONFIRMATION POPUP */}
      <AnimatePresence>
        {deleteConfirm && deleteConfirm.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirm(null)}
              className="absolute inset-0 bg-slate-900 opacity-50"
            ></motion.div>

            {/* Modal container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden relative z-10 p-6 text-slate-800"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-red-50 text-red-600 rounded-2xl shrink-0">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div className="space-y-1.5 flex-1">
                  <h3 className="font-bold font-display text-lg text-slate-900">
                    {deleteConfirm.title}
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {deleteConfirm.message}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-6 justify-end">
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-xl border border-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    deleteConfirm.onConfirm();
                  }}
                  className="px-5 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Confirm Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PAYMENT DETAILS POPUP */}
      <AnimatePresence>
        {selectedRegPayment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 text-slate-800">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedRegPayment(null)}
              className="absolute inset-0 bg-slate-900 opacity-50"
            ></motion.div>

            {/* Modal container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden relative z-10"
            >
              <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-indigo-400" />
                  <h3 className="font-bold font-display text-base">Payment Verification Record</h3>
                </div>
                <button
                  onClick={() => setSelectedRegPayment(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3 text-left">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 uppercase font-bold tracking-wider text-[10px]">Registration ID</span>
                    <span className="font-mono font-bold text-slate-800 bg-slate-200 px-2 py-0.5 rounded text-[11px]">{selectedRegPayment.registrationId}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs border-t border-slate-200/50 pt-2">
                    <span className="text-slate-400 uppercase font-bold tracking-wider text-[10px]">Team Name</span>
                    <span className="font-bold text-slate-800">{selectedRegPayment.teamName}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs border-t border-slate-200/50 pt-2">
                    <span className="text-slate-400 uppercase font-bold tracking-wider text-[10px]">Team Leader</span>
                    <span className="font-medium text-slate-700">{selectedRegPayment.leadName}</span>
                  </div>
                </div>

                <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 space-y-3 text-xs text-left">
                  <div className="flex justify-between items-center">
                    <span className="text-indigo-600 font-bold uppercase tracking-wider text-[10px]">Payment Status</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      selectedRegPayment.paymentStatus === "paid"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : selectedRegPayment.paymentStatus === "free"
                        ? "bg-slate-100 text-slate-600 border-slate-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}>
                      {selectedRegPayment.paymentStatus || "Free / Exempted"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center border-t border-indigo-100/50 pt-2">
                    <span className="text-indigo-600 font-bold uppercase tracking-wider text-[10px]">Amount Charged</span>
                    <span className="font-mono font-bold text-slate-800 text-sm">
                      {selectedRegPayment.amountPaid ? `₹${selectedRegPayment.amountPaid}` : "₹0 (Exempted)"}
                    </span>
                  </div>

                  {selectedRegPayment.paymentStatus === "paid" && (
                    <>
                      <div className="flex justify-between items-center border-t border-indigo-100/50 pt-2">
                        <span className="text-indigo-600 font-bold uppercase tracking-wider text-[10px]">Transaction ID</span>
                        <span className="font-mono font-bold text-indigo-700 bg-white border border-indigo-150 px-2 py-0.5 rounded">{selectedRegPayment.paymentId}</span>
                      </div>
                      <div className="flex justify-between items-center border-t border-indigo-100/50 pt-2">
                        <span className="text-indigo-600 font-bold uppercase tracking-wider text-[10px]">Razorpay Order ID</span>
                        <span className="font-mono font-bold text-slate-600 select-all text-[10px]">{selectedRegPayment.orderId}</span>
                      </div>
                      <div className="flex justify-between items-center border-t border-indigo-100/50 pt-2">
                        <span className="text-indigo-600 font-bold uppercase tracking-wider text-[10px]">Payment Gateway</span>
                        <span className="font-medium text-slate-700">Razorpay Smart Gateway</span>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex justify-end pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setSelectedRegPayment(null)}
                    className="px-5 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-colors cursor-pointer"
                  >
                    Close Record
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT REGISTRATION FIELDS MODAL */}
      <AnimatePresence>
        {editingReg && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 text-slate-800">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingReg(null)}
              className="absolute inset-0 bg-slate-900 opacity-50"
            ></motion.div>

            {/* Modal container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden relative z-10 max-h-[90vh] flex flex-col"
            >
              <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2 text-left">
                  <Edit2 className="w-5 h-5 text-indigo-400" />
                  <div>
                    <h3 className="font-bold font-display text-base">Modify Team Registration</h3>
                    <p className="text-[10px] text-slate-400 font-mono">{editingReg.registrationId} • {editingReg.teamName}</p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingReg(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateRegistration} className="p-6 overflow-y-auto space-y-6 flex-1 text-left">
                {editSuccess && (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-3 flex gap-2 text-xs">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{editSuccess}</span>
                  </div>
                )}
                {editError && (
                  <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-3 flex gap-2 text-xs">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>{editError}</span>
                  </div>
                )}

                {/* Section 1: Core details */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider border-b border-slate-100 pb-1 text-left">Core Parameters</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Team Name</label>
                      <input
                        type="text"
                        value={editForm.teamName || ""}
                        onChange={(e) => setEditForm(prev => ({ ...prev, teamName: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 bg-slate-50/50"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Faculty Mentor</label>
                      <input
                        type="text"
                        value={editForm.mentorName || ""}
                        onChange={(e) => setEditForm(prev => ({ ...prev, mentorName: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 bg-slate-50/50"
                        required
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Problem Statement Assignment</label>
                      <select
                        value={editForm.problemStatementId || ""}
                        onChange={(e) => setEditForm(prev => ({ ...prev, problemStatementId: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white outline-none focus:border-indigo-500 cursor-pointer"
                        required
                      >
                        <option value="">Select Statement</option>
                        {problemStatements.map(ps => (
                          <option key={ps.id} value={ps.id}>[{ps.code}] {ps.title}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section 2: Team Lead */}
                <div className="space-y-4 pt-2">
                  <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider border-b border-slate-100 pb-1 text-left">Team Leader Profile</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Leader Name</label>
                      <input
                        type="text"
                        value={editForm.leadName || ""}
                        onChange={(e) => setEditForm(prev => ({ ...prev, leadName: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 bg-slate-50/50"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Leader Mobile</label>
                      <input
                        type="tel"
                        maxLength={10}
                        value={editForm.leadMobile || ""}
                        onChange={(e) => setEditForm(prev => ({ ...prev, leadMobile: e.target.value.replace(/\D/g, "") }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 bg-slate-50/50"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Leader Department</label>
                      <input
                        type="text"
                        value={editForm.leadDepartment || ""}
                        onChange={(e) => setEditForm(prev => ({ ...prev, leadDepartment: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 bg-slate-50/50"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Leader Gender</label>
                      <select
                        value={editForm.leadGender || ""}
                        onChange={(e) => setEditForm(prev => ({ ...prev, leadGender: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white outline-none focus:border-indigo-500 cursor-pointer"
                        required
                      >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section 3: Roster Members */}
                <div className="space-y-4 pt-2">
                  <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider border-b border-slate-100 pb-1 text-left">Team Member Roster</h4>
                  <div className="space-y-4 text-left">
                    {[1, 2, 3, 4, 5].map((num) => (
                      <div key={num} className="bg-slate-50 border border-slate-150 rounded-2xl p-4 space-y-3 text-left">
                        <span className="text-[10px] font-extrabold text-indigo-600 block">Member {num} details</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase">Full Name</label>
                            <input
                              type="text"
                              value={(editForm as any)[`member${num}`] || ""}
                              onChange={(e) => setEditForm(prev => ({ ...prev, [`member${num}`]: e.target.value }))}
                              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs outline-none bg-white"
                              required
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase">Gender</label>
                            <select
                              value={(editForm as any)[`member${num}Gender`] || ""}
                              onChange={(e) => setEditForm(prev => ({ ...prev, [`member${num}Gender`]: e.target.value }))}
                              className="w-full px-2.5 py-1.5 border border-slate-200 bg-white rounded-lg text-xs outline-none cursor-pointer"
                              required
                            >
                              <option value="">Select Gender</option>
                              <option value="Male">Male</option>
                              <option value="Female">Female</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase">Email Address</label>
                            <input
                              type="email"
                              value={(editForm as any)[`member${num}Email`] || ""}
                              onChange={(e) => setEditForm(prev => ({ ...prev, [`member${num}Email`]: e.target.value }))}
                              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs outline-none bg-white"
                              required
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase">Phone Number</label>
                            <input
                              type="tel"
                              maxLength={10}
                              value={(editForm as any)[`member${num}Phone`] || ""}
                              onChange={(e) => setEditForm(prev => ({ ...prev, [`member${num}Phone`]: e.target.value.replace(/\D/g, "") }))}
                              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs outline-none bg-white"
                              required
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t border-slate-100 justify-end shrink-0">
                  <button
                    type="button"
                    onClick={() => setEditingReg(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-xl border border-slate-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* VIEW PROJECT PROPOSAL MODAL */}
      <AnimatePresence>
        {selectedRegProposal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl border border-slate-150 shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh] overflow-hidden"
            >
              {/* Modal Header */}
              <div className="bg-slate-950 text-white p-6 shrink-0 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block">
                    Student Work Submission
                  </span>
                  <h3 className="text-lg font-bold font-display mt-0.5">
                    {selectedRegProposal.teamName} Proposal Details
                  </h3>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs bg-white/10 text-white border border-white/10 px-2.5 py-1 rounded-lg font-bold">
                    {selectedRegProposal.registrationId}
                  </span>
                  <button
                    onClick={() => setSelectedRegProposal(null)}
                    className="text-white/70 hover:text-white hover:bg-white/15 p-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 md:p-8 overflow-y-auto space-y-6 text-left">
                {/* Proposal Status Tag */}
                <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-150 rounded-2xl text-xs">
                  <div>
                    <span className="font-semibold text-slate-500">Submission Phase Status:</span>
                  </div>
                  <div>
                    {selectedRegProposal.proposalStatus === "submitted" ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                        Final Submitted & Locked
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                        Draft Saved (In Progress)
                      </span>
                    )}
                  </div>
                </div>

                {/* Mapped Problem Statement Summary */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Assigned Problem Statement
                  </span>
                  {(() => {
                    const ps = problemStatements.find(p => p.id === selectedRegProposal.problemStatementId);
                    return ps ? (
                      <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl">
                        <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-md border border-indigo-200 inline-block mb-1.5">
                          {ps.code} • {ps.category}
                        </span>
                        <h4 className="text-xs font-bold text-slate-800">{ps.title}</h4>
                        <p className="text-[10px] text-slate-500 mt-1">Ministry/Nodal Agency: {ps.organization}</p>
                      </div>
                    ) : (
                      <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-700 text-xs font-medium">
                        Mapped problem statement not found or deleted.
                      </div>
                    );
                  })()}
                </div>

                {/* Abstract Section */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    1. Solution Abstract / Idea Summary
                  </span>
                  <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 max-h-[180px] overflow-y-auto">
                    {selectedRegProposal.abstract ? (
                      <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                        {selectedRegProposal.abstract}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400 italic">
                        No abstract solutions uploaded yet.
                      </p>
                    )}
                  </div>
                </div>

                {/* Implementation Steps Section */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    2. Implementation Steps / Methodology
                  </span>
                  <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 max-h-[180px] overflow-y-auto">
                    {selectedRegProposal.implementationSteps ? (
                      <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                        {selectedRegProposal.implementationSteps}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400 italic">
                        No implementation milestones uploaded yet.
                      </p>
                    )}
                  </div>
                </div>

                {/* Pitch Presentation PPT Section */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    3. Pitch Presentation (PPT / PDF)
                  </span>
                  {selectedRegProposal.pptFileName ? (
                    <div className="border border-slate-150 rounded-2xl p-4 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                          <FileText className="w-5 h-5 font-bold" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 break-all truncate max-w-[280px]" title={selectedRegProposal.pptFileName}>
                            {selectedRegProposal.pptFileName}
                          </p>
                          <span className="text-[10px] text-slate-400">Presentation attachment</span>
                        </div>
                      </div>
                      {selectedRegProposal.pptBase64 && (
                        <button
                          onClick={() => {
                            const link = document.createElement("a");
                            link.href = selectedRegProposal.pptBase64!;
                            link.download = selectedRegProposal.pptFileName || "presentation.pptx";
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }}
                          className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                        >
                          <Download className="w-4 h-4" />
                          Download PPT File
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="border border-dashed border-slate-200 rounded-2xl p-6 text-center text-slate-400 text-xs italic">
                      No presentation file uploaded yet.
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedRegProposal(null)}
                  className="px-5 py-2.5 text-xs font-bold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl shadow-xs cursor-pointer transition-colors"
                >
                  Close Document View
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

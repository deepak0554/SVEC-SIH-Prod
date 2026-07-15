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
  ShieldAlert
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
  const [activeTab, setActiveTab] = useState<"registrations" | "statements" | "stats" | "settings" | "students" | "admins" | "security">("registrations");

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

  const handleDeleteAdmin = async (userToDelete: string) => {
    if (!window.confirm(`Are you sure you want to delete admin account "${userToDelete}"?`)) {
      return;
    }

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
    }
  };

  // State for Settings & Fees
  const [settingsForm, setSettingsForm] = useState({
    feeEnabled: false,
    feeAmount: 0,
    razorpayKeyId: "",
    razorpayKeySecret: ""
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
          razorpayKeySecret: data.razorpayKeySecret || ""
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

  const handleDeleteStudent = async (studentId: string, email: string) => {
    if (!window.confirm(`Are you sure you want to delete the student account for ${email}? This will delete their student login credentials.`)) {
      return;
    }

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
    }
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

  const handleDeletePS = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this Problem Statement? It may affect existing registrations mapped to it.")) {
      return;
    }

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
    }
  };

  const handleDeleteRegistration = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this student team registration? This action is irreversible.")) {
      return;
    }

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
    }
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

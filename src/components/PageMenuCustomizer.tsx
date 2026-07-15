import React, { useState, useEffect } from "react";
import { HomepageContent, CustomPage, MenuItem, Sponsor, Patron, TeamSpoc, PreviousPhoto } from "../types";
import { 
  Plus, Trash2, Edit2, CheckCircle, AlertCircle, Save, Layers, List, Link as LinkIcon, 
  UserPlus, Image as ImageIcon, Sparkles, FileText, LayoutGrid, Eye, ArrowUp, ArrowDown 
} from "lucide-react";

interface PageMenuCustomizerProps {
  passcode: string;
}

export default function PageMenuCustomizer({ passcode }: PageMenuCustomizerProps) {
  // Global tab within customizer
  const [activeSubTab, setActiveSubTab] = useState<"details" | "sponsors" | "spocs" | "photos" | "pages" | "menu">("details");

  // State variables
  const [homepage, setHomepage] = useState<HomepageContent | null>(null);
  const [pagesList, setPagesList] = useState<CustomPage[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Details form state
  const [detailsForm, setDetailsForm] = useState({
    title: "",
    description: "",
    slogan: "",
    dates: "",
    bannerUrl: ""
  });

  // Patrons form state
  const [patronName, setPatronName] = useState("");
  const [patronPosition, setPatronPosition] = useState("");
  const [patronImageBase64, setPatronImageBase64] = useState("");
  const [editingPatronId, setEditingPatronId] = useState<string | null>(null);

  // SPOC form state
  const [spocType, setSpocType] = useState<"student" | "college">("student");
  const [spocName, setSpocName] = useState("");
  const [spocRole, setSpocRole] = useState("");
  const [spocDept, setSpocDept] = useState("");
  const [spocEmail, setSpocEmail] = useState("");
  const [spocPhone, setSpocPhone] = useState("");
  const [spocImageBase64, setSpocImageBase64] = useState("");

  // Gallery photo form state
  const [photoTitle, setPhotoTitle] = useState("");
  const [photoDesc, setPhotoDesc] = useState("");
  const [photoBase64, setPhotoBase64] = useState("");

  // Dynamic pages form state
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [pageTitle, setPageTitle] = useState("");
  const [pageSlug, setPageSlug] = useState("");
  const [pageContent, setPageContent] = useState("");
  const [pagePublished, setPagePublished] = useState(true);

  // Menu items list for live editing
  const [editingMenu, setEditingMenu] = useState<MenuItem[]>([]);

  // Fetch all customizable parameters
  const fetchAllData = async () => {
    setLoading(true);
    setError("");
    try {
      const [homeRes, pagesRes, menuRes] = await Promise.all([
        fetch("/api/homepage"),
        fetch("/api/custom-pages"),
        fetch("/api/menu")
      ]);

      if (homeRes.ok) {
        const homeData: HomepageContent = await homeRes.json();
        setHomepage(homeData);
        setDetailsForm({
          title: homeData.sihDetails.title || "",
          description: homeData.sihDetails.description || "",
          slogan: homeData.sihDetails.slogan || "",
          dates: homeData.sihDetails.dates || "",
          bannerUrl: homeData.sihDetails.bannerUrl || ""
        });
      }

      if (pagesRes.ok) {
        const pagesData: CustomPage[] = await pagesRes.json();
        setPagesList(pagesData);
      }

      if (menuRes.ok) {
        const menuData: MenuItem[] = await menuRes.json();
        setMenuItems(menuData);
        setEditingMenu(menuData.sort((a, b) => a.order - b.order));
      }
    } catch (err) {
      setError("Failed to load layout or configuration data from server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Helper for converting images to Base64
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, callback: (base64: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("Image size should be less than 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      callback(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // 1. Save Details
  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!homepage) return;

    setError("");
    setSuccess("");

    const updatedHomepage: HomepageContent = {
      ...homepage,
      sihDetails: {
        ...homepage.sihDetails,
        title: detailsForm.title.trim(),
        description: detailsForm.description.trim(),
        slogan: detailsForm.slogan.trim(),
        dates: detailsForm.dates.trim(),
        bannerUrl: detailsForm.bannerUrl
      }
    };

    try {
      const res = await fetch("/api/homepage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Passcode": passcode
        },
        body: JSON.stringify(updatedHomepage)
      });

      const data = await res.json();
      if (res.ok) {
        setHomepage(data.content);
        setSuccess("Landing page primary details saved successfully!");
      } else {
        setError(data.error || "Failed to update landing page details.");
      }
    } catch (err) {
      setError("Network error. Could not save homepage details.");
    }
  };

  // 2. Add or Edit Patron
  const handleAddPatron = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!homepage || !patronName.trim() || !patronPosition.trim()) return;

    setError("");
    setSuccess("");

    let updatedPatrons = homepage.patrons || [];
    if (editingPatronId) {
      updatedPatrons = updatedPatrons.map((p) => {
        if (p.id === editingPatronId) {
          return {
            ...p,
            name: patronName.trim(),
            position: patronPosition.trim(),
            imageUrl: patronImageBase64
          };
        }
        return p;
      });
    } else {
      const newPatron: Patron = {
        id: Date.now().toString(),
        name: patronName.trim(),
        position: patronPosition.trim(),
        imageUrl: patronImageBase64
      };
      updatedPatrons = [...updatedPatrons, newPatron];
    }

    const updatedHomepage: HomepageContent = {
      ...homepage,
      patrons: updatedPatrons
    };

    try {
      const res = await fetch("/api/homepage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Passcode": passcode
        },
        body: JSON.stringify(updatedHomepage)
      });

      const data = await res.json();
      if (res.ok) {
        setHomepage(data.content);
        setPatronName("");
        setPatronPosition("");
        setPatronImageBase64("");
        setEditingPatronId(null);
        setSuccess(editingPatronId ? "College Patron updated successfully!" : "College Patron added successfully!");
      } else {
        setError(data.error || "Failed to save patron.");
      }
    } catch (err) {
      setError("Network error. Could not save patron.");
    }
  };

  // Delete Patron
  const handleDeletePatron = async (id: string) => {
    if (!homepage) return;

    setError("");
    setSuccess("");

    const updatedHomepage: HomepageContent = {
      ...homepage,
      patrons: (homepage.patrons || []).filter((p) => p.id !== id)
    };

    try {
      const res = await fetch("/api/homepage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Passcode": passcode
        },
        body: JSON.stringify(updatedHomepage)
      });

      const data = await res.json();
      if (res.ok) {
        setHomepage(data.content);
        setSuccess("College Patron removed.");
      } else {
        setError(data.error || "Failed to delete patron.");
      }
    } catch (err) {
      setError("Network error. Could not delete patron.");
    }
  };

  // 3. Add SPOC Card (Student or College staff)
  const handleAddSpoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!homepage || !spocName.trim()) return;

    setError("");
    setSuccess("");

    const newSpoc: TeamSpoc = {
      id: Date.now().toString(),
      name: spocName.trim(),
      role: spocRole.trim(),
      department: spocDept.trim(),
      email: spocEmail.trim(),
      phone: spocPhone.trim(),
      imageUrl: spocImageBase64
    };

    let updatedHomepage: HomepageContent;
    if (spocType === "student") {
      updatedHomepage = {
        ...homepage,
        studentSpocs: [...(homepage.studentSpocs || []), newSpoc]
      };
    } else {
      updatedHomepage = {
        ...homepage,
        collegeSpocs: [...(homepage.collegeSpocs || []), newSpoc]
      };
    }

    try {
      const res = await fetch("/api/homepage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Passcode": passcode
        },
        body: JSON.stringify(updatedHomepage)
      });

      const data = await res.json();
      if (res.ok) {
        setHomepage(data.content);
        setSpocName("");
        setSpocRole("");
        setSpocDept("");
        setSpocEmail("");
        setSpocPhone("");
        setSpocImageBase64("");
        setSuccess(`SPOC Contact added to ${spocType === "student" ? "Students" : "College"} list!`);
      } else {
        setError(data.error || "Failed to add SPOC.");
      }
    } catch (err) {
      setError("Network error. Could not add SPOC card.");
    }
  };

  // Delete SPOC Card
  const handleDeleteSpoc = async (id: string, type: "student" | "college") => {
    if (!homepage) return;

    setError("");
    setSuccess("");

    let updatedHomepage: HomepageContent;
    if (type === "student") {
      updatedHomepage = {
        ...homepage,
        studentSpocs: homepage.studentSpocs.filter((s) => s.id !== id)
      };
    } else {
      updatedHomepage = {
        ...homepage,
        collegeSpocs: homepage.collegeSpocs.filter((s) => s.id !== id)
      };
    }

    try {
      const res = await fetch("/api/homepage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Passcode": passcode
        },
        body: JSON.stringify(updatedHomepage)
      });

      const data = await res.json();
      if (res.ok) {
        setHomepage(data.content);
        setSuccess("SPOC profile removed successfully.");
      } else {
        setError(data.error || "Failed to delete SPOC profile.");
      }
    } catch (err) {
      setError("Network error. Could not delete SPOC profile.");
    }
  };

  // 4. Add Gallery Photo
  const handleAddPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!homepage || !photoTitle.trim()) return;

    setError("");
    setSuccess("");

    const newPhoto: PreviousPhoto = {
      id: Date.now().toString(),
      title: photoTitle.trim(),
      description: photoDesc.trim(),
      imageUrl: photoBase64
    };

    const updatedHomepage: HomepageContent = {
      ...homepage,
      previousPhotos: [...(homepage.previousPhotos || []), newPhoto]
    };

    try {
      const res = await fetch("/api/homepage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Passcode": passcode
        },
        body: JSON.stringify(updatedHomepage)
      });

      const data = await res.json();
      if (res.ok) {
        setHomepage(data.content);
        setPhotoTitle("");
        setPhotoDesc("");
        setPhotoBase64("");
        setSuccess("Gallery photo added successfully!");
      } else {
        setError(data.error || "Failed to add gallery photo.");
      }
    } catch (err) {
      setError("Network error. Could not add gallery photo.");
    }
  };

  // Delete Gallery Photo
  const handleDeletePhoto = async (id: string) => {
    if (!homepage) return;

    setError("");
    setSuccess("");

    const updatedHomepage: HomepageContent = {
      ...homepage,
      previousPhotos: homepage.previousPhotos.filter((p) => p.id !== id)
    };

    try {
      const res = await fetch("/api/homepage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Passcode": passcode
        },
        body: JSON.stringify(updatedHomepage)
      });

      const data = await res.json();
      if (res.ok) {
        setHomepage(data.content);
        setSuccess("Gallery item removed successfully.");
      } else {
        setError(data.error || "Failed to delete photo.");
      }
    } catch (err) {
      setError("Network error. Could not delete gallery photo.");
    }
  };

  // 5. Save or Edit dynamic custom page
  const handleSavePage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pageTitle.trim() || !pageSlug.trim()) {
      setError("Page title and URL slug are required.");
      return;
    }

    setError("");
    setSuccess("");

    const payload = {
      id: editingPageId || undefined,
      title: pageTitle.trim(),
      slug: pageSlug.trim().toLowerCase().replace(/[^a-z0-9-_]/g, "-"),
      content: pageContent,
      published: pagePublished
    };

    try {
      const res = await fetch("/api/custom-pages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Passcode": passcode
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        // Refresh pages list
        const pagesRes = await fetch("/api/custom-pages");
        if (pagesRes.ok) {
          setPagesList(await pagesRes.json());
        }

        setEditingPageId(null);
        setPageTitle("");
        setPageSlug("");
        setPageContent("");
        setPagePublished(true);
        setSuccess("Dynamic page saved successfully!");
      } else {
        setError(data.error || "Failed to save dynamic page.");
      }
    } catch (err) {
      setError("Network error. Could not save page.");
    }
  };

  // Delete Custom Page
  const handleDeletePage = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this custom page? Any menu item pointing to this page slug will need to be reconfigured/removed.")) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      const res = await fetch(`/api/custom-pages/${id}`, {
        method: "DELETE",
        headers: {
          "X-Admin-Passcode": passcode
        }
      });

      const data = await res.json();
      if (res.ok) {
        // Refresh pages list
        const pagesRes = await fetch("/api/custom-pages");
        if (pagesRes.ok) {
          setPagesList(await pagesRes.json());
        }
        setSuccess("Custom page deleted successfully!");
      } else {
        setError(data.error || "Failed to delete custom page.");
      }
    } catch (err) {
      setError("Network error. Could not delete custom page.");
    }
  };

  // Select page for editing
  const handleStartEditPage = (page: CustomPage) => {
    setEditingPageId(page.id);
    setPageTitle(page.title);
    setPageSlug(page.slug);
    setPageContent(page.content);
    setPagePublished(page.published);
  };

  // Cancel edit
  const handleCancelEditPage = () => {
    setEditingPageId(null);
    setPageTitle("");
    setPageSlug("");
    setPageContent("");
    setPagePublished(true);
  };

  // 6. Navigation Menu Management
  // Add an item to menu
  const handleAddPageToMenu = (page: CustomPage) => {
    // Check if slug is already in menu
    if (editingMenu.some((m) => m.type === "custom" && m.target === page.slug)) {
      alert("This custom page is already added to the navigation menu.");
      return;
    }

    const newItem: MenuItem = {
      id: Date.now().toString(),
      label: page.title,
      type: "custom",
      target: page.slug,
      order: editingMenu.length + 1
    };

    setEditingMenu([...editingMenu, newItem]);
  };

  // Remove menu item
  const handleRemoveMenuItem = (id: string) => {
    setEditingMenu(editingMenu.filter((m) => m.id !== id));
  };

  // Update menu item label
  const handleUpdateMenuLabel = (id: string, newLabel: string) => {
    setEditingMenu(
      editingMenu.map((m) => (m.id === id ? { ...m, label: newLabel } : m))
    );
  };

  // Move menu item order
  const handleMoveMenuItem = (idx: number, direction: "up" | "down") => {
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === editingMenu.length - 1) return;

    const newMenu = [...editingMenu];
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    
    // Swap
    const temp = newMenu[idx];
    newMenu[idx] = newMenu[targetIdx];
    newMenu[targetIdx] = temp;

    // Recalculate order
    const ordered = newMenu.map((m, i) => ({ ...m, order: i + 1 }));
    setEditingMenu(ordered);
  };

  // Save entire menu config
  const handleSaveMenuConfig = async () => {
    setError("");
    setSuccess("");

    // Make sure we have system items
    if (!editingMenu.some(m => m.target === "home")) {
      setError("The menu must contain a 'Home' link.");
      return;
    }

    try {
      const res = await fetch("/api/menu", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Passcode": passcode
        },
        body: JSON.stringify(editingMenu)
      });

      const data = await res.json();
      if (res.ok) {
        setMenuItems(data.menu);
        setEditingMenu(data.menu.sort((a: MenuItem, b: MenuItem) => a.order - b.order));
        setSuccess("Front-end menu configuration saved and published successfully!");
      } else {
        setError(data.error || "Failed to update menu configuration.");
      }
    } catch (err) {
      setError("Network error. Could not update navigation menu.");
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center">
        <span className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin inline-block"></span>
        <p className="text-xs text-slate-400 mt-3 font-semibold">Fetching layouts, pages and menu structures...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-2xl p-4 text-xs flex gap-2.5 font-semibold shadow-xs">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-4 text-xs flex gap-2.5 font-semibold shadow-xs">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      {/* Sub tabs navigation */}
      <div className="flex flex-wrap gap-1 border-b border-slate-200 pb-3">
        <button
          onClick={() => { setActiveSubTab("details"); setError(""); setSuccess(""); }}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
            activeSubTab === "details" ? "bg-indigo-50 text-indigo-700" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          SIH Banner Details
        </button>
        <button
          onClick={() => { setActiveSubTab("sponsors"); setError(""); setSuccess(""); }}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
            activeSubTab === "sponsors" ? "bg-indigo-50 text-indigo-700" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
          College Patrons
        </button>
        <button
          onClick={() => { setActiveSubTab("spocs"); setError(""); setSuccess(""); }}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
            activeSubTab === "spocs" ? "bg-indigo-50 text-indigo-700" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <UserPlus className="w-4 h-4" />
          Staff & Student SPOCs
        </button>
        <button
          onClick={() => { setActiveSubTab("photos"); setError(""); setSuccess(""); }}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
            activeSubTab === "photos" ? "bg-indigo-50 text-indigo-700" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          Previous SIH Photos
        </button>
        <button
          onClick={() => { setActiveSubTab("pages"); setError(""); setSuccess(""); }}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
            activeSubTab === "pages" ? "bg-indigo-50 text-indigo-700" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <FileText className="w-4 h-4" />
          Dynamic Custom Pages
        </button>
        <button
          onClick={() => { setActiveSubTab("menu"); setError(""); setSuccess(""); }}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
            activeSubTab === "menu" ? "bg-indigo-50 text-indigo-700" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <List className="w-4 h-4" />
          Front-End Navigation Menu
        </button>
      </div>

      {/* SUB-TAB CONTENTS */}

      {/* 1. DETAILS FORM */}
      {activeSubTab === "details" && homepage && (
        <form onSubmit={handleSaveDetails} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            Landing Page Primary Header Content
          </h2>
          <p className="text-xs text-slate-400 -mt-2 mb-4">
            Edit the main hero banner text and deadlines shown to the students on the home screen.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Hackathon Event Title</label>
              <input
                type="text"
                required
                className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500"
                value={detailsForm.title}
                onChange={(e) => setDetailsForm({ ...detailsForm, title: e.target.value })}
                placeholder="e.g. Smart India Hackathon 2026 - SVEC Internal Round"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Inspirational Slogan</label>
              <input
                type="text"
                className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500"
                value={detailsForm.slogan}
                onChange={(e) => setDetailsForm({ ...detailsForm, slogan: e.target.value })}
                placeholder="e.g. Inculcating a Culture of Product Innovation and Problem-Solving"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Event Dates / Guidelines Summary</label>
              <input
                type="text"
                className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500"
                value={detailsForm.dates}
                onChange={(e) => setDetailsForm({ ...detailsForm, dates: e.target.value })}
                placeholder="e.g. Registration: Oct 1 - Oct 25 | Hackathon: Nov 10-11, 2026"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Detailed Description Paragraph</label>
              <textarea
                required
                rows={5}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 leading-relaxed"
                value={detailsForm.description}
                onChange={(e) => setDetailsForm({ ...detailsForm, description: e.target.value })}
                placeholder="Write a clear introductory paragraph detailing SVEC selection norms..."
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Save className="w-4 h-4" />
              Save Primary Details
            </button>
          </div>
        </form>
      )}

      {/* 2. COLLEGE PATRONS TAB */}
      {activeSubTab === "sponsors" && homepage && (
        <div className="space-y-6">
          {/* Add/Edit Patron form */}
          <form onSubmit={handleAddPatron} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              {editingPatronId ? (
                <>
                  <Edit2 className="w-4 h-4 text-indigo-500" />
                  Edit College Patron
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 text-indigo-500" />
                  Add College Patron
                </>
              )}
            </h2>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Patron Name *</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500"
                  value={patronName}
                  onChange={(e) => setPatronName(e.target.value)}
                  placeholder="e.g. Sri G. Satyanarayana, Sri Ch. V. V. Subba Rao"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Position / Designation *</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500"
                  value={patronPosition}
                  onChange={(e) => setPatronPosition(e.target.value)}
                  placeholder="e.g. President, Secretary, Technical Director"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Patron Profile Photo (Optional)</label>
              <input
                type="file"
                accept="image/*"
                className="w-full text-xs font-semibold text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100"
                onChange={(e) => handleImageUpload(e, setPatronImageBase64)}
              />
              <p className="text-[10px] text-slate-400 mt-1">Accepts images up to 2MB. If photo is omitted, a letter-based initials avatar is automatically generated.</p>
              {patronImageBase64 && (
                <div className="mt-3 flex items-center gap-3">
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1">Photo Preview:</span>
                    <img src={patronImageBase64} alt="Patron Photo Preview" className="h-16 w-16 rounded-full object-cover border p-0.5 shadow-xs" referrerPolicy="no-referrer" />
                  </div>
                  {editingPatronId && (
                    <button
                      type="button"
                      onClick={() => setPatronImageBase64("")}
                      className="mt-4 text-xs font-bold text-red-500 hover:text-red-700 hover:underline"
                    >
                      Remove Photo
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end gap-2">
              {editingPatronId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingPatronId(null);
                    setPatronName("");
                    setPatronPosition("");
                    setPatronImageBase64("");
                  }}
                  className="px-4 py-2 border border-slate-200 text-slate-500 hover:bg-slate-50 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                {editingPatronId ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {editingPatronId ? "Update Patron" : "Add College Patron"}
              </button>
            </div>
          </form>

          {/* List Patrons */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">
              Current College Patrons ({homepage.patrons?.length || 0})
            </h2>

            {homepage.patrons && homepage.patrons.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {homepage.patrons.map((p) => (
                  <div
                    key={p.id}
                    className={`border p-4 rounded-xl flex items-center justify-between gap-3 transition-all ${
                      editingPatronId === p.id 
                        ? "border-indigo-500 bg-indigo-50/20 shadow-xs" 
                        : "border-slate-100 bg-slate-50/50"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.name} className="h-10 w-10 rounded-full object-cover flex-shrink-0" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-extrabold flex items-center justify-center text-xs flex-shrink-0">
                          {p.name.split(" ").filter(Boolean).map((n) => n[0]).join("").substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 leading-tight truncate">{p.name}</p>
                        <span className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full font-semibold inline-block mt-1">
                          {p.position}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPatronId(p.id);
                          setPatronName(p.name);
                          setPatronPosition(p.position);
                          setPatronImageBase64(p.imageUrl || "");
                          setSuccess("");
                          setError("");
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer"
                        title="Edit Patron"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (editingPatronId === p.id) {
                            setEditingPatronId(null);
                            setPatronName("");
                            setPatronPosition("");
                            setPatronImageBase64("");
                          }
                          handleDeletePatron(p.id);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                        title="Delete Patron"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic text-center py-6">No college patrons configured yet.</p>
            )}
          </div>
        </div>
      )}

      {/* 3. SPOCS TAB */}
      {activeSubTab === "spocs" && homepage && (
        <div className="space-y-6">
          {/* Add SPOC */}
          <form onSubmit={handleAddSpoc} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-indigo-500" />
              Add SPOC Member
            </h2>

            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">SPOC Member Group *</label>
                <select
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:indigo-500 bg-white"
                  value={spocType}
                  onChange={(e) => setSpocType(e.target.value as any)}
                >
                  <option value="student">Student SPOC</option>
                  <option value="college">College Staff SPOC</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500"
                  value={spocName}
                  onChange={(e) => setSpocName(e.target.value)}
                  placeholder="e.g. Dr. K. Shirin Bhanu"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Specific Role / Position *</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500"
                  value={spocRole}
                  onChange={(e) => setSpocRole(e.target.value)}
                  placeholder="e.g. Student Lead, Coordinator"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Department *</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500"
                  value={spocDept}
                  onChange={(e) => setSpocDept(e.target.value)}
                  placeholder="e.g. CSE, IT, ECE"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500"
                  value={spocEmail}
                  onChange={(e) => setSpocEmail(e.target.value)}
                  placeholder="e.g. kbhanu@svec.edu.in"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Contact Phone *</label>
                <input
                  type="tel"
                  required
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500"
                  value={spocPhone}
                  onChange={(e) => setSpocPhone(e.target.value)}
                  placeholder="e.g. 9440123456"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Profile Photo (Optional)</label>
              <input
                type="file"
                accept="image/*"
                className="w-full text-xs font-semibold text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100"
                onChange={(e) => handleImageUpload(e, setSpocImageBase64)}
              />
              {spocImageBase64 && (
                <div className="mt-3">
                  <span className="text-[10px] text-slate-400 block mb-1">Photo Preview:</span>
                  <img src={spocImageBase64} alt="SPOC Preview" className="h-14 w-14 object-cover rounded-xl border p-0.5" referrerPolicy="no-referrer" />
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                Add SPOC Member
              </button>
            </div>
          </form>

          {/* List College SPOCs */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">
              Current College Staff SPOCs / Mentors ({homepage.collegeSpocs?.length || 0})
            </h2>

            {homepage.collegeSpocs && homepage.collegeSpocs.length > 0 ? (
              <div className="space-y-3">
                {homepage.collegeSpocs.map((s) => (
                  <div
                    key={s.id}
                    className="border border-slate-100 bg-slate-50/50 p-4 rounded-xl flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      {s.imageUrl ? (
                        <img src={s.imageUrl} alt={s.name} className="h-10 w-10 rounded-lg object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-700 font-extrabold flex items-center justify-center text-xs">
                          {s.name.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-bold text-slate-800">
                          {s.name} <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full uppercase ml-1.5">{s.role}</span>
                        </p>
                        <p className="text-[10px] text-slate-400 font-semibold">{s.department} | Email: {s.email} | Phone: {s.phone}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteSpoc(s.id, "college")}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic text-center py-4">No staff SPOCs configured.</p>
            )}
          </div>

          {/* List Student SPOCs */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">
              Current Student SPOCs ({homepage.studentSpocs?.length || 0})
            </h2>

            {homepage.studentSpocs && homepage.studentSpocs.length > 0 ? (
              <div className="space-y-3">
                {homepage.studentSpocs.map((s) => (
                  <div
                    key={s.id}
                    className="border border-slate-100 bg-slate-50/50 p-4 rounded-xl flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      {s.imageUrl ? (
                        <img src={s.imageUrl} alt={s.name} className="h-10 h-10 rounded-lg object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 font-extrabold flex items-center justify-center text-xs">
                          {s.name.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-bold text-slate-800">
                          {s.name} <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full uppercase ml-1.5">{s.role}</span>
                        </p>
                        <p className="text-[10px] text-slate-400 font-semibold">{s.department} | Email: {s.email} | Phone: {s.phone}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteSpoc(s.id, "student")}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic text-center py-4">No student SPOCs configured.</p>
            )}
          </div>
        </div>
      )}

      {/* 4. PHOTOS TAB */}
      {activeSubTab === "photos" && homepage && (
        <div className="space-y-6">
          <form onSubmit={handleAddPhoto} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-indigo-500" />
              Add Previous SIH Photo
            </h2>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Photo Title *</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500"
                  value={photoTitle}
                  onChange={(e) => setPhotoTitle(e.target.value)}
                  placeholder="e.g. SIH 2024 Nodal Center Winners"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Short Description (Optional)</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500"
                  value={photoDesc}
                  onChange={(e) => setPhotoDesc(e.target.value)}
                  placeholder="e.g. SVEC students receiving first prize of 1 Lakh INR."
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Upload Photo *</label>
              <input
                type="file"
                accept="image/*"
                required
                className="w-full text-xs font-semibold text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100"
                onChange={(e) => handleImageUpload(e, setPhotoBase64)}
              />
              {photoBase64 && (
                <div className="mt-3">
                  <span className="text-[10px] text-slate-400 block mb-1">Image Preview:</span>
                  <img src={photoBase64} alt="Gallery Preview" className="h-28 max-w-[200px] object-cover rounded-xl border p-0.5" referrerPolicy="no-referrer" />
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                Add Gallery Photo
              </button>
            </div>
          </form>

          {/* List photos */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">
              Current Gallery Photos ({homepage.previousPhotos?.length || 0})
            </h2>

            {homepage.previousPhotos && homepage.previousPhotos.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {homepage.previousPhotos.map((p) => (
                  <div
                    key={p.id}
                    className="border border-slate-200 rounded-xl overflow-hidden shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
                  >
                    <div className="h-32 bg-slate-100 flex items-center justify-center relative">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <ImageIcon className="w-8 h-8 text-slate-300" />
                      )}
                    </div>
                    <div className="p-3 bg-white flex-1 flex flex-col justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-slate-800 text-xs truncate">{p.title}</h3>
                        {p.description && <p className="text-[10px] text-slate-500 leading-normal line-clamp-2 mt-0.5">{p.description}</p>}
                      </div>
                      <div className="pt-2 border-t border-slate-100 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleDeletePhoto(p.id)}
                          className="text-[10px] text-red-600 hover:bg-red-50 px-2 py-1.5 rounded-lg flex items-center gap-1 font-bold cursor-pointer transition-all border border-transparent hover:border-red-100"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic text-center py-6">No previous SIH photos uploaded.</p>
            )}
          </div>
        </div>
      )}

      {/* 5. DYNAMIC CUSTOM PAGES TAB */}
      {activeSubTab === "pages" && (
        <div className="space-y-6">
          {/* Create or Edit custom page form */}
          <form onSubmit={handleSavePage} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              {editingPageId ? <Edit2 className="w-4 h-4 text-indigo-500" /> : <Plus className="w-4 h-4 text-indigo-500" />}
              {editingPageId ? "Edit Custom Page" : "Create Dynamic Custom Page"}
            </h2>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Page Title *</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500"
                  value={pageTitle}
                  onChange={(e) => {
                    setPageTitle(e.target.value);
                    if (!editingPageId) {
                      setPageSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "-").substring(0, 30));
                    }
                  }}
                  placeholder="e.g. Rules and Guidelines, Event Schedule"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">URL Slug / Path *</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs font-mono font-semibold focus:outline-none focus:border-indigo-500"
                  value={pageSlug}
                  onChange={(e) => setPageSlug(e.target.value)}
                  placeholder="e.g. schedule, selection-process"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">This defines the link path of your page. Recommended is lowercase letters and dashes.</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span>Page Markdown Content</span>
                <span className="text-[10px] font-bold text-indigo-500 hover:underline cursor-help" onClick={() => alert("Markdown Hints:\n- Use # for Big titles\n- Use ## for sections\n- Use ### for subsections\n- Use - or * for bullet points\n- Simple empty lines create paragraphs.")}>
                  Markdown Hints & Formatting Help
                </span>
              </label>
              <textarea
                required
                rows={12}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:border-indigo-500 leading-relaxed"
                value={pageContent}
                onChange={(e) => setPageContent(e.target.value)}
                placeholder="## Main Header&#10;Write detailed descriptions, guidelines, dates, and rule sheets here...&#10;&#10;### Section 1: Teams&#10;- Bullet point 1&#10;- Bullet point 2"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="pagePublished"
                className="w-4 h-4 accent-indigo-600 rounded"
                checked={pagePublished}
                onChange={(e) => setPagePublished(e.target.checked)}
              />
              <label htmlFor="pagePublished" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                Publish this page immediately (make it visible to students)
              </label>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end gap-3">
              {editingPageId && (
                <button
                  type="button"
                  onClick={handleCancelEditPage}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel Edit
                </button>
              )}
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Save className="w-4 h-4" />
                {editingPageId ? "Update Page" : "Publish Dynamic Page"}
              </button>
            </div>
          </form>

          {/* List Custom Pages */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">
              Configured Custom Pages ({pagesList.length})
            </h2>

            {pagesList.length > 0 ? (
              <div className="space-y-3">
                {pagesList.map((p) => (
                  <div
                    key={p.id}
                    className="border border-slate-100 bg-slate-50/50 p-4 rounded-xl flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">
                          {p.title} 
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ml-2 ${
                            p.published ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                          }`}>
                            {p.published ? "Published" : "Draft"}
                          </span>
                        </p>
                        <p className="text-[10px] text-slate-400 font-semibold font-mono">Slug: /{p.slug}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleStartEditPage(p)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer"
                        title="Edit Page"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddPageToMenu(p)}
                        className="px-2 py-1 border border-indigo-100 text-indigo-600 hover:bg-indigo-50 rounded-lg text-[10px] font-bold cursor-pointer"
                        title="Add to navigation menu"
                      >
                        + Add to Menu
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePage(p.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                        title="Delete Page"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic text-center py-4">No custom dynamic pages created yet.</p>
            )}
          </div>
        </div>
      )}

      {/* 6. NAVIGATION MENU TAB */}
      {activeSubTab === "menu" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <List className="w-4 h-4 text-indigo-500" />
              Manage Front-End Navigation Menu Links
            </h2>
            <p className="text-xs text-slate-500">
              Customize the links that appear in the top-level header of the website. You can change their display labels, remove custom page links, and control the exact order they are shown.
            </p>

            <div className="space-y-3 pt-2">
              {editingMenu.map((m, idx) => (
                <div
                  key={m.id}
                  className="bg-slate-50/50 border border-slate-100 p-4 rounded-xl flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
                      <LinkIcon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase">Display Label</label>
                        <input
                          type="text"
                          required
                          className="w-full bg-white px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                          value={m.label}
                          onChange={(e) => handleUpdateMenuLabel(m.id, e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase">Target Address</label>
                        <span className="block text-xs font-semibold text-slate-500 pt-2 truncate font-mono">
                          {m.type === "system" ? `System View: ${m.target}` : `Custom Page: /${m.target}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Order buttons */}
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveMenuItem(idx, "up")}
                      className={`p-1 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer ${idx === 0 ? "opacity-30 cursor-not-allowed" : ""}`}
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === editingMenu.length - 1}
                      onClick={() => handleMoveMenuItem(idx, "down")}
                      className={`p-1 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer ${idx === editingMenu.length - 1 ? "opacity-30 cursor-not-allowed" : ""}`}
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>

                    {/* Delete button (only allow delete for non-essential links, allow deleting register and custom links, keep home & admin always) */}
                    {m.target !== "home" && m.target !== "admin" ? (
                      <button
                        type="button"
                        onClick={() => handleRemoveMenuItem(m.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer ml-2"
                        title="Remove link from navbar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ) : (
                      <span className="w-8 shrink-0 text-center text-[9px] font-bold uppercase tracking-wider text-slate-300 select-none">Core</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={fetchAllData}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                Reset Changes
              </button>
              <button
                type="button"
                onClick={handleSaveMenuConfig}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Save className="w-4 h-4" />
                Save & Publish Navigation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

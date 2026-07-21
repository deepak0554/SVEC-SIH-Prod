import React, { useState, useEffect, useRef } from "react";
import { HomepageContent, CustomPage, MenuItem, Sponsor, Patron, TeamSpoc, PreviousPhoto } from "../types";
import { 
  Plus, Trash2, Edit2, CheckCircle, AlertCircle, Save, Layers, List, Link as LinkIcon, 
  UserPlus, Image as ImageIcon, Sparkles, FileText, LayoutGrid, Eye, ArrowUp, ArrowDown,
  ShieldAlert, Shield, Bold, Italic, Heading1, Heading2, HelpCircle, Code, ExternalLink, FileJson,
  X, FolderPlus, Folder
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import HtmlRichEditor from "./HtmlRichEditor";

interface PageMenuCustomizerProps {
  passcode: string;
}

export default function PageMenuCustomizer({ passcode }: PageMenuCustomizerProps) {
  // Global tab within customizer
  const [activeSubTab, setActiveSubTab] = useState<"details" | "guidelines" | "sponsors" | "spocs" | "photos" | "pages" | "menu" | "credits">("details");

  // State variables
  const [homepage, setHomepage] = useState<HomepageContent | null>(null);
  const [pagesList, setPagesList] = useState<CustomPage[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  
  // Footer Credits customizer states
  const [settingsData, setSettingsData] = useState<any>(null);
  const [creditsTitle, setCreditsTitle] = useState<string>("Department of CSE");
  const [creditsContent, setCreditsContent] = useState<string>("");
  const [creditsEnabled, setCreditsEnabled] = useState<boolean>(true);
  const [savingCredits, setSavingCredits] = useState<boolean>(false);
  
  // Guidelines form state
  const [guidelinesPageId, setGuidelinesPageId] = useState<string>("");
  const [guidelinesTitle, setGuidelinesTitle] = useState<string>("Guidelines & Rules");
  const [guidelinesContent, setGuidelinesContent] = useState<string>("");
  const [guidelinesPublished, setGuidelinesPublished] = useState<boolean>(true);
  
  // Rich HTML Guidelines editor variables
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [editorPreviewTheme, setEditorPreviewTheme] = useState<"light" | "dark">("light");
  const [insertImageUrl, setInsertImageUrl] = useState("");
  const [insertImageAlt, setInsertImageAlt] = useState("Hackathon Event Banner");
  const [insertImageSize, setInsertImageSize] = useState("max-w-xl");
  const [insertImageRounded, setInsertImageRounded] = useState("rounded-2xl");
  const [insertImageShadow, setInsertImageShadow] = useState("shadow-md");
  const [showImageModal, setShowImageModal] = useState(false);
  
  const [insertLinkUrl, setInsertLinkUrl] = useState("");
  const [insertLinkText, setInsertLinkText] = useState("");
  const [showLinkModal, setShowLinkModal] = useState(false);
  
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
  const [pendingPhotos, setPendingPhotos] = useState<{ id: string; base64: string; title: string; description: string; fileName: string }[]>([]);

  // Photo edit state
  const [editingPhotoId, setEditingPhotoId] = useState<string | null>(null);
  const [editingPhotoTitle, setEditingPhotoTitle] = useState("");
  const [editingPhotoDesc, setEditingPhotoDesc] = useState("");
  const [editingPhotoBase64, setEditingPhotoBase64] = useState("");
  const [editingPhotoGroup, setEditingPhotoGroup] = useState("");

  // Group rename state
  const [editingGroupName, setEditingGroupName] = useState<string | null>(null);
  const [newGroupNameInput, setNewGroupNameInput] = useState("");

  // Group selection state for batch upload
  const [selectedBatchGroup, setSelectedBatchGroup] = useState("General Gallery");
  const [customNewGroupName, setCustomNewGroupName] = useState("");
  const [isCreatingNewGroup, setIsCreatingNewGroup] = useState(false);

  // Dynamic pages form state
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [pageTitle, setPageTitle] = useState("");
  const [pageSlug, setPageSlug] = useState("");
  const [pageContent, setPageContent] = useState("");
  const [pagePublished, setPagePublished] = useState(true);

  // Menu items list for live editing
  const [editingMenu, setEditingMenu] = useState<MenuItem[]>([]);

  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
  } | null>(null);

  // Memoized array of existing unique photo group titles for dropdowns
  const existingGroups = React.useMemo(() => {
    if (!homepage || !homepage.previousPhotos) return ["General Gallery"];
    const groups = new Set<string>();
    homepage.previousPhotos.forEach((p) => {
      if (p.groupTitle) {
        groups.add(p.groupTitle.trim());
      }
    });
    if (groups.size === 0) {
      groups.add("General Gallery");
    }
    return Array.from(groups);
  }, [homepage]);

  // Fetch all customizable parameters
  const fetchAllData = async () => {
    setLoading(true);
    setError("");
    try {
      const [homeRes, pagesRes, menuRes, settingsRes] = await Promise.all([
        fetch("/api/homepage"),
        fetch("/api/custom-pages"),
        fetch("/api/menu"),
        fetch("/api/settings", {
          headers: { "X-Admin-Passcode": passcode }
        })
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
        
        // Find guidelines page
        const guidelinesPage = pagesData.find(p => p.slug === "guidelines");
        if (guidelinesPage) {
          setGuidelinesPageId(guidelinesPage.id);
          setGuidelinesTitle(guidelinesPage.title);
          setGuidelinesContent(guidelinesPage.content);
          setGuidelinesPublished(guidelinesPage.published);
        }
      }

      if (menuRes.ok) {
        const menuData: MenuItem[] = await menuRes.json();
        setMenuItems(menuData);
        setEditingMenu(menuData.sort((a, b) => a.order - b.order));
      }

      if (settingsRes.ok) {
        const settings = await settingsRes.json();
        setSettingsData(settings);
        setCreditsTitle(settings.creditsTitle || "Department of CSE");
        setCreditsContent(settings.creditsContent || "");
        setCreditsEnabled(settings.creditsEnabled !== undefined ? settings.creditsEnabled : true);
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
  const handleDeletePatron = (id: string) => {
    setDeleteConfirm({
      isOpen: true,
      title: "Remove College Patron",
      message: "Are you sure you want to remove this college patron/sponsor from the landing page list?",
      onConfirm: async () => {
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
        } finally {
          setDeleteConfirm(null);
        }
      }
    });
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
  const handleDeleteSpoc = (id: string, type: "student" | "college") => {
    setDeleteConfirm({
      isOpen: true,
      title: `Remove ${type === "student" ? "Student" : "College"} SPOC Profile`,
      message: "Are you sure you want to remove this SPOC profile from the contact cards list?",
      onConfirm: async () => {
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
        } finally {
          setDeleteConfirm(null);
        }
      }
    });
  };

  // Helper for reading File as Base64 with Promise
  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (file.size > 2 * 1024 * 1024) {
        reject(new Error(`File "${file.name}" is larger than 2MB.`));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error || new Error("Failed to read file."));
      reader.readAsDataURL(file);
    });
  };

  // Upload and queue multiple gallery images
  const handleMultipleImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setError("");
    setSuccess("");

    const newPending: { id: string; base64: string; title: string; description: string; fileName: string }[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const base64 = await readFileAsBase64(file);
        // Clean up file name to form a default title
        let defaultTitle = file.name;
        const lastDot = defaultTitle.lastIndexOf(".");
        if (lastDot !== -1) {
          defaultTitle = defaultTitle.substring(0, lastDot);
        }
        defaultTitle = defaultTitle
          .replace(/[-_]/g, " ")
          .replace(/\b\w/g, c => c.toUpperCase());

        newPending.push({
          id: `${Date.now()}-${i}-${Math.random().toString(36).substr(2, 5)}`,
          base64,
          title: defaultTitle,
          description: "",
          fileName: file.name
        });
      } catch (err: any) {
        setError(err.message || "Failed to process one or more images.");
      }
    }

    setPendingPhotos(prev => [...prev, ...newPending]);
    // reset input so same files can be re-uploaded if cleared
    e.target.value = "";
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

  // Add the queued batch of gallery photos
  const handleAddBatchPhotos = async () => {
    if (!homepage || pendingPhotos.length === 0) return;

    setError("");
    setSuccess("");

    const targetGroup = isCreatingNewGroup && customNewGroupName.trim()
      ? customNewGroupName.trim()
      : selectedBatchGroup.trim();

    const newPhotos: PreviousPhoto[] = pendingPhotos.map((photo, i) => ({
      id: `${Date.now()}-${i}-${Math.random().toString(36).substr(2, 5)}`,
      title: photo.title.trim() || `SIH Photo ${i + 1}`,
      description: photo.description.trim(),
      imageUrl: photo.base64,
      groupTitle: targetGroup || "General Gallery"
    }));

    const updatedHomepage: HomepageContent = {
      ...homepage,
      previousPhotos: [...(homepage.previousPhotos || []), ...newPhotos]
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
        setPendingPhotos([]);
        setSuccess(`Successfully added ${newPhotos.length} photos to the gallery!`);
      } else {
        setError(data.error || "Failed to add gallery photos.");
      }
    } catch (err) {
      setError("Network error. Could not add gallery photos.");
    }
  };

  // Delete Gallery Photo
  const handleDeletePhoto = (id: string) => {
    setDeleteConfirm({
      isOpen: true,
      title: "Remove Gallery Photo",
      message: "Are you sure you want to remove this memory photo from the event archive?",
      onConfirm: async () => {
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
        } finally {
          setDeleteConfirm(null);
        }
      }
    });
  };

  // Start editing a gallery photo
  const handleStartEditPhoto = (photo: PreviousPhoto) => {
    setEditingPhotoId(photo.id);
    setEditingPhotoTitle(photo.title);
    setEditingPhotoDesc(photo.description || "");
    setEditingPhotoBase64(photo.imageUrl || "");
    setEditingPhotoGroup(photo.groupTitle || "General Gallery");
  };

  // Cancel photo editing
  const handleCancelEditPhoto = () => {
    setEditingPhotoId(null);
    setEditingPhotoTitle("");
    setEditingPhotoDesc("");
    setEditingPhotoBase64("");
    setEditingPhotoGroup("");
  };

  // Update an existing gallery photo
  const handleUpdatePhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!homepage || !editingPhotoId || !editingPhotoTitle.trim()) return;

    setError("");
    setSuccess("");

    const updatedPhotos = (homepage.previousPhotos || []).map((p) => {
      if (p.id === editingPhotoId) {
        return {
          ...p,
          title: editingPhotoTitle.trim(),
          description: editingPhotoDesc.trim(),
          imageUrl: editingPhotoBase64,
          groupTitle: editingPhotoGroup.trim() || "General Gallery"
        };
      }
      return p;
    });

    const updatedHomepage: HomepageContent = {
      ...homepage,
      previousPhotos: updatedPhotos
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
        handleCancelEditPhoto();
        setSuccess("Gallery photo updated successfully!");
      } else {
        setError(data.error || "Failed to update gallery photo.");
      }
    } catch (err) {
      setError("Network error. Could not update gallery photo.");
    }
  };

  // Rename an entire gallery group (all photos in it get updated to the new name)
  const handleRenameGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!homepage || !editingGroupName || !newGroupNameInput.trim()) return;

    setError("");
    setSuccess("");

    const oldName = editingGroupName.trim();
    const newName = newGroupNameInput.trim();

    const updatedPhotos = (homepage.previousPhotos || []).map((p) => {
      const pGroup = (p.groupTitle || "General Gallery").trim();
      if (pGroup === oldName) {
        return {
          ...p,
          groupTitle: newName
        };
      }
      return p;
    });

    const updatedHomepage: HomepageContent = {
      ...homepage,
      previousPhotos: updatedPhotos
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
        setEditingGroupName(null);
        setNewGroupNameInput("");
        setSuccess(`Gallery group renamed from "${oldName}" to "${newName}" successfully!`);
      } else {
        setError(data.error || "Failed to rename gallery group.");
      }
    } catch (err) {
      setError("Network error. Could not rename gallery group.");
    }
  };

  // Delete an entire gallery group and all its photos
  const handleDeleteGroup = (groupName: string) => {
    setDeleteConfirm({
      isOpen: true,
      title: "Delete Entire Gallery Group?",
      message: `Are you sure you want to delete the gallery group "${groupName}" and ALL of its photos? This action cannot be undone.`,
      onConfirm: async () => {
        if (!homepage) return;
        setError("");
        setSuccess("");

        const updatedPhotos = (homepage.previousPhotos || []).filter((p) => {
          const pGroup = (p.groupTitle || "General Gallery").trim();
          return pGroup !== groupName.trim();
        });

        const updatedHomepage: HomepageContent = {
          ...homepage,
          previousPhotos: updatedPhotos
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
            setSuccess(`Gallery group "${groupName}" and all of its photos were removed successfully.`);
          } else {
            setError(data.error || "Failed to delete gallery group.");
          }
        } catch (err) {
          setError("Network error. Could not delete gallery group.");
        } finally {
          setDeleteConfirm(null);
        }
      }
    });
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

  // Save Guidelines and Rules custom page directly
  const handleSaveGuidelines = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guidelinesTitle.trim()) {
      setError("Guidelines title is required.");
      return;
    }

    setError("");
    setSuccess("");

    const payload = {
      id: guidelinesPageId || undefined,
      title: guidelinesTitle.trim(),
      slug: "guidelines",
      content: guidelinesContent,
      published: guidelinesPublished
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
          const updatedPages: CustomPage[] = await pagesRes.json();
          setPagesList(updatedPages);
          const guidelinesPage = updatedPages.find(p => p.slug === "guidelines");
          if (guidelinesPage) {
            setGuidelinesPageId(guidelinesPage.id);
            setGuidelinesTitle(guidelinesPage.title);
            setGuidelinesContent(guidelinesPage.content);
            setGuidelinesPublished(guidelinesPage.published);
          }
        }
        setSuccess("Guidelines & Rules updated successfully!");
      } else {
        setError(data.error || "Failed to update Guidelines & Rules.");
      }
    } catch (err) {
      setError("Network error. Could not save guidelines.");
    }
  };

  // Helper to insert HTML markup or tags at the textarea cursor
  const insertHtmlAtCursor = (before: string, after: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);
    const replacement = before + selected + after;

    setGuidelinesContent(
      text.substring(0, start) + replacement + text.substring(end)
    );

    // Maintain focus and reset selection bounds
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selected.length);
    }, 10);
  };

  // Helper to insert whole pre-designed layout blocks/templates
  const insertHtmlTemplate = (templateName: string) => {
    let template = "";

    switch (templateName) {
      case "alert-yellow":
        template = `\n<div class="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-2xl my-4 shadow-xs">\n  <h4 class="text-xs font-bold text-amber-800 uppercase tracking-wide">⚠️ Key Notice / Disclaimer</h4>\n  <p class="text-xs text-amber-700 mt-1 leading-relaxed">Please ensure all team registrations contain valid contact details. Registrations with incorrect data will be disqualified.</p>\n</div>\n`;
        break;
      case "alert-green":
        template = `\n<div class="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-r-2xl my-4 shadow-xs">\n  <h4 class="text-xs font-bold text-emerald-800 uppercase tracking-wide">📅 Important Timeline & Date</h4>\n  <p class="text-xs text-emerald-700 mt-1 leading-relaxed">Internal evaluation round begins on August 10th. Make sure your submissions are uploaded before 6:00 PM IST.</p>\n</div>\n`;
        break;
      case "alert-blue":
        template = `\n<div class="bg-indigo-50 border-l-4 border-indigo-500 p-4 rounded-r-2xl my-4 shadow-xs">\n  <h4 class="text-xs font-bold text-indigo-800 uppercase tracking-wide">💡 Useful Hackathon Tip</h4>\n  <p class="text-xs text-indigo-700 mt-1 leading-relaxed">Focus on solving high-impact problem statements with clean proof-of-concept prototypes to score maximum points.</p>\n</div>\n`;
        break;
      case "cards":
        template = `\n<div class="grid grid-cols-1 md:grid-cols-3 gap-6 my-6">\n  <div class="border border-slate-100 bg-slate-50/50 rounded-2xl p-4 shadow-xs hover:border-indigo-200 transition-colors">\n    <h3 class="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">Step 1: Idea Pitching</h3>\n    <p class="text-xs text-slate-500 leading-relaxed">Form a team of 6 students with at least 1 female member and submit your presentation abstract.</p>\n  </div>\n  <div class="border border-slate-100 bg-slate-50/50 rounded-2xl p-4 shadow-xs hover:border-indigo-200 transition-colors">\n    <h3 class="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">Step 2: Prototyping</h3>\n    <p class="text-xs text-slate-500 leading-relaxed">Develop a minimal working solution during the 24-hour internal development hackathon.</p>\n  </div>\n  <div class="border border-slate-100 bg-slate-50/50 rounded-2xl p-4 shadow-xs hover:border-indigo-200 transition-colors">\n    <h3 class="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">Step 3: Presentation</h3>\n    <p class="text-xs text-slate-500 leading-relaxed">Demonstrate your working software to the vetting panel of external experts and industrial spocs.</p>\n  </div>\n</div>\n`;
        break;
      case "key-dates":
        template = `\n<div class="bg-slate-50 border border-slate-200 rounded-3xl p-5 my-6 space-y-3 shadow-xs">\n  <h3 class="text-xs font-black text-slate-800 uppercase tracking-widest border-b border-slate-200 pb-2">Important Deadlines & Schedule</h3>\n  <div class="space-y-2.5">\n    <div class="flex justify-between text-xs font-semibold">\n      <span class="text-slate-600">Team Registration Closes</span>\n      <span class="text-indigo-600 font-bold">Aug 05, 2026</span>\n    </div>\n    <div class="flex justify-between text-xs font-semibold border-t border-slate-100 pt-2">\n      <span class="text-slate-600">Abstract Submission Deadline</span>\n      <span class="text-indigo-600 font-bold">Aug 08, 2026</span>\n    </div>\n    <div class="flex justify-between text-xs font-semibold border-t border-slate-100 pt-2">\n      <span class="text-slate-600">Internal Hackathon Round</span>\n      <span class="text-emerald-600 font-bold">Aug 10-11, 2026</span>\n    </div>\n  </div>\n</div>\n`;
        break;
      case "full-sample":
        template = `\n<div class="space-y-6">\n  <h2 class="text-lg sm:text-xl font-extrabold mt-6 mb-3 border-b pb-1.5 font-display text-indigo-700 border-indigo-100">Smart India Hackathon - SVEC Internal Round Guidelines</h2>\n  <p class="text-sm text-slate-600 leading-relaxed mb-4">Welcome to the SVEC Internal selections portal. This portal manages registrations, ideas tracking, and announcements for the Sri Vasavi Engineering College Hackathon Center.</p>\n  \n  <div class="bg-indigo-50/30 border border-indigo-100 rounded-3xl p-5 my-6 flex flex-col md:flex-row gap-6 items-center">\n    <img src="https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=800&q=80" alt="Hackathon Event Banner" class="w-full md:w-1/3 rounded-2xl border shadow-sm h-32 object-cover" />\n    <div class="flex-1 space-y-2">\n      <h3 class="text-xs font-bold text-slate-800 uppercase tracking-widest">General Rules of Formations</h3>\n      <p class="text-xs text-slate-500 leading-relaxed">Each team must comprise exactly 6 student members. It is strictly mandatory to include at least 1 female team member in each roster to satisfy SIH selection parameters.</p>\n    </div>\n  </div>\n\n  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">\n    <div class="border border-slate-200 rounded-2xl p-4 bg-white shadow-xs">\n      <h4 class="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">Team Eligibility</h4>\n      <ul class="list-disc pl-5 space-y-1.5 text-xs text-slate-500">\n        <li>Open to B.Tech, M.Tech, MCA and Diploma students.</li>\n        <li>A student can be a member of only ONE team.</li>\n        <li>Multiple departments can collaborate in a single team.</li>\n      </ul>\n    </div>\n    <div class="border border-slate-200 rounded-2xl p-4 bg-white shadow-xs">\n      <h4 class="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">Vetting Process</h4>\n      <ul class="list-disc pl-5 space-y-1.5 text-xs text-slate-500">\n        <li>Abstract submissions will be screened initially.</li>\n        <li>Shortlisted ideas must present active prototypes.</li>\n        <li>Top selected teams proceed to national nominations.</li>\n      </ul>\n    </div>\n  </div>\n</div>\n`;
        break;
      default:
        break;
    }

    if (!template) return;
    insertHtmlAtCursor(template);
  };

  const handleInsertImageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!insertImageUrl.trim()) return;

    const imgTag = `<img src="${insertImageUrl.trim()}" alt="${insertImageAlt.trim() || 'Hackathon Image'}" class="${insertImageSize} ${insertImageRounded} ${insertImageShadow} h-auto object-cover my-5 mx-auto block max-w-full" referrerPolicy="no-referrer" />\n`;
    insertHtmlAtCursor(imgTag);
    setInsertImageUrl("");
    setShowImageModal(false);
  };

  const handleInsertLinkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!insertLinkUrl.trim()) return;

    const linkText = insertLinkText.trim() || insertLinkUrl.trim();
    const linkTag = `<a href="${insertLinkUrl.trim()}" target="_blank" rel="noopener noreferrer" class="text-indigo-600 hover:text-indigo-800 font-bold underline transition-colors inline-flex items-center gap-1">${linkText} <span class="text-[10px]">↗</span></a>`;
    insertHtmlAtCursor(linkTag);
    setInsertLinkUrl("");
    setInsertLinkText("");
    setShowLinkModal(false);
  };

  // Delete Custom Page
  const handleDeletePage = (id: string) => {
    setDeleteConfirm({
      isOpen: true,
      title: "Delete Custom Page",
      message: "Are you sure you want to delete this custom page? Any menu item pointing to this page slug will need to be reconfigured/removed.",
      onConfirm: async () => {
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
        } finally {
          setDeleteConfirm(null);
        }
      }
    });
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

  // Save Footer Credits config
  const handleSaveCreditsConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSavingCredits(true);

    const mergedSettings = {
      ...(settingsData || {}),
      creditsTitle: creditsTitle.trim() || "Department of CSE",
      creditsContent: creditsContent,
      creditsEnabled: creditsEnabled
    };

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Passcode": passcode
        },
        body: JSON.stringify(mergedSettings)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSettingsData(data.settings);
        setSuccess("Footer Credits Page configuration updated and published successfully!");
      } else {
        setError(data.error || "Failed to update Footer Credits configuration.");
      }
    } catch (err) {
      setError("Network error. Could not save Footer Credits configuration.");
    } finally {
      setSavingCredits(false);
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
          onClick={() => { setActiveSubTab("guidelines"); setError(""); setSuccess(""); }}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
            activeSubTab === "guidelines" ? "bg-indigo-50 text-indigo-700" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Shield className="w-4 h-4" />
          Guidelines & Rules
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
          Multiple Galleries & Albums
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
        <button
          onClick={() => { setActiveSubTab("credits"); setError(""); setSuccess(""); }}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
            activeSubTab === "credits" ? "bg-indigo-50 text-indigo-700" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-500" />
          Footer Credits
        </button>
      </div>

      {/* SUB-TAB CONTENTS */}

      {/* GUIDELINES & RULES HOME BODY CONTENT HTML DESIGNER */}
      {activeSubTab === "guidelines" && (
        <div className="space-y-6">
          {/* Header block with statistics and short description */}
          <div className="bg-gradient-to-r from-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-indigo-500/20 border border-indigo-400/30 rounded-full text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                <Sparkles className="w-3 h-3 text-indigo-300" />
                <span>Rich Layout Designer</span>
              </div>
              <h2 className="text-lg font-black font-display tracking-tight flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-400" />
                Home Page HTML body customizer
              </h2>
              <p className="text-xs text-slate-300">
                Design and format your Internal Hackathon Guidelines, add images, links, highlight notices and build custom visual blocks.
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  const confirmOver = window.confirm("Loading a sample template will replace all current contents in your guidelines designer. Do you wish to continue?");
                  if (confirmOver) {
                    setGuidelinesContent(`
<div class="space-y-6">
  <h2 class="text-xl font-bold text-indigo-700 mt-5 mb-2.5 font-display border-b pb-1">Smart India Hackathon - SVEC Selection Round</h2>
  <p class="text-sm text-slate-600 leading-relaxed mb-4">Welcome to the SVEC Internal selections portal. This portal manages registrations, ideas tracking, and announcements for the Sri Vasavi Engineering College Hackathon Center.</p>
  
  <div class="bg-indigo-50 border-l-4 border-indigo-500 p-4 rounded-r-2xl my-5 shadow-xs flex gap-3">
    <span class="text-xl shrink-0">💡</span>
    <div>
      <h4 class="text-xs font-bold text-indigo-800 uppercase tracking-wider">SVEC Innovation Mentoring Tip</h4>
      <p class="text-xs text-indigo-700 mt-1 leading-relaxed">Prioritize solving problem statements listed directly by central ministries. Having a robust hardware proof-of-concept or live software UI prototype guarantees maximum evaluation scores.</p>
    </div>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-2 gap-6 my-5">
    <div class="border border-slate-200 rounded-2xl p-4 bg-white shadow-xs">
      <h4 class="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">Team Eligibility</h4>
      <ul class="list-disc pl-5 space-y-1.5 text-xs text-slate-500">
        <li>Open to B.Tech, M.Tech, MCA and Diploma students.</li>
        <li>A student can be a member of only ONE team.</li>
        <li>Multiple departments can collaborate in a single team.</li>
      </ul>
    </div>
    <div class="border border-slate-200 rounded-2xl p-4 bg-white shadow-xs">
      <h4 class="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">Vetting Process</h4>
      <ul class="list-disc pl-5 space-y-1.5 text-xs text-slate-500">
        <li>Abstract submissions will be screened initially.</li>
        <li>Shortlisted ideas must present active prototypes.</li>
        <li>Top selected teams proceed to national nominations.</li>
      </ul>
    </div>
  </div>
</div>
                    `);
                  }
                }}
                className="px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/40 text-indigo-200 text-[11px] font-bold rounded-xl cursor-pointer transition-all flex items-center gap-1"
                title="Loads a highly styled sample template to get you started immediately"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                Load Sample Template
              </button>
            </div>
          </div>

          {/* DUAL WORKSPACE LAYOUT */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT WORKSPACE: THE DESIGN EDITOR (8 cols) */}
            <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                  <Code className="w-4 h-4 text-indigo-500" />
                  HTML Content & Design Tools
                </h3>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="guidelinesPublished"
                    className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                    checked={guidelinesPublished}
                    onChange={(e) => setGuidelinesPublished(e.target.checked)}
                  />
                  <label htmlFor="guidelinesPublished" className="text-xs font-bold text-slate-600 cursor-pointer select-none">
                    Visible on main page
                  </label>
                </div>
              </div>

              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Landing Section Title *</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500"
                    value={guidelinesTitle}
                    onChange={(e) => setGuidelinesTitle(e.target.value)}
                    placeholder="e.g. Guidelines, Selection Criteria & Rules"
                  />
                </div>

                {/* WYSIWYG Editor */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">Guidelines Content Editor *</label>
                  <HtmlRichEditor
                    value={guidelinesContent}
                    onChange={setGuidelinesContent}
                    title="Guidelines HTML Canvas"
                    placeholder="Describe selection processes, evaluation parameters, continuous coding sessions, and roster configurations here..."
                  />
                </div>
              </div>

              {/* Action save bar */}
              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveGuidelines}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm transition-all hover:scale-[1.01]"
                >
                  <Save className="w-4 h-4" />
                  Save Landing Content
                </button>
              </div>
            </div>

            {/* RIGHT WORKSPACE: DYNAMIC REAL-TIME CANVAS PREVIEW (4 cols) */}
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-slate-100 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-emerald-500" />
                    Live Preview
                  </h3>
                  {/* Theme Switcher Toggle */}
                  <div className="flex items-center bg-slate-200 p-0.5 rounded-lg border border-slate-300">
                    <button
                      type="button"
                      onClick={() => setEditorPreviewTheme("light")}
                      className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                        editorPreviewTheme === "light"
                          ? "bg-white text-slate-800 shadow-xs"
                          : "text-slate-500"
                      }`}
                    >
                      Light
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditorPreviewTheme("dark")}
                      className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                        editorPreviewTheme === "dark"
                          ? "bg-slate-900 text-white shadow-xs"
                          : "text-slate-500"
                      }`}
                    >
                      Dark
                    </button>
                  </div>
                </div>

                {/* THE PREVIEW CANVAS CONTAINER */}
                <div 
                  className={`border rounded-xl p-4 min-h-[300px] max-h-[500px] overflow-y-auto transition-all duration-300 ${
                    editorPreviewTheme === "dark" 
                      ? "bg-slate-950 border-slate-800 text-slate-200" 
                      : "bg-white border-slate-200 text-slate-700"
                  }`}
                >
                  {/* Custom Page Header Preview */}
                  <div className={`flex items-center gap-2 pb-2 border-b mb-3 ${
                    editorPreviewTheme === "dark" ? "border-slate-850" : "border-slate-100"
                  }`}>
                    <div className={`p-1 rounded-lg text-xs ${
                      editorPreviewTheme === "dark" ? "bg-slate-900 text-emerald-400" : "bg-emerald-50 text-emerald-600"
                    }`}>
                      <Shield className="w-4 h-4" />
                    </div>
                    <h2 className="text-xs font-bold">
                      {guidelinesTitle || "Guidelines & Rules"}
                    </h2>
                  </div>

                  {/* Render guidelines HTML content */}
                  {guidelinesContent ? (
                    <div 
                      dangerouslySetInnerHTML={{ __html: guidelinesContent }}
                      className="prose prose-sm max-w-none break-words leading-relaxed text-xs space-y-3"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
                      <Code className="w-6 h-6 opacity-30" />
                      <p className="text-center text-[10px]">No body content designed yet.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Instructions and help card */}
              <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 text-xs text-indigo-950 space-y-1.5">
                <h4 className="font-bold flex items-center gap-1 text-indigo-900">
                  <HelpCircle className="w-4 h-4 text-indigo-600" />
                  Visual Editor Tips
                </h4>
                <ul className="list-disc pl-4 space-y-1 text-[11px] text-indigo-900/80 leading-relaxed">
                  <li>Use formatting buttons to apply colors, highlights, or block elements instantly.</li>
                  <li>Drag and drop any local image file or click <strong>Image</strong> to import local graphics or hotlinks.</li>
                  <li>All styles are optimized via Tailwind CSS to guarantee eye-safe layout.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

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
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <FolderPlus className="w-4 h-4 text-indigo-500" />
                Add Photos to Multiple Galleries & Albums
              </h2>
              {pendingPhotos.length > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600">
                  {pendingPhotos.length} Draft Photo(s) Selected
                </span>
              )}
            </div>

            {/* Selection Step (Always visible to let users add more files) */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                Select Photo(s) from your Device
              </label>
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="block w-full text-xs font-semibold text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100 cursor-pointer"
                  onChange={handleMultipleImagesUpload}
                />
                {pendingPhotos.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setPendingPhotos([])}
                    className="px-3.5 py-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-all cursor-pointer border border-transparent hover:border-red-150"
                  >
                    Clear Selected
                  </button>
                )}
              </div>
              <p className="text-[10px] text-slate-400">
                Tip: You can organize your photos into multiple distinct galleries. Each unique group name creates a physical cover-album stack on the home page!
              </p>
            </div>

            {/* Batch Form Queue */}
            {pendingPhotos.length > 0 && (
              <div className="border-t pt-4 border-slate-100 space-y-4">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Configure Upload Group Metadata
                </h3>

                {/* Album Group Selector for Batch */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Choose Gallery Group/Album *
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 bg-white text-slate-800"
                      value={isCreatingNewGroup ? "NEW_GROUP" : selectedBatchGroup}
                      onChange={(e) => {
                        if (e.target.value === "NEW_GROUP") {
                          setIsCreatingNewGroup(true);
                        } else {
                          setIsCreatingNewGroup(false);
                          setSelectedBatchGroup(e.target.value);
                        }
                      }}
                    >
                      {existingGroups.map((group) => (
                        <option key={group} value={group}>
                          {group}
                        </option>
                      ))}
                      <option value="NEW_GROUP" className="text-indigo-600 font-bold">
                        + Create New Group/Album...
                      </option>
                    </select>
                  </div>

                  {isCreatingNewGroup && (
                    <div className="animate-fade-in">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        New Group/Album Name *
                      </label>
                      <input
                        type="text"
                        required
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 bg-white text-slate-800"
                        value={customNewGroupName}
                        onChange={(e) => setCustomNewGroupName(e.target.value)}
                        placeholder="e.g. SIH Grand Finale 2026"
                      />
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[380px] overflow-y-auto p-1 border rounded-xl border-slate-100 bg-slate-50/35">
                  {pendingPhotos.map((photo, index) => (
                    <div 
                      key={photo.id}
                      className="bg-white p-3.5 rounded-xl border border-slate-150 shadow-2xs flex gap-3 items-start relative hover:border-indigo-200 transition-colors"
                    >
                      <div className="relative w-20 h-20 shrink-0 bg-slate-100 rounded-lg overflow-hidden border">
                        <img 
                          src={photo.base64} 
                          alt="Thumbnail preview" 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                        />
                        <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-slate-900/80 text-white text-[8px] font-bold rounded">
                          #{index + 1}
                        </span>
                      </div>

                      <div className="flex-1 space-y-2 text-left">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Photo Title *</label>
                          <input
                            type="text"
                            required
                            className="w-full px-2 py-1 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-indigo-500"
                            value={photo.title}
                            onChange={(e) => {
                              const updated = [...pendingPhotos];
                              updated[index].title = e.target.value;
                              setPendingPhotos(updated);
                            }}
                            placeholder="Photo title"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Description (Optional)</label>
                          <input
                            type="text"
                            className="w-full px-2 py-1 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-indigo-500"
                            value={photo.description}
                            onChange={(e) => {
                              const updated = [...pendingPhotos];
                              updated[index].description = e.target.value;
                              setPendingPhotos(updated);
                            }}
                            placeholder="Description"
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setPendingPhotos(prev => prev.filter(p => p.id !== photo.id))}
                        className="absolute top-2 right-2 p-1 bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-full cursor-pointer transition-colors"
                        title="Remove photo from batch"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleAddBatchPhotos}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer shadow-sm transition-all"
                  >
                    <Save className="w-4 h-4" />
                    Upload & Add {pendingPhotos.length} Photo(s) to Gallery
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* List photos */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs text-left">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">
              Current Gallery Groups & Photos ({homepage.previousPhotos?.length || 0} photos in total)
            </h2>

            {homepage.previousPhotos && homepage.previousPhotos.length > 0 ? (
              <div className="space-y-8">
                {/* Group photos by group name */}
                {(Object.entries(
                  homepage.previousPhotos.reduce((acc, p) => {
                    const g = (p.groupTitle || "General Gallery").trim();
                    if (!acc[g]) acc[g] = [];
                    acc[g].push(p);
                    return acc;
                  }, {} as Record<string, PreviousPhoto[]>)
                ) as [string, PreviousPhoto[]][]).map(([groupName, photos]) => (
                  <div key={groupName} className="border border-slate-150 rounded-2xl overflow-hidden bg-slate-50/20 shadow-2xs">
                    {/* Group Folder Header */}
                    <div className="bg-slate-100/80 px-5 py-3.5 border-b border-slate-150 flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Folder className="w-4.5 h-4.5 text-indigo-500 fill-indigo-100" />
                        <h3 className="font-extrabold text-sm text-slate-800 font-display">
                          {groupName}
                        </h3>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
                          {photos.length} Photo(s)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingGroupName(groupName);
                            setNewGroupNameInput(groupName);
                          }}
                          className="text-[10px] text-indigo-600 hover:bg-indigo-50/80 px-2 py-1.5 rounded-lg flex items-center gap-1 font-bold cursor-pointer transition-all border border-slate-200/60 bg-white shadow-3xs"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Rename Album</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteGroup(groupName)}
                          className="text-[10px] text-red-600 hover:bg-red-50/80 px-2 py-1.5 rounded-lg flex items-center gap-1 font-bold cursor-pointer transition-all border border-red-100 bg-white shadow-3xs"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete Album</span>
                        </button>
                      </div>
                    </div>

                    {/* Photos in this group */}
                    <div className="p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 bg-white">
                      {photos.map((p) => (
                        <div
                          key={p.id}
                          className="border border-slate-200 rounded-xl overflow-hidden shadow-3xs hover:border-slate-300 hover:shadow-2xs transition-all flex flex-col justify-between bg-slate-50/10"
                        >
                          <div className="h-32 bg-slate-100 flex items-center justify-center relative">
                            {p.imageUrl ? (
                              <img src={p.imageUrl} alt={p.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <ImageIcon className="w-8 h-8 text-slate-300" />
                            )}
                          </div>
                          <div className="p-3 bg-white flex-1 flex flex-col justify-between gap-2 text-left">
                            <div>
                              <h4 className="font-bold text-slate-800 text-xs truncate">{p.title}</h4>
                              {p.description && <p className="text-[10px] text-slate-500 leading-normal line-clamp-2 mt-0.5">{p.description}</p>}
                            </div>
                            <div className="pt-2 border-t border-slate-100 flex justify-between items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleStartEditPhoto(p)}
                                className="text-[10px] text-indigo-600 hover:bg-indigo-50 px-2 py-1.5 rounded-lg flex items-center gap-1 font-bold cursor-pointer transition-all border border-transparent hover:border-indigo-100"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                <span>Edit Details</span>
                              </button>
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
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Page body content *
              </label>
              <HtmlRichEditor
                value={pageContent}
                onChange={setPageContent}
                title="Page HTML Designer"
                placeholder="Write, design and fully format your custom page body content here..."
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

      {/* FOOTER CREDITS TAB */}
      {activeSubTab === "credits" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="space-y-1">
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  Customize Footer Credits Page
                </h2>
                <p className="text-xs text-slate-500">
                  Enable or disable the credits link, change the link title shown in the landing page footer, and edit the credits page as a fully customizable HTML page.
                </p>
              </div>

              <div className="flex items-center gap-3 bg-slate-50 border border-slate-150 px-3.5 py-2 rounded-xl shrink-0">
                <span className="text-xs font-bold text-slate-600">Enable Credits Page Link</span>
                <button
                  type="button"
                  onClick={() => setCreditsEnabled(!creditsEnabled)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    creditsEnabled ? "bg-indigo-600" : "bg-slate-200"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                      creditsEnabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>

            {creditsEnabled ? (
              <form onSubmit={handleSaveCreditsConfig} className="space-y-6">
                <div className="max-w-xl">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Credits Link Title (Displays in Footer)
                  </label>
                  <input
                    type="text"
                    required
                    value={creditsTitle}
                    onChange={(e) => setCreditsTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 text-slate-800 bg-white"
                    placeholder="e.g. Department of CSE"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    This text serves as the anchor link in the footer (e.g., "Maintained & Developed by Department of CSE").
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Credits Page HTML Content
                  </label>
                  <p className="text-[11px] text-slate-500 leading-relaxed mb-2">
                    Design your credits page with custom HTML tags, styles, layouts, or links. Use the visual editor below to insert layouts, alert banners, cards, or raw code structures.
                  </p>
                  
                  <HtmlRichEditor
                    value={creditsContent}
                    onChange={(val) => setCreditsContent(val)}
                    placeholder="Enter credits page content in rich HTML format..."
                    title="Credits Page Rich Content Designer"
                  />
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-100 justify-end">
                  <button
                    type="submit"
                    disabled={savingCredits}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md transition-colors disabled:opacity-50"
                  >
                    {savingCredits ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block"></span>
                        Saving Credits...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Save & Publish Credits Page
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center py-10 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <Sparkles className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <h3 className="text-xs font-bold text-slate-700">Credits Link is Disabled</h3>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto mt-1 leading-relaxed">
                  The credits anchor link in the footer is currently hidden. Toggle the switch above to enable and design the Credits Page.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

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

      {/* EDIT PHOTO MODAL POPUP */}
      <AnimatePresence>
        {editingPhotoId !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={handleCancelEditPhoto}
              className="absolute inset-0 bg-slate-900 opacity-50"
            ></motion.div>

            {/* Modal container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden relative z-10 p-6 text-slate-800"
            >
              <div className="flex items-center justify-between border-b pb-3 border-slate-150 mb-4">
                <h3 className="font-bold font-display text-base text-slate-900 flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-indigo-500" />
                  Edit Gallery Photo Details
                </h3>
                <button
                  type="button"
                  onClick={handleCancelEditPhoto}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleUpdatePhoto} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Photo Title *</label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 text-slate-800 bg-white"
                    value={editingPhotoTitle}
                    onChange={(e) => setEditingPhotoTitle(e.target.value)}
                    placeholder="e.g. Winner celebration"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Description (Optional)</label>
                  <textarea
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 resize-none text-slate-800 bg-white"
                    value={editingPhotoDesc}
                    onChange={(e) => setEditingPhotoDesc(e.target.value)}
                    placeholder="e.g. Cash prize of 1,00,000 INR awarded to Team Innovators."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Gallery Group/Album</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 text-slate-800 bg-white"
                    value={editingPhotoGroup}
                    onChange={(e) => setEditingPhotoGroup(e.target.value)}
                    placeholder="e.g. General Gallery"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Enter the Group/Album name to organize this photo. Existing group names are: {existingGroups.join(", ")}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Replace Image (Optional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    className="w-full text-xs font-semibold text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100 cursor-pointer"
                    onChange={(e) => handleImageUpload(e, setEditingPhotoBase64)}
                  />
                  {editingPhotoBase64 && (
                    <div className="mt-3">
                      <span className="text-[10px] text-slate-400 block mb-1 font-bold">Image Preview:</span>
                      <img 
                        src={editingPhotoBase64} 
                        alt="Edit Gallery Preview" 
                        className="h-24 max-w-[180px] object-cover rounded-xl border p-0.5" 
                        referrerPolicy="no-referrer" 
                      />
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-2 justify-end border-t border-slate-100 mt-5">
                  <button
                    type="button"
                    onClick={handleCancelEditPhoto}
                    className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-xl border border-slate-200 cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md cursor-pointer flex items-center gap-1.5 transition-colors"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* RENAME ALBUM GROUP MODAL POPUP */}
      <AnimatePresence>
        {editingGroupName !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingGroupName(null)}
              className="absolute inset-0 bg-slate-900 opacity-50"
            ></motion.div>

            {/* Modal container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden relative z-10 p-6 text-slate-800 text-left"
            >
              <div className="flex items-center justify-between border-b pb-3 border-slate-150 mb-4">
                <h3 className="font-bold font-display text-base text-slate-900 flex items-center gap-2">
                  <Folder className="w-4.5 h-4.5 text-indigo-500 fill-indigo-100" />
                  Rename Gallery Album/Group
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingGroupName(null)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleRenameGroup} className="space-y-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wide">
                    Current Name
                  </span>
                  <p className="text-xs font-bold text-slate-700 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 mt-1">
                    {editingGroupName}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    New Album/Group Name *
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 text-slate-800 bg-white"
                    value={newGroupNameInput}
                    onChange={(e) => setNewGroupNameInput(e.target.value)}
                    placeholder="e.g. SIH Hackathon Grand Finale 2026"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Note: This will rename the group for all {
                      homepage.previousPhotos?.filter(
                        (p) => (p.groupTitle || "General Gallery").trim() === editingGroupName.trim()
                      ).length || 0
                    } photos in this album.
                  </p>
                </div>

                <div className="flex gap-3 pt-2 justify-end border-t border-slate-100 mt-5">
                  <button
                    type="button"
                    onClick={() => setEditingGroupName(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-xl border border-slate-200 cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md cursor-pointer flex items-center gap-1.5 transition-colors"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Rename Album
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

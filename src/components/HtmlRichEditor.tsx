import React, { useState, useRef, useEffect } from "react";
import { 
  Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Link as LinkIcon, Image as ImageIcon, Sparkles, FileText, Check, 
  HelpCircle, Code, Eye, Type, Palette, Layout, Trash2, ArrowRight, Table, Undo, Redo,
  AlertCircle, Heading1, Heading2, Heading3, ChevronDown, Upload, Maximize2, Minimize2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { getErrorMessage } from "../utils/error";

interface HtmlRichEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  title?: string;
}

const PRESET_COLORS = [
  { name: "Default", class: "text-slate-700", hex: "#334155" },
  { name: "Indigo", class: "text-indigo-600", hex: "#4f46e5" },
  { name: "Emerald", class: "text-emerald-600", hex: "#059669" },
  { name: "Amber", class: "text-amber-600", hex: "#d97706" },
  { name: "Rose", class: "text-rose-600", hex: "#e11d48" },
  { name: "Violet", class: "text-violet-600", hex: "#7c3aed" },
  { name: "Sky", class: "text-sky-600", hex: "#0284c7" }
];

const PRESET_BG_COLORS = [
  { name: "Clear", hex: "transparent" },
  { name: "Yellow Highlight", hex: "#fef08a" },
  { name: "Green Highlight", hex: "#bbf7d0" },
  { name: "Blue Highlight", hex: "#bfdbfe" },
  { name: "Purple Highlight", hex: "#e9d5ff" },
  { name: "Red Highlight", hex: "#fecaca" }
];

export default function HtmlRichEditor({ value, onChange, placeholder = "Design your custom page body here...", title = "Rich Editor" }: HtmlRichEditorProps) {
  const [editorMode, setEditorMode] = useState<"visual" | "html">("visual");
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Modals state
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imageAlt, setImageAlt] = useState("Hackathon Event Banner");
  const [imageWidth, setImageWidth] = useState("max-w-xl");
  const [imageRounded, setImageRounded] = useState("rounded-2xl");
  const [imageShadow, setImageShadow] = useState("shadow-md");
  const [uploadingImage, setUploadingImage] = useState(false);

  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");

  const [showColorDropdown, setShowColorDropdown] = useState(false);
  const [showBgDropdown, setShowBgDropdown] = useState(false);

  // Sync value with contentEditable without losing focus/cursor position
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || "";
    }
  }, [value, editorMode]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    // Optional: clean up paste if needed, but standard paste is fine
  };

  // Helper to execute document commands
  const executeCommand = (command: string, argument: string = "") => {
    document.execCommand(command, false, argument);
    handleInput();
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  // Formatting helpers
  const applyHeading = (tag: string) => {
    executeCommand("formatBlock", `<${tag}>`);
    
    // Add nice default utility classes to headings if needed, or rely on prose
    if (editorRef.current) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        let parent = selection.getRangeAt(0).startContainer.parentElement;
        while (parent && parent !== editorRef.current) {
          if (parent.tagName.toLowerCase() === tag.toLowerCase()) {
            if (tag === "h1") parent.className = "text-3xl font-black text-slate-900 mt-6 mb-4 font-display";
            if (tag === "h2") parent.className = "text-xl font-bold text-indigo-700 mt-5 mb-2.5 font-display border-b pb-1";
            if (tag === "h3") parent.className = "text-base font-bold text-slate-800 mt-4 mb-2";
            break;
          }
          parent = parent.parentElement;
        }
      }
    }
    handleInput();
  };

  // Dropdown options handler
  const handleTextColor = (hex: string) => {
    executeCommand("foreColor", hex);
    setShowColorDropdown(false);
  };

  const handleBgColor = (hex: string) => {
    executeCommand("hiliteColor", hex);
    setShowBgDropdown(false);
  };

  // Multipart Image Uploader
  const handleLocalImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Image size should be less than 5MB.");
      return;
    }

    setUploadingImage(true);
    // Pre-read Base64 as immediate visual fallback so embedding always works
    const reader = new FileReader();
    reader.onload = (re) => {
      if (re.target?.result) {
        setImageUrl(re.target.result as string);
      }
    };
    reader.readAsDataURL(file);

    try {
      const adminToken = sessionStorage.getItem("svec_sih_admin_token") || localStorage.getItem("svec_sih_admin_token") || "";
      const headers: Record<string, string> = {};
      if (adminToken) {
        headers["Authorization"] = adminToken.startsWith("Bearer ") ? adminToken : `Bearer ${adminToken}`;
        headers["X-Admin-Passcode"] = adminToken;
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", "images");

      const res = await fetch("/api/upload", {
        method: "POST",
        headers,
        body: formData
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setImageUrl(data.url);
      }
    } catch (err) {
      console.warn("Editor image upload notice:", err);
    } finally {
      setUploadingImage(false);
    }
  };

  // Insert Image HTML tag at cursor
  const handleInsertImageSubmit = (e?: React.FormEvent | React.MouseEvent | React.KeyboardEvent) => {
    if (e) e.preventDefault();
    if (!imageUrl.trim()) return;

    // Use specific layout styles
    const imgHtml = `<img src="${imageUrl.trim()}" alt="${imageAlt.trim() || 'Hackathon Image'}" class="${imageWidth} ${imageRounded} ${imageShadow} h-auto object-cover my-5 mx-auto block max-w-full" referrerPolicy="no-referrer" />\n<p class="text-xs text-center text-slate-400 mt-1 italic">${imageAlt.trim()}</p>\n`;
    
    if (editorMode === "visual") {
      executeCommand("insertHTML", imgHtml);
    } else {
      onChange(value + "\n" + imgHtml);
    }

    // Reset state
    setImageUrl("");
    setImageAlt("Hackathon Event Banner");
    setShowImageModal(false);
  };

  // Insert Hyperlink HTML tag
  const handleInsertLinkSubmit = (e?: React.FormEvent | React.MouseEvent | React.KeyboardEvent) => {
    if (e) e.preventDefault();
    if (!linkUrl.trim()) return;

    const textToInsert = linkText.trim() || linkUrl.trim();
    const linkHtml = `<a href="${linkUrl.trim()}" target="_blank" rel="noopener noreferrer" class="text-indigo-600 hover:text-indigo-800 font-bold underline transition-colors inline-flex items-center gap-1">${textToInsert} <span class="text-[10px]">↗</span></a>`;
    
    if (editorMode === "visual") {
      executeCommand("insertHTML", linkHtml);
    } else {
      onChange(value + linkHtml);
    }

    setLinkUrl("");
    setLinkText("");
    setShowLinkModal(false);
  };

  // Insert Custom Styled Layout Blocks
  const insertTemplateBlock = (templateType: string) => {
    let blockHtml = "";

    switch (templateType) {
      case "banner-notice":
        blockHtml = `
<div class="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-2xl my-5 shadow-xs flex gap-3">
  <span class="text-xl shrink-0">⚠️</span>
  <div>
    <h4 class="text-xs font-bold text-amber-800 uppercase tracking-wider">Key Compliance Notice</h4>
    <p class="text-xs text-amber-700 mt-1 leading-relaxed">It is strictly mandatory to form a team of exactly 6 members, including at least 1 female student leader or roster member. Single-gender configurations will be disqualified automatically.</p>
  </div>
</div>
`;
        break;
      case "banner-timeline":
        blockHtml = `
<div class="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-r-2xl my-5 shadow-xs flex gap-3">
  <span class="text-xl shrink-0">📅</span>
  <div>
    <h4 class="text-xs font-bold text-emerald-800 uppercase tracking-wider">Important Deadlines & Roadmap</h4>
    <p class="text-xs text-emerald-700 mt-1 leading-relaxed">Internal presentation slides and abstract drafts must be uploaded within the registration portal before August 12th, 2026. The 24-Hour continuous internal selection round begins on August 15th.</p>
  </div>
</div>
`;
        break;
      case "banner-tip":
        blockHtml = `
<div class="bg-indigo-50 border-l-4 border-indigo-500 p-4 rounded-r-2xl my-5 shadow-xs flex gap-3">
  <span class="text-xl shrink-0">💡</span>
  <div>
    <h4 class="text-xs font-bold text-indigo-800 uppercase tracking-wider">SVEC Innovation Mentoring Tip</h4>
    <p class="text-xs text-indigo-700 mt-1 leading-relaxed">Prioritize solving problem statements listed directly by central ministries. Having a robust hardware proof-of-concept or live software UI prototype guarantees maximum evaluation scores.</p>
  </div>
</div>
`;
        break;
      case "layout-three-cards":
        blockHtml = `
<div class="grid grid-cols-1 md:grid-cols-3 gap-6 my-6">
  <div class="border border-slate-100 bg-slate-50/50 rounded-2xl p-4 shadow-xs hover:border-indigo-200 transition-colors">
    <div class="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs mb-3">1</div>
    <h3 class="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">Stage 1: Idea Draft</h3>
    <p class="text-xs text-slate-500 leading-relaxed">Select a problem statement, form your compliant 6-person roster, and upload a brief 3-slide PDF concept note.</p>
  </div>
  <div class="border border-slate-100 bg-slate-50/50 rounded-2xl p-4 shadow-xs hover:border-indigo-200 transition-colors">
    <div class="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs mb-3">2</div>
    <h3 class="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">Stage 2: Coding Hack</h3>
    <p class="text-xs text-slate-500 leading-relaxed">Participate in the continuous physical internal hackathon. Refine and code your software or build hardware breadboards.</p>
  </div>
  <div class="border border-slate-100 bg-slate-50/50 rounded-2xl p-4 shadow-xs hover:border-indigo-200 transition-colors">
    <div class="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs mb-3">3</div>
    <h3 class="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">Stage 3: Jury Review</h3>
    <p class="text-xs text-slate-500 leading-relaxed">Demonstrate your active solution live to industrial reviewers and college mentors for final nomination selection.</p>
  </div>
</div>
`;
        break;
      case "deadlines-table":
        blockHtml = `
<div class="bg-slate-50 border border-slate-200 rounded-2xl p-5 my-6 space-y-3.5 shadow-xs">
  <h3 class="text-xs font-black text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-2">SVEC SIH Event Calendar 2026</h3>
  <div class="space-y-3">
    <div class="flex items-center justify-between text-xs">
      <span class="text-slate-600 font-medium"> Roster Formations & Nominations Closes</span>
      <span class="text-indigo-600 font-bold bg-indigo-50 px-2.5 py-1 rounded-md">Aug 08, 2026</span>
    </div>
    <div class="flex items-center justify-between text-xs border-t border-slate-150 pt-2.5">
      <span class="text-slate-600 font-medium">📊 Slide Deck Abstract Upload Deadline</span>
      <span class="text-indigo-600 font-bold bg-indigo-50 px-2.5 py-1 rounded-md">Aug 12, 2026</span>
    </div>
    <div class="flex items-center justify-between text-xs border-t border-slate-150 pt-2.5">
      <span class="text-slate-600 font-medium">💻 Continuous 24h Internal Selection Hackathon</span>
      <span class="text-emerald-600 font-bold bg-emerald-50 px-2.5 py-1 rounded-md">Aug 15-16, 2026</span>
    </div>
    <div class="flex items-center justify-between text-xs border-t border-slate-150 pt-2.5">
      <span class="text-slate-600 font-medium">🏆 Nominations Announcement & Portal Upload</span>
      <span class="text-indigo-600 font-bold bg-indigo-50 px-2.5 py-1 rounded-md">Aug 18, 2026</span>
    </div>
  </div>
</div>
`;
        break;
      default:
        break;
    }

    if (editorMode === "visual") {
      executeCommand("insertHTML", blockHtml);
    } else {
      onChange(value + "\n" + blockHtml);
    }
  };

  return (
    <div className={`border border-slate-200 rounded-2xl bg-white flex flex-col overflow-hidden transition-all duration-300 ${isFullscreen ? "fixed inset-4 z-50 shadow-2xl border-indigo-400 bg-white" : "shadow-xs"}`}>
      {/* HEADER CONTROLS */}
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0 select-none">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">{title}</span>
        </div>

        {/* MODE TABS */}
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-200 p-0.5 rounded-lg border border-slate-300">
            <button
              type="button"
              onClick={() => setEditorMode("visual")}
              className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                editorMode === "visual"
                  ? "bg-white text-slate-800 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Eye className="w-3.5 h-3.5 text-indigo-500" />
              <span>Visual Editor</span>
            </button>
            <button
              type="button"
              onClick={() => setEditorMode("html")}
              className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                editorMode === "html"
                  ? "bg-white text-slate-800 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Code className="w-3.5 h-3.5 text-indigo-500" />
              <span>HTML Source Code</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen View"}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* THE FORMATTING TOOLBAR */}
      {editorMode === "visual" && (
        <div className="bg-white border-b border-slate-200 px-4 py-2 flex flex-wrap items-center gap-1 shrink-0 select-none">
          {/* HEADINGS ACCORDION DROP-MENU */}
          <div className="relative inline-block group">
            <button
              type="button"
              className="px-2 py-1.5 hover:bg-slate-100 rounded text-slate-600 text-xs font-bold transition-all cursor-pointer flex items-center gap-1 border border-slate-150"
            >
              <Type className="w-3.5 h-3.5 text-slate-400" />
              <span>Headings</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
            <div className="absolute left-0 mt-1 w-40 bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-50 hidden group-hover:block hover:block">
              <button
                type="button"
                onClick={() => applyHeading("h1")}
                className="w-full text-left px-3.5 py-2 hover:bg-indigo-50 text-slate-800 font-extrabold text-sm block"
              >
                Display Title (H1)
              </button>
              <button
                type="button"
                onClick={() => applyHeading("h2")}
                className="w-full text-left px-3.5 py-2 hover:bg-indigo-50 text-indigo-600 font-bold text-xs block"
              >
                Section Title (H2)
              </button>
              <button
                type="button"
                onClick={() => applyHeading("h3")}
                className="w-full text-left px-3.5 py-2 hover:bg-indigo-50 text-slate-700 font-bold text-[11px] block"
              >
                Mini Title (H3)
              </button>
              <button
                type="button"
                onClick={() => applyHeading("p")}
                className="w-full text-left px-3.5 py-2 hover:bg-indigo-50 text-slate-600 text-xs block border-t"
              >
                Normal Paragraph
              </button>
            </div>
          </div>

          <div className="h-5 w-[1px] bg-slate-200 mx-1" />

          {/* BASIC TEXT FORMATTING */}
          <button
            type="button"
            onClick={() => executeCommand("bold")}
            className="p-1.5 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-800 cursor-pointer"
            title="Bold"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand("italic")}
            className="p-1.5 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-800 cursor-pointer"
            title="Italic"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand("underline")}
            className="p-1.5 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-800 cursor-pointer"
            title="Underline"
          >
            <Underline className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand("strikeThrough")}
            className="p-1.5 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-800 cursor-pointer"
            title="Strikethrough"
          >
            <Strikethrough className="w-4 h-4" />
          </button>

          <div className="h-5 w-[1px] bg-slate-200 mx-1" />

          {/* COLOR DROP-MENUS */}
          <div className="relative inline-block">
            <button
              type="button"
              onClick={() => { setShowColorDropdown(!showColorDropdown); setShowBgDropdown(false); }}
              className="p-1.5 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-800 cursor-pointer flex items-center gap-0.5"
              title="Text Color"
            >
              <Palette className="w-4 h-4 text-indigo-500" />
              <ChevronDown className="w-2.5 h-2.5 text-slate-400" />
            </button>
            {showColorDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowColorDropdown(false)} />
                <div className="absolute left-0 mt-1 w-36 bg-white border border-slate-200 rounded-xl shadow-xl p-1 z-50">
                  <span className="block text-[9px] font-bold text-slate-400 px-2 py-1 uppercase">Colors</span>
                  {PRESET_COLORS.map((c) => (
                    <button
                      type="button"
                      key={c.name}
                      onClick={() => handleTextColor(c.hex)}
                      className="w-full text-left px-2 py-1 text-xs hover:bg-slate-50 flex items-center gap-1.5 font-semibold text-slate-700"
                    >
                      <span className="w-3.5 h-3.5 rounded-full border border-slate-200" style={{ backgroundColor: c.hex }} />
                      <span>{c.name}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="relative inline-block">
            <button
              type="button"
              onClick={() => { setShowBgDropdown(!showBgDropdown); setShowColorDropdown(false); }}
              className="p-1.5 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-800 cursor-pointer flex items-center gap-0.5"
              title="Highlight Color"
            >
              <span className="w-4 h-4 bg-yellow-200 border border-yellow-300 rounded block" />
              <ChevronDown className="w-2.5 h-2.5 text-slate-400" />
            </button>
            {showBgDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowBgDropdown(false)} />
                <div className="absolute left-0 mt-1 w-40 bg-white border border-slate-200 rounded-xl shadow-xl p-1 z-50">
                  <span className="block text-[9px] font-bold text-slate-400 px-2 py-1 uppercase">Highlights</span>
                  {PRESET_BG_COLORS.map((bg) => (
                    <button
                      type="button"
                      key={bg.name}
                      onClick={() => handleBgColor(bg.hex)}
                      className="w-full text-left px-2 py-1 text-xs hover:bg-slate-50 flex items-center gap-1.5 font-semibold text-slate-700"
                    >
                      <span className="w-3.5 h-3.5 rounded border border-slate-200" style={{ backgroundColor: bg.hex }} />
                      <span>{bg.name}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="h-5 w-[1px] bg-slate-200 mx-1" />

          {/* ALIGNMENTS */}
          <button
            type="button"
            onClick={() => executeCommand("justifyLeft")}
            className="p-1.5 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-800 cursor-pointer"
            title="Align Left"
          >
            <AlignLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand("justifyCenter")}
            className="p-1.5 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-800 cursor-pointer"
            title="Align Center"
          >
            <AlignCenter className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand("justifyRight")}
            className="p-1.5 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-800 cursor-pointer"
            title="Align Right"
          >
            <AlignRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand("justifyFull")}
            className="p-1.5 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-800 cursor-pointer"
            title="Justify"
          >
            <AlignJustify className="w-4 h-4" />
          </button>

          <div className="h-5 w-[1px] bg-slate-200 mx-1" />

          {/* LISTS */}
          <button
            type="button"
            onClick={() => executeCommand("insertUnorderedList")}
            className="p-1.5 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-800 cursor-pointer"
            title="Bullet List"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand("insertOrderedList")}
            className="p-1.5 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-800 cursor-pointer"
            title="Numbered List"
          >
            <ListOrdered className="w-4 h-4" />
          </button>

          <div className="h-5 w-[1px] bg-slate-200 mx-1" />

          {/* INSERT TOOLS */}
          <button
            type="button"
            onClick={() => setShowImageModal(true)}
            className="px-2.5 py-1 hover:bg-indigo-50 border border-slate-150 hover:border-indigo-200 rounded-lg text-[10px] font-bold text-slate-700 transition-colors cursor-pointer flex items-center gap-1"
            title="Insert Image (Link or Local File)"
          >
            <ImageIcon className="w-3.5 h-3.5 text-emerald-500" />
            <span>Image</span>
          </button>
          <button
            type="button"
            onClick={() => setShowLinkModal(true)}
            className="px-2.5 py-1 hover:bg-indigo-50 border border-slate-150 hover:border-indigo-200 rounded-lg text-[10px] font-bold text-slate-700 transition-colors cursor-pointer flex items-center gap-1"
            title="Insert Hyperlink Button"
          >
            <LinkIcon className="w-3.5 h-3.5 text-indigo-500" />
            <span>Link</span>
          </button>

          <div className="h-5 w-[1px] bg-slate-200 mx-1" />

          {/* BLOCKS INSERTERS ACCORDION */}
          <div className="relative inline-block group">
            <button
              type="button"
              className="px-2 py-1 hover:bg-indigo-50 border border-indigo-150 hover:border-indigo-200 rounded-lg text-[10px] font-black text-indigo-600 transition-colors cursor-pointer flex items-center gap-1"
            >
              <Layout className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
              <span>Layout Blocks</span>
              <ChevronDown className="w-3 h-3 text-indigo-400" />
            </button>
            <div className="absolute right-0 mt-1 w-52 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 z-50 hidden group-hover:block hover:block">
              <button
                type="button"
                onClick={() => insertTemplateBlock("banner-notice")}
                className="w-full text-left px-3.5 py-2 hover:bg-amber-50 text-[11px] font-bold text-slate-700 flex items-center gap-1.5"
              >
                <span>⚠️</span> Notice Banner
              </button>
              <button
                type="button"
                onClick={() => insertTemplateBlock("banner-timeline")}
                className="w-full text-left px-3.5 py-2 hover:bg-emerald-50 text-[11px] font-bold text-slate-700 flex items-center gap-1.5"
              >
                <span>📅</span> Timeline Roadmap Box
              </button>
              <button
                type="button"
                onClick={() => insertTemplateBlock("banner-tip")}
                className="w-full text-left px-3.5 py-2 hover:bg-indigo-50 text-[11px] font-bold text-slate-700 flex items-center gap-1.5"
              >
                <span>💡</span> Mentor Tip Alert
              </button>
              <button
                type="button"
                onClick={() => insertTemplateBlock("layout-three-cards")}
                className="w-full text-left px-3.5 py-2 hover:bg-indigo-50 text-[11px] font-bold text-slate-700 flex items-center gap-1.5 border-t border-slate-100"
              >
                <span>🪧</span> 3-Column Roadmap Steps
              </button>
              <button
                type="button"
                onClick={() => insertTemplateBlock("deadlines-table")}
                className="w-full text-left px-3.5 py-2 hover:bg-indigo-50 text-[11px] font-bold text-slate-700 flex items-center gap-1.5"
              >
                <span>🗓️</span> Deadlines Calendar Block
              </button>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={() => executeCommand("undo")}
              className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 cursor-pointer"
              title="Undo"
            >
              <Undo className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => executeCommand("redo")}
              className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 cursor-pointer"
              title="Redo"
            >
              <Redo className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* THE WYSIWYG CANVAS / TEXTAREA */}
      <div className="flex-1 relative overflow-hidden min-h-[350px] flex flex-col">
        {editorMode === "visual" ? (
          <div
            ref={editorRef}
            contentEditable
            onInput={handleInput}
            onPaste={handlePaste}
            className="flex-1 p-6 overflow-y-auto outline-none prose prose-sm max-w-none text-slate-700 select-text leading-relaxed text-sm bg-white"
            style={{ minHeight: "350px" }}
            id="wysiwyg-custom-body-canvas"
            data-placeholder={placeholder}
          />
        ) : (
          <textarea
            className="flex-1 w-full p-5 overflow-y-auto outline-none font-mono text-xs bg-slate-900 text-slate-100 leading-relaxed selection:bg-indigo-500"
            style={{ minHeight: "350px", resize: "none" }}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="<!-- Insert raw HTML or customize content tags directly -->"
          />
        )}
      </div>

      {/* FOOTER STATS */}
      <div className="bg-slate-50 border-t border-slate-200 px-4 py-1.5 flex items-center justify-between text-[10px] text-slate-400 shrink-0 select-none">
        <div>
          <span>Chars count: {value?.length || 0}</span>
        </div>
        <div>
          <span>Any custom styles & layouts are rendered in real-time</span>
        </div>
      </div>

      {/* IMAGE CONFIGURATION MODAL */}
      <AnimatePresence>
        {showImageModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setShowImageModal(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl border border-slate-200 p-6 w-full max-w-md relative z-10 shadow-2xl space-y-4 text-left"
            >
              <div className="flex items-center justify-between pb-2 border-b">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-emerald-500" />
                  Configure Custom Image
                </h3>
                <button 
                  type="button" 
                  onClick={() => setShowImageModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-xs font-bold font-mono"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                {/* Drag and drop / local file picker */}
                <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-4 text-center space-y-2">
                  {uploadingImage ? (
                    <div className="flex flex-col items-center justify-center py-2 space-y-1">
                      <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs font-bold text-indigo-600">Uploading & verifying image...</span>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-6 h-6 text-indigo-500 mx-auto" />
                      <div>
                        <label className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer block">
                          Upload local image file
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleLocalImageUpload}
                            disabled={uploadingImage}
                          />
                        </label>
                        <span className="text-[9px] text-slate-400 block mt-0.5">Accepts PNG, JPG or WebP up to 5MB</span>
                      </div>
                    </>
                  )}
                </div>

                <div className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  — Or insert an image web link —
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Image Web Address (URL)</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500 font-mono"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleInsertImageSubmit();
                      }
                    }}
                    placeholder="e.g. https://images.unsplash.com/photo-..."
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Alt description / caption text</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500"
                    value={imageAlt}
                    onChange={(e) => setImageAlt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleInsertImageSubmit();
                      }
                    }}
                    placeholder="e.g. Winners of SVEC Internal SIH round receiving Awards"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-600 uppercase mb-1">Max Width</label>
                    <select
                      className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs"
                      value={imageWidth}
                      onChange={(e) => setImageWidth(e.target.value)}
                    >
                      <option value="max-w-xs">Small (320px)</option>
                      <option value="max-w-md">Medium (448px)</option>
                      <option value="max-w-xl">Large (576px)</option>
                      <option value="max-w-full">Full (100%)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-600 uppercase mb-1">Corners</label>
                    <select
                      className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs"
                      value={imageRounded}
                      onChange={(e) => setImageRounded(e.target.value)}
                    >
                      <option value="rounded-none">Square</option>
                      <option value="rounded-xl">Rounded XL</option>
                      <option value="rounded-2xl">Rounded 2XL</option>
                      <option value="rounded-full">Circle</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-600 uppercase mb-1">Shadow</label>
                    <select
                      className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs"
                      value={imageShadow}
                      onChange={(e) => setImageShadow(e.target.value)}
                    >
                      <option value="shadow-none">No shadow</option>
                      <option value="shadow-sm">Small</option>
                      <option value="shadow-md">Medium</option>
                      <option value="shadow-xl">Extra Large</option>
                    </select>
                  </div>
                </div>

                {imageUrl && (
                  <div className="p-2 border rounded-xl bg-slate-50 flex items-center justify-center max-h-24 overflow-hidden">
                    <img src={imageUrl} alt="preview" className="h-20 object-contain rounded" referrerPolicy="no-referrer" />
                  </div>
                )}

                <div className="pt-3 border-t flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowImageModal(false)}
                    className="px-3 py-1.5 hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-500 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertImageSubmit()}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg cursor-pointer"
                  >
                    Insert Image
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* HYPERLINK CONFIGURATION MODAL */}
      <AnimatePresence>
        {showLinkModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setShowLinkModal(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl border border-slate-200 p-6 w-full max-w-md relative z-10 shadow-2xl space-y-4 text-left"
            >
              <div className="flex items-center justify-between pb-2 border-b">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <LinkIcon className="w-4 h-4 text-indigo-500" />
                  Configure Hyperlink Button
                </h3>
                <button 
                  type="button" 
                  onClick={() => setShowLinkModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-xs font-bold font-mono"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Target Address (URL) *</label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleInsertLinkSubmit();
                      }
                    }}
                    placeholder="e.g. https://sih.gov.in/ or /register"
                  />
                  <span className="text-[9px] text-slate-400 mt-0.5 block">Use full addresses starting with https://, or relative page slugs</span>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Display Label *</label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500"
                    value={linkText}
                    onChange={(e) => setLinkText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleInsertLinkSubmit();
                      }
                    }}
                    placeholder="e.g. Read Selection Guidelines"
                  />
                </div>

                <div className="pt-3 border-t flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowLinkModal(false)}
                    className="px-3 py-1.5 hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-500 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertLinkSubmit()}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg cursor-pointer"
                  >
                    Insert Link
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* STYLES TO INJECT FOR contentEditable placeholder helper */}
      <style>{`
        #wysiwyg-custom-body-canvas:empty:before {
          content: attr(data-placeholder);
          color: #94a3b8;
          font-style: italic;
        }
      `}</style>
    </div>
  );
}

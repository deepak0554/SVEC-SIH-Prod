import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Printer, X, FileText, Info, Download, FileCode, CheckCircle2, Sliders, Upload, RotateCcw, Image as ImageIcon, Lock, Save, Sparkles, AlertCircle } from "lucide-react";
import { Registration } from "../types";
import SvecLogo from "./SvecLogo";
import { getErrorMessage } from "../utils/error";

// Default realistic cursive signature vector for Dr. Ch. Rambabu in fountain pen blue ink
const DEFAULT_SIGNATURE_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 85" width="320" height="85">
  <g fill="none" stroke="#1d4ed8" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
    <!-- Dr. loop and flourish -->
    <path d="M 18 52 C 16 32, 22 14, 34 16 C 45 18, 46 44, 30 52 C 22 55, 18 42, 24 32 C 32 18, 54 24, 58 46" />
    <path d="M 64 50 C 65 48, 66 50, 64 50" stroke-width="3.5" />
    
    <!-- Ch. stroke -->
    <path d="M 76 20 C 82 12, 86 36, 88 48 C 91 52, 96 36, 102 32 C 106 30, 108 42, 114 48" />
    <path d="M 120 50 C 121 48, 122 50, 120 50" stroke-width="3.5" />
    
    <!-- Rambabu elegant cursive path -->
    <path d="M 136 48 C 132 30, 140 18, 148 20 C 156 22, 154 38, 146 48 C 144 52, 152 42, 160 32 C 166 26, 172 38, 174 46 C 176 50, 182 34, 188 32 C 194 30, 196 42, 202 46 C 208 34, 214 32, 220 38 C 224 44, 226 50, 234 44 C 242 36, 248 32, 256 36 C 262 40, 260 48, 268 44 C 276 38, 284 32, 292 38 C 298 44, 300 48, 308 42" />
    
    <!-- Dynamic signature underline flourish -->
    <path d="M 28 62 C 85 58, 175 60, 298 48" stroke-width="2.2" />
    <path d="M 240 58 C 265 56, 290 54, 310 50" stroke-width="1.8" />
  </g>
</svg>
`)}`;

// Default realistic official college rubber stamp seal for Sri Vasavi Engineering College (Autonomous)
const DEFAULT_COLLEGE_STAMP_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 220" width="220" height="220">
  <defs>
    <path id="stampArcTop" d="M 32 110 A 78 78 0 1 1 188 110" fill="none" />
    <path id="stampArcBottom" d="M 188 110 A 78 78 0 0 1 32 110" fill="none" />
  </defs>
  <!-- Outer Stamp Rings with realistic ink stamp styling -->
  <circle cx="110" cy="110" r="102" fill="none" stroke="#3730a3" stroke-width="2.6" stroke-dasharray="5 2.5" />
  <circle cx="110" cy="110" r="97" fill="none" stroke="#3730a3" stroke-width="2.2" />
  <circle cx="110" cy="110" r="72" fill="none" stroke="#3730a3" stroke-width="1.4" />
  
  <!-- Curved Upper Text: College Name -->
  <text fill="#3730a3" font-family="'Times New Roman', Georgia, serif" font-size="10" font-weight="bold" letter-spacing="1">
    <textPath href="#stampArcTop" startOffset="50%" text-anchor="middle">
      SRI VASAVI ENGINEERING COLLEGE
    </textPath>
  </text>
  
  <!-- Curved Lower Text: Location -->
  <text fill="#3730a3" font-family="'Times New Roman', Georgia, serif" font-size="9" font-weight="bold" letter-spacing="1.2">
    <textPath href="#stampArcBottom" startOffset="50%" text-anchor="middle">
      ★ PEDATADEPALLI · TPG ★
    </textPath>
  </text>
  
  <!-- Center Seal Box & Designation -->
  <circle cx="110" cy="110" r="46" fill="#e0e7ff" fill-opacity="0.35" stroke="#3730a3" stroke-width="1" stroke-dasharray="3 2" />
  
  <text x="110" y="96" fill="#312e81" font-family="'Times New Roman', Georgia, serif" font-size="12" font-weight="bold" text-anchor="middle" letter-spacing="0.5">PRINCIPAL</text>
  
  <line x1="72" y1="102" x2="148" y2="102" stroke="#3730a3" stroke-width="1.2" />
  
  <text x="110" y="115" fill="#3730a3" font-family="Arial, sans-serif" font-size="7.5" font-weight="bold" text-anchor="middle" letter-spacing="0.5">(AUTONOMOUS)</text>
  <text x="110" y="127" fill="#4338ca" font-family="Arial, sans-serif" font-size="7" font-weight="bold" text-anchor="middle">OFFICIAL SEAL</text>
</svg>
`)}`;

// Default official standalone SVEC college emblem vector data URI (works universally in HTML, canvas, PDF and Word .doc)
const DEFAULT_SVEC_LOGO_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
  <!-- Outer Gear / Cog Wheel -->
  <g fill="#16a34a">
    <circle cx="200" cy="180" r="145" />
    <rect x="188" y="23" width="24" height="20" rx="2" transform="rotate(0 200 180)" />
    <rect x="188" y="23" width="24" height="20" rx="2" transform="rotate(15 200 180)" />
    <rect x="188" y="23" width="24" height="20" rx="2" transform="rotate(30 200 180)" />
    <rect x="188" y="23" width="24" height="20" rx="2" transform="rotate(45 200 180)" />
    <rect x="188" y="23" width="24" height="20" rx="2" transform="rotate(60 200 180)" />
    <rect x="188" y="23" width="24" height="20" rx="2" transform="rotate(75 200 180)" />
    <rect x="188" y="23" width="24" height="20" rx="2" transform="rotate(90 200 180)" />
    <rect x="188" y="23" width="24" height="20" rx="2" transform="rotate(105 200 180)" />
    <rect x="188" y="23" width="24" height="20" rx="2" transform="rotate(120 200 180)" />
    <rect x="188" y="23" width="24" height="20" rx="2" transform="rotate(135 200 180)" />
    <rect x="188" y="23" width="24" height="20" rx="2" transform="rotate(150 200 180)" />
    <rect x="188" y="23" width="24" height="20" rx="2" transform="rotate(165 200 180)" />
    <rect x="188" y="23" width="24" height="20" rx="2" transform="rotate(180 200 180)" />
    <rect x="188" y="23" width="24" height="20" rx="2" transform="rotate(195 200 180)" />
    <rect x="188" y="23" width="24" height="20" rx="2" transform="rotate(210 200 180)" />
    <rect x="188" y="23" width="24" height="20" rx="2" transform="rotate(225 200 180)" />
    <rect x="188" y="23" width="24" height="20" rx="2" transform="rotate(240 200 180)" />
    <rect x="188" y="23" width="24" height="20" rx="2" transform="rotate(255 200 180)" />
    <rect x="188" y="23" width="24" height="20" rx="2" transform="rotate(270 200 180)" />
    <rect x="188" y="23" width="24" height="20" rx="2" transform="rotate(285 200 180)" />
    <rect x="188" y="23" width="24" height="20" rx="2" transform="rotate(300 200 180)" />
    <rect x="188" y="23" width="24" height="20" rx="2" transform="rotate(315 200 180)" />
    <rect x="188" y="23" width="24" height="20" rx="2" transform="rotate(330 200 180)" />
    <rect x="188" y="23" width="24" height="20" rx="2" transform="rotate(345 200 180)" />
  </g>
  <!-- Inner Circles -->
  <circle cx="200" cy="180" r="135" fill="#fcfdf2" stroke="#1e3a8a" stroke-width="6" />
  <circle cx="200" cy="180" r="128" fill="none" stroke="#db2777" stroke-width="2.5" />
  <!-- Big Red V Lines -->
  <path d="M 125 105 L 200 295 L 275 105" fill="none" stroke="#dc2626" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
  <!-- Top Center-Right: Satellite Dish -->
  <g transform="translate(165, 80)" stroke="#1e3a8a" stroke-width="2" fill="none">
    <path d="M 25 55 L 45 55 M 35 55 L 35 38" stroke="#1e293b" stroke-width="3" stroke-linecap="round" />
    <path d="M 22 38 L 48 38" stroke="#1e293b" stroke-width="2" />
    <path d="M 10 15 C 15 35, 55 35, 60 15" fill="#2563eb" stroke="#1d4ed8" stroke-width="2.5" />
    <line x1="35" y1="23" x2="35" y2="2" stroke="#0f172a" stroke-width="2.5" />
    <circle cx="35" cy="2" r="3.5" fill="#ef4444" stroke="none" />
  </g>
  <!-- Bottom Left: Transmission Tower -->
  <g transform="translate(100, 185)">
    <line x1="15" y1="85" x2="25" y2="5" stroke="#1e293b" stroke-width="3.5" />
    <line x1="45" y1="85" x2="35" y2="5" stroke="#1e293b" stroke-width="3.5" />
    <line x1="16" y1="65" x2="44" y2="65" stroke="#1e293b" stroke-width="2" />
    <line x1="19" y1="45" x2="41" y2="45" stroke="#1e293b" stroke-width="2" />
    <line x1="22" y1="25" x2="38" y2="25" stroke="#1e293b" stroke-width="2" />
    <line x1="15" y1="85" x2="41" y2="45" stroke="#1e293b" stroke-width="1.5" />
    <line x1="45" y1="85" x2="19" y2="45" stroke="#1e293b" stroke-width="1.5" />
    <line x1="19" y1="45" x2="38" y2="25" stroke="#1e293b" stroke-width="1.5" />
    <line x1="41" y1="45" x2="22" y2="25" stroke="#1e293b" stroke-width="1.5" />
    <line x1="22" y1="25" x2="35" y2="5" stroke="#1e293b" stroke-width="1.5" />
    <line x1="38" y1="25" x2="25" y2="5" stroke="#1e293b" stroke-width="1.5" />
    <line x1="23" y1="5" x2="37" y2="5" stroke="#1e293b" stroke-width="2.5" />
  </g>
  <!-- Bottom Right: Computer Setup -->
  <g transform="translate(230, 195)">
    <rect x="8" y="5" width="58" height="42" rx="4" fill="#2563eb" stroke="#1d4ed8" stroke-width="3" />
    <rect x="13" y="9" width="48" height="34" rx="1.5" fill="#ffffff" stroke="#1d4ed8" stroke-width="1" />
    <path d="M 18 16 L 34 16 M 18 23 L 44 23 M 18 30 L 38 30" stroke="#93c5fd" stroke-width="2" stroke-linecap="round" />
    <path d="M 32 47 L 42 47 L 46 56 L 28 56 Z" fill="#1d4ed8" stroke="#1e3a8a" stroke-width="2" />
    <path d="M 3 58 L 71 58 L 62 73 L 12 73 Z" fill="#e2e8f0" stroke="#475569" stroke-width="2" />
    <line x1="14" y1="63" x2="60" y2="63" stroke="#94a3b8" stroke-width="2" stroke-dasharray="3,2" />
    <line x1="12" y1="68" x2="58" y2="68" stroke="#94a3b8" stroke-width="2" stroke-dasharray="4,2" />
  </g>
  <!-- Defs for textPath -->
  <defs>
    <path id="svecTextUpper" d="M 72,180 A 128,128 0 0,1 328,180" fill="none" />
  </defs>
  <text fill="#dc2626" font-size="13" font-weight="bold" font-family="system-ui, -apple-system, Arial, sans-serif" letter-spacing="1.8">
    <textPath href="#svecTextUpper" startOffset="50%" text-anchor="middle">
      SRI VASAVI ENGINEERING COLLEGE
    </textPath>
  </text>
  <!-- Stars -->
  <g fill="#1d4ed8">
    <path d="M 85,198 L 87,192 L 93,192 L 88,188 L 90,182 L 85,186 L 80,182 L 82,188 L 77,192 L 83,192 Z" />
    <path d="M 315,198 L 317,192 L 323,192 L 318,188 L 320,182 L 315,186 L 310,182 L 312,188 L 307,192 L 313,192 Z" />
  </g>
  <!-- Ribbon -->
  <g>
    <path d="M 60,312 C 45,315 32,328 32,345 C 32,360 48,362 55,350 L 70,332 Z" fill="#db2777" opacity="0.8" />
    <path d="M 340,312 C 355,315 368,328 368,345 C 368,360 352,362 345,350 L 330,332 Z" fill="#db2777" opacity="0.8" />
    <path d="M 45,322 Q 200,345 355,322 L 345,290 Q 200,312 55,290 Z" fill="#ffffff" stroke="#db2777" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
    <text x="200" y="313" fill="#1e3a8a" font-size="17" font-weight="800" font-family="system-ui, -apple-system, Arial, sans-serif" text-anchor="middle" letter-spacing="1">
      TADEPALLIGUDEM
    </text>
  </g>
</svg>
`)}`;

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

export interface ConsentLetterModalProps {
  isOpen: boolean;
  onClose: () => void;
  registration: Registration | null;
  isReadOnly?: boolean;
  isSuperAdmin?: boolean;
  canCustomize?: boolean;
  config?: any;
  onSaveGlobalTemplate?: (templateSettings: any) => Promise<void>;
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
  isSuperAdmin = false,
  canCustomize = false,
  config,
  onSaveGlobalTemplate,
}: ConsentLetterModalProps) {
  // Only super admins or explicitly authorized roles can customize template
  const allowCustomization = !isReadOnly && (isSuperAdmin || canCustomize);

  const [logoUrl, setLogoUrl] = useState(config?.logoUrl || "");
  const [includeFullLetterhead, setIncludeFullLetterhead] = useState(
    config?.consentLetterIncludeLetterhead !== undefined ? config.consentLetterIncludeLetterhead : true
  );
  const logoFileInputRef = useRef<HTMLInputElement>(null);

  const effectiveLogoUrl = logoUrl || DEFAULT_SVEC_LOGO_SVG;

  const [aicteNo, setAicteNo] = useState(config?.consentLetterAicteNo || "1-3634005111");
  const [principalName, setPrincipalName] = useState(config?.consentLetterPrincipalName || "Dr. Ch. Rambabu");
  const [principalDesignationLine1, setPrincipalDesignationLine1] = useState(
    config?.consentLetterDesignation1 || "Principal, Sri Vasavi Engineering College (Autonomous)"
  );
  const [principalDesignationLine2, setPrincipalDesignationLine2] = useState(
    config?.consentLetterDesignation2 || "Pedatadepalli, Tadepalligudem."
  );
  const [teamName, setTeamName] = useState(registration?.teamName || "");
  
  // Signature Image state & handlers
  const [signatureUrl, setSignatureUrl] = useState<string>(config?.consentLetterSignatureUrl || DEFAULT_SIGNATURE_SVG);
  const [showSignature, setShowSignature] = useState<boolean>(
    config?.consentLetterShowSignature !== undefined ? config.consentLetterShowSignature : true
  );
  const signatureFileInputRef = useRef<HTMLInputElement>(null);

  // College Stamp / Seal Image state & handlers
  const [stampUrl, setStampUrl] = useState<string>(config?.consentLetterStampUrl || DEFAULT_COLLEGE_STAMP_SVG);
  const [showStamp, setShowStamp] = useState<boolean>(
    config?.consentLetterShowStamp !== undefined ? config.consentLetterShowStamp : true
  );
  const stampFileInputRef = useRef<HTMLInputElement>(null);

  // Saving template feedback states
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [saveTemplateSuccess, setSaveTemplateSuccess] = useState(false);

  useEffect(() => {
    if (config) {
      if (config.logoUrl) setLogoUrl(config.logoUrl);
      if (config.consentLetterAicteNo) setAicteNo(config.consentLetterAicteNo);
      if (config.consentLetterPrincipalName) setPrincipalName(config.consentLetterPrincipalName);
      if (config.consentLetterDesignation1) setPrincipalDesignationLine1(config.consentLetterDesignation1);
      if (config.consentLetterDesignation2) setPrincipalDesignationLine2(config.consentLetterDesignation2);
      if (config.consentLetterSignatureUrl) setSignatureUrl(config.consentLetterSignatureUrl);
      if (config.consentLetterStampUrl) setStampUrl(config.consentLetterStampUrl);
      if (config.consentLetterShowSignature !== undefined) setShowSignature(config.consentLetterShowSignature);
      if (config.consentLetterShowStamp !== undefined) setShowStamp(config.consentLetterShowStamp);
      if (config.consentLetterIncludeLetterhead !== undefined) setIncludeFullLetterhead(config.consentLetterIncludeLetterhead);
    }
  }, [config]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch("/api/settings/public");
        if (res.ok) {
          const data = await res.json();
          if (data.logoUrl && !logoUrl) setLogoUrl(data.logoUrl);
          if (data.consentLetterAicteNo && !config?.consentLetterAicteNo) setAicteNo(data.consentLetterAicteNo);
          if (data.consentLetterPrincipalName && !config?.consentLetterPrincipalName) setPrincipalName(data.consentLetterPrincipalName);
          if (data.consentLetterDesignation1 && !config?.consentLetterDesignation1) setPrincipalDesignationLine1(data.consentLetterDesignation1);
          if (data.consentLetterDesignation2 && !config?.consentLetterDesignation2) setPrincipalDesignationLine2(data.consentLetterDesignation2);
          if (data.consentLetterSignatureUrl && !config?.consentLetterSignatureUrl) setSignatureUrl(data.consentLetterSignatureUrl);
          if (data.consentLetterStampUrl && !config?.consentLetterStampUrl) setStampUrl(data.consentLetterStampUrl);
          if (data.consentLetterShowSignature !== undefined && config?.consentLetterShowSignature === undefined) setShowSignature(data.consentLetterShowSignature);
          if (data.consentLetterShowStamp !== undefined && config?.consentLetterShowStamp === undefined) setShowStamp(data.consentLetterShowStamp);
          if (data.consentLetterIncludeLetterhead !== undefined && config?.consentLetterIncludeLetterhead === undefined) setIncludeFullLetterhead(data.consentLetterIncludeLetterhead);
        }
      } catch (err) {
        console.error("Error fetching settings for consent letter:", err);
      }
    };
    fetchSettings();
  }, []);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("category", "images");
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setLogoUrl(data.url);
        }
      } catch (err) {
        console.error("Error uploading logo:", err);
      }
    }
  };

  const handleResetLogo = () => {
    setLogoUrl(DEFAULT_SVEC_LOGO_SVG);
  };

  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("category", "images");
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setSignatureUrl(data.url);
          setShowSignature(true);
        }
      } catch (err) {
        console.error("Error uploading signature:", err);
      }
    }
  };

  const handleResetSignature = () => {
    setSignatureUrl(DEFAULT_SIGNATURE_SVG);
    setShowSignature(true);
  };

  const handleStampUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("category", "images");
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setStampUrl(data.url);
          setShowStamp(true);
        }
      } catch (err) {
        console.error("Error uploading stamp:", err);
      }
    }
  };

  const handleResetStamp = () => {
    setStampUrl(DEFAULT_COLLEGE_STAMP_SVG);
    setShowStamp(true);
  };

  // Super Admin: Save current customizer configuration as Global Default Template
  const handleSaveGlobalTemplate = async () => {
    setSavingTemplate(true);
    setSaveTemplateSuccess(false);
    try {
      const token = sessionStorage.getItem("svec_sih_admin_token");
      const templatePayload = {
        consentLetterEnabled: true,
        consentLetterAicteNo: aicteNo,
        consentLetterPrincipalName: principalName,
        consentLetterDesignation1: principalDesignationLine1,
        consentLetterDesignation2: principalDesignationLine2,
        consentLetterSignatureUrl: signatureUrl,
        consentLetterStampUrl: stampUrl,
        consentLetterShowSignature: showSignature,
        consentLetterShowStamp: showStamp,
        consentLetterIncludeLetterhead: includeFullLetterhead,
        consentLetterRequireSelection: true
      };

      if (onSaveGlobalTemplate) {
        await onSaveGlobalTemplate(templatePayload);
      } else {
        const res = await fetch("/api/admin/consent-letter-template", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify(templatePayload)
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(getErrorMessage(errData, "Failed to save global template"));
        }
      }

      setSaveTemplateSuccess(true);
      setTimeout(() => setSaveTemplateSuccess(false), 4000);
    } catch (err: any) {
      alert(err.message || "Failed to save global template");
    } finally {
      setSavingTemplate(false);
    }
  };
  
  const [letterDate, setLetterDate] = useState(() => {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, "0");
    const year = today.getFullYear();
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const monthName = monthNames[today.getMonth()];
    return `${day}/${monthName}/${year}`;
  });

  const [roster, setRoster] = useState<RosterMember[]>([]);

  // Initialize roster and teamName from registration data matching the 6-member SIH format
  useEffect(() => {
    if (!registration) return;

    setTeamName(registration.teamName || "");

    const initialRoster: RosterMember[] = [];

    // Add Lead (Row 1: Team Leader)
    initialRoster.push({
      role: "Team Leader",
      name: registration.leadName || "",
      gender: registration.leadGender ? (registration.leadGender.toUpperCase().startsWith("F") ? "F" : "M") : "",
      email: registration.studentEmail || "",
      phone: registration.leadMobile || "",
      stream: registration.leadDepartment || "CSE",
      academicYear: registration.leadAcademicYear || "3rd Year",
    });

    // Add member 1 to 5
    if (registration.member1) {
      initialRoster.push({
        role: "Team Member",
        name: registration.member1,
        gender: registration.member1Gender ? (registration.member1Gender.toUpperCase().startsWith("F") ? "F" : "M") : "",
        email: registration.member1Email || "",
        phone: registration.member1Phone || "",
        stream: registration.leadDepartment || "CSE",
        academicYear: registration.member1AcademicYear || "3rd Year",
      });
    }
    if (registration.member2) {
      initialRoster.push({
        role: "Team Member",
        name: registration.member2,
        gender: registration.member2Gender ? (registration.member2Gender.toUpperCase().startsWith("F") ? "F" : "M") : "",
        email: registration.member2Email || "",
        phone: registration.member2Phone || "",
        stream: registration.leadDepartment || "CSE",
        academicYear: registration.member2AcademicYear || "3rd Year",
      });
    }
    if (registration.member3) {
      initialRoster.push({
        role: "Team Member",
        name: registration.member3,
        gender: registration.member3Gender ? (registration.member3Gender.toUpperCase().startsWith("F") ? "F" : "M") : "",
        email: registration.member3Email || "",
        phone: registration.member3Phone || "",
        stream: registration.leadDepartment || "CSE",
        academicYear: registration.member3AcademicYear || "3rd Year",
      });
    }
    if (registration.member4) {
      initialRoster.push({
        role: "Team Member",
        name: registration.member4,
        gender: registration.member4Gender ? (registration.member4Gender.toUpperCase().startsWith("F") ? "F" : "M") : "",
        email: registration.member4Email || "",
        phone: registration.member4Phone || "",
        stream: registration.leadDepartment || "CSE",
        academicYear: registration.member4AcademicYear || "3rd Year",
      });
    }
    if (registration.member5) {
      initialRoster.push({
        role: "Team Member",
        name: registration.member5,
        gender: registration.member5Gender ? (registration.member5Gender.toUpperCase().startsWith("F") ? "F" : "M") : "",
        email: registration.member5Email || "",
        phone: registration.member5Phone || "",
        stream: registration.leadDepartment || "CSE",
        academicYear: registration.member5AcademicYear || "3rd Year",
      });
    }

    // Official SIH Nomination format requires 6 member rows (1 Leader + 5 Members)
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

  // Download official editable Word document (.doc) matching exact format
  const handleDownloadWordDoc = () => {
    const headerHtml = includeFullLetterhead ? `
      <table style="width:100%; border:none; margin-bottom:15pt; border-bottom:2pt solid #000000; padding-bottom:8pt;">
        <tr>
          <td style="width:70pt; border:none; vertical-align:middle; text-align:left; padding:0;">
            <img src="${effectiveLogoUrl}" alt="College Logo" width="65" height="65" style="width:65pt; height:65pt; object-fit:contain; display:block;" />
          </td>
          <td style="border:none; text-align:center; vertical-align:middle; padding:0 8pt;">
            <h2 style="font-family:'Arial',sans-serif; color:#1e40af; font-size:15pt; margin:0; text-transform:uppercase; font-weight:bold; line-height:1.2;">
              SRI VASAVI ENGINEERING COLLEGE <span style="font-size:10pt; color:#4f46e5; text-transform:none;">(Autonomous)</span>
            </h2>
            <p style="font-family:'Arial',sans-serif; font-size:8pt; margin:2pt 0; color:#475569;">
              (Sponsored by Sri Vasavi Educational Society; Regd.No:898/2000)
            </p>
            <p style="font-family:'Arial',sans-serif; font-size:8.5pt; margin:2pt 0; font-weight:bold; color:#334155;">
              Accredited by NAAC with 'A' Grade | Accredited by NBA | Approved by AICTE, New Delhi
            </p>
            <p style="font-family:'Arial',sans-serif; font-size:9pt; margin:2pt 0; font-weight:bold; color:#0f172a;">
              Pedatadepalli, TADEPALLIGUDEM – 534 101, W.G. Dist, (A.P.)
            </p>
          </td>
          <td style="width:70pt; border:none; padding:0;"></td>
        </tr>
      </table>
    ` : `
      <div style="text-align:center; font-family:'Times New Roman',serif; font-size:12pt; margin-bottom:25pt; color:#64748b;">
        &lt; College letter head &gt;
      </div>
    `;

    const rowsHtml = roster.map(m => `
      <tr>
        <td style="border:1px solid #000000; padding:6pt; font-size:10pt; font-family:'Arial',sans-serif; font-weight:${m.role === 'Team Leader' ? 'bold' : 'normal'};">
          ${m.role}
        </td>
        <td style="border:1px solid #000000; padding:6pt; font-size:10pt; font-family:'Arial',sans-serif;">
          ${m.name || ""}
        </td>
        <td style="border:1px solid #000000; padding:6pt; font-size:10pt; text-align:center; font-family:'Arial',sans-serif;">
          ${m.gender || ""}
        </td>
        <td style="border:1px solid #000000; padding:6pt; font-size:9.5pt; font-family:'Arial',sans-serif;">
          ${m.email || ""}
        </td>
        <td style="border:1px solid #000000; padding:6pt; font-size:9.5pt; font-family:'Arial',sans-serif;">
          ${m.phone || ""}
        </td>
        <td style="border:1px solid #000000; padding:6pt; font-size:9.5pt; font-family:'Arial',sans-serif;">
          ${m.stream || ""}
        </td>
        <td style="border:1px solid #000000; padding:6pt; font-size:9.5pt; font-family:'Arial',sans-serif;">
          ${m.academicYear || ""}
        </td>
      </tr>
    `).join("");

    const docContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>SIH 2026 Nomination Letter - ${teamName || registration.teamName}</title>
        <style>
          @page Section1 {
            size: 210mm 297mm;
            margin: 20mm 20mm 20mm 20mm;
            mso-header-margin: 36pt;
            mso-footer-margin: 36pt;
            mso-paper-source: 0;
          }
          div.Section1 { page: Section1; }
          body {
            font-family: 'Times New Roman', Times, serif;
            font-size: 11pt;
            line-height: 1.4;
            color: #000000;
          }
          p { margin: 8pt 0; }
          table.roster-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 14pt;
            margin-bottom: 20pt;
          }
          table.roster-table th {
            border: 1px solid #000000;
            padding: 6pt;
            font-family: 'Arial', sans-serif;
            font-size: 9.5pt;
            font-weight: bold;
            text-align: left;
            background-color: #f8fafc;
          }
        </style>
      </head>
      <body>
        <div class="Section1">
          ${headerHtml}

          <p style="font-family:'Times New Roman',serif; font-size:11pt; margin-bottom:12pt;">
            <strong>Date:</strong> ${letterDate}
          </p>

          <p style="font-family:'Times New Roman',serif; font-size:12pt; font-weight:bold; text-align:center; margin-top:14pt; margin-bottom:14pt;">
            Sub: Smart India Hackathon 2026 – Nomination
          </p>

          <p style="font-family:'Times New Roman',serif; font-size:11pt; line-height:1.5; text-align:justify; margin-bottom:14pt;">
            I am pleased to nominate the below team from our college to participate in Smart India Hackathon 2026. AICTE Application No/ UGC Registration No for our college is ${aicteNo ? `<span style="text-decoration:underline; font-weight:bold;">${aicteNo}</span>` : `___________________`}.
          </p>

          <p style="font-family:'Times New Roman',serif; font-size:11.5pt; font-weight:bold; margin-bottom:8pt;">
            Team : ${teamName || registration.teamName || ""}
          </p>

          <table class="roster-table">
            <thead>
              <tr>
                <th style="width:16%;"></th>
                <th style="width:20%;">Name</th>
                <th style="width:10%; text-align:center;">Gender (M/F)</th>
                <th style="width:22%;">Email id</th>
                <th style="width:14%;">Mobile no.</th>
                <th style="width:9%;">Stream</th>
                <th style="width:9%;">Academic Year</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div style="margin-top:30pt; font-family:'Times New Roman',serif; font-size:11pt; line-height:1.4;">
            <p style="margin:0 0 6pt 0;">Sincerely,</p>
            <table style="width:100%; border:none; border-collapse:collapse; margin-top:2pt;">
              <tr>
                <td style="vertical-align:top; border:none; padding:0;">
                  ${showSignature && signatureUrl ? `
                    <div style="margin: 2pt 0 4pt 0;">
                      <img src="${signatureUrl}" alt="Principal Signature" style="height:45pt; max-width:180pt; object-fit:contain; display:block;" />
                    </div>
                  ` : `<div style="height:35pt;"></div>`}
                  <p style="margin:0; font-weight:bold;">${principalName || "Principal's Name"}</p>
                  <p style="margin:0;">${principalDesignationLine1 || "Principal, Sri Vasavi Engineering College (Autonomous)"}</p>
                  <p style="margin:0;">${principalDesignationLine2 || "Pedatadepalli, Tadepalligudem."}</p>
                </td>
                ${showStamp && stampUrl ? `
                <td style="vertical-align:middle; text-align:right; border:none; padding:0; width:110pt;">
                  <img src="${stampUrl}" alt="College Stamp Seal" style="width:85pt; height:85pt; object-fit:contain; display:inline-block;" />
                </td>
                ` : ""}
              </tr>
            </table>
          </div>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff' + docContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SIH2026_Nomination_Letter_${(teamName || registration.teamName || "Team").replace(/[^a-zA-Z0-9]/g, "_")}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Download official PDF copy matching document layout
  const handleDownloadPDF = async () => {
    const element = document.getElementById("printable-consent-letter");
    if (!element) return;

    // Capture and reset scroll positions
    const scrolledAncestors: Array<{ element: HTMLElement; scrollTop: number; scrollLeft: number }> = [];
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

    // Load html2pdf if needed
    if (!(window as any).html2pdf) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "/js/html2pdf.bundle.min.js";
        script.onload = () => resolve();
        script.onerror = () => {
          const cdnScript = document.createElement("script");
          cdnScript.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
          cdnScript.onload = () => resolve();
          cdnScript.onerror = () => reject(new Error("Failed to load PDF library"));
          document.head.appendChild(cdnScript);
        };
        document.head.appendChild(script);
      });
    }

    element.classList.add("pdf-generation-active");

    const opt = {
      margin:       [12, 14, 12, 14], // mm [top, left, bottom, right]
      filename:     `SIH2026_Nomination_Consent_Letter_${(teamName || registration.teamName || "Team").replace(/[^a-zA-Z0-9]/g, "_")}.pdf`,
      image:        { type: "jpeg", quality: 0.98 },
      html2canvas:  { 
        scale: 2.5, 
        useCORS: true, 
        logging: false,
        scrollX: 0,
        scrollY: 0
      },
      jsPDF:        { unit: "mm", format: "a4", orientation: "portrait" }
    };

    const restore = makeOklchSafe();
    try {
      await (window as any).html2pdf().set(opt).from(element).save();
    } finally {
      restore();
      element.classList.remove("pdf-generation-active");
      
      scrolledAncestors.forEach(({ element: el, scrollTop, scrollLeft }) => {
        el.scrollTop = scrollTop;
        el.scrollLeft = scrollLeft;
      });
    }
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
          className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-6xl w-full max-h-[94vh] flex flex-col overflow-hidden relative z-10 no-print"
        >
          {/* Modal Header */}
          <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-indigo-500/20 border border-indigo-400/30 rounded-xl flex items-center justify-center text-indigo-400 shadow-xs">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold font-display text-sm uppercase tracking-wider flex items-center gap-2">
                  Smart India Hackathon 2026 – Nomination & Consent Letter
                  <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded-full normal-case">
                    Official AICTE / SIH Format
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400">Standardized nomination document ready for Principal signature and official seal</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          {isReadOnly && registration && !registration.isFinalSelected ? (
            <div className="p-8 sm:p-12 text-center max-w-xl mx-auto space-y-6 my-auto">
              <div className="w-16 h-16 bg-amber-100 border border-amber-200 rounded-2xl flex items-center justify-center text-amber-600 mx-auto shadow-sm">
                <Lock className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h4 className="text-xl font-bold font-display text-slate-900">
                  Consent Letter Download Locked
                </h4>
                <p className="text-sm text-slate-600 leading-relaxed">
                  The official institutional Consent & Nomination Letter signed by the Principal is enabled exclusively for teams that have been selected for the next round of <b>Smart India Hackathon 2026</b>.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left space-y-2 text-xs text-slate-700">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-500">Team Name:</span>
                  <span className="font-bold text-slate-900">{registration.teamName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-500">Current Status:</span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[11px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    Pending Next Round Selection
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Understood, Return to Portal
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
            
            {/* Left Column: Letter Customizer / Configuration Panel (Super Admin / Admin Only) */}
            {allowCustomization && (
              <div className="w-full lg:w-[320px] xl:w-[350px] p-5 bg-slate-50/70 space-y-4 shrink-0 overflow-y-auto">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2 text-slate-800">
                    <Sliders className="w-4 h-4 text-indigo-600" />
                    <h4 className="text-xs font-extrabold font-display uppercase tracking-wider">Document Customizer</h4>
                  </div>
                  <span className="text-[9px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                    Admin Mode
                  </span>
                </div>

                {/* Save Global Default Template Action for Super Admin */}
                <div className="bg-indigo-900 text-white p-3.5 rounded-2xl space-y-2 shadow-xs">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-200">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Global Consent Letter Template</span>
                  </div>
                  <p className="text-[11px] text-indigo-100/80 leading-relaxed">
                    Save the current AICTE number, Principal signature, seal, and designation as the official default for all students.
                  </p>
                  <button
                    type="button"
                    onClick={handleSaveGlobalTemplate}
                    disabled={savingTemplate}
                    className="w-full mt-1 flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-400 active:bg-indigo-600 disabled:opacity-50 text-white text-xs font-bold py-2 px-3 rounded-xl transition-all shadow-xs cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {savingTemplate ? "Saving Template..." : "Save as Global Default"}
                  </button>
                  {saveTemplateSuccess && (
                    <p className="text-[10.5px] text-emerald-300 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      Global template saved successfully!
                    </p>
                  )}
                </div>

                {/* Letterhead Mode Switch */}
                <div className="bg-white p-3 rounded-2xl border border-slate-200 space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Letterhead Presentation
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setIncludeFullLetterhead(true)}
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        includeFullLetterhead
                          ? "bg-white text-indigo-700 shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      College Letterhead
                    </button>
                    <button
                      type="button"
                      onClick={() => setIncludeFullLetterhead(false)}
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        !includeFullLetterhead
                          ? "bg-white text-indigo-700 shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                      title="Prints with placeholder < College letter head > for feeding physical pre-printed stationery"
                    >
                      Raw Template
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    {includeFullLetterhead
                      ? "Includes full SVEC header with college logo and affiliations."
                      : "Shows '< College letter head >' placeholder for printing on college physical letterhead."}
                  </p>
                </div>

                <div className="space-y-3">
                  {/* Team Name */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">Team Name</label>
                    <input
                      type="text"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 shadow-2xs font-medium"
                      placeholder="e.g. CodeWarriors"
                    />
                  </div>

                  {/* Date */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">Date</label>
                    <input
                      type="text"
                      value={letterDate}
                      onChange={(e) => setLetterDate(e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 shadow-2xs font-medium"
                      placeholder="e.g. 29/August/2026"
                    />
                  </div>

                  {/* AICTE / UGC ID */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">AICTE App No / UGC Reg No</label>
                    <input
                      type="text"
                      value={aicteNo}
                      onChange={(e) => setAicteNo(e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 shadow-2xs font-medium"
                      placeholder="e.g. 1-3634005111"
                    />
                  </div>

                  {/* Principal Name */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">Principal's Name</label>
                    <input
                      type="text"
                      value={principalName}
                      onChange={(e) => setPrincipalName(e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 shadow-2xs font-medium"
                      placeholder="e.g. Dr. Ch. Rambabu"
                    />
                  </div>

                  {/* Designation Line 1 */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">Designation / Title</label>
                    <input
                      type="text"
                      value={principalDesignationLine1}
                      onChange={(e) => setPrincipalDesignationLine1(e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 shadow-2xs font-medium"
                      placeholder="Principal, Sri Vasavi Engineering College (Autonomous)"
                    />
                  </div>

                  {/* Designation Line 2 / Address */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">Location / Address</label>
                    <input
                      type="text"
                      value={principalDesignationLine2}
                      onChange={(e) => setPrincipalDesignationLine2(e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 shadow-2xs font-medium"
                      placeholder="Pedatadepalli, Tadepalligudem."
                    />
                  </div>

                  {/* College Header Logo Customizer */}
                  <div className="space-y-2 pt-1 border-t border-slate-100">
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">College Header Logo</label>
                    <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
                      <div className="bg-white border border-slate-200 rounded-lg p-2 flex items-center justify-center h-16 overflow-hidden">
                        <img
                          src={effectiveLogoUrl}
                          alt="College Header Logo Preview"
                          className="max-h-full max-w-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                      </div>

                      <div className="flex items-center gap-1.5">
                        <input
                          type="file"
                          ref={logoFileInputRef}
                          onChange={handleLogoUpload}
                          accept="image/*"
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => logoFileInputRef.current?.click()}
                          className="flex-1 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-lg shadow-2xs cursor-pointer transition-colors"
                        >
                          <Upload className="w-3 h-3 text-indigo-600" />
                          Upload Logo
                        </button>
                        <button
                          type="button"
                          onClick={handleResetLogo}
                          title="Reset to default SVEC emblem logo"
                          className="flex items-center justify-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 px-2 py-1.5 rounded-lg cursor-pointer transition-colors"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Reset
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Digital Signature Customizer */}
                  <div className="space-y-2 pt-1 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">Principal Signature</label>
                      <label className="inline-flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showSignature}
                          onChange={(e) => setShowSignature(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-7 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600 relative"></div>
                        <span className="text-[10px] font-medium text-slate-500">{showSignature ? "Show" : "Hide"}</span>
                      </label>
                    </div>

                    {showSignature && (
                      <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
                        {signatureUrl && (
                          <div className="bg-white border border-slate-200 rounded-lg p-2 flex items-center justify-center h-14 overflow-hidden">
                            <img
                              src={signatureUrl}
                              alt="Signature Preview"
                              className="max-h-full max-w-full object-contain"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        )}

                        <div className="flex items-center gap-1.5">
                          <input
                            type="file"
                            ref={signatureFileInputRef}
                            onChange={handleSignatureUpload}
                            accept="image/*"
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => signatureFileInputRef.current?.click()}
                            className="flex-1 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-lg shadow-2xs cursor-pointer transition-colors"
                          >
                            <Upload className="w-3 h-3 text-indigo-600" />
                            Upload Image
                          </button>
                          <button
                            type="button"
                            onClick={handleResetSignature}
                            title="Reset to default Dr. Ch. Rambabu signature"
                            className="flex items-center justify-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 px-2 py-1.5 rounded-lg cursor-pointer transition-colors"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Reset
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* College Stamp / Seal Customizer */}
                  <div className="space-y-2 pt-1 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">College Stamp / Seal</label>
                      <label className="inline-flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showStamp}
                          onChange={(e) => setShowStamp(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-7 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600 relative"></div>
                        <span className="text-[10px] font-medium text-slate-500">{showStamp ? "Show" : "Hide"}</span>
                      </label>
                    </div>

                    {showStamp && (
                      <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
                        {stampUrl && (
                          <div className="bg-white border border-slate-200 rounded-lg p-2 flex items-center justify-center h-20 overflow-hidden">
                            <img
                              src={stampUrl}
                              alt="College Stamp Seal Preview"
                              className="max-h-full max-w-full object-contain"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        )}

                        <div className="flex items-center gap-1.5">
                          <input
                            type="file"
                            ref={stampFileInputRef}
                            onChange={handleStampUpload}
                            accept="image/*"
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => stampFileInputRef.current?.click()}
                            className="flex-1 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-lg shadow-2xs cursor-pointer transition-colors"
                          >
                            <Upload className="w-3 h-3 text-indigo-600" />
                            Upload Stamp
                          </button>
                          <button
                            type="button"
                            onClick={handleResetStamp}
                            title="Reset to default SVEC college stamp seal"
                            className="flex items-center justify-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 px-2 py-1.5 rounded-lg cursor-pointer transition-colors"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Reset
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-2xl space-y-1 text-xs text-indigo-900">
                  <div className="flex items-center gap-1.5 font-bold text-[11px] text-indigo-700">
                    <Info className="w-3.5 h-3.5" />
                    Direct Inline Table Editing
                  </div>
                  <p className="text-[10.5px] text-slate-600 leading-relaxed">
                    You can click directly inside any cell of the table on the right to edit student names, genders, emails, mobile numbers, streams, or years.
                  </p>
                </div>
              </div>
            )}

            {/* Right Column: Printable Document Layout matching attached format */}
            <div className="flex-1 p-4 md:p-8 overflow-y-auto space-y-4 bg-slate-100/60">
              
              {/* Document Banner */}
              <div className="max-w-3xl mx-auto flex items-center justify-between gap-3 bg-white border border-slate-200/80 px-4 py-2.5 rounded-2xl text-xs text-slate-600 shadow-2xs">
                <div className="flex items-center gap-2 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>Document Type: <b>Official Nomination Letter (SIH 2026 Standard)</b></span>
                </div>
                <span className="text-[10px] text-slate-400 hidden sm:inline">A4 Portrait · 1-Page Layout</span>
              </div>

              {/* Printable Document Sheet (Simulating real A4 page) */}
              <div className="border border-slate-300 rounded-2xl p-6 sm:p-10 md:p-12 bg-white shadow-lg max-w-3xl mx-auto transition-all">
                <div id="printable-consent-letter" className="font-serif text-slate-900 text-left space-y-5">
                  
                  {/* Print Stylesheet Injection */}
                  <style dangerouslySetInnerHTML={{__html: `
                    @media print {
                      @page {
                        size: A4 portrait;
                        margin: 15mm 15mm 15mm 15mm;
                      }
                      body {
                        background: #ffffff !important;
                        color: #000000 !important;
                      }
                      #printable-consent-letter {
                        font-family: "Times New Roman", Times, Georgia, serif !important;
                        color: #000000 !important;
                        background: #ffffff !important;
                        width: 100% !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        box-shadow: none !important;
                        border: none !important;
                        font-size: 11pt !important;
                        line-height: 1.4 !important;
                        box-sizing: border-box !important;
                        page-break-inside: avoid !important;
                      }
                      table {
                        width: 100% !important;
                        border-collapse: collapse !important;
                        margin-top: 12px !important;
                        margin-bottom: 16px !important;
                        table-layout: fixed !important;
                      }
                      th, td {
                        border: 1px solid #000000 !important;
                        padding: 5px 6px !important;
                        font-size: 9pt !important;
                        font-family: Arial, Helvetica, sans-serif !important;
                        vertical-align: middle !important;
                        word-break: break-word !important;
                      }
                      th {
                        background-color: #f1f5f9 !important;
                        font-weight: bold !important;
                        color: #000000 !important;
                        text-align: left !important;
                      }
                      input, textarea, .print-no-border {
                        border: none !important;
                        background: transparent !important;
                        outline: none !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        box-shadow: none !important;
                        width: 100% !important;
                        height: auto !important;
                        font-size: inherit !important;
                        font-family: inherit !important;
                        color: #000000 !important;
                      }
                    }

                    /* Interactive PDF generation styles via html2canvas */
                    .pdf-generation-active #printable-consent-letter,
                    .pdf-generation-active {
                      font-family: "Times New Roman", Times, Georgia, serif !important;
                      color: #000000 !important;
                      background: #ffffff !important;
                      width: 100% !important;
                      padding: 4mm 4mm 4mm 4mm !important;
                      margin: 0 !important;
                      box-shadow: none !important;
                      border: none !important;
                      font-size: 10pt !important;
                      line-height: 1.35 !important;
                      box-sizing: border-box !important;
                    }
                    .pdf-generation-active table {
                      width: 100% !important;
                      border-collapse: collapse !important;
                      margin-top: 10px !important;
                      margin-bottom: 12px !important;
                      table-layout: fixed !important;
                    }
                    .pdf-generation-active th, 
                    .pdf-generation-active td {
                      border: 1px solid #000000 !important;
                      padding: 4px 5px !important;
                      font-size: 8.5pt !important;
                      font-family: Arial, Helvetica, sans-serif !important;
                      vertical-align: middle !important;
                      word-break: break-word !important;
                    }
                    .pdf-generation-active th {
                      background-color: #f8fafc !important;
                      font-weight: bold !important;
                      color: #000000 !important;
                      text-align: left !important;
                    }
                    .pdf-generation-active input, 
                    .pdf-generation-active textarea, 
                    .pdf-generation-active .print-no-border {
                      border: none !important;
                      background: transparent !important;
                      outline: none !important;
                      padding: 0 !important;
                      margin: 0 !important;
                      box-shadow: none !important;
                      width: 100% !important;
                      height: auto !important;
                      font-size: inherit !important;
                      font-family: inherit !important;
                      color: #000000 !important;
                    }
                    .pdf-generation-active .header-logo-img {
                      width: 58px !important;
                      height: 58px !important;
                      display: block !important;
                      object-fit: contain !important;
                    }
                    .pdf-generation-active .signature-img {
                      height: 48px !important;
                      width: auto !important;
                      max-width: 180px !important;
                      display: block !important;
                      object-fit: contain !important;
                    }
                    .pdf-generation-active .stamp-img {
                      width: 90px !important;
                      height: 90px !important;
                      display: block !important;
                      object-fit: contain !important;
                    }
                  `}} />

                  {/* Top Section: College Letterhead or Placeholder */}
                  {includeFullLetterhead ? (
                    <div className="flex items-center justify-between pb-3 border-b-2 border-slate-900">
                      <div className="w-16 h-16 shrink-0 flex items-center justify-center">
                        <img
                          src={effectiveLogoUrl}
                          width="64"
                          height="64"
                          className="header-logo-img w-16 h-16 object-contain select-none"
                          alt="College Logo"
                          referrerPolicy="no-referrer"
                          crossOrigin="anonymous"
                        />
                      </div>
                      <div className="flex-1 text-center font-sans px-3">
                        <h2 className="text-base sm:text-lg font-black text-blue-800 tracking-tight leading-tight uppercase">
                          SRI VASAVI ENGINEERING COLLEGE <span className="text-indigo-600 font-bold lowercase text-xs">(Autonomous)</span>
                        </h2>
                        <p className="text-[8.5px] font-bold text-slate-600 mt-0.5">
                          (Sponsored by Sri Vasavi Educational Society; Regd.No:898/2000)
                        </p>
                        <p className="text-[8.5px] font-bold text-slate-700 mt-0.5">
                          | Accredited by <span className="text-rose-600 font-extrabold">NAAC</span> with <span className="text-rose-600 font-extrabold">'A'</span> Grade | &amp; | Accredited by <span className="text-rose-600 font-extrabold">NBA</span> |
                        </p>
                        <p className="text-[8.5px] font-semibold text-slate-600 mt-0.5">
                          Approved by AICTE, New Delhi and Permanently Affiliated to JNTUK, Kakinada
                        </p>
                        <p className="text-[9.5px] font-black text-slate-900 mt-0.5 uppercase tracking-wide">
                          Pedatadepalli, TADEPALLIGUDEM – 534 101, W.G. Dist, (A.P.)
                        </p>
                      </div>
                      <div className="w-16 h-16 shrink-0" />
                    </div>
                  ) : (
                    <div className="text-center py-4 text-slate-400 font-serif text-sm tracking-wide border-b border-dashed border-slate-200">
                      &lt; College letter head &gt;
                    </div>
                  )}

                  {/* Date Line */}
                  <div className="pt-2 text-xs sm:text-sm font-serif text-slate-900">
                    <strong>Date:</strong> {letterDate}
                  </div>

                  {/* Sub Header */}
                  <div className="text-center font-bold text-sm sm:text-base font-serif tracking-normal text-slate-900 py-1">
                    Sub: Smart India Hackathon 2026 – Nomination
                  </div>

                  {/* Main Paragraph */}
                  <p className="text-xs sm:text-sm leading-relaxed text-slate-900 text-justify font-serif">
                    I am pleased to nominate the below team from our college to participate in Smart India Hackathon 2026. AICTE Application No/ UGC Registration No for our college is {aicteNo ? <span className="underline font-bold font-sans">{aicteNo}</span> : "___________________"}.
                  </p>

                  {/* Team Label */}
                  <div className="font-bold text-xs sm:text-sm text-slate-900 font-serif">
                    Team : <span className="font-sans uppercase text-slate-900 font-bold">{teamName || registration.teamName}</span>
                  </div>

                  {/* Official SIH Format Nomination Table */}
                  <div className="overflow-x-auto pt-1">
                    <table className="w-full border-collapse border border-slate-900 text-left text-xs table-fixed">
                      <thead>
                        <tr className="bg-slate-50 font-bold border-b border-slate-900 text-slate-900">
                          <th className="border border-slate-900 p-2 text-[10px] font-sans w-[15%] min-w-[75px]"></th>
                          <th className="border border-slate-900 p-2 text-[10px] font-sans w-[21%] min-w-[95px]">Name</th>
                          <th className="border border-slate-900 p-2 text-[10px] font-sans text-center w-[10%] min-w-[45px]">Gender (M/F)</th>
                          <th className="border border-slate-900 p-2 text-[10px] font-sans w-[23%] min-w-[110px]">Email id</th>
                          <th className="border border-slate-900 p-2 text-[10px] font-sans w-[13%] min-w-[70px]">Mobile no.</th>
                          <th className="border border-slate-900 p-2 text-[10px] font-sans w-[9%] min-w-[45px]">Stream</th>
                          <th className="border border-slate-900 p-2 text-[10px] font-sans w-[9%] min-w-[45px]">Academic Year</th>
                        </tr>
                      </thead>
                      <tbody>
                        {roster.map((member, idx) => (
                          <tr key={idx} className="hover:bg-indigo-50/30 transition-colors">
                            <td className="border border-slate-900 p-2 text-[10px] font-bold text-slate-900 font-sans">
                              {member.role === "Team Leader" ? (
                                <span className="font-extrabold">Team Leader</span>
                              ) : (
                                <span>Team Member</span>
                              )}
                            </td>
                            <td className="border border-slate-900 p-2">
                              {isReadOnly ? (
                                <span className="text-slate-900 text-[10.5px] font-sans px-0.5 block truncate font-medium">{member.name || "-"}</span>
                              ) : (
                                <input
                                  type="text"
                                  value={member.name}
                                  onChange={(e) => handleUpdateRosterCell(idx, "name", e.target.value)}
                                  className="w-full bg-transparent outline-none border-none p-0 text-slate-900 text-[10.5px] font-sans font-medium print-no-border"
                                  placeholder="Enter Name"
                                />
                              )}
                            </td>
                            <td className="border border-slate-900 p-2 text-center">
                              {isReadOnly ? (
                                <span className="text-slate-900 text-[10.5px] font-sans px-0.5 block text-center font-medium">{member.gender || "-"}</span>
                              ) : (
                                <input
                                  type="text"
                                  value={member.gender}
                                  onChange={(e) => handleUpdateRosterCell(idx, "gender", e.target.value)}
                                  className="w-full bg-transparent outline-none border-none p-0 text-slate-900 text-[10.5px] text-center font-sans font-medium print-no-border"
                                  placeholder="M/F"
                                />
                              )}
                            </td>
                            <td className="border border-slate-900 p-2">
                              {isReadOnly ? (
                                <span className="text-slate-900 text-[9.5px] font-sans px-0.5 block break-all leading-tight">{member.email || "-"}</span>
                              ) : (
                                <input
                                  type="email"
                                  value={member.email}
                                  onChange={(e) => handleUpdateRosterCell(idx, "email", e.target.value)}
                                  className="w-full bg-transparent outline-none border-none p-0 text-slate-900 text-[9.5px] font-sans break-all leading-tight print-no-border"
                                  placeholder="Enter Email"
                                />
                              )}
                            </td>
                            <td className="border border-slate-900 p-2">
                              {isReadOnly ? (
                                <span className="text-slate-900 text-[9.5px] font-sans px-0.5 block leading-tight">{member.phone || "-"}</span>
                              ) : (
                                <input
                                  type="tel"
                                  value={member.phone}
                                  onChange={(e) => handleUpdateRosterCell(idx, "phone", e.target.value)}
                                  className="w-full bg-transparent outline-none border-none p-0 text-slate-900 text-[9.5px] font-sans leading-tight print-no-border"
                                  placeholder="Enter Mobile"
                                />
                              )}
                            </td>
                            <td className="border border-slate-900 p-2">
                              {isReadOnly ? (
                                <span className="text-slate-900 text-[10px] font-sans px-0.5 block truncate">{member.stream || "-"}</span>
                              ) : (
                                <input
                                  type="text"
                                  value={member.stream}
                                  onChange={(e) => handleUpdateRosterCell(idx, "stream", e.target.value)}
                                  className="w-full bg-transparent outline-none border-none p-0 text-slate-900 text-[10px] font-sans print-no-border"
                                  placeholder="CSE"
                                />
                              )}
                            </td>
                            <td className="border border-slate-900 p-2">
                              {isReadOnly ? (
                                <span className="text-slate-900 text-[10px] font-sans px-0.5 block truncate">{member.academicYear || "-"}</span>
                              ) : (
                                <input
                                  type="text"
                                  value={member.academicYear}
                                  onChange={(e) => handleUpdateRosterCell(idx, "academicYear", e.target.value)}
                                  className="w-full bg-transparent outline-none border-none p-0 text-slate-900 text-[10px] font-sans print-no-border"
                                  placeholder="3rd Year"
                                />
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Principal Signature, Designation and College Stamp Block */}
                  <div className="pt-6 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6">
                    <div className="text-xs sm:text-sm text-slate-900 font-serif space-y-1">
                      <p className="font-serif text-slate-900 mb-2">Sincerely,</p>
                      
                      {showSignature && signatureUrl ? (
                        <div className="py-1">
                          <img
                            src={signatureUrl}
                            alt="Principal's Signature"
                            className="signature-img h-12 sm:h-14 w-auto max-w-[200px] object-contain select-none"
                            referrerPolicy="no-referrer"
                            crossOrigin="anonymous"
                          />
                        </div>
                      ) : (
                        <div className="h-10 sm:h-12"></div>
                      )}

                      <p className="font-serif text-slate-900 font-bold text-sm sm:text-base pt-1">
                        {principalName || "Principal's Name"}
                      </p>
                      <p className="font-serif text-slate-900 text-xs sm:text-sm">
                        {principalDesignationLine1 || "Principal, Sri Vasavi Engineering College (Autonomous)"}
                      </p>
                      <p className="font-serif text-slate-900 text-xs sm:text-sm">
                        {principalDesignationLine2 || "Pedatadepalli, Tadepalligudem."}
                      </p>
                    </div>

                    {/* Official College Stamp Seal Image */}
                    {showStamp && stampUrl && (
                      <div className="shrink-0 flex flex-col items-center select-none pb-0.5 self-center sm:self-end">
                        <div className="relative p-1">
                          <img
                            src={stampUrl}
                            alt="Official College Stamp Seal"
                            className="stamp-img w-24 h-24 sm:w-28 sm:h-28 object-contain select-none transition-transform hover:scale-105"
                            referrerPolicy="no-referrer"
                            crossOrigin="anonymous"
                          />
                        </div>
                        <span className="text-[10px] font-sans font-medium text-slate-400 mt-0.5 print-no-border">
                          Official Institutional Seal
                        </span>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            </div>
          </div>
          )}

          {/* Modal Footer with Export & Action Buttons */}
          <div className="p-5 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0 no-print">
            <div className="text-[11px] text-slate-500 flex items-center gap-2 text-center sm:text-left">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Standardized format strictly aligned with Smart India Hackathon 2026 Institutional Nomination Guidelines.</span>
            </div>
            
            <div className="flex flex-wrap justify-end gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl shadow-2xs cursor-pointer transition-colors"
              >
                Close
              </button>
              
              {(!isReadOnly || (registration && registration.isFinalSelected)) && (
                <>
                  {/* Word Document (.doc) Export Button */}
                  <button
                    type="button"
                    onClick={handleDownloadWordDoc}
                    className="px-4 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs cursor-pointer transition-all flex items-center gap-1.5"
                    title="Download editable Microsoft Word (.doc) format"
                  >
                    <FileCode className="w-4 h-4" />
                    Download Word (.doc)
                  </button>

                  {/* PDF Download Button */}
                  <button
                    type="button"
                    onClick={handleDownloadPDF}
                    className="px-4 py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs cursor-pointer transition-all flex items-center gap-1.5"
                    title="Download official PDF copy of the nomination letter"
                  >
                    <Download className="w-4 h-4" />
                    Download PDF
                  </button>

                  {/* Native Print Dialog Button */}
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-4 py-2.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs cursor-pointer transition-all flex items-center gap-1.5"
                  >
                    <Printer className="w-4 h-4" />
                    Print Letter
                  </button>
                </>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

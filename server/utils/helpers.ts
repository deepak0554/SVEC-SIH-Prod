import { FeeConfig } from "../../src/types";
import { saveBase64Securely } from "../fileUpload";
import { db } from "../db";

export const MASKED_SECRET = "••••••••";

export function maskSecretValue(val?: string): string {
  return val && val.trim().length > 0 ? MASKED_SECRET : "";
}

export function sanitizeSettingsForAdmin(settings: FeeConfig): FeeConfig {
  return {
    ...settings,
    razorpayKeySecret: maskSecretValue(settings.razorpayKeySecret),
    smtpPass: maskSecretValue(settings.smtpPass),
    twilioAuthToken: maskSecretValue(settings.twilioAuthToken),
    msg91AuthKey: maskSecretValue(settings.msg91AuthKey),
    whatsappAccessToken: maskSecretValue(settings.whatsappAccessToken),
    dbPassword: maskSecretValue(settings.dbPassword),
  };
}

export function resolveSecretUpdate(incoming: string | undefined, currentSecret: string | undefined, envSecret?: string): string {
  if (incoming === undefined || incoming === null) {
    return currentSecret || envSecret || "";
  }
  const clean = incoming.trim();
  if (clean === "") {
    return "";
  }
  // If it's a masked placeholder string (bullets or asterisks), preserve current secret or environment secret
  if (/^[•*]+$/.test(clean)) {
    return currentSecret || envSecret || "";
  }
  return clean;
}

/**
 * Robust Department matching helper for Department-Specific SPOC data scoping.
 * Compares department names, codes, abbreviations (e.g. CSE, IT, ECE) case-insensitively.
 */
export function isDepartmentMatch(teamDept?: string, adminDept?: string): boolean {
  if (!adminDept || adminDept.trim() === "" || adminDept.trim().toLowerCase() === "all") {
    return true; // Super admin or unassigned matches all
  }
  if (!teamDept) return false;

  const tDept = teamDept.trim().toLowerCase();
  const aDept = adminDept.trim().toLowerCase();

  if (tDept === aDept) return true;

  // Department normalization mappings
  const deptAliases: Record<string, string[]> = {
    cse: ["cse", "computer science", "computer science and engineering", "comp sci"],
    it: ["it", "information technology", "infotech"],
    ece: ["ece", "electronics", "electronics and communication", "electronics & communication engineering", "electronics and communication engineering"],
    eee: ["eee", "electrical", "electrical & electronics", "electrical and electronics engineering"],
    mech: ["mech", "mechanical", "mechanical engineering"],
    civil: ["civil", "civil engineering"],
    aiml: ["aiml", "ai & ml", "ai and ml", "artificial intelligence", "artificial intelligence and machine learning"],
    aids: ["aids", "ai & ds", "ai and ds", "artificial intelligence & data science", "artificial intelligence and data science"],
    cst: ["cst", "computer science and technology"],
    cs: ["cs", "cyber security", "cybersecurity", "computer science and engineering (cyber security)"],
    iot: ["iot", "internet of things"],
    mba: ["mba", "master of business administration"],
    mca: ["mca", "master of computer applications"],
    basic: ["bsh", "b&sh", "basic sciences", "humanities", "basic sciences and humanities"]
  };

  for (const key of Object.keys(deptAliases)) {
    const aliases = deptAliases[key];
    const teamMatches = aliases.some(alias => tDept.includes(alias) || alias.includes(tDept));
    const adminMatches = aliases.some(alias => aDept.includes(alias) || alias.includes(aDept));
    if (teamMatches && adminMatches) {
      return true;
    }
  }

  return tDept.includes(aDept) || aDept.includes(tDept);
}

export function saveBase64File(
  base64Data: string,
  category: "ppts" | "images" | "documents" | "sample_ppts",
  suggestedName?: string
) {
  const res = saveBase64Securely(base64Data, category, suggestedName);
  if (!res) return null;
  return {
    url: res.url,
    filename: res.filename,
    size: res.size,
    relativePath: `/uploads/${category}/${res.filename}`
  };
}

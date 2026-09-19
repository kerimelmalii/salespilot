import type { CompanyCandidate, ScanRequest } from "./types";

export const STORAGE_VERSION = 1;
export const HISTORY_KEY = "salespilot:search-history:v1";
export const SAVED_LEADS_KEY = "salespilot:saved-leads:v1";
export const PROFILE_KEY = "salespilot:profile:v1";

export interface SearchHistoryItem {
  id: string;
  createdAt: string;
  request: Partial<ScanRequest>;
  discovered: number;
  qualified: number;
  status: "completed" | "discovered";
}

export interface SavedLead {
  domain: string;
  title: string;
  url: string;
  savedAt: string;
  score?: number;
  sector?: string;
  region?: string;
}

export interface WorkspaceProfile {
  fullName: string;
  email: string;
  companyName: string;
  website: string;
  role: string;
}

function readList<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function readHistory() {
  return readList<SearchHistoryItem>(HISTORY_KEY);
}

export function saveHistoryItem(item: SearchHistoryItem) {
  const next = [item, ...readHistory().filter((entry) => entry.id !== item.id)].slice(0, 50);
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("salespilot:storage"));
}

export function readSavedLeads() {
  return readList<SavedLead>(SAVED_LEADS_KEY);
}

export function toggleSavedLead(candidate: CompanyCandidate, context?: { score?: number; sector?: string; region?: string }) {
  const current = readSavedLeads();
  const exists = current.some((lead) => lead.domain === candidate.domain);
  const next = exists
    ? current.filter((lead) => lead.domain !== candidate.domain)
    : [{ domain: candidate.domain, title: candidate.title, url: candidate.url, savedAt: new Date().toISOString(), ...context }, ...current];
  window.localStorage.setItem(SAVED_LEADS_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("salespilot:storage"));
  return !exists;
}

export function readProfile(): WorkspaceProfile {
  const fallback: WorkspaceProfile = { fullName: "SalesPilot Kullanıcısı", email: "", companyName: "", website: "", role: "Satış ve İş Geliştirme" };
  if (typeof window === "undefined") return fallback;
  try {
    return { ...fallback, ...JSON.parse(window.localStorage.getItem(PROFILE_KEY) ?? "{}") };
  } catch {
    return fallback;
  }
}

export function saveProfile(profile: WorkspaceProfile) {
  window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  window.dispatchEvent(new Event("salespilot:storage"));
}

import type { SavedAnalysis } from "./types";

const STORAGE_KEY = "housescope:analyses";
const MAX_ANALYSES = 20;

export function getSavedAnalyses(): SavedAnalysis[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveAnalysis(analysis: SavedAnalysis): void {
  const existing = getSavedAnalyses();
  const updated = [analysis, ...existing].slice(0, MAX_ANALYSES);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function deleteAnalysis(id: string): void {
  const existing = getSavedAnalyses();
  const updated = existing.filter((a) => a.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

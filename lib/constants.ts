import { type Severity, type Category } from "./types";

export const SEVERITY_COLORS: Record<Severity, string> = {
  critical: "#E05252",
  high: "#D97B3A",
  medium: "#C4A020",
  low: "#5A9BB8",
};

export const SEVERITY_ORDER: Severity[] = ["critical", "high", "medium", "low"];

export const CATEGORY_LABELS: Record<Category, string> = {
  water_damage: "Water Damage",
  structural: "Structural",
  electrical: "Electrical",
  hvac: "HVAC",
  roof_ceiling: "Roof / Ceiling",
  foundation: "Foundation",
  plumbing: "Plumbing",
  safety: "Safety",
};

export const FRAMES_PER_SECOND = 0.25; // 1 frame every 4 seconds
export const BATCH_SIZE = 6;
export const FINDING_FADE_IN_MS = 200;
export const FINDING_FADE_OUT_MS = 300;
export const FINDING_DISPLAY_DURATION = 4; // seconds each finding shows on video
export const CONFIDENCE_THRESHOLD = 0.75;

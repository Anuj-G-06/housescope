export type Severity = "critical" | "high" | "medium" | "low";

export type Category =
  | "water_damage"
  | "structural"
  | "electrical"
  | "hvac"
  | "roof_ceiling"
  | "foundation"
  | "plumbing"
  | "safety";

export interface BBox {
  x: number; // normalized 0-1
  y: number;
  w: number;
  h: number;
}

export interface Finding {
  id: string;
  category: Category;
  severity: Severity;
  label: string;
  description: string;
  bbox: BBox;
  repair_cost_low: number;
  repair_cost_high: number;
  code_reference: string | null;
  confidence: number;
  frame_index: number;
  timestamp: number; // seconds into video
}

export interface ManifestEntry {
  id: string;
  category: Category;
  severity: Severity;
  label: string;
  description: string;
  bbox: BBox;
  repair_cost_low: number;
  repair_cost_high: number;
  code_reference: string | null;
  confidence: number;
  timestamp_start: number;
  timestamp_end: number;
}

export interface AnalysisResult {
  manifest: ManifestEntry[];
  risk_score: number;
  total_cost_low: number;
  total_cost_high: number;
}

export interface SavedAnalysis {
  id: string;
  address: string;
  date: string;
  thumbnail: string;
  result: AnalysisResult;
}

export type AppStage = "upload" | "processing" | "results";

export interface FrameData {
  index: number;
  timestamp: number; // seconds
  data: string; // base64 JPEG
}

export interface BatchRequest {
  frames: FrameData[];
  address: string;
}

export interface BatchResponse {
  findings: Finding[];
}

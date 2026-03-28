export interface BBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Finding {
  id: string;
  category: string;
  severity: "critical" | "high" | "medium" | "low";
  label: string;
  description: string;
  timestamp_start: number;
  timestamp_end: number;
  bbox: BBox;
  repair_cost_low: number;
  repair_cost_high: number;
  code_reference: string | null;
  confidence: number;
}

export interface InspectionData {
  property: {
    address: string;
    type: string;
    year_built: number;
    sqft: number;
    analyzed_at: string;
  };
  summary: {
    overall_risk_score: number;
    risk_label: string;
    total_findings: number;
    severity_counts: Record<string, number>;
    total_cost_low: number;
    total_cost_high: number;
    negotiation_ask_low: number;
    negotiation_ask_high: number;
  };
  findings: Finding[];
}
